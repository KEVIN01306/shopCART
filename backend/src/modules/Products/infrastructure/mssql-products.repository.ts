import crypto from "node:crypto";
import { getPool, sql } from "@infrastructure/config/mssql.config.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type {
    AdjustVariantStockInput,
    AdminProductsFilterOptions,
    CatalogFilterOptions,
    Category,
    CreateCategory,
    CreateProductInput,
    CreateProductVariantInput,
    KardexFilterOptions,
    KardexMovement,
    Product,
    ProductVariant,
    UpdateCategory,
    UpdateProductInput,
    UpdateProductVariantInput,
} from "../domain/product.entity.js";
import {
    ProductMapper,
    type CategoryDbRow,
    type KardexMovementDbRow,
    type ProductDbRow,
    type ProductVariantDbRow,
} from "./mappers/product.mapper.js";

export class MssqlProductsRepository implements IProductsRepository {
    constructor(
        private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool
    ) {}

    // =========================================================================
    // CATEGORÍAS
    // =========================================================================

    async listCategories(onlyActive = true): Promise<Category[]> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_only_active", sql.Bit, onlyActive ? 1 : 0)
                .execute<CategoryDbRow>("SP_Categorias_Listar");

            const rows = result.recordset ?? [];
            return rows.map((row) => ProductMapper.toCategory(row));
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findCategoryById(id: string): Promise<Category | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .execute<CategoryDbRow>("SP_Categorias_ObtenerPorId");

            const row = result.recordset?.[0];
            return row ? ProductMapper.toCategory(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async createCategory(data: CreateCategory): Promise<Category> {
        try {
            const pool = await this.poolProvider();
            const categoryId = data.id || crypto.randomUUID();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), categoryId)
                .input("p_name", sql.VarChar(100), data.name.trim())
                .input(
                    "p_description",
                    sql.VarChar(255),
                    data.description?.trim() || null
                )
                .execute<CategoryDbRow>("SP_Categorias_Crear");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return ProductMapper.toCategory(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateCategory(id: string, data: UpdateCategory): Promise<Category> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input(
                    "p_name",
                    sql.VarChar(100),
                    data.name !== undefined ? data.name.trim() : null
                )
                .input(
                    "p_description",
                    sql.VarChar(255),
                    data.description !== undefined
                        ? data.description?.trim() ?? ""
                        : null
                )
                .input(
                    "p_is_active",
                    sql.Bit,
                    data.isActive !== undefined ? (data.isActive ? 1 : 0) : null
                )
                .execute<CategoryDbRow>("SP_Categorias_Actualizar");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return ProductMapper.toCategory(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    // =========================================================================
    // CATÁLOGO PÚBLICO (SHOP)
    // =========================================================================

    async listCatalogProducts(
        options: CatalogFilterOptions
    ): Promise<{ data: Product[]; total: number }> {
        try {
            const pool = await this.poolProvider();
            const page = options.page ?? 1;
            const limit = options.limit ?? 12;

            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input("p_q", sql.NVarChar(100), options.q?.trim() || null)
                .input("p_category_id", sql.VarChar(36), options.categoryId || null)
                .input(
                    "p_min_price",
                    sql.Decimal(12, 2),
                    options.minPrice !== undefined ? options.minPrice : null
                )
                .input(
                    "p_max_price",
                    sql.Decimal(12, 2),
                    options.maxPrice !== undefined ? options.maxPrice : null
                )
                .input("p_sort_by", sql.VarChar(30), options.sortBy || "latest")
                .input(
                    "p_in_stock",
                    sql.Bit,
                    options.inStock !== undefined
                        ? options.inStock
                            ? 1
                            : 0
                        : null
                )
                .execute("SP_Productos_ListarCatalogo");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;

            const productRows = recordsets?.[0] ?? (result.recordset as ProductDbRow[]) ?? [];
            const variantRows = recordsets?.[1] ?? [];

            const variantsByProduct = new Map<string, ProductVariant[]>();
            for (const vRow of variantRows) {
                const mappedVariant = ProductMapper.toVariant(vRow);
                const list = variantsByProduct.get(mappedVariant.productId) ?? [];
                list.push(mappedVariant);
                variantsByProduct.set(mappedVariant.productId, list);
            }

            const total =
                productRows.length > 0
                    ? Number(productRows[0]?.total_count ?? productRows.length)
                    : 0;

            const data = productRows.map((pRow) =>
                ProductMapper.toProduct(
                    pRow,
                    variantsByProduct.get(pRow.id) ?? []
                )
            );

            return { data, total };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findCatalogProductById(id: string): Promise<Product | null> {
        return this.findProductByIdInternal(id, true);
    }

    // =========================================================================
    // PANEL ADMINISTRATIVO (PRODUCTS)
    // =========================================================================

    async listAdminProducts(
        options: AdminProductsFilterOptions
    ): Promise<{ data: Product[]; total: number }> {
        try {
            const pool = await this.poolProvider();
            const page = options.page ?? 1;
            const limit = options.limit ?? 10;

            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input("p_q", sql.NVarChar(100), options.q?.trim() || null)
                .input("p_category_id", sql.VarChar(36), options.categoryId || null)
                .execute("SP_Productos_ListarAdmin");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;

            const productRows = recordsets?.[0] ?? (result.recordset as ProductDbRow[]) ?? [];
            const variantRows = recordsets?.[1] ?? [];

            const variantsByProduct = new Map<string, ProductVariant[]>();
            for (const vRow of variantRows) {
                const mappedVariant = ProductMapper.toVariant(vRow);
                const list = variantsByProduct.get(mappedVariant.productId) ?? [];
                list.push(mappedVariant);
                variantsByProduct.set(mappedVariant.productId, list);
            }

            const total =
                productRows.length > 0
                    ? Number(productRows[0]?.total_count ?? productRows.length)
                    : 0;

            const data = productRows.map((pRow) =>
                ProductMapper.toProduct(
                    pRow,
                    variantsByProduct.get(pRow.id) ?? []
                )
            );

            return { data, total };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findAdminProductById(id: string): Promise<Product | null> {
        return this.findProductByIdInternal(id, false);
    }

    private async findProductByIdInternal(
        id: string,
        onlyActive: boolean
    ): Promise<Product | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_only_active", sql.Bit, onlyActive ? 1 : 0)
                .execute("SP_Productos_ObtenerPorId");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;

            const productRow =
                recordsets?.[0]?.[0] ??
                ((result.recordset as ProductDbRow[] | undefined)?.[0]);

            if (!productRow) {
                return null;
            }

            const variantRows = recordsets?.[1] ?? [];
            const variants = variantRows.map((vRow) =>
                ProductMapper.toVariant(vRow)
            );

            return ProductMapper.toProduct(productRow, variants);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    private async syncProductImages(
        productId: string,
        imageUrls: string[]
    ): Promise<void> {
        const pool = await this.poolProvider();
        const cleaned = imageUrls
            .map((u) => u.trim())
            .filter((u, idx, arr) => u.length > 0 && arr.indexOf(u) === idx);

        const payload = JSON.stringify(
            cleaned.map((url, idx) => ({
                imageUrl: url,
                isCover: idx === 0,
                sortOrder: idx,
            }))
        );

        await pool
            .request()
            .input("p_product_id", sql.VarChar(36), productId)
            .input("p_images_json", sql.NVarChar(sql.MAX), payload)
            .execute("SP_Productos_SincronizarImagenes");
    }

    async createProduct(data: CreateProductInput): Promise<Product> {
        try {
            const pool = await this.poolProvider();
            const productId = data.id || crypto.randomUUID();
            const coverImageUrl =
                data.mainImageUrl?.trim() ||
                data.imageUrls?.find((u) => u.trim().length > 0)?.trim() ||
                null;

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), productId)
                .input("p_category_id", sql.VarChar(36), data.categoryId)
                .input("p_name", sql.VarChar(200), data.name.trim())
                .input(
                    "p_description",
                    sql.NVarChar(sql.MAX),
                    data.description?.trim() || null
                )
                .input("p_main_image_url", sql.VarChar(500), coverImageUrl)
                .input("p_user_id", sql.VarChar(36), data.userId || null)
                .execute("SP_Productos_CrearProducto");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;
            const productRow =
                recordsets?.[0]?.[0] ??
                ((result.recordset as ProductDbRow[] | undefined)?.[0]);

            if (!productRow) {
                throw new NotFoundPersistenceError();
            }

            try {
                if (data.imageUrls && data.imageUrls.length > 0) {
                    const combinedImages = coverImageUrl
                        ? [coverImageUrl, ...data.imageUrls]
                        : data.imageUrls;
                    await this.syncProductImages(productId, combinedImages);
                }

                if (data.variants && data.variants.length > 0) {
                    for (const variant of data.variants) {
                        await this.createVariant(productId, {
                            ...variant,
                            userId: data.userId ?? variant.userId ?? null,
                        });
                    }
                }

                const refreshed = await this.findAdminProductById(productId);
                if (!refreshed) {
                    throw new NotFoundPersistenceError();
                }
                return refreshed;
            } catch (postCreateError) {
                // Si ocurre algún error en las variantes o imágenes al crear el producto,
                // se elimina de inmediato el producto creado junto con sus datos parciales
                // para evitar productos huérfanos o corruptos.
                try {
                    await this.deleteProduct(productId, data.userId || null);
                } catch (cleanupError) {
                    console.error("Error al limpiar producto tras fallo en variantes:", cleanupError);
                }
                throw postCreateError;
            }
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async deleteProduct(id: string, userId?: string | null): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_user_id", sql.VarChar(36), userId || null)
                .execute("SP_Productos_EliminarProductoPorFallo");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
        try {
            const pool = await this.poolProvider();
            const coverImageUrl =
                data.mainImageUrl !== undefined
                    ? data.mainImageUrl?.trim() ||
                      data.imageUrls?.find((u) => u.trim().length > 0)?.trim() ||
                      ""
                    : data.imageUrls && data.imageUrls.length > 0
                      ? data.imageUrls.find((u) => u.trim().length > 0)?.trim() ??
                        null
                      : null;

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input(
                    "p_category_id",
                    sql.VarChar(36),
                    data.categoryId ?? null
                )
                .input(
                    "p_name",
                    sql.VarChar(200),
                    data.name !== undefined ? data.name.trim() : null
                )
                .input(
                    "p_description",
                    sql.NVarChar(sql.MAX),
                    data.description !== undefined
                        ? data.description?.trim() ?? ""
                        : null
                )
                .input("p_main_image_url", sql.VarChar(500), coverImageUrl)
                .input(
                    "p_is_active",
                    sql.Bit,
                    data.isActive !== undefined ? (data.isActive ? 1 : 0) : null
                )
                .input("p_user_id", sql.VarChar(36), data.userId || null)
                .execute("SP_Productos_ActualizarProducto");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;
            const productRow =
                recordsets?.[0]?.[0] ??
                ((result.recordset as ProductDbRow[] | undefined)?.[0]);

            if (!productRow) {
                throw new NotFoundPersistenceError();
            }

            if (data.imageUrls !== undefined) {
                const combinedImages =
                    coverImageUrl && coverImageUrl.length > 0
                        ? [coverImageUrl, ...data.imageUrls]
                        : data.imageUrls;
                await this.syncProductImages(id, combinedImages);
            }

            if (data.variants && data.variants.length > 0) {
                const existingVariants = (recordsets?.[1] ?? []).map((v) =>
                    ProductMapper.toVariant(v)
                );
                const existingById = new Map(
                    existingVariants.map((v) => [v.id, v])
                );

                for (const variantPayload of data.variants) {
                    if (variantPayload.id && existingById.has(variantPayload.id)) {
                        const prev = existingById.get(variantPayload.id)!;
                        await this.updateVariant(variantPayload.id, {
                            sku: variantPayload.sku,
                            attributes: variantPayload.attributes,
                            price: variantPayload.price,
                            isActive: variantPayload.isActive,
                            userId: data.userId ?? null,
                        });

                        if (
                            variantPayload.stockPhysical !== undefined &&
                            variantPayload.stockPhysical !== prev.stockPhysical
                        ) {
                            const delta =
                                variantPayload.stockPhysical - prev.stockPhysical;
                            await this.adjustVariantStock({
                                variantId: variantPayload.id,
                                movementType: "AJUSTE",
                                quantity: delta,
                                reason: "Ajuste desde formulario de edición de producto",
                                userId: data.userId ?? null,
                            });
                        }
                    } else {
                        await this.createVariant(id, {
                            sku: variantPayload.sku,
                            attributes: variantPayload.attributes,
                            price: variantPayload.price,
                            stockPhysical: variantPayload.stockPhysical ?? 0,
                            userId: data.userId ?? null,
                        });
                    }
                }
            }

            const refreshed = await this.findAdminProductById(id);
            if (!refreshed) {
                throw new NotFoundPersistenceError();
            }
            return refreshed;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async toggleProductStatus(
        id: string,
        isActive: boolean,
        userId?: string | null
    ): Promise<Product> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_is_active", sql.Bit, isActive ? 1 : 0)
                .input("p_user_id", sql.VarChar(36), userId || null)
                .execute("SP_Productos_CambiarEstadoActivo");

            const recordsets = result.recordsets as unknown as
                | [ProductDbRow[], ProductVariantDbRow[]]
                | undefined;
            const productRow =
                recordsets?.[0]?.[0] ??
                ((result.recordset as ProductDbRow[] | undefined)?.[0]);

            if (!productRow) {
                throw new NotFoundPersistenceError();
            }

            const variantRows = recordsets?.[1] ?? [];
            const variants = variantRows.map((vRow) =>
                ProductMapper.toVariant(vRow)
            );

            return ProductMapper.toProduct(productRow, variants);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    // =========================================================================
    // VARIANTES Y KARDEX
    // =========================================================================

    async createVariant(
        productId: string,
        data: CreateProductVariantInput
    ): Promise<ProductVariant> {
        try {
            const pool = await this.poolProvider();
            const variantId = data.id || crypto.randomUUID();
            const serializedAttrs = ProductMapper.serializeAttributes(
                data.attributes
            );

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), variantId)
                .input("p_product_id", sql.VarChar(36), productId)
                .input("p_sku", sql.VarChar(60), data.sku.trim())
                .input(
                    "p_attributes",
                    sql.NVarChar(sql.MAX),
                    serializedAttrs
                )
                .input("p_price", sql.Decimal(12, 2), data.price)
                .input(
                    "p_stock_physical",
                    sql.Int,
                    data.stockPhysical ?? 0
                )
                .input("p_user_id", sql.VarChar(36), data.userId || null)
                .execute<ProductVariantDbRow>("SP_Productos_CrearVariante");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return ProductMapper.toVariant(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateVariant(
        variantId: string,
        data: UpdateProductVariantInput
    ): Promise<ProductVariant> {
        try {
            const pool = await this.poolProvider();
            const serializedAttrs =
                data.attributes !== undefined
                    ? ProductMapper.serializeAttributes(data.attributes) ?? "{}"
                    : null;

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), variantId)
                .input(
                    "p_sku",
                    sql.VarChar(60),
                    data.sku !== undefined ? data.sku.trim() : null
                )
                .input(
                    "p_attributes",
                    sql.NVarChar(sql.MAX),
                    serializedAttrs
                )
                .input(
                    "p_price",
                    sql.Decimal(12, 2),
                    data.price !== undefined ? data.price : null
                )
                .input(
                    "p_is_active",
                    sql.Bit,
                    data.isActive !== undefined ? (data.isActive ? 1 : 0) : null
                )
                .input("p_user_id", sql.VarChar(36), data.userId || null)
                .execute<ProductVariantDbRow>("SP_Productos_ActualizarVariante");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return ProductMapper.toVariant(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async adjustVariantStock(
        data: AdjustVariantStockInput
    ): Promise<ProductVariant> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_variant_id", sql.VarChar(36), data.variantId)
                .input("p_movement_type", sql.VarChar(20), data.movementType)
                .input("p_quantity", sql.Int, data.quantity)
                .input("p_reason", sql.NVarChar(255), data.reason.trim())
                .input("p_user_id", sql.VarChar(36), data.userId || null)
                .execute<ProductVariantDbRow>(
                    "SP_Productos_AjustarStockVariante"
                );

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return ProductMapper.toVariant(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async listKardexMovements(
        options: KardexFilterOptions
    ): Promise<{ data: KardexMovement[]; total: number }> {
        try {
            const pool = await this.poolProvider();
            const page = options.page ?? 1;
            const limit = options.limit ?? 15;

            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input(
                    "p_product_id",
                    sql.VarChar(36),
                    options.productId || null
                )
                .input(
                    "p_variant_id",
                    sql.VarChar(36),
                    options.variantId || null
                )
                .input(
                    "p_movement_type",
                    sql.VarChar(20),
                    options.movementType || null
                )
                .execute<KardexMovementDbRow>("SP_Kardex_ListarMovimientos");

            const rows = result.recordset ?? [];
            const total =
                rows.length > 0
                    ? Number(rows[0]?.total_count ?? rows.length)
                    : 0;
            const data = rows.map((r) => ProductMapper.toKardexMovement(r));

            return { data, total };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}

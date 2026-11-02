import "dotenv/config";
import assert from "node:assert/strict";
import type sql from "mssql";
import AppError from "../../shared/errors/AppError.js";
import { MssqlProductsRepository } from "./infrastructure/mssql-products.repository.js";
import type {
    CategoryDbRow,
    ProductDbRow,
    ProductVariantDbRow,
} from "./infrastructure/mappers/product.mapper.js";
import { CreateCategoryUseCase } from "./application/create-category.usecase.js";
import { ListCategoriesUseCase } from "./application/list-categories.usecase.js";
import { CreateProductUseCase } from "./application/create-product.usecase.js";
import { ListCatalogProductsUseCase } from "./application/list-catalog-products.usecase.js";
import { GetCatalogProductUseCase } from "./application/get-catalog-product.usecase.js";
import { UpdateVariantUseCase } from "./application/update-variant.usecase.js";
import { AdjustVariantStockUseCase } from "./application/adjust-variant-stock.usecase.js";
import { ToggleProductStatusUseCase } from "./application/toggle-product-status.usecase.js";

function createMockCatalogMssqlPool() {
    const categories = new Map<string, CategoryDbRow>();
    const products = new Map<string, ProductDbRow>();
    const variants = new Map<string, ProductVariantDbRow>();
    const kardexMovements: Array<{
        variant_id: string;
        movement_type: string;
        quantity: number;
        previous_stock: number;
        new_stock: number;
        reason: string;
    }> = [];

    const pool = {
        request() {
            const inputs: Record<string, any> = {};
            const req = {
                input(name: string, _type: any, value: any) {
                    inputs[name] = value;
                    return req;
                },
                async execute(spName: string) {
                    switch (spName) {
                        case "SP_Categorias_Crear": {
                            for (const c of categories.values()) {
                                if (
                                    c.name.toLowerCase() ===
                                    String(inputs.p_name).toLowerCase()
                                ) {
                                    const err: any = new Error(
                                        "DUPLICADO: Ya existe una categoría con ese nombre."
                                    );
                                    err.number = 50003;
                                    throw err;
                                }
                            }
                            const row: CategoryDbRow = {
                                id: inputs.p_id,
                                name: inputs.p_name,
                                description: inputs.p_description ?? null,
                                is_active: 1,
                                created_at: new Date(),
                                product_count: 0,
                            };
                            categories.set(row.id, row);
                            return { recordset: [row] };
                        }

                        case "SP_Categorias_Listar": {
                            const onlyActive = Boolean(inputs.p_only_active);
                            const list = Array.from(categories.values())
                                .filter((c) => !onlyActive || Boolean(c.is_active))
                                .map((c) => {
                                    const activeProdCount = Array.from(
                                        products.values()
                                    ).filter(
                                        (p) =>
                                            p.category_id === c.id &&
                                            Boolean(p.is_active)
                                    ).length;
                                    return {
                                        ...c,
                                        product_count: activeProdCount,
                                    };
                                });
                            return { recordset: list };
                        }

                        case "SP_Productos_CrearProducto": {
                            const cat = categories.get(inputs.p_category_id);
                            if (!cat) {
                                const err: any = new Error(
                                    "NO_ENCONTRADO: La categoría especificada no existe."
                                );
                                err.number = 50001;
                                throw err;
                            }
                            const row: ProductDbRow = {
                                id: inputs.p_id,
                                category_id: inputs.p_category_id,
                                category_name: cat.name,
                                name: inputs.p_name,
                                description: inputs.p_description ?? null,
                                main_image_url: inputs.p_main_image_url ?? null,
                                is_active: 1,
                                created_at: new Date(),
                                updated_at: new Date(),
                            };
                            products.set(row.id, row);
                            return {
                                recordset: [row],
                                recordsets: [[row], []],
                            };
                        }

                        case "SP_Productos_CrearVariante": {
                            for (const v of variants.values()) {
                                if (
                                    v.sku.toLowerCase() ===
                                    String(inputs.p_sku).toLowerCase()
                                ) {
                                    const err: any = new Error(
                                        "DUPLICADO: Ya existe una variante con ese SKU."
                                    );
                                    err.number = 50003;
                                    throw err;
                                }
                            }
                            const stockPhysical = Number(
                                inputs.p_stock_physical ?? 0
                            );
                            const vRow: ProductVariantDbRow = {
                                id: inputs.p_id,
                                product_id: inputs.p_product_id,
                                sku: inputs.p_sku,
                                attributes: inputs.p_attributes ?? null,
                                price: Number(inputs.p_price),
                                stock_physical: stockPhysical,
                                stock_reserved: 0,
                                stock_available: stockPhysical,
                                is_active: 1,
                                created_at: new Date(),
                                updated_at: new Date(),
                            };
                            variants.set(vRow.id, vRow);
                            if (stockPhysical > 0) {
                                kardexMovements.push({
                                    variant_id: vRow.id,
                                    movement_type: "ENTRADA",
                                    quantity: stockPhysical,
                                    previous_stock: 0,
                                    new_stock: stockPhysical,
                                    reason: "Inventario inicial en creación de variante",
                                });
                            }
                            return { recordset: [vRow] };
                        }

                        case "SP_Productos_ObtenerPorId": {
                            const onlyActive = Boolean(inputs.p_only_active);
                            const p = products.get(inputs.p_id);
                            if (!p || (onlyActive && !p.is_active)) {
                                return { recordset: [], recordsets: [[], []] };
                            }
                            const prodVariants = Array.from(
                                variants.values()
                            ).filter(
                                (v) =>
                                    v.product_id === p.id &&
                                    (!onlyActive || Boolean(v.is_active))
                            );
                            return {
                                recordset: [p],
                                recordsets: [[p], prodVariants],
                            };
                        }

                        case "SP_Productos_ListarCatalogo": {
                            const activeProds = Array.from(
                                products.values()
                            ).filter((p) => Boolean(p.is_active));
                            const matchingProds: ProductDbRow[] = [];
                            const matchingVars: ProductVariantDbRow[] = [];

                            for (const p of activeProds) {
                                if (
                                    inputs.p_category_id &&
                                    p.category_id !== inputs.p_category_id
                                ) {
                                    continue;
                                }
                                const pVars = Array.from(
                                    variants.values()
                                ).filter(
                                    (v) =>
                                        v.product_id === p.id &&
                                        Boolean(v.is_active) &&
                                        (inputs.p_min_price === null ||
                                            Number(v.price) >=
                                                Number(inputs.p_min_price)) &&
                                        (inputs.p_max_price === null ||
                                            Number(v.price) <=
                                                Number(inputs.p_max_price))
                                );
                                if (pVars.length === 0) continue;

                                matchingProds.push({
                                    ...p,
                                    min_price: Math.min(
                                        ...pVars.map((v) => Number(v.price))
                                    ),
                                    max_price: Math.max(
                                        ...pVars.map((v) => Number(v.price))
                                    ),
                                    total_stock_available: pVars.reduce(
                                        (acc, v) =>
                                            acc +
                                            (v.stock_physical -
                                                v.stock_reserved),
                                        0
                                    ),
                                    variants_count: pVars.length,
                                    total_count: activeProds.length,
                                });
                                matchingVars.push(...pVars);
                            }

                            return {
                                recordset: matchingProds,
                                recordsets: [matchingProds, matchingVars],
                            };
                        }

                        case "SP_Productos_ActualizarVariante": {
                            const v = variants.get(inputs.p_id);
                            if (!v) {
                                const err: any = new Error(
                                    "NO_ENCONTRADO: La variante no existe."
                                );
                                err.number = 50001;
                                throw err;
                            }
                            if (inputs.p_sku !== null) v.sku = inputs.p_sku;
                            if (inputs.p_attributes !== null)
                                v.attributes = inputs.p_attributes;
                            if (inputs.p_price !== null)
                                v.price = Number(inputs.p_price);
                            if (inputs.p_is_active !== null)
                                v.is_active = inputs.p_is_active;
                            v.updated_at = new Date();
                            return { recordset: [v] };
                        }

                        case "SP_Productos_AjustarStockVariante": {
                            const v = variants.get(inputs.p_variant_id);
                            if (!v) {
                                const err: any = new Error(
                                    "NO_ENCONTRADO: La variante no existe."
                                );
                                err.number = 50001;
                                throw err;
                            }
                            const prev = v.stock_physical;
                            const qty = Number(inputs.p_quantity);
                            let nextStock = prev;
                            if (inputs.p_movement_type === "ENTRADA") {
                                nextStock = prev + Math.abs(qty);
                            } else if (inputs.p_movement_type === "SALIDA") {
                                nextStock = prev - Math.abs(qty);
                            } else {
                                nextStock = prev + qty;
                            }
                            if (nextStock < 0 || nextStock < v.stock_reserved) {
                                const err: any = new Error(
                                    "STOCK_INSUFICIENTE: La existencia física no puede quedar en negativo ni ser menor al stock reservado."
                                );
                                err.number = 50002;
                                throw err;
                            }
                            v.stock_physical = nextStock;
                            v.stock_available = nextStock - v.stock_reserved;
                            kardexMovements.push({
                                variant_id: v.id,
                                movement_type: inputs.p_movement_type,
                                quantity: qty,
                                previous_stock: prev,
                                new_stock: nextStock,
                                reason: inputs.p_reason,
                            });
                            return { recordset: [v] };
                        }

                        case "SP_Productos_CambiarEstadoActivo": {
                            const p = products.get(inputs.p_id);
                            if (!p) {
                                const err: any = new Error(
                                    "NO_ENCONTRADO: El producto no existe."
                                );
                                err.number = 50001;
                                throw err;
                            }
                            p.is_active = inputs.p_is_active;
                            const prodVariants = Array.from(
                                variants.values()
                            ).filter((v) => v.product_id === p.id);
                            return {
                                recordset: [p],
                                recordsets: [[p], prodVariants],
                            };
                        }

                        default:
                            throw new Error(`Unexpected SP call: ${spName}`);
                    }
                },
            };
            return req;
        },
        kardexMovements,
    };

    return pool;
}

async function runProductsCatalogKardexTests() {
    console.log(
        "🧪 Starting Products, Variants & Kardex automated test suite (MSSQL SP)..."
    );

    const mockPool = createMockCatalogMssqlPool();
    const repository = new MssqlProductsRepository(
        async () => mockPool as unknown as sql.ConnectionPool
    );

    const createCategoryUseCase = new CreateCategoryUseCase(repository);
    const listCategoriesUseCase = new ListCategoriesUseCase(repository);
    const createProductUseCase = new CreateProductUseCase(repository);
    const listCatalogProductsUseCase = new ListCatalogProductsUseCase(
        repository
    );
    const getCatalogProductUseCase = new GetCatalogProductUseCase(repository);
    const updateVariantUseCase = new UpdateVariantUseCase(repository);
    const adjustVariantStockUseCase = new AdjustVariantStockUseCase(repository);
    const toggleProductStatusUseCase = new ToggleProductStatusUseCase(
        repository
    );

    // 1. Create Category & Prevent Duplicate Category Name
    const category = await createCategoryUseCase.execute({
        name: "Smartphones & Tablets",
        description: "Flagship 5G smartphones and tablets",
    });
    assert.ok(category.id);
    assert.equal(category.name, "Smartphones & Tablets");

    let duplicateRejected = false;
    try {
        await createCategoryUseCase.execute({
            name: "smartphones & tablets",
        });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 409) {
            duplicateRejected = true;
        }
    }
    assert.equal(duplicateRejected, true, "Duplicate category must return 409");
    console.log("✅ [1/6] Category creation and uniqueness validated.");

    // 2. Create Product with Multiple Variants & Initial Kardex Movements
    const createdProduct = await createProductUseCase.execute({
        categoryId: category.id,
        name: "Samsung Galaxy S22 Ultra 8K Camera & Video",
        description: "8K SUPER STEADY VIDEO\nNIGHTOGRAPHY + PORTRAIT MODE",
        mainImageUrl:
            "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c",
        variants: [
            {
                sku: "SGS22U-PK-512",
                attributes: {
                    Color: "Pink Gold",
                    Style: "S22 Ultra",
                    Size: "512GB",
                },
                price: 2899.0,
                stockPhysical: 14,
            },
            {
                sku: "SGS22-BK-256",
                attributes: {
                    Color: "Phantom Black",
                    Style: "S22",
                    Size: "256GB",
                },
                price: 2299.0,
                stockPhysical: 20,
            },
        ],
    });

    assert.equal(createdProduct.variants.length, 2);
    assert.equal(createdProduct.minPrice, 2299.0);
    assert.equal(createdProduct.maxPrice, 2899.0);
    assert.equal(createdProduct.totalStockAvailable, 34);
    assert.equal(mockPool.kardexMovements.length, 2);
    console.log(
        "✅ [2/6] Product created with 2 variants and initial Kardex ENTRADA movements."
    );

    // 3. Public Catalog Listing & Category Product Count
    const categoriesWithCount = await listCategoriesUseCase.execute(true);
    assert.equal(categoriesWithCount[0]?.productCount, 1);

    const catalogResult = await listCatalogProductsUseCase.execute({
        page: 1,
        limit: 12,
        categoryId: category.id,
    });
    assert.equal(catalogResult.data.length, 1);
    assert.equal(catalogResult.data[0]?.variants.length, 2);
    console.log(
        "✅ [3/6] Public catalog listing and category counters verified."
    );

    // 4. Variant Price Update
    const targetVariant = createdProduct.variants[0]!;
    const updatedVariant = await updateVariantUseCase.execute(targetVariant.id, {
        price: 2499.0,
    });
    assert.equal(updatedVariant.price, 2499.0);
    console.log("✅ [4/6] Variant price update verified.");

    // 5. Kardex Stock Adjustment & Negative Stock Prevention
    const afterSalida = await adjustVariantStockUseCase.execute({
        variantId: targetVariant.id,
        movementType: "SALIDA",
        quantity: 5,
        reason: "Despacho por auditoría de almacén",
    });
    assert.equal(afterSalida.stockPhysical, targetVariant.stockPhysical - 5);

    let negativeStockBlocked = false;
    try {
        await adjustVariantStockUseCase.execute({
            variantId: targetVariant.id,
            movementType: "SALIDA",
            quantity: 999,
            reason: "Intento de dejar stock negativo",
        });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 409) {
            negativeStockBlocked = true;
        }
    }
    assert.equal(
        negativeStockBlocked,
        true,
        "Negative physical stock must be blocked with 409 INSUFFICIENT_STOCK"
    );
    console.log(
        "✅ [5/6] Kardex stock adjustment and negative stock prevention verified."
    );

    // 6. Soft Delete Product & Hide from Public Catalog
    await toggleProductStatusUseCase.execute(createdProduct.id, false);
    let inactiveHidden = false;
    try {
        await getCatalogProductUseCase.execute(createdProduct.id);
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) {
            inactiveHidden = true;
        }
    }
    assert.equal(
        inactiveHidden,
        true,
        "Soft-deleted product must return 404 in public catalog"
    );
    console.log(
        "✅ [6/6] Product soft-delete hides product from public storefront."
    );

    console.log(
        "\n🎉 ALL 6 PRODUCTS, VARIANTS & KARDEX TEST CASES PASSED SUCCESSFULLY!"
    );
}

runProductsCatalogKardexTests().catch((err) => {
    console.error("❌ Products/Kardex test suite failed:", err);
    process.exitCode = 1;
});

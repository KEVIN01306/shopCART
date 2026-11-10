import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import BaseController from "@presentation/base.controller.js";
import type { ListCatalogProductsUseCase } from "../application/list-catalog-products.usecase.js";
import type { GetCatalogProductUseCase } from "../application/get-catalog-product.usecase.js";
import type { ListCategoriesUseCase } from "../application/list-categories.usecase.js";
import type { CreateCategoryUseCase } from "../application/create-category.usecase.js";
import type { UpdateCategoryUseCase } from "../application/update-category.usecase.js";
import type { ListAdminProductsUseCase } from "../application/list-admin-products.usecase.js";
import type { GetAdminProductUseCase } from "../application/get-admin-product.usecase.js";
import type { CreateProductUseCase } from "../application/create-product.usecase.js";
import type { UpdateProductUseCase } from "../application/update-product.usecase.js";
import type { ToggleProductStatusUseCase } from "../application/toggle-product-status.usecase.js";
import type { CreateVariantUseCase } from "../application/create-variant.usecase.js";
import type { UpdateVariantUseCase } from "../application/update-variant.usecase.js";
import type { AdjustVariantStockUseCase } from "../application/adjust-variant-stock.usecase.js";
import type { ListKardexMovementsUseCase } from "../application/list-kardex-movements.usecase.js";
import type {
    CatalogFilterOptions,
    KardexMovementType,
} from "../domain/product.entity.js";

const VALID_SORT_BY = new Set([
    "latest",
    "price_asc",
    "price_desc",
    "name_asc",
]);

const VALID_MOVEMENT_TYPES = new Set([
    "ENTRADA",
    "SALIDA",
    "AJUSTE",
    "DEVOLUCION",
]);

export class ProductsController extends BaseController {
    constructor(
        private readonly listCatalogProductsUseCase: ListCatalogProductsUseCase,
        private readonly getCatalogProductUseCase: GetCatalogProductUseCase,
        private readonly listCategoriesUseCase: ListCategoriesUseCase,
        private readonly createCategoryUseCase: CreateCategoryUseCase,
        private readonly updateCategoryUseCase: UpdateCategoryUseCase,
        private readonly listAdminProductsUseCase: ListAdminProductsUseCase,
        private readonly getAdminProductUseCase: GetAdminProductUseCase,
        private readonly createProductUseCase: CreateProductUseCase,
        private readonly updateProductUseCase: UpdateProductUseCase,
        private readonly toggleProductStatusUseCase: ToggleProductStatusUseCase,
        private readonly createVariantUseCase: CreateVariantUseCase,
        private readonly updateVariantUseCase: UpdateVariantUseCase,
        private readonly adjustVariantStockUseCase: AdjustVariantStockUseCase,
        private readonly listKardexMovementsUseCase?: ListKardexMovementsUseCase
    ) {
        super();
    }

    // =========================================================================
    // ENDPOINTS PÚBLICOS DE CATÁLOGO (SHOP)
    // =========================================================================

    listCatalog = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 12)
                : 12;
            const q = req.query.q ? String(req.query.q).trim() : undefined;
            const categoryId = req.query.categoryId
                ? String(req.query.categoryId).trim()
                : undefined;

            const minPriceRaw = req.query.minPrice
                ? Number(req.query.minPrice)
                : undefined;
            const maxPriceRaw = req.query.maxPrice
                ? Number(req.query.maxPrice)
                : undefined;

            const minPrice =
                minPriceRaw !== undefined && !Number.isNaN(minPriceRaw)
                    ? minPriceRaw
                    : undefined;
            const maxPrice =
                maxPriceRaw !== undefined && !Number.isNaN(maxPriceRaw)
                    ? maxPriceRaw
                    : undefined;

            const sortByParam = req.query.sortBy
                ? String(req.query.sortBy)
                : "latest";
            const sortBy = (
                VALID_SORT_BY.has(sortByParam) ? sortByParam : "latest"
            ) as CatalogFilterOptions["sortBy"];

            const inStockRaw = req.query.inStock;
            const inStock =
                inStockRaw === "true" || inStockRaw === "1"
                    ? true
                    : inStockRaw === "false" || inStockRaw === "0"
                      ? false
                      : undefined;

            const offset = (page - 1) * limit;
            const result = await this.listCatalogProductsUseCase.execute({
                page,
                limit,
                q,
                categoryId,
                minPrice,
                maxPrice,
                inStock,
                sortBy,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Catálogo obtenido exitosamente",
                        result.data,
                        result.total,
                        limit,
                        offset
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    listPublicCategories = async (
        _req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const categories = await this.listCategoriesUseCase.execute(true);
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Categorías del catálogo obtenidas exitosamente",
                        categories
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    getCatalogProductById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = req.params.id as string;
            const product = await this.getCatalogProductUseCase.execute(id);
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Detalle del producto obtenido exitosamente",
                        product
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    // =========================================================================
    // ENDPOINTS ADMINISTRATIVOS (ADMINISTRADOR / OPERADOR)
    // =========================================================================

    listAllCategories = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const onlyActive = req.query.onlyActive === "true";
            const categories = await this.listCategoriesUseCase.execute(
                onlyActive
            );
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Categorías obtenidas exitosamente",
                        categories
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    createCategory = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const category = await this.createCategoryUseCase.execute(req.body);
            return res
                .status(201)
                .json(
                    ResponseHttp.success(
                        "Categoría creada exitosamente",
                        category
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    updateCategory = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = req.params.id as string;
            const category = await this.updateCategoryUseCase.execute(
                id,
                req.body
            );
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Categoría actualizada exitosamente",
                        category
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    listAdminProducts = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 10)
                : 10;
            const q = req.query.q ? String(req.query.q).trim() : undefined;
            const categoryId = req.query.categoryId
                ? String(req.query.categoryId).trim()
                : undefined;

            const offset = (page - 1) * limit;
            const result = await this.listAdminProductsUseCase.execute({
                page,
                limit,
                q,
                categoryId,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Productos obtenidos exitosamente",
                        result.data,
                        result.total,
                        limit,
                        offset
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    getAdminProductById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = req.params.id as string;
            const product = await this.getAdminProductUseCase.execute(id);
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Producto obtenido exitosamente",
                        product
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    createProduct = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const auditContext = this.getAuditContext(req, res);
            const product = await this.createProductUseCase.execute({
                ...req.body,
                userId: auditContext.userId,
            });
            return res
                .status(201)
                .json(
                    ResponseHttp.success(
                        "Producto creado exitosamente",
                        product
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    updateProduct = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = req.params.id as string;
            const auditContext = this.getAuditContext(req, res);
            const product = await this.updateProductUseCase.execute(id, {
                ...req.body,
                userId: auditContext.userId,
            });
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Producto actualizado exitosamente",
                        product
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    toggleProductStatus = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const id = req.params.id as string;
            const { isActive } = req.body as { isActive: boolean };
            const auditContext = this.getAuditContext(req, res);
            const product = await this.toggleProductStatusUseCase.execute(
                id,
                isActive,
                auditContext.userId
            );
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        isActive
                            ? "Producto activado exitosamente"
                            : "Producto desactivado exitosamente",
                        product
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    createVariant = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const productId = req.params.id as string;
            const auditContext = this.getAuditContext(req, res);
            const variant = await this.createVariantUseCase.execute(productId, {
                ...req.body,
                userId: auditContext.userId,
            });
            return res
                .status(201)
                .json(
                    ResponseHttp.success(
                        "Variante creada exitosamente",
                        variant
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    updateVariant = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const variantId = req.params.variantId as string;
            const auditContext = this.getAuditContext(req, res);
            const variant = await this.updateVariantUseCase.execute(variantId, {
                ...req.body,
                userId: auditContext.userId,
            });
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Variante actualizada exitosamente",
                        variant
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    adjustVariantStock = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const variantId = req.params.variantId as string;
            const auditContext = this.getAuditContext(req, res);
            const variant = await this.adjustVariantStockUseCase.execute({
                variantId,
                movementType: req.body.movementType,
                quantity: req.body.quantity,
                reason: req.body.reason,
                userId: auditContext.userId,
            });
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Stock de variante ajustado y registrado en Kardex exitosamente",
                        variant
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    listKardexMovements = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!this.listKardexMovementsUseCase) {
                return res
                    .status(200)
                    .json(
                        ResponseHttp.pagination(
                            "Historial de movimientos en Kardex obtenido exitosamente",
                            [],
                            0,
                            15,
                            0
                        )
                    );
            }

            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 15)
                : 15;
            const productId = req.query.productId
                ? String(req.query.productId).trim()
                : undefined;
            const variantId = req.query.variantId
                ? String(req.query.variantId).trim()
                : undefined;
            const movementTypeRaw = req.query.movementType
                ? String(req.query.movementType).trim().toUpperCase()
                : undefined;
            const movementType =
                movementTypeRaw && VALID_MOVEMENT_TYPES.has(movementTypeRaw)
                    ? (movementTypeRaw as KardexMovementType)
                    : undefined;

            const offset = (page - 1) * limit;
            const result = await this.listKardexMovementsUseCase.execute({
                page,
                limit,
                productId,
                variantId,
                movementType,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Historial de movimientos en Kardex obtenido exitosamente",
                        result.data,
                        result.total,
                        limit,
                        offset
                    )
                );
        } catch (error) {
            next(error);
        }
    };
}

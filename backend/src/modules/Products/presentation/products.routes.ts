import { Router } from "express";
import { productsController } from "../products.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import {
    AdjustVariantStockSchema,
    CategoryIdParamSchema,
    CreateCategorySchema,
    CreateProductSchema,
    CreateVariantSchema,
    ProductIdParamSchema,
    ToggleProductStatusSchema,
    UpdateCategorySchema,
    UpdateProductSchema,
    UpdateVariantSchema,
    VariantParamsSchema,
} from "./validators/products.schemas.js";

const router = Router();
const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

// =============================================================================
// RUTAS PÚBLICAS DE CATÁLOGO (Invitado, Cliente, Operador, Administrador)
// =============================================================================

router.get("/catalog", productsController.listCatalog);

router.get("/catalog/categories", productsController.listPublicCategories);

router.get(
    "/catalog/:id",
    validatedMiddleware.validateParams(ProductIdParamSchema),
    productsController.getCatalogProductById
);

// =============================================================================
// RUTAS PROTEGIDAS DE ADMINISTRACIÓN Y OPERACIÓN DE INVENTARIO
// =============================================================================

router.use(authMiddleware.routeProtect);

router.get(
    "/categories",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    productsController.listAllCategories
);

router.post(
    "/categories",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateBody(CreateCategorySchema),
    productsController.createCategory
);

router.put(
    "/categories/:id",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(CategoryIdParamSchema),
    validatedMiddleware.validateBody(UpdateCategorySchema),
    productsController.updateCategory
);

router.get(
    "/",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    productsController.listAdminProducts
);

router.get(
    "/kardex",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    productsController.listKardexMovements
);

router.get(
    "/:id",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(ProductIdParamSchema),
    productsController.getAdminProductById
);

router.post(
    "/",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateBody(CreateProductSchema),
    productsController.createProduct
);

router.put(
    "/:id",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(ProductIdParamSchema),
    validatedMiddleware.validateBody(UpdateProductSchema),
    productsController.updateProduct
);

router.patch(
    "/:id/status",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(ProductIdParamSchema),
    validatedMiddleware.validateBody(ToggleProductStatusSchema),
    productsController.toggleProductStatus
);

router.post(
    "/:id/variants",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(ProductIdParamSchema),
    validatedMiddleware.validateBody(CreateVariantSchema),
    productsController.createVariant
);

router.put(
    "/:id/variants/:variantId",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(VariantParamsSchema),
    validatedMiddleware.validateBody(UpdateVariantSchema),
    productsController.updateVariant
);

router.patch(
    "/:id/variants/:variantId/stock",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(VariantParamsSchema),
    validatedMiddleware.validateBody(AdjustVariantStockSchema),
    productsController.adjustVariantStock
);

export default router;

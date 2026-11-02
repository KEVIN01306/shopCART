import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlProductsRepository } from "./infrastructure/mssql-products.repository.js";
import { ListCatalogProductsUseCase } from "./application/list-catalog-products.usecase.js";
import { GetCatalogProductUseCase } from "./application/get-catalog-product.usecase.js";
import { ListCategoriesUseCase } from "./application/list-categories.usecase.js";
import { CreateCategoryUseCase } from "./application/create-category.usecase.js";
import { UpdateCategoryUseCase } from "./application/update-category.usecase.js";
import { ListAdminProductsUseCase } from "./application/list-admin-products.usecase.js";
import { GetAdminProductUseCase } from "./application/get-admin-product.usecase.js";
import { CreateProductUseCase } from "./application/create-product.usecase.js";
import { UpdateProductUseCase } from "./application/update-product.usecase.js";
import { ToggleProductStatusUseCase } from "./application/toggle-product-status.usecase.js";
import { CreateVariantUseCase } from "./application/create-variant.usecase.js";
import { UpdateVariantUseCase } from "./application/update-variant.usecase.js";
import { AdjustVariantStockUseCase } from "./application/adjust-variant-stock.usecase.js";
import { ProductsController } from "./presentation/products.controller.js";

export const productsRepository = new MssqlProductsRepository(getPool);

export const listCatalogProductsUseCase = new ListCatalogProductsUseCase(
    productsRepository
);
export const getCatalogProductUseCase = new GetCatalogProductUseCase(
    productsRepository
);
export const listCategoriesUseCase = new ListCategoriesUseCase(
    productsRepository
);
export const createCategoryUseCase = new CreateCategoryUseCase(
    productsRepository
);
export const updateCategoryUseCase = new UpdateCategoryUseCase(
    productsRepository
);
export const listAdminProductsUseCase = new ListAdminProductsUseCase(
    productsRepository
);
export const getAdminProductUseCase = new GetAdminProductUseCase(
    productsRepository
);
export const createProductUseCase = new CreateProductUseCase(
    productsRepository
);
export const updateProductUseCase = new UpdateProductUseCase(
    productsRepository
);
export const toggleProductStatusUseCase = new ToggleProductStatusUseCase(
    productsRepository
);
export const createVariantUseCase = new CreateVariantUseCase(
    productsRepository
);
export const updateVariantUseCase = new UpdateVariantUseCase(
    productsRepository
);
export const adjustVariantStockUseCase = new AdjustVariantStockUseCase(
    productsRepository
);

export const productsController = new ProductsController(
    listCatalogProductsUseCase,
    getCatalogProductUseCase,
    listCategoriesUseCase,
    createCategoryUseCase,
    updateCategoryUseCase,
    listAdminProductsUseCase,
    getAdminProductUseCase,
    createProductUseCase,
    updateProductUseCase,
    toggleProductStatusUseCase,
    createVariantUseCase,
    updateVariantUseCase,
    adjustVariantStockUseCase
);

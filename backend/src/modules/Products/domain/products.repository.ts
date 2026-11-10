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
} from "./product.entity.js";

export interface IProductsRepository {
    // Categorías
    listCategories(onlyActive?: boolean): Promise<Category[]>;
    findCategoryById(id: string): Promise<Category | null>;
    createCategory(data: CreateCategory): Promise<Category>;
    updateCategory(id: string, data: UpdateCategory): Promise<Category>;

    // Catálogo Público (Shop)
    listCatalogProducts(
        options: CatalogFilterOptions
    ): Promise<{ data: Product[]; total: number }>;
    findCatalogProductById(id: string): Promise<Product | null>;

    // Panel Administrativo (Products)
    listAdminProducts(
        options: AdminProductsFilterOptions
    ): Promise<{ data: Product[]; total: number }>;
    findAdminProductById(id: string): Promise<Product | null>;
    createProduct(data: CreateProductInput): Promise<Product>;
    updateProduct(id: string, data: UpdateProductInput): Promise<Product>;
    toggleProductStatus(id: string, isActive: boolean, userId?: string | null): Promise<Product>;

    // Variantes y Kardex
    createVariant(productId: string, data: CreateProductVariantInput): Promise<ProductVariant>;
    updateVariant(variantId: string, data: UpdateProductVariantInput): Promise<ProductVariant>;
    adjustVariantStock(data: AdjustVariantStockInput): Promise<ProductVariant>;
    listKardexMovements(
        options: KardexFilterOptions
    ): Promise<{ data: KardexMovement[]; total: number }>;
}

export type VariantAttributes = Record<string, string>;

export type KardexMovementType = "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";

export interface Category {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    productCount: number;
    createdAt: Date;
}

export interface CreateCategory {
    id?: string;
    name: string;
    description?: string | null;
}

export interface UpdateCategory {
    name?: string;
    description?: string | null;
    isActive?: boolean;
}

export interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    attributes: VariantAttributes;
    price: number;
    stockPhysical: number;
    stockReserved: number;
    stockAvailable: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateProductVariantInput {
    id?: string;
    sku: string;
    attributes?: VariantAttributes | null;
    price: number;
    stockPhysical?: number;
    userId?: string | null;
}

export interface UpdateProductVariantInput {
    id?: string;
    sku?: string;
    attributes?: VariantAttributes | null;
    price?: number;
    isActive?: boolean;
    userId?: string | null;
}

export interface AdjustVariantStockInput {
    variantId: string;
    movementType: KardexMovementType;
    quantity: number;
    reason: string;
    userId?: string | null;
}

export interface KardexMovement {
    id: string;
    variantId: string;
    sku: string;
    attributes: VariantAttributes;
    productId: string;
    productName: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    movementType: KardexMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    createdAt: Date;
}

export interface KardexFilterOptions {
    page?: number;
    limit?: number;
    productId?: string;
    variantId?: string;
    movementType?: KardexMovementType;
}

export interface Product {
    id: string;
    categoryId: string;
    categoryName: string;
    name: string;
    description: string | null;
    mainImageUrl: string | null;
    imageUrls: string[];
    isActive: boolean;
    minPrice: number;
    maxPrice: number;
    totalStockPhysical: number;
    totalStockReserved: number;
    totalStockAvailable: number;
    variantsCount: number;
    defaultVariantId?: string | null;
    defaultVariantSku?: string | null;
    defaultVariantAttributes?: VariantAttributes;
    variants: ProductVariant[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProductInput {
    id?: string;
    categoryId: string;
    name: string;
    description?: string | null;
    mainImageUrl?: string | null;
    imageUrls?: string[];
    variants?: CreateProductVariantInput[];
    userId?: string | null;
}

export interface UpdateProductInput {
    categoryId?: string;
    name?: string;
    description?: string | null;
    mainImageUrl?: string | null;
    imageUrls?: string[];
    isActive?: boolean;
    variants?: Array<
        UpdateProductVariantInput & {
            id?: string;
            sku: string;
            price: number;
            stockPhysical?: number;
        }
    >;
    userId?: string | null;
}

export interface CatalogFilterOptions {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: "latest" | "price_asc" | "price_desc" | "name_asc";
}

export interface AdminProductsFilterOptions {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
}

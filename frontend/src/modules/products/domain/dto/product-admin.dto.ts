export interface AdminCategoryDto {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    productCount?: number;
}

export interface AdminProductVariantDto {
    id: string;
    productId: string;
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stockPhysical: number;
    stockReserved: number;
    stockAvailable: number;
    isActive: boolean;
}

export interface AdminProductDto {
    id: string;
    categoryId: string;
    categoryName: string;
    name: string;
    description: string | null;
    mainImageUrl: string | null;
    imageUrls?: string[];
    isActive: boolean;
    minPrice: number;
    maxPrice: number;
    totalStockPhysical?: number;
    totalStockReserved?: number;
    totalStockAvailable: number;
    variantsCount: number;
    variants: AdminProductVariantDto[];
    createdAt?: string;
}

export interface CreateVariantInput {
    id?: string;
    sku: string;
    price: number;
    stockPhysical: number;
    attributes: Record<string, string>;
    isActive?: boolean;
}

export interface CreateProductPayload {
    categoryId: string;
    name: string;
    description?: string | null;
    mainImageUrl?: string | null;
    imageUrls?: string[];
    variants: CreateVariantInput[];
}

export interface UpdateProductPayload {
    categoryId?: string;
    name?: string;
    description?: string | null;
    mainImageUrl?: string | null;
    imageUrls?: string[];
    isActive?: boolean;
    variants?: CreateVariantInput[];
}

export type StockMovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';

export interface AdjustStockPayload {
    movementType: StockMovementType;
    quantity: number;
    reason: string;
}

export interface CreateCategoryPayload {
    name: string;
    description?: string | null;
}

export interface UpdateCategoryPayload {
    name?: string;
    description?: string | null;
    isActive?: boolean;
}

export interface KardexMovementDto {
    id: string;
    variantId: string;
    sku: string;
    attributes: Record<string, string>;
    productId: string;
    productName: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    movementType: StockMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    createdAt: string;
}

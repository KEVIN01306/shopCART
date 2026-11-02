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
    isActive: boolean;
    minPrice: number;
    maxPrice: number;
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
    variants: CreateVariantInput[];
}

export interface UpdateProductPayload {
    categoryId?: string;
    name?: string;
    description?: string | null;
    mainImageUrl?: string | null;
    isActive?: boolean;
    variants?: CreateVariantInput[];
}

export type StockMovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface AdjustStockPayload {
    movementType: StockMovementType;
    quantity: number;
    reason: string;
}

export interface CreateCategoryPayload {
    name: string;
    description?: string | null;
}

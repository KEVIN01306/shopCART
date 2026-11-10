export interface ShopCategory {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    productCount: number;
}

export interface ProductVariantDto {
    id: string;
    productId: string;
    sku: string;
    attributes: Record<string, string>; // ej: { Color: "Pink Gold", Style: "S22", Size: "512GB" }
    price: number;
    stockPhysical: number;
    stockReserved: number;
    stockAvailable: number;
    isActive: boolean;
}

export interface ShopProduct {
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
    variants: ProductVariantDto[];
    createdAt?: string;
}

export type CatalogSortBy = 'latest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface CatalogQueryParams {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: CatalogSortBy;
}

export interface PaginatedShopCatalog {
    data: ShopProduct[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

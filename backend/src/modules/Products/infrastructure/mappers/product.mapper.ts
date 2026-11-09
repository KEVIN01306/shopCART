import type {
    Category,
    Product,
    ProductVariant,
    VariantAttributes,
} from "../../domain/product.entity.js";

export interface CategoryDbRow {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | number;
    created_at: Date;
    product_count?: number;
    // Dual compatibility with PascalCase schema (Categories)
    IDCategory?: string;
    Name?: string;
    Description?: string | null;
    IsActive?: boolean | number;
    CreatedAt?: Date;
}

export interface ProductVariantDbRow {
    id: string;
    product_id: string;
    sku: string;
    attributes: string | null;
    price: number | string;
    stock_physical: number;
    stock_reserved: number;
    stock_available?: number;
    is_active: boolean | number;
    created_at?: Date;
    updated_at?: Date;
    // Dual compatibility with PascalCase schema (ProductVariants)
    IDVariant?: string;
    IDProduct?: string;
    SKU?: string;
    Attributes?: string | null;
    Price?: number | string;
    StockPhysical?: number;
    StockReserved?: number;
    IsActive?: boolean | number;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface ProductDbRow {
    id: string;
    category_id: string;
    category_name: string;
    name: string;
    description: string | null;
    main_image_url: string | null;
    is_active: boolean | number;
    created_at: Date;
    updated_at: Date;
    min_price?: number | string | null;
    max_price?: number | string | null;
    total_stock_physical?: number | null;
    total_stock_reserved?: number | null;
    total_stock_available?: number | null;
    variants_count?: number | null;
    default_variant_id?: string | null;
    default_variant_sku?: string | null;
    default_variant_attributes?: string | null;
    total_count?: number | null;
    // Dual compatibility with PascalCase schema (Products & ProductImages)
    IDProduct?: string;
    IDCategory?: string;
    Name?: string;
    Description?: string | null;
    ImageURL?: string | null;
    IsActive?: boolean | number;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export class ProductMapper {
    static parseAttributes(raw: string | null | undefined): VariantAttributes {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const normalized: VariantAttributes = {};
                for (const [key, value] of Object.entries(parsed)) {
                    if (value !== undefined && value !== null) {
                        normalized[key] = String(value);
                    }
                }
                return normalized;
            }
            return {};
        } catch {
            return {};
        }
    }

    static serializeAttributes(
        attrs: VariantAttributes | null | undefined
    ): string | null {
        if (!attrs || Object.keys(attrs).length === 0) {
            return null;
        }
        return JSON.stringify(attrs);
    }

    static toCategory(row: CategoryDbRow): Category {
        return {
            id: row.id ?? row.IDCategory ?? '',
            name: row.name ?? row.Name ?? '',
            description: row.description ?? row.Description ?? null,
            isActive: Boolean(row.is_active ?? row.IsActive),
            productCount: Number(row.product_count ?? 0),
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
        };
    }

    static toVariant(row: ProductVariantDbRow): ProductVariant {
        const stockPhysical = Number(row.stock_physical ?? row.StockPhysical ?? 0);
        const stockReserved = Number(row.stock_reserved ?? row.StockReserved ?? 0);
        const stockAvailable =
            row.stock_available !== undefined
                ? Number(row.stock_available)
                : stockPhysical - stockReserved;

        const createdRaw = row.created_at ?? row.CreatedAt;
        const updatedRaw = row.updated_at ?? row.UpdatedAt;

        return {
            id: row.id ?? row.IDVariant ?? '',
            productId: row.product_id ?? row.IDProduct ?? '',
            sku: row.sku ?? row.SKU ?? '',
            attributes: ProductMapper.parseAttributes(row.attributes ?? row.Attributes),
            price: Number(row.price ?? row.Price ?? 0),
            stockPhysical,
            stockReserved,
            stockAvailable,
            isActive: Boolean(row.is_active ?? row.IsActive),
            createdAt: createdRaw ? new Date(createdRaw) : undefined,
            updatedAt: updatedRaw ? new Date(updatedRaw) : undefined,
        };
    }

    static toProduct(
        row: ProductDbRow,
        variants: ProductVariant[] = []
    ): Product {
        const minPrice =
            row.min_price !== undefined && row.min_price !== null
                ? Number(row.min_price)
                : variants.length > 0
                ? Math.min(...variants.map((v) => v.price))
                : 0;

        const maxPrice =
            row.max_price !== undefined && row.max_price !== null
                ? Number(row.max_price)
                : variants.length > 0
                ? Math.max(...variants.map((v) => v.price))
                : 0;

        const totalStockPhysical =
            row.total_stock_physical !== undefined && row.total_stock_physical !== null
                ? Number(row.total_stock_physical)
                : variants.reduce((acc, v) => acc + v.stockPhysical, 0);

        const totalStockReserved =
            row.total_stock_reserved !== undefined && row.total_stock_reserved !== null
                ? Number(row.total_stock_reserved)
                : variants.reduce((acc, v) => acc + v.stockReserved, 0);

        const totalStockAvailable =
            row.total_stock_available !== undefined && row.total_stock_available !== null
                ? Number(row.total_stock_available)
                : variants.reduce((acc, v) => acc + v.stockAvailable, 0);

        const variantsCount =
            row.variants_count !== undefined && row.variants_count !== null
                ? Number(row.variants_count)
                : variants.length;

        const defaultVariant = variants[0];

        return {
            id: row.id ?? row.IDProduct ?? '',
            categoryId: row.category_id ?? row.IDCategory ?? '',
            categoryName: row.category_name,
            name: row.name ?? row.Name ?? '',
            description: row.description ?? row.Description ?? null,
            mainImageUrl: row.main_image_url ?? row.ImageURL ?? null,
            isActive: Boolean(row.is_active ?? row.IsActive),
            minPrice,
            maxPrice,
            totalStockPhysical,
            totalStockReserved,
            totalStockAvailable,
            variantsCount,
            defaultVariantId:
                row.default_variant_id ?? defaultVariant?.id ?? null,
            defaultVariantSku:
                row.default_variant_sku ?? defaultVariant?.sku ?? null,
            defaultVariantAttributes: row.default_variant_attributes
                ? ProductMapper.parseAttributes(row.default_variant_attributes)
                : defaultVariant?.attributes ?? {},
            variants,
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
            updatedAt: new Date(row.updated_at ?? row.UpdatedAt ?? new Date()),
        };
    }
}

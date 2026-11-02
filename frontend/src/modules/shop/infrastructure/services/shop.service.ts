import { api } from '../../../../core/api/axios.instance';
import type {
    ShopCategory,
    ShopProduct,
    ProductVariantDto,
    CatalogQueryParams,
    PaginatedShopCatalog,
} from '../../domain/dto/shop.dto';

const parseAttributes = (raw: unknown): Record<string, string> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return Object.fromEntries(
                    Object.entries(parsed).map(([k, v]) => [String(k), String(v ?? '')]),
                );
            }
        } catch {
            return {};
        }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
                String(k),
                String(v ?? ''),
            ]),
        );
    }
    return {};
};

export const normalizeVariant = (v: Record<string, unknown>, fallbackProductId = ''): ProductVariantDto => {
    const stockPhysical = Number(v.stockPhysical ?? v.physicalStock ?? v.stock_physical ?? 0);
    const stockReserved = Number(v.stockReserved ?? v.reservedStock ?? v.stock_reserved ?? 0);
    const stockAvailable = Number(
        v.stockAvailable ?? v.availableStock ?? v.stock_available ?? Math.max(0, stockPhysical - stockReserved),
    );

    return {
        id: String(v.id ?? v.variantId ?? ''),
        productId: String(v.productId ?? v.product_id ?? fallbackProductId),
        sku: String(v.sku ?? ''),
        attributes: parseAttributes(v.attributes ?? v.attributesJson ?? v.attributes_json),
        price: Number(v.price ?? 0),
        stockPhysical,
        stockReserved,
        stockAvailable,
        isActive: v.isActive !== undefined ? Boolean(v.isActive) : v.is_active !== undefined ? Boolean(v.is_active) : true,
    };
};

export const normalizeShopProduct = (raw: Record<string, unknown>): ShopProduct => {
    const id = String(raw.id ?? raw.productId ?? '');
    const rawVariants = Array.isArray(raw.variants) ? (raw.variants as Record<string, unknown>[]) : [];
    const variants = rawVariants.map((v) => normalizeVariant(v, id));
    const activeVariants = variants.filter((v) => v.isActive);
    const prices = (activeVariants.length > 0 ? activeVariants : variants)
        .map((v) => v.price)
        .filter((p) => p > 0);

    const computedMinPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const computedMaxPrice = prices.length > 0 ? Math.max(...prices) : computedMinPrice;
    const computedStock = (activeVariants.length > 0 ? activeVariants : variants).reduce(
        (acc, v) => acc + v.stockAvailable,
        0,
    );

    return {
        id,
        categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
        categoryName: String(raw.categoryName ?? raw.category_name ?? 'Tecnología'),
        name: String(raw.name ?? ''),
        description: raw.description != null ? String(raw.description) : null,
        mainImageUrl:
            raw.mainImageUrl != null
                ? String(raw.mainImageUrl)
                : raw.main_image_url != null
                ? String(raw.main_image_url)
                : null,
        isActive:
            raw.isActive !== undefined
                ? Boolean(raw.isActive)
                : raw.is_active !== undefined
                ? Boolean(raw.is_active)
                : true,
        minPrice: Number(raw.minPrice ?? raw.min_price ?? computedMinPrice),
        maxPrice: Number(raw.maxPrice ?? raw.max_price ?? computedMaxPrice),
        totalStockAvailable: Number(
            raw.totalStockAvailable ?? raw.total_stock_available ?? computedStock,
        ),
        variantsCount: Number(raw.variantsCount ?? raw.variants_count ?? (variants.length || 1)),
        variants,
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    };
};

export const getCatalogCategories = async (): Promise<ShopCategory[]> => {
    const response = await api.get('/products/catalog/categories');
    const payload = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
    return list.map((c: Record<string, unknown>) => ({
        id: String(c.id ?? c.categoryId ?? ''),
        name: String(c.name ?? ''),
        description: c.description != null ? String(c.description) : null,
        isActive: c.isActive !== undefined ? Boolean(c.isActive) : true,
        productCount: Number(c.productCount ?? c.product_count ?? c.totalProducts ?? 0),
    }));
};

export const getCatalogProducts = async (
    params: CatalogQueryParams = {},
): Promise<PaginatedShopCatalog> => {
    const queryParams: Record<string, string | number> = {};
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.q && params.q.trim()) queryParams.q = params.q.trim();
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.minPrice !== undefined && params.minPrice > 0) queryParams.minPrice = params.minPrice;
    if (params.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;
    if (params.sortBy) queryParams.sortBy = params.sortBy;

    const response = await api.get('/products/catalog', { params: queryParams });
    const root = response.data;

    let rawList: Record<string, unknown>[] = [];
    let meta = {
        total: 0,
        limit: params.limit ?? 16,
        offset: ((params.page ?? 1) - 1) * (params.limit ?? 16),
    };

    if (Array.isArray(root?.data)) {
        rawList = root.data;
        if (root.meta) {
            meta = {
                total: Number(root.meta.total ?? rawList.length),
                limit: Number(root.meta.limit ?? meta.limit),
                offset: Number(root.meta.offset ?? meta.offset),
            };
        } else {
            meta.total = Number(root.total ?? rawList.length);
        }
    } else if (Array.isArray(root?.data?.data)) {
        rawList = root.data.data;
        const m = root.data.meta ?? root.meta;
        meta = {
            total: Number(m?.total ?? root.data.total ?? rawList.length),
            limit: Number(m?.limit ?? meta.limit),
            offset: Number(m?.offset ?? meta.offset),
        };
    } else if (Array.isArray(root?.data?.items)) {
        rawList = root.data.items;
        meta.total = Number(root.data.total ?? root.meta?.total ?? rawList.length);
    } else if (Array.isArray(root)) {
        rawList = root;
        meta.total = rawList.length;
    }

    return {
        data: rawList.map(normalizeShopProduct),
        meta,
    };
};

export const getCatalogProductById = async (id: string): Promise<ShopProduct> => {
    const response = await api.get(`/products/catalog/${id}`);
    const raw = response.data?.data ?? response.data;
    return normalizeShopProduct(raw as Record<string, unknown>);
};

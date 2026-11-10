import { api } from '../../../../core/api/axios.instance';
import { normalizeShopProduct } from '../../../shop/infrastructure/services/shop.service';
import type {
    AdminCategoryDto,
    AdminProductDto,
    CreateProductPayload,
    UpdateProductPayload,
    AdjustStockPayload,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    KardexMovementDto,
    StockMovementType,
} from '../../domain/dto/product-admin.dto';

export interface PaginatedAdminProducts {
    data: AdminProductDto[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface PaginatedKardexMovements {
    data: KardexMovementDto[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export const getAdminCategories = async (): Promise<AdminCategoryDto[]> => {
    try {
        const res = await api.get('/products/categories', {
            params: { onlyActive: 'false' },
        });
        const payload = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
        return list.map((c: Record<string, unknown>) => ({
            id: String(c.id ?? c.categoryId ?? ''),
            name: String(c.name ?? ''),
            description: c.description != null ? String(c.description) : null,
            isActive: c.isActive !== undefined ? Boolean(c.isActive) : c.is_active !== undefined ? Boolean(c.is_active) : true,
            productCount: Number(c.productCount ?? c.product_count ?? 0),
        }));
    } catch {
        const res = await api.get('/products/catalog/categories');
        const payload = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(payload) ? payload : [];
        return list.map((c: Record<string, unknown>) => ({
            id: String(c.id ?? c.categoryId ?? ''),
            name: String(c.name ?? ''),
            description: c.description != null ? String(c.description) : null,
            isActive: c.isActive !== undefined ? Boolean(c.isActive) : true,
            productCount: Number(c.productCount ?? c.product_count ?? 0),
        }));
    }
};

export const createAdminCategory = async (
    payload: CreateCategoryPayload,
): Promise<AdminCategoryDto> => {
    const res = await api.post('/products/categories', payload);
    const raw = (res.data?.data ?? res.data ?? {}) as Record<string, unknown>;
    return {
        id: String(raw.id ?? raw.categoryId ?? ''),
        name: String(raw.name ?? payload.name),
        description: raw.description != null ? String(raw.description) : payload.description ?? null,
        isActive: true,
        productCount: 0,
    };
};

export const updateAdminCategory = async (
    id: string,
    payload: UpdateCategoryPayload,
): Promise<AdminCategoryDto> => {
    const res = await api.put(`/products/categories/${id}`, payload);
    const raw = (res.data?.data ?? res.data ?? {}) as Record<string, unknown>;
    return {
        id: String(raw.id ?? raw.categoryId ?? id),
        name: String(raw.name ?? payload.name ?? ''),
        description: raw.description != null ? String(raw.description) : payload.description ?? null,
        isActive:
            raw.isActive !== undefined
                ? Boolean(raw.isActive)
                : payload.isActive !== undefined
                ? Boolean(payload.isActive)
                : true,
        productCount: Number(raw.productCount ?? raw.product_count ?? 0),
    };
};

export const getAdminProducts = async (params: {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
}): Promise<PaginatedAdminProducts> => {
    const query: Record<string, string | number> = {};
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.q && params.q.trim()) query.q = params.q.trim();
    if (params.categoryId) query.categoryId = params.categoryId;

    const res = await api.get('/products', { params: query });
    const root = res.data;

    let rawList: Record<string, unknown>[] = [];
    let meta = {
        total: 0,
        limit: params.limit ?? 10,
        offset: ((params.page ?? 1) - 1) * (params.limit ?? 10),
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

export const getAdminProductById = async (id: string): Promise<AdminProductDto> => {
    const res = await api.get(`/products/${id}`);
    const raw = (res.data?.data ?? res.data) as Record<string, unknown>;
    return normalizeShopProduct(raw);
};

export const createAdminProduct = async (
    payload: CreateProductPayload,
): Promise<AdminProductDto> => {
    const res = await api.post('/products', payload);
    const raw = (res.data?.data ?? res.data) as Record<string, unknown>;
    return normalizeShopProduct(raw);
};

export const updateAdminProduct = async (
    id: string,
    payload: UpdateProductPayload,
): Promise<AdminProductDto> => {
    const res = await api.put(`/products/${id}`, payload);
    const raw = (res.data?.data ?? res.data) as Record<string, unknown>;
    return normalizeShopProduct(raw);
};

export const toggleAdminProductStatus = async (
    id: string,
    isActive: boolean,
): Promise<void> => {
    await api.patch(`/products/${id}/status`, { isActive });
};

export const adjustVariantStock = async (
    productId: string,
    variantId: string,
    payload: AdjustStockPayload,
): Promise<void> => {
    await api.patch(`/products/${productId}/variants/${variantId}/stock`, payload);
};

export const getKardexMovements = async (params: {
    page?: number;
    limit?: number;
    productId?: string;
    variantId?: string;
    movementType?: string;
}): Promise<PaginatedKardexMovements> => {
    const query: Record<string, string | number> = {};
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.productId) query.productId = params.productId;
    if (params.variantId) query.variantId = params.variantId;
    if (params.movementType) query.movementType = params.movementType;

    const res = await api.get('/products/kardex', { params: query });
    const root = res.data;

    const rawList: Record<string, unknown>[] = Array.isArray(root?.data)
        ? root.data
        : Array.isArray(root?.data?.data)
        ? root.data.data
        : Array.isArray(root)
        ? root
        : [];

    const m = root?.meta ?? root?.data?.meta ?? {};
    const limit = params.limit ?? 15;
    const total = Number(m.total ?? root?.total ?? rawList.length);
    const offset = Number(m.offset ?? ((params.page ?? 1) - 1) * limit);

    return {
        data: rawList.map((r) => ({
            id: String(r.id ?? ''),
            variantId: String(r.variantId ?? r.variant_id ?? ''),
            sku: String(r.sku ?? ''),
            attributes:
                typeof r.attributes === 'object' && r.attributes !== null && !Array.isArray(r.attributes)
                    ? (r.attributes as Record<string, string>)
                    : {},
            productId: String(r.productId ?? r.product_id ?? ''),
            productName: String(r.productName ?? r.product_name ?? ''),
            userId: r.userId != null ? String(r.userId) : r.user_id != null ? String(r.user_id) : null,
            userName: r.userName != null ? String(r.userName) : r.user_name != null ? String(r.user_name) : null,
            userEmail: r.userEmail != null ? String(r.userEmail) : r.user_email != null ? String(r.user_email) : null,
            movementType: String(r.movementType ?? r.movement_type ?? 'AJUSTE') as StockMovementType,
            quantity: Number(r.quantity ?? 0),
            previousStock: Number(r.previousStock ?? r.previous_stock ?? 0),
            newStock: Number(r.newStock ?? r.new_stock ?? 0),
            reason: String(r.reason ?? ''),
            createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
        })),
        meta: { total, limit, offset },
    };
};

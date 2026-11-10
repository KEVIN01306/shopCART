import { api } from '../../../../core/api/axios.instance';
import type {
    CouponDto,
    CreateCouponPayload,
    UpdateCouponPayload,
    ValidateCouponPayload,
    ValidatedCouponDto,
} from '../../domain/coupon.dto';

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
    meta?: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface PaginatedCouponsResponse {
    data: CouponDto[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export const getAdminCoupons = async (params?: {
    page?: number;
    limit?: number;
    q?: string;
}): Promise<PaginatedCouponsResponse> => {
    const response = await api.get<ApiResponse<CouponDto[]>>('/coupons', {
        params,
    });
    const list = response.data.data || [];
    return {
        data: list,
        meta: response.data.meta || {
            total: list.length,
            limit: params?.limit || 20,
            offset: 0,
        },
    };
};

export const createAdminCoupon = async (
    payload: CreateCouponPayload
): Promise<CouponDto> => {
    const response = await api.post<ApiResponse<CouponDto>>('/coupons', payload);
    return response.data.data;
};

export const updateAdminCoupon = async (
    id: string,
    payload: UpdateCouponPayload
): Promise<CouponDto> => {
    const response = await api.put<ApiResponse<CouponDto>>(
        `/coupons/${id}`,
        payload
    );
    return response.data.data;
};

export const toggleAdminCouponStatus = async (
    id: string,
    isActive: boolean
): Promise<CouponDto> => {
    const response = await api.patch<ApiResponse<CouponDto>>(
        `/coupons/${id}/status`,
        { isActive }
    );
    return response.data.data;
};

export const validateCouponCode = async (
    payload: ValidateCouponPayload
): Promise<ValidatedCouponDto> => {
    const headers: Record<string, string> = {};
    if (payload.guestToken) {
        headers['x-guest-token'] = payload.guestToken;
    }
    const response = await api.post<ApiResponse<ValidatedCouponDto>>(
        '/coupons/validate',
        payload,
        { headers }
    );
    return response.data.data;
};

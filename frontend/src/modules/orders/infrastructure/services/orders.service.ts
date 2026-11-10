import { api } from '../../../../core/api/axios.instance';
import type {
    CheckoutReservationDto,
    CreateShippingAddressPayload,
    OrderDetailDto,
    OrderStatus,
    OrderSummaryDto,
    PaginatedOrdersResponse,
    ShippingAddressDto,
} from '../../domain/order.dto';

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

export const getMyAddresses = async (): Promise<ShippingAddressDto[]> => {
    const res = await api.get<ApiResponse<ShippingAddressDto[]>>('/orders/addresses');
    return res.data.data;
};

export const createAddress = async (
    payload: CreateShippingAddressPayload
): Promise<ShippingAddressDto> => {
    const res = await api.post<ApiResponse<ShippingAddressDto>>(
        '/orders/addresses',
        payload
    );
    return res.data.data;
};

export const deleteAddress = async (id: string): Promise<void> => {
    await api.delete(`/orders/addresses/${id}`);
};

export const reserveCheckoutStock = async (): Promise<CheckoutReservationDto> => {
    const res = await api.post<ApiResponse<CheckoutReservationDto>>(
        '/orders/checkout/reserve'
    );
    return res.data.data;
};

export const createCheckoutOrder = async (payload: {
    addressId: string;
    couponCode?: string | null;
    idempotencyKey: string;
}): Promise<OrderDetailDto> => {
    const res = await api.post<ApiResponse<OrderDetailDto>>(
        '/orders/checkout',
        payload,
        {
            headers: {
                'Idempotency-Key': payload.idempotencyKey,
            },
        }
    );
    return res.data.data;
};

export const getMyOrdersPaginated = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
}): Promise<PaginatedOrdersResponse> => {
    const res = await api.get<ApiResponse<OrderSummaryDto[]>>('/orders/my', {
        params,
    });
    return {
        data: res.data.data,
        total: res.data.meta?.total ?? res.data.data.length,
        limit: res.data.meta?.limit ?? (params?.limit || 15),
        offset: res.data.meta?.offset ?? 0,
    };
};

export const getAllOrdersPaginated = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
}): Promise<PaginatedOrdersResponse> => {
    const res = await api.get<ApiResponse<OrderSummaryDto[]>>('/orders', {
        params,
    });
    return {
        data: res.data.data,
        total: res.data.meta?.total ?? res.data.data.length,
        limit: res.data.meta?.limit ?? (params?.limit || 15),
        offset: res.data.meta?.offset ?? 0,
    };
};

export const getOrderById = async (id: string): Promise<OrderDetailDto> => {
    const res = await api.get<ApiResponse<OrderDetailDto>>(`/orders/${id}`);
    return res.data.data;
};

export const advanceOrderStatus = async (
    id: string,
    status: OrderStatus
): Promise<OrderDetailDto> => {
    const res = await api.patch<ApiResponse<OrderDetailDto>>(
        `/orders/${id}/status`,
        { status }
    );
    return res.data.data;
};

export const cancelOrderById = async (
    id: string,
    reason?: string
): Promise<OrderDetailDto> => {
    const res = await api.post<ApiResponse<OrderDetailDto>>(
        `/orders/${id}/cancel`,
        { reason }
    );
    return res.data.data;
};

export const processOrderReturn = async (
    orderId: string,
    payload: {
        orderItemId: string;
        quantity: number;
        reason: string;
    }
): Promise<OrderDetailDto> => {
    const res = await api.post<ApiResponse<OrderDetailDto>>(
        `/orders/${orderId}/returns`,
        payload
    );
    return res.data.data;
};

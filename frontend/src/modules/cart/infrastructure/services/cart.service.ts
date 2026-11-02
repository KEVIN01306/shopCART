import { api } from '../../../../core/api/axios.instance';
import type { CartDto, CartItemDto } from '../../domain/cart.types';

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}

const getGuestHeaders = (guestToken?: string | null) => {
    const headers: Record<string, string> = {};
    if (guestToken) {
        headers['x-guest-token'] = guestToken;
    }
    return headers;
};

export const fetchRemoteCart = async (guestToken?: string | null): Promise<CartDto> => {
    const response = await api.get<ApiResponse<CartDto>>('/cart', {
        headers: getGuestHeaders(guestToken),
    });
    return response.data.data;
};

export const addRemoteCartItem = async (
    variantId: string,
    quantity: number,
    guestToken?: string | null
): Promise<CartItemDto> => {
    const response = await api.post<ApiResponse<CartItemDto>>(
        '/cart/items',
        { variantId, quantity },
        { headers: getGuestHeaders(guestToken) }
    );
    return response.data.data;
};

export const updateRemoteCartItem = async (
    variantId: string,
    quantity: number,
    guestToken?: string | null
): Promise<CartItemDto> => {
    const response = await api.put<ApiResponse<CartItemDto>>(
        `/cart/items/${variantId}`,
        { quantity },
        { headers: getGuestHeaders(guestToken) }
    );
    return response.data.data;
};

export const removeRemoteCartItem = async (
    variantId: string,
    guestToken?: string | null
): Promise<void> => {
    await api.delete(`/cart/items/${variantId}`, {
        headers: getGuestHeaders(guestToken),
    });
};

export const clearRemoteCart = async (guestToken?: string | null): Promise<void> => {
    await api.delete('/cart', {
        headers: getGuestHeaders(guestToken),
    });
};

export const syncGuestCart = async (guestToken: string): Promise<CartDto> => {
    const response = await api.post<ApiResponse<CartDto>>('/cart/sync', { guestToken });
    return response.data.data;
};

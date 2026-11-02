import type { CartBase, CartItem } from "./cart.entity.js";

export interface GetOrCreateCartParams {
    userId?: string | null;
    guestToken?: string | null;
}

export interface CartsRepository {
    getOrCreateCart(params: GetOrCreateCartParams): Promise<CartBase>;
    getCartDetails(cartId: string): Promise<CartItem[]>;
    addItem(cartId: string, variantId: string, quantity: number): Promise<CartItem>;
    updateItemQuantity(cartId: string, variantId: string, quantity: number): Promise<CartItem | null>;
    removeItem(cartId: string, variantId: string): Promise<void>;
    clearCart(cartId: string): Promise<void>;
    syncGuestCart(userId: string, guestToken: string): Promise<CartBase>;
}

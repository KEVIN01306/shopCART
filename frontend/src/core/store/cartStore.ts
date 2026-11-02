import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    fetchRemoteCart,
    addRemoteCartItem,
    updateRemoteCartItem,
    removeRemoteCartItem,
    clearRemoteCart,
    syncGuestCart,
} from '../../modules/cart/infrastructure/services/cart.service';
import type { CartDto, CartItemDto } from '../../modules/cart/domain/cart.types';

export interface CartItem {
    variantId: string;
    productId: string;
    productName: string;
    sku: string;
    attributes: Record<string, string>;
    price: number;
    quantity: number;
    imageUrl: string | null;
    stockAvailable?: number;
}

interface CartState {
    items: CartItem[];
    guestToken: string;
    isLoading: boolean;
    addItem: (item: CartItem) => Promise<void>;
    updateQuantity: (variantId: string, quantity: number) => Promise<void>;
    removeItem: (variantId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    fetchCart: () => Promise<void>;
    syncOnAuth: () => Promise<void>;
}

function generateGuestToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function mapDtoToCartItem(dto: CartItemDto): CartItem {
    const rawAttrs = dto.attributes;
    const stringAttrs: Record<string, string> = {};
    if (rawAttrs && typeof rawAttrs === 'object') {
        for (const [k, v] of Object.entries(rawAttrs)) {
            stringAttrs[k] = String(v);
        }
    }

    return {
        variantId: dto.variantId,
        productId: dto.productId,
        productName: dto.productName,
        sku: dto.sku,
        attributes: stringAttrs,
        price: Number(dto.price),
        quantity: dto.quantity,
        imageUrl: dto.mainImageUrl,
        stockAvailable: dto.availableStock,
    };
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            guestToken: generateGuestToken(),
            isLoading: false,

            addItem: async (item: CartItem) => {
                const currentItems = get().items;
                const existing = currentItems.find((i) => i.variantId === item.variantId);

                // Optimistic local update
                let updatedItems: CartItem[];
                if (existing) {
                    updatedItems = currentItems.map((i) =>
                        i.variantId === item.variantId
                            ? { ...i, quantity: i.quantity + item.quantity }
                            : i
                    );
                } else {
                    updatedItems = [...currentItems, item];
                }
                set({ items: updatedItems });

                // Backend synchronization (best-effort)
                try {
                    const guestToken = get().guestToken;
                    await addRemoteCartItem(item.variantId, item.quantity, guestToken);
                } catch (err) {
                    // Silently keep local state if offline or network error
                    console.warn('[CartStore] Offline / backend sync warning on addItem:', err);
                }
            },

            updateQuantity: async (variantId: string, quantity: number) => {
                if (quantity <= 0) {
                    await get().removeItem(variantId);
                    return;
                }

                const currentItems = get().items;
                const updatedItems = currentItems.map((i) =>
                    i.variantId === variantId ? { ...i, quantity } : i
                );
                set({ items: updatedItems });

                try {
                    const guestToken = get().guestToken;
                    await updateRemoteCartItem(variantId, quantity, guestToken);
                } catch (err) {
                    console.warn('[CartStore] Backend sync warning on updateQuantity:', err);
                }
            },

            removeItem: async (variantId: string) => {
                const currentItems = get().items;
                const updatedItems = currentItems.filter((i) => i.variantId !== variantId);
                set({ items: updatedItems });

                try {
                    const guestToken = get().guestToken;
                    await removeRemoteCartItem(variantId, guestToken);
                } catch (err) {
                    console.warn('[CartStore] Backend sync warning on removeItem:', err);
                }
            },

            clearCart: async () => {
                set({ items: [] });
                try {
                    const guestToken = get().guestToken;
                    await clearRemoteCart(guestToken);
                } catch (err) {
                    console.warn('[CartStore] Backend sync warning on clearCart:', err);
                }
            },

            fetchCart: async () => {
                set({ isLoading: true });
                try {
                    const guestToken = get().guestToken;
                    const cart: CartDto = await fetchRemoteCart(guestToken);
                    if (cart && Array.isArray(cart.items)) {
                        set({ items: cart.items.map(mapDtoToCartItem) });
                    }
                } catch (err) {
                    console.warn('[CartStore] Backend fetchCart warning, using local cache:', err);
                } finally {
                    set({ isLoading: false });
                }
            },

            syncOnAuth: async () => {
                const guestToken = get().guestToken;
                if (!guestToken) return;

                set({ isLoading: true });
                try {
                    const syncedCart: CartDto = await syncGuestCart(guestToken);
                    if (syncedCart && Array.isArray(syncedCart.items)) {
                        set({ items: syncedCart.items.map(mapDtoToCartItem) });
                    }
                    // Reset guestToken to a fresh one for future guest sessions
                    set({ guestToken: generateGuestToken() });
                } catch (err) {
                    console.warn('[CartStore] Cart sync on auth failed, falling back to fetchCart:', err);
                    await get().fetchCart();
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'shopcart-cart-storage',
            partialize: (state) => ({
                items: state.items,
                guestToken: state.guestToken,
            }),
        }
    )
);

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
import type {
    AppliedCouponInfo,
    CartDto,
    CartItemDto,
} from '../../modules/cart/domain/cart.types';

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
    categoryId?: string;
    categoryName?: string;
}

interface CartState {
    items: CartItem[];
    guestToken: string;
    isLoading: boolean;
    appliedCoupon: AppliedCouponInfo | null;
    addItem: (item: CartItem) => Promise<void>;
    updateQuantity: (variantId: string, quantity: number) => Promise<void>;
    removeItem: (variantId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    fetchCart: () => Promise<void>;
    syncOnAuth: () => Promise<void>;
    setAppliedCoupon: (coupon: AppliedCouponInfo | null) => void;
    removeCoupon: () => void;
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
        categoryId: dto.categoryId,
        categoryName: dto.categoryName,
    };
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            guestToken: generateGuestToken(),
            isLoading: false,
            appliedCoupon: null,

            setAppliedCoupon: (coupon: AppliedCouponInfo | null) => {
                set({ appliedCoupon: coupon });
            },

            removeCoupon: () => {
                set({ appliedCoupon: null });
            },

            addItem: async (item: CartItem) => {
                const currentItems = get().items;
                const existing = currentItems.find((i) => i.variantId === item.variantId);
                const maxStock = item.stockAvailable ?? existing?.stockAvailable;

                // Enforce available stock cap locally
                const desiredQty = (existing?.quantity ?? 0) + item.quantity;
                if (maxStock !== undefined && desiredQty > maxStock) {
                    const allowedIncrement = Math.max(0, maxStock - (existing?.quantity ?? 0));
                    if (allowedIncrement <= 0) {
                        throw new Error(
                            'La cantidad solicitada supera las existencias disponibles en inventario.'
                        );
                    }
                    item = { ...item, quantity: allowedIncrement };
                }

                // Optimistic local update
                let updatedItems: CartItem[];
                if (existing) {
                    updatedItems = currentItems.map((i) =>
                        i.variantId === item.variantId
                            ? {
                                  ...i,
                                  quantity: i.quantity + item.quantity,
                                  stockAvailable: maxStock ?? i.stockAvailable,
                              }
                            : i
                    );
                } else {
                    updatedItems = [...currentItems, item];
                }
                set({ items: updatedItems });

                // Backend synchronization (best-effort)
                try {
                    const guestToken = get().guestToken;
                    const syncedCart = await addRemoteCartItem(
                        item.variantId,
                        item.quantity,
                        guestToken
                    );
                    if (syncedCart && Array.isArray(syncedCart.items)) {
                        set({ items: syncedCart.items.map(mapDtoToCartItem) });
                    }
                } catch (err) {
                    console.warn('[CartStore] Offline / backend sync warning on addItem:', err);
                }
            },

            updateQuantity: async (variantId: string, quantity: number) => {
                if (quantity <= 0) {
                    await get().removeItem(variantId);
                    return;
                }

                const currentItems = get().items;
                const target = currentItems.find((i) => i.variantId === variantId);
                if (
                    target?.stockAvailable !== undefined &&
                    quantity > target.stockAvailable
                ) {
                    quantity = target.stockAvailable;
                }

                const updatedItems = currentItems.map((i) =>
                    i.variantId === variantId ? { ...i, quantity } : i
                );
                set({ items: updatedItems });

                try {
                    const guestToken = get().guestToken;
                    const syncedCart = await updateRemoteCartItem(
                        variantId,
                        quantity,
                        guestToken
                    );
                    if (syncedCart && Array.isArray(syncedCart.items)) {
                        set({ items: syncedCart.items.map(mapDtoToCartItem) });
                    }
                } catch (err) {
                    console.warn('[CartStore] Backend sync warning on updateQuantity:', err);
                }
            },

            removeItem: async (variantId: string) => {
                const currentItems = get().items;
                const updatedItems = currentItems.filter((i) => i.variantId !== variantId);
                set({
                    items: updatedItems,
                    appliedCoupon: updatedItems.length === 0 ? null : get().appliedCoupon,
                });

                try {
                    const guestToken = get().guestToken;
                    await removeRemoteCartItem(variantId, guestToken);
                } catch (err) {
                    console.warn('[CartStore] Backend sync warning on removeItem:', err);
                }
            },

            clearCart: async () => {
                set({ items: [], appliedCoupon: null });
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
                        if (cart.items.length > 0) {
                            set({ items: cart.items.map(mapDtoToCartItem) });
                        } else if (get().items.length > 0) {
                            for (const localItem of get().items) {
                                try {
                                    await addRemoteCartItem(localItem.variantId, localItem.quantity, guestToken);
                                } catch (e) {
                                    console.warn('[CartStore] Re-sync item warning:', e);
                                }
                            }
                            const refreshed = await fetchRemoteCart(guestToken);
                            if (refreshed && Array.isArray(refreshed.items) && refreshed.items.length > 0) {
                                set({ items: refreshed.items.map(mapDtoToCartItem) });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[CartStore] Backend fetchCart warning, using local cache:', err);
                } finally {
                    set({ isLoading: false });
                }
            },

            syncOnAuth: async () => {
                const guestToken = get().guestToken;
                set({ isLoading: true });
                try {
                    if (guestToken) {
                        const syncedCart: CartDto = await syncGuestCart(guestToken);
                        if (syncedCart && Array.isArray(syncedCart.items) && syncedCart.items.length > 0) {
                            set({ items: syncedCart.items.map(mapDtoToCartItem) });
                            set({ guestToken: generateGuestToken() });
                            return;
                        }
                    }
                    await get().fetchCart();
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
                appliedCoupon: state.appliedCoupon,
            }),
        }
    )
);

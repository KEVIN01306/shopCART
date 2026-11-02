export interface CartItem {
    id: string;
    cartId: string;
    variantId: string;
    quantity: number;
    sku: string;
    attributes: Record<string, any> | null;
    price: number;
    stockPhysical: number;
    reservedStock: number;
    availableStock: number;
    productId: string;
    productName: string;
    mainImageUrl: string | null;
    categoryName: string;
    itemTotal: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CartBase {
    id: string;
    userId: string | null;
    guestToken: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Cart extends CartBase {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
}

export function calculateCartTotals(items: CartItem[]): { itemCount: number; subtotal: number } {
    let itemCount = 0;
    let subtotal = 0;

    for (const item of items) {
        itemCount += item.quantity;
        subtotal += Number((item.quantity * item.price).toFixed(2));
    }

    return {
        itemCount,
        subtotal: Number(subtotal.toFixed(2)),
    };
}

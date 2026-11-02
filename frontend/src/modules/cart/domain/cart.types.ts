export interface CartItemDto {
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
}

export interface CartDto {
    id: string;
    userId: string | null;
    guestToken: string | null;
    items: CartItemDto[];
    itemCount: number;
    subtotal: number;
}

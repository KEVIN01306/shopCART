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
    categoryId?: string;
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

export interface AppliedCouponInfo {
    couponId: string;
    code: string;
    discountType: 'PORCENTAJE' | 'MONTO_FIJO';
    discountValue: number;
    minOrderAmount: number;
    categoryId: string | null;
    categoryName: string | null;
    subtotal: number;
    eligibleSubtotal: number;
    discountAmount: number;
    finalTotal: number;
}

export type DiscountType = 'PORCENTAJE' | 'MONTO_FIJO';

export interface CouponDto {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    maxUses: number;
    currentUses: number;
    maxUsesPerClient: number;
    categoryId: string | null;
    categoryName: string | null;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
}

export interface CreateCouponPayload {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    maxUses: number;
    maxUsesPerClient: number;
    categoryId?: string | null;
    startsAt: string;
    expiresAt: string;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {
    clearCategory?: boolean;
    isActive?: boolean;
}

export interface ValidateCouponPayload {
    code: string;
    cartId?: string | null;
    subtotal?: number | null;
    categorySubtotal?: number | null;
    guestToken?: string | null;
}

export interface ValidatedCouponDto {
    couponId: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    categoryId: string | null;
    categoryName: string | null;
    subtotal: number;
    eligibleSubtotal: number;
    discountAmount: number;
    finalTotal: number;
}

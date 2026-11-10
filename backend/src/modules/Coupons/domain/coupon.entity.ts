export type DiscountType = "PORCENTAJE" | "MONTO_FIJO";

export interface Coupon {
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
    startsAt: Date;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
}

export interface CreateCouponInput {
    id?: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount?: number;
    maxUses: number;
    maxUsesPerClient?: number;
    categoryId?: string | null;
    startsAt: Date | string;
    expiresAt: Date | string;
    userId?: string | null;
}

export interface UpdateCouponInput {
    code?: string;
    discountType?: DiscountType;
    discountValue?: number;
    minOrderAmount?: number;
    maxUses?: number;
    maxUsesPerClient?: number;
    categoryId?: string | null;
    clearCategory?: boolean;
    startsAt?: Date | string;
    expiresAt?: Date | string;
    isActive?: boolean;
    userId?: string | null;
}

export interface ValidateCouponInput {
    code: string;
    userId?: string | null;
    guestToken?: string | null;
    cartId?: string | null;
    subtotal?: number | null;
    categorySubtotal?: number | null;
}

export interface ValidatedCouponResult {
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

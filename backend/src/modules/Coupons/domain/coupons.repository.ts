import type {
    Coupon,
    CreateCouponInput,
    UpdateCouponInput,
    ValidatedCouponResult,
} from "./coupon.entity.js";

export interface ListCouponsOptions {
    page?: number;
    limit?: number;
    q?: string;
}

export interface ValidateAndApplyParams {
    code: string;
    userId?: string | null;
    cartId?: string | null;
    subtotal?: number | null;
    categorySubtotal?: number | null;
}

export interface ICouponsRepository {
    listCoupons(options: ListCouponsOptions): Promise<{ data: Coupon[]; total: number }>;
    getCouponById(id: string): Promise<Coupon | null>;
    createCoupon(input: CreateCouponInput & { id: string }): Promise<Coupon>;
    updateCoupon(id: string, input: UpdateCouponInput): Promise<Coupon>;
    toggleCouponStatus(id: string, isActive: boolean, userId?: string | null): Promise<Coupon>;
    validateAndApply(params: ValidateAndApplyParams): Promise<ValidatedCouponResult>;
}

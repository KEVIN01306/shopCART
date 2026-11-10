import type { Coupon, DiscountType, ValidatedCouponResult } from "../../domain/coupon.entity.js";

export interface CouponDbRow {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number | string;
    min_order_amount: number | string;
    max_uses: number;
    current_uses: number;
    max_uses_per_client: number;
    category_id: string | null;
    category_name?: string | null;
    starts_at: Date | string;
    expires_at: Date | string;
    is_active: boolean | number;
    created_at: Date | string;
    total_count?: number;
}

export interface ValidatedCouponDbRow {
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_value: number | string;
    min_order_amount: number | string;
    category_id: string | null;
    category_name: string | null;
    subtotal: number | string;
    eligible_subtotal: number | string;
    discount_amount: number | string;
    final_total: number | string;
}

export class CouponMapper {
    static toDomain(row: CouponDbRow): Coupon {
        return {
            id: row.id,
            code: row.code,
            discountType: (row.discount_type === "MONTO_FIJO" ? "MONTO_FIJO" : "PORCENTAJE") as DiscountType,
            discountValue: Number(Number(row.discount_value).toFixed(2)),
            minOrderAmount: Number(Number(row.min_order_amount ?? 0).toFixed(2)),
            maxUses: Number(row.max_uses),
            currentUses: Number(row.current_uses ?? 0),
            maxUsesPerClient: Number(row.max_uses_per_client ?? 1),
            categoryId: row.category_id ?? null,
            categoryName: row.category_name ?? null,
            startsAt: new Date(row.starts_at),
            expiresAt: new Date(row.expires_at),
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at),
        };
    }

    static toValidatedResult(row: ValidatedCouponDbRow): ValidatedCouponResult {
        return {
            couponId: row.coupon_id,
            code: row.code,
            discountType: (row.discount_type === "MONTO_FIJO" ? "MONTO_FIJO" : "PORCENTAJE") as DiscountType,
            discountValue: Number(Number(row.discount_value).toFixed(2)),
            minOrderAmount: Number(Number(row.min_order_amount ?? 0).toFixed(2)),
            categoryId: row.category_id ?? null,
            categoryName: row.category_name ?? null,
            subtotal: Number(Number(row.subtotal ?? 0).toFixed(2)),
            eligibleSubtotal: Number(Number(row.eligible_subtotal ?? 0).toFixed(2)),
            discountAmount: Number(Number(row.discount_amount ?? 0).toFixed(2)),
            finalTotal: Number(Number(row.final_total ?? 0).toFixed(2)),
        };
    }
}

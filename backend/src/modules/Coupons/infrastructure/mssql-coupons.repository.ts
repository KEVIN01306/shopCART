import { getPool, sql } from "@infrastructure/config/mssql.config.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import type {
    ICouponsRepository,
    ListCouponsOptions,
    ValidateAndApplyParams,
} from "../domain/coupons.repository.js";
import type {
    Coupon,
    CreateCouponInput,
    UpdateCouponInput,
    ValidatedCouponResult,
} from "../domain/coupon.entity.js";
import {
    CouponMapper,
    type CouponDbRow,
    type ValidatedCouponDbRow,
} from "./mappers/coupon.mapper.js";

export class MssqlCouponsRepository implements ICouponsRepository {
    constructor(
        private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool
    ) {}

    async listCoupons(
        options: ListCouponsOptions
    ): Promise<{ data: Coupon[]; total: number }> {
        try {
            const page = options.page ?? 1;
            const limit = options.limit ?? 20;
            const pool = await this.poolProvider();

            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input("p_q", sql.NVarChar(100), options.q ?? null)
                .execute<CouponDbRow>("SP_Cupones_Listar");

            const rows = result.recordset ?? [];
            const total =
                rows.length > 0 ? Number(rows[0]?.total_count ?? rows.length) : 0;

            return {
                data: rows.map((r) => CouponMapper.toDomain(r)),
                total,
            };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async getCouponById(id: string): Promise<Coupon | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .execute<CouponDbRow>("SP_Cupones_ObtenerPorId");

            const row = result.recordset?.[0];
            return row ? CouponMapper.toDomain(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async createCoupon(input: CreateCouponInput & { id: string }): Promise<Coupon> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), input.id)
                .input("p_code", sql.VarChar(50), input.code.trim().toUpperCase())
                .input("p_discount_type", sql.VarChar(20), input.discountType)
                .input("p_discount_value", sql.Decimal(12, 2), input.discountValue)
                .input(
                    "p_min_order_amount",
                    sql.Decimal(12, 2),
                    input.minOrderAmount ?? 0
                )
                .input("p_max_uses", sql.Int, input.maxUses)
                .input("p_max_uses_per_client", sql.Int, input.maxUsesPerClient ?? 1)
                .input("p_category_id", sql.VarChar(36), input.categoryId ?? null)
                .input("p_starts_at", sql.DateTime2, new Date(input.startsAt))
                .input("p_expires_at", sql.DateTime2, new Date(input.expiresAt))
                .input("p_user_id", sql.VarChar(36), input.userId ?? null)
                .execute<CouponDbRow>("SP_Cupones_Crear");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CouponMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateCoupon(id: string, input: UpdateCouponInput): Promise<Coupon> {
        try {
            const pool = await this.poolProvider();
            const clearCategory =
                input.clearCategory === true || input.categoryId === "" ? 1 : 0;
            const categoryId =
                clearCategory === 1 ? null : (input.categoryId ?? null);

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input(
                    "p_code",
                    sql.VarChar(50),
                    input.code ? input.code.trim().toUpperCase() : null
                )
                .input("p_discount_type", sql.VarChar(20), input.discountType ?? null)
                .input(
                    "p_discount_value",
                    sql.Decimal(12, 2),
                    input.discountValue ?? null
                )
                .input(
                    "p_min_order_amount",
                    sql.Decimal(12, 2),
                    input.minOrderAmount ?? null
                )
                .input("p_max_uses", sql.Int, input.maxUses ?? null)
                .input(
                    "p_max_uses_per_client",
                    sql.Int,
                    input.maxUsesPerClient ?? null
                )
                .input("p_category_id", sql.VarChar(36), categoryId)
                .input("p_clear_category", sql.Bit, clearCategory)
                .input(
                    "p_starts_at",
                    sql.DateTime2,
                    input.startsAt ? new Date(input.startsAt) : null
                )
                .input(
                    "p_expires_at",
                    sql.DateTime2,
                    input.expiresAt ? new Date(input.expiresAt) : null
                )
                .input(
                    "p_is_active",
                    sql.Bit,
                    input.isActive !== undefined ? (input.isActive ? 1 : 0) : null
                )
                .input("p_user_id", sql.VarChar(36), input.userId ?? null)
                .execute<CouponDbRow>("SP_Cupones_Actualizar");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CouponMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async toggleCouponStatus(
        id: string,
        isActive: boolean,
        userId?: string | null
    ): Promise<Coupon> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_is_active", sql.Bit, isActive ? 1 : 0)
                .input("p_user_id", sql.VarChar(36), userId ?? null)
                .execute<CouponDbRow>("SP_Cupones_CambiarEstadoActivo");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CouponMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async validateAndApply(
        params: ValidateAndApplyParams
    ): Promise<ValidatedCouponResult> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_code", sql.VarChar(50), params.code.trim().toUpperCase())
                .input("p_user_id", sql.VarChar(36), params.userId ?? null)
                .input("p_cart_id", sql.VarChar(36), params.cartId ?? null)
                .input(
                    "p_subtotal",
                    sql.Decimal(12, 2),
                    params.subtotal !== undefined && params.subtotal !== null
                        ? params.subtotal
                        : null
                )
                .input(
                    "p_category_subtotal",
                    sql.Decimal(12, 2),
                    params.categorySubtotal !== undefined &&
                        params.categorySubtotal !== null
                        ? params.categorySubtotal
                        : null
                )
                .execute<ValidatedCouponDbRow>("SP_Cupones_ValidarYAplicar");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CouponMapper.toValidatedResult(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}

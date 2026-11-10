import AppError from "@shared/errors/AppError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { Coupon, UpdateCouponInput } from "../domain/coupon.entity.js";
import type { ICouponsRepository } from "../domain/coupons.repository.js";

export class UpdateCouponUseCase {
    constructor(private readonly couponsRepository: ICouponsRepository) {}

    async execute(id: string, input: UpdateCouponInput): Promise<Coupon> {
        try {
            return await this.couponsRepository.updateCoupon(id, input);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe otro cupón con ese código.",
                    "COUPON_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El cupón o la categoría especificada no existe.",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof DatabaseError) {
                if (error.message.includes("DATOS_INVALIDOS")) {
                    const cleanMsg = error.message
                        .replace(/^DATOS_INVALIDOS:\s*/i, "")
                        .trim();
                    throw new AppError(cleanMsg, "INVALID_DATA", 400);
                }
                throw new AppError(
                    "Error al actualizar el cupón",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

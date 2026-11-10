import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { Coupon } from "../domain/coupon.entity.js";
import type { ICouponsRepository } from "../domain/coupons.repository.js";

export class ToggleCouponStatusUseCase {
    constructor(private readonly couponsRepository: ICouponsRepository) {}

    async execute(
        id: string,
        isActive: boolean,
        userId?: string | null
    ): Promise<Coupon> {
        try {
            return await this.couponsRepository.toggleCouponStatus(
                id,
                isActive,
                userId
            );
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El cupón no existe.",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al cambiar el estado del cupón",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

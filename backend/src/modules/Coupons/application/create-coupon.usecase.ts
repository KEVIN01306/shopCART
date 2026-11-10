import crypto from "node:crypto";
import AppError from "@shared/errors/AppError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { Coupon, CreateCouponInput } from "../domain/coupon.entity.js";
import type { ICouponsRepository } from "../domain/coupons.repository.js";

export class CreateCouponUseCase {
    constructor(private readonly couponsRepository: ICouponsRepository) {}

    async execute(input: CreateCouponInput): Promise<Coupon> {
        try {
            const id = input.id || crypto.randomUUID();
            return await this.couponsRepository.createCoupon({
                ...input,
                id,
            });
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe un cupón registrado con ese código.",
                    "COUPON_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La categoría especificada no existe.",
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
                    "Error al crear el cupón",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

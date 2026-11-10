import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type {
    ValidateCouponInput,
    ValidatedCouponResult,
} from "../domain/coupon.entity.js";
import type { ICouponsRepository } from "../domain/coupons.repository.js";
import type { CartsRepository } from "@modules/Carts/domain/carts.repository.js";

export class ValidateCouponUseCase {
    constructor(
        private readonly couponsRepository: ICouponsRepository,
        private readonly cartsRepository?: CartsRepository
    ) {}

    async execute(input: ValidateCouponInput): Promise<ValidatedCouponResult> {
        const cleanCode = input.code?.trim().toUpperCase();
        if (!cleanCode) {
            throw new AppError(
                "Ingresa un código de cupón válido.",
                "INVALID_COUPON",
                400
            );
        }

        let resolvedCartId = input.cartId ?? null;
        if (
            !resolvedCartId &&
            this.cartsRepository &&
            (input.userId || input.guestToken)
        ) {
            try {
                const cartBase = await this.cartsRepository.getOrCreateCart({
                    userId: input.userId,
                    guestToken: input.guestToken,
                });
                resolvedCartId = cartBase.id;
            } catch {
                resolvedCartId = null;
            }
        }

        try {
            return await this.couponsRepository.validateAndApply({
                code: cleanCode,
                userId: input.userId ?? null,
                cartId: resolvedCartId,
                subtotal: input.subtotal ?? null,
                categorySubtotal: input.categorySubtotal ?? null,
            });
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El cupón ingresado no existe o se encuentra inactivo.",
                    "COUPON_NOT_FOUND",
                    404
                );
            }
            if (error instanceof DatabaseError) {
                if (error.message.includes("DATOS_INVALIDOS")) {
                    const cleanMsg = error.message
                        .replace(/^DATOS_INVALIDOS:\s*/i, "")
                        .trim();
                    throw new AppError(cleanMsg, "INVALID_COUPON", 400);
                }
                throw new AppError(
                    "Error al validar el cupón",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

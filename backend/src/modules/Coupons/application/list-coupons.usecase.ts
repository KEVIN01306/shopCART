import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { Coupon } from "../domain/coupon.entity.js";
import type {
    ICouponsRepository,
    ListCouponsOptions,
} from "../domain/coupons.repository.js";

export class ListCouponsUseCase {
    constructor(private readonly couponsRepository: ICouponsRepository) {}

    async execute(
        options: ListCouponsOptions
    ): Promise<{ data: Coupon[]; total: number }> {
        try {
            return await this.couponsRepository.listCoupons(options);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al obtener los cupones",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

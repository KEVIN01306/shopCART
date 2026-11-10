import AppError from "@shared/errors/AppError.js";
import { InsufficientStockPersistenceError } from "@shared/db/database/errors/InsufficientStockPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { CheckoutReservationResult } from "../domain/order.entity.js";

export class ReserveCheckoutUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(userId: string): Promise<CheckoutReservationResult> {
        try {
            return await this.ordersRepository.reserveCartForCheckout(userId);
        } catch (error) {
            if (error instanceof InsufficientStockPersistenceError) {
                const cleanMsg = error.message
                    .replace(/^STOCK_INSUFICIENTE:\s*/i, "")
                    .trim();
                throw new AppError(
                    cleanMsg ||
                        "Uno o más productos de tu carrito no tienen stock disponible suficiente.",
                    "INSUFFICIENT_STOCK",
                    409
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
                    "Error al reservar existencias para el checkout",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

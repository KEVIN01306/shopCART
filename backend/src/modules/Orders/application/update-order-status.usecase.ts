import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { OrderDetail, OrderStatus } from "../domain/order.entity.js";

export class UpdateOrderStatusUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(
        orderId: string,
        newStatus: OrderStatus,
        userId: string
    ): Promise<OrderDetail> {
        try {
            return await this.ordersRepository.advanceStatus(
                orderId,
                newStatus,
                userId
            );
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El pedido especificado no existe",
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
                    "Error al actualizar el estado del pedido",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

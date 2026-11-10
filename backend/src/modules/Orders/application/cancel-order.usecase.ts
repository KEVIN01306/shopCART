import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { OrderDetail } from "../domain/order.entity.js";

export class CancelOrderUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(
        orderId: string,
        requester: { id: string; roles: string[] },
        reason?: string
    ): Promise<OrderDetail> {
        try {
            const existing = await this.ordersRepository.findById(orderId);
            if (!existing) {
                throw new AppError(
                    "El pedido especificado no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }

            const isStaff =
                requester.roles.includes("Administrador") ||
                requester.roles.includes("Operador");

            if (!isStaff && existing.userId !== requester.id) {
                throw new AppError(
                    "No tienes permiso para cancelar este pedido",
                    "FORBIDDEN",
                    403
                );
            }

            return await this.ordersRepository.cancelOrder(
                orderId,
                requester.id,
                reason
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
                    "Error al cancelar el pedido",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { OrderDetail } from "../domain/order.entity.js";

export class GetOrderUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(
        orderId: string,
        requester: { id: string; roles: string[] }
    ): Promise<OrderDetail> {
        try {
            const order = await this.ordersRepository.findById(orderId);
            if (!order) {
                throw new AppError(
                    "Pedido no encontrado",
                    "DATA_NOT_FOUND",
                    404
                );
            }

            const isStaff =
                requester.roles.includes("Administrador") ||
                requester.roles.includes("Operador");

            if (!isStaff && order.userId !== requester.id) {
                throw new AppError(
                    "No tienes permiso para acceder a este pedido",
                    "FORBIDDEN",
                    403
                );
            }

            return order;
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al obtener el detalle del pedido",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { ListOrdersOptions, OrderSummary } from "../domain/order.entity.js";

export class ListOrdersUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(
        options: ListOrdersOptions
    ): Promise<{ data: OrderSummary[]; total: number }> {
        try {
            return await this.ordersRepository.listOrders(options);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al listar los pedidos",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type {
    OrderDetail,
    ProcessOrderReturnInput,
} from "../domain/order.entity.js";

export class ProcessOrderReturnUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(input: ProcessOrderReturnInput): Promise<OrderDetail> {
        if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
            throw new AppError(
                "La cantidad a devolver debe ser un número entero mayor a 0.",
                "INVALID_DATA",
                400
            );
        }

        const cleanReason = input.reason?.trim();
        if (!cleanReason) {
            throw new AppError(
                "Debes especificar el motivo de la devolución.",
                "INVALID_DATA",
                400
            );
        }

        try {
            return await this.ordersRepository.processReturn({
                ...input,
                reason: cleanReason,
            });
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El pedido o el ítem especificado no existe",
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
                    "Error al procesar la devolución del pedido",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

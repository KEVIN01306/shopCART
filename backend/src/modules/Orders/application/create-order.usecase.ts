import { v4 as uuidv4 } from "uuid";
import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { InsufficientStockPersistenceError } from "@shared/db/database/errors/InsufficientStockPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type { OrderDetail } from "../domain/order.entity.js";

export interface CreateOrderInput {
    userId: string;
    addressId: string;
    couponCode?: string | null;
    idempotencyKey: string;
}

function generateOrderNumber(): string {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${ymd}-${rand}`;
}

export class CreateOrderUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(input: CreateOrderInput): Promise<OrderDetail> {
        const cleanIdempotencyKey = input.idempotencyKey?.trim();
        if (!cleanIdempotencyKey) {
            throw new AppError(
                "Se requiere una clave de idempotencia (idempotencyKey) para procesar el pedido.",
                "INVALID_DATA",
                400
            );
        }

        if (!input.addressId?.trim()) {
            throw new AppError(
                "Debes seleccionar una dirección de entrega válida.",
                "INVALID_DATA",
                400
            );
        }

        try {
            return await this.ordersRepository.createOrderAtomic({
                orderId: uuidv4(),
                orderNumber: generateOrderNumber(),
                userId: input.userId,
                addressId: input.addressId.trim(),
                couponCode: input.couponCode?.trim() || null,
                idempotencyKey: cleanIdempotencyKey,
            });
        } catch (error) {
            if (error instanceof InsufficientStockPersistenceError) {
                const cleanMsg = error.message
                    .replace(/^STOCK_INSUFICIENTE:\s*/i, "")
                    .trim();
                throw new AppError(
                    cleanMsg ||
                        "Stock insuficiente para completar el pedido.",
                    "INSUFFICIENT_STOCK",
                    409
                );
            }
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La dirección de entrega o el cupón indicado no es válido.",
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
                    "Error al procesar el checkout del pedido",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

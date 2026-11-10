import { v4 as uuidv4 } from "uuid";
import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { OrdersRepository } from "../domain/orders.repository.js";
import type {
    CreateShippingAddress,
    ShippingAddress,
} from "../domain/order.entity.js";

export class ListAddressesUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(userId: string): Promise<ShippingAddress[]> {
        try {
            return await this.ordersRepository.listAddressesByUser(userId);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al obtener las direcciones de entrega",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

export class CreateAddressUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(
        data: Omit<CreateShippingAddress, "id">
    ): Promise<ShippingAddress> {
        try {
            return await this.ordersRepository.createAddress({
                ...data,
                id: uuidv4(),
            });
        } catch (error) {
            if (error instanceof DatabaseError) {
                if (error.message.includes("DATOS_INVALIDOS")) {
                    const cleanMsg = error.message
                        .replace(/^DATOS_INVALIDOS:\s*/i, "")
                        .trim();
                    throw new AppError(cleanMsg, "INVALID_DATA", 400);
                }
                throw new AppError(
                    "Error al registrar la dirección de entrega",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

export class DeleteAddressUseCase {
    constructor(private readonly ordersRepository: OrdersRepository) {}

    async execute(addressId: string, userId: string): Promise<void> {
        try {
            await this.ordersRepository.deleteAddress(addressId, userId);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La dirección no existe o no pertenece a tu cuenta",
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
                    "Error al eliminar la dirección",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

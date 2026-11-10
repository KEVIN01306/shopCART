import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type {
    KardexFilterOptions,
    KardexMovement,
} from "../domain/product.entity.js";

export class ListKardexMovementsUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        options: KardexFilterOptions
    ): Promise<{ data: KardexMovement[]; total: number }> {
        try {
            return await this.productsRepository.listKardexMovements(options);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al consultar el historial de movimientos en Kardex",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

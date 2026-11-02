import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Product } from "../domain/product.entity.js";

export class ToggleProductStatusUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        id: string,
        isActive: boolean,
        userId?: string | null
    ): Promise<Product> {
        try {
            return await this.productsRepository.toggleProductStatus(
                id,
                isActive,
                userId
            );
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El producto no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al cambiar el estado del producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

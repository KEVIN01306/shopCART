import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { InsufficientStockPersistenceError } from "@shared/db/database/errors/InsufficientStockPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Product, UpdateProductInput } from "../domain/product.entity.js";

export class UpdateProductUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(id: string, data: UpdateProductInput): Promise<Product> {
        try {
            return await this.productsRepository.updateProduct(id, data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El producto o la categoría indicada no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Uno de los SKUs ya está registrado en otra variante",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof InsufficientStockPersistenceError) {
                throw new AppError(
                    "La existencia física no puede ser negativa ni menor al stock reservado",
                    "INSUFFICIENT_STOCK",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al actualizar el producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

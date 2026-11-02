import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { CreateProductInput, Product } from "../domain/product.entity.js";

export class CreateProductUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(data: CreateProductInput): Promise<Product> {
        try {
            return await this.productsRepository.createProduct(data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La categoría especificada no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Uno de los SKUs indicados ya está registrado en otra variante",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al crear el producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

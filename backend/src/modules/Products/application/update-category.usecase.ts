import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Category, UpdateCategory } from "../domain/product.entity.js";

export class UpdateCategoryUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(id: string, data: UpdateCategory): Promise<Category> {
        try {
            return await this.productsRepository.updateCategory(id, data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La categoría no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe otra categoría con ese nombre",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al actualizar la categoría",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

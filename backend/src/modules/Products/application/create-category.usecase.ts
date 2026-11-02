import AppError from "@shared/errors/AppError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Category, CreateCategory } from "../domain/product.entity.js";

export class CreateCategoryUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(data: CreateCategory): Promise<Category> {
        try {
            return await this.productsRepository.createCategory(data);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe una categoría con ese nombre",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al crear la categoría",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

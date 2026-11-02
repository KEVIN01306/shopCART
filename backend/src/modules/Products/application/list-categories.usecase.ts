import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Category } from "../domain/product.entity.js";

export class ListCategoriesUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(onlyActive = true): Promise<Category[]> {
        try {
            return await this.productsRepository.listCategories(onlyActive);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al obtener las categorías",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

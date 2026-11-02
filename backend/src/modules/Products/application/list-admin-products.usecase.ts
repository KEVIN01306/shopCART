import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { AdminProductsFilterOptions, Product } from "../domain/product.entity.js";

export class ListAdminProductsUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        options: AdminProductsFilterOptions
    ): Promise<{ data: Product[]; total: number }> {
        try {
            return await this.productsRepository.listAdminProducts(options);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al obtener los productos del panel administrativo",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

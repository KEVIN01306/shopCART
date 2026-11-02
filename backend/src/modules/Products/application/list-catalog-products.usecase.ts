import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { CatalogFilterOptions, Product } from "../domain/product.entity.js";

export class ListCatalogProductsUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        options: CatalogFilterOptions
    ): Promise<{ data: Product[]; total: number }> {
        try {
            return await this.productsRepository.listCatalogProducts(options);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al consultar el catálogo de productos",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

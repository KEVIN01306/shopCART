import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Product } from "../domain/product.entity.js";

export class GetCatalogProductUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(id: string): Promise<Product> {
        try {
            const product =
                await this.productsRepository.findCatalogProductById(id);
            if (!product) {
                throw new AppError(
                    "Producto no encontrado o no disponible",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            return product;
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al consultar el detalle del producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

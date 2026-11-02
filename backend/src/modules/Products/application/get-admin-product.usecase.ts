import AppError from "@shared/errors/AppError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type { Product } from "../domain/product.entity.js";

export class GetAdminProductUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(id: string): Promise<Product> {
        try {
            const product = await this.productsRepository.findAdminProductById(
                id
            );
            if (!product) {
                throw new AppError(
                    "El producto solicitado no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            return product;
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al consultar el producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

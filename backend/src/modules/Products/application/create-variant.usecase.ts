import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type {
    CreateProductVariantInput,
    ProductVariant,
} from "../domain/product.entity.js";

export class CreateVariantUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        productId: string,
        data: CreateProductVariantInput
    ): Promise<ProductVariant> {
        try {
            return await this.productsRepository.createVariant(productId, data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El producto padre no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe una variante con ese SKU",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al crear la variante del producto",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

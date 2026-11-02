import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type {
    ProductVariant,
    UpdateProductVariantInput,
} from "../domain/product.entity.js";

export class UpdateVariantUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(
        variantId: string,
        data: UpdateProductVariantInput
    ): Promise<ProductVariant> {
        try {
            return await this.productsRepository.updateVariant(variantId, data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La variante indicada no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    "Ya existe otra variante con ese SKU",
                    "DATA_ALREADY_EXISTS",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al actualizar la variante",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

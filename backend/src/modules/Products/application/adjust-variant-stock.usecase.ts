import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import { InsufficientStockPersistenceError } from "@shared/db/database/errors/InsufficientStockPersistenceError.js";
import { DatabaseError } from "@shared/db/database/errors/DatabaseError.js";
import type { IProductsRepository } from "../domain/products.repository.js";
import type {
    AdjustVariantStockInput,
    ProductVariant,
} from "../domain/product.entity.js";

export class AdjustVariantStockUseCase {
    constructor(private readonly productsRepository: IProductsRepository) {}

    async execute(data: AdjustVariantStockInput): Promise<ProductVariant> {
        try {
            return await this.productsRepository.adjustVariantStock(data);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "La variante indicada no existe",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            if (error instanceof InsufficientStockPersistenceError) {
                throw new AppError(
                    "La existencia física no puede quedar en negativo ni ser menor al stock reservado",
                    "INSUFFICIENT_STOCK",
                    409
                );
            }
            if (error instanceof DatabaseError) {
                throw new AppError(
                    "Error al ajustar el stock en Kardex",
                    "DATABASE_ERROR",
                    500
                );
            }
            throw error;
        }
    }
}

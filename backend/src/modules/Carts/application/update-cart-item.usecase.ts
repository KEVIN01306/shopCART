import type { CartsRepository } from "../domain/carts.repository.js";
import type { Cart } from "../domain/cart.entity.js";
import { CartMapper } from "../infrastructure/mappers/cart.mapper.js";
import AppError from "@shared/errors/AppError.js";
import { InsufficientStockPersistenceError } from "@shared/db/database/errors/InsufficientStockPersistenceError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";

export interface UpdateCartItemQuantityDTO {
    userId?: string | null;
    guestToken?: string | null;
    variantId: string;
    quantity: number;
}

export class UpdateCartItemQuantityUseCase {
    constructor(private readonly cartsRepository: CartsRepository) {}

    async execute(dto: UpdateCartItemQuantityDTO): Promise<Cart> {
        if (!dto.userId && !dto.guestToken) {
            throw new AppError(
                "Debe proporcionar usuario autenticado o x-guest-token",
                "MISSING_CART_IDENTIFIER",
                400
            );
        }

        try {
            const cartBase = await this.cartsRepository.getOrCreateCart({
                userId: dto.userId,
                guestToken: dto.guestToken,
            });

            await this.cartsRepository.updateItemQuantity(cartBase.id, dto.variantId, dto.quantity);
            const items = await this.cartsRepository.getCartDetails(cartBase.id);

            return CartMapper.toFullCart(cartBase, items);
        } catch (error) {
            if (error instanceof InsufficientStockPersistenceError) {
                throw new AppError(
                    error.message || "La cantidad solicitada supera las existencias disponibles en inventario.",
                    "INSUFFICIENT_STOCK",
                    409
                );
            }
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError(
                    "El item o la variante no existe en el carrito.",
                    "DATA_NOT_FOUND",
                    404
                );
            }
            throw error;
        }
    }
}

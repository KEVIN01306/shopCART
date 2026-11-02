import type { CartsRepository } from "../domain/carts.repository.js";
import type { Cart } from "../domain/cart.entity.js";
import { CartMapper } from "../infrastructure/mappers/cart.mapper.js";
import AppError from "@shared/errors/AppError.js";

export interface RemoveCartItemDTO {
    userId?: string | null;
    guestToken?: string | null;
    variantId: string;
}

export class RemoveCartItemUseCase {
    constructor(private readonly cartsRepository: CartsRepository) {}

    async execute(dto: RemoveCartItemDTO): Promise<Cart> {
        if (!dto.userId && !dto.guestToken) {
            throw new AppError(
                "Debe proporcionar usuario autenticado o x-guest-token",
                "MISSING_CART_IDENTIFIER",
                400
            );
        }

        const cartBase = await this.cartsRepository.getOrCreateCart({
            userId: dto.userId,
            guestToken: dto.guestToken,
        });

        await this.cartsRepository.removeItem(cartBase.id, dto.variantId);
        const items = await this.cartsRepository.getCartDetails(cartBase.id);

        return CartMapper.toFullCart(cartBase, items);
    }
}

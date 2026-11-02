import type { CartsRepository } from "../domain/carts.repository.js";
import type { Cart } from "../domain/cart.entity.js";
import { CartMapper } from "../infrastructure/mappers/cart.mapper.js";
import AppError from "@shared/errors/AppError.js";

export interface AddCartItemDTO {
    userId?: string | null;
    guestToken?: string | null;
    variantId: string;
    quantity: number;
}

export class AddCartItemUseCase {
    constructor(private readonly cartsRepository: CartsRepository) {}

    async execute(dto: AddCartItemDTO): Promise<Cart> {
        if (!dto.userId && !dto.guestToken) {
            throw new AppError(
                "Debe proporcionar usuario autenticado o x-guest-token",
                "MISSING_CART_IDENTIFIER",
                400
            );
        }

        if (dto.quantity <= 0) {
            throw new AppError("La cantidad debe ser mayor a 0", "INVALID_QUANTITY", 400);
        }

        const cartBase = await this.cartsRepository.getOrCreateCart({
            userId: dto.userId,
            guestToken: dto.guestToken,
        });

        await this.cartsRepository.addItem(cartBase.id, dto.variantId, dto.quantity);
        const items = await this.cartsRepository.getCartDetails(cartBase.id);

        return CartMapper.toFullCart(cartBase, items);
    }
}

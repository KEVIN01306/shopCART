import type { CartsRepository } from "../domain/carts.repository.js";
import type { Cart } from "../domain/cart.entity.js";
import { CartMapper } from "../infrastructure/mappers/cart.mapper.js";
import AppError from "@shared/errors/AppError.js";

export interface SyncCartDTO {
    userId: string;
    guestToken: string;
}

export class SyncCartUseCase {
    constructor(private readonly cartsRepository: CartsRepository) {}

    async execute(dto: SyncCartDTO): Promise<Cart> {
        if (!dto.userId) {
            throw new AppError("Usuario no autenticado", "UNAUTHORIZED", 401);
        }

        if (!dto.guestToken || typeof dto.guestToken !== "string" || !dto.guestToken.trim()) {
            throw new AppError("El token de invitado es obligatorio", "INVALID_GUEST_TOKEN", 400);
        }

        const cartBase = await this.cartsRepository.syncGuestCart(dto.userId, dto.guestToken.trim());
        const items = await this.cartsRepository.getCartDetails(cartBase.id);

        return CartMapper.toFullCart(cartBase, items);
    }
}

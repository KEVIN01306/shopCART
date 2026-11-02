import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlCartsRepository } from "./infrastructure/mssql-carts.repository.js";
import { GetCartUseCase } from "./application/get-cart.usecase.js";
import { AddCartItemUseCase } from "./application/add-cart-item.usecase.js";
import { UpdateCartItemQuantityUseCase } from "./application/update-cart-item.usecase.js";
import { RemoveCartItemUseCase } from "./application/remove-cart-item.usecase.js";
import { ClearCartUseCase } from "./application/clear-cart.usecase.js";
import { SyncCartUseCase } from "./application/sync-cart.usecase.js";
import { CartsController } from "./presentation/carts.controller.js";

export const cartsRepository = new MssqlCartsRepository(getPool);

export const getCartUseCase = new GetCartUseCase(cartsRepository);
export const addCartItemUseCase = new AddCartItemUseCase(cartsRepository);
export const updateCartItemQuantityUseCase = new UpdateCartItemQuantityUseCase(cartsRepository);
export const removeCartItemUseCase = new RemoveCartItemUseCase(cartsRepository);
export const clearCartUseCase = new ClearCartUseCase(cartsRepository);
export const syncCartUseCase = new SyncCartUseCase(cartsRepository);

export const cartsController = new CartsController(
    getCartUseCase,
    addCartItemUseCase,
    updateCartItemQuantityUseCase,
    removeCartItemUseCase,
    clearCartUseCase,
    syncCartUseCase
);

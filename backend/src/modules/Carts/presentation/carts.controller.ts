import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import BaseController from "@presentation/base.controller.js";
import AppError from "@shared/errors/AppError.js";
import type { GetCartUseCase } from "../application/get-cart.usecase.js";
import type { AddCartItemUseCase } from "../application/add-cart-item.usecase.js";
import type { UpdateCartItemQuantityUseCase } from "../application/update-cart-item.usecase.js";
import type { RemoveCartItemUseCase } from "../application/remove-cart-item.usecase.js";
import type { ClearCartUseCase } from "../application/clear-cart.usecase.js";
import type { SyncCartUseCase } from "../application/sync-cart.usecase.js";

export class CartsController extends BaseController {
    constructor(
        private readonly getCartUseCase: GetCartUseCase,
        private readonly addCartItemUseCase: AddCartItemUseCase,
        private readonly updateCartItemQuantityUseCase: UpdateCartItemQuantityUseCase,
        private readonly removeCartItemUseCase: RemoveCartItemUseCase,
        private readonly clearCartUseCase: ClearCartUseCase,
        private readonly syncCartUseCase: SyncCartUseCase
    ) {
        super();
    }

    private resolveCartIdentity(
        req: Request,
        res: Response,
        allowAutoGenerateGuest: boolean = true
    ): { userId: string | null; guestToken: string | null } {
        const userId = res.locals.user?.id || (req as any).user?.id || null;
        let guestToken =
            (req.headers["x-guest-token"] as string | undefined) ||
            (req.headers["X-Guest-Token"] as string | undefined) ||
            null;

        if (guestToken) {
            guestToken = guestToken.trim();
        }

        if (!userId && !guestToken) {
            if (allowAutoGenerateGuest) {
                guestToken = crypto.randomUUID();
            } else {
                throw new AppError(
                    "Debe iniciar sesión o proporcionar el encabezado 'x-guest-token'",
                    "MISSING_CART_IDENTIFIER",
                    400
                );
            }
        }

        return { userId, guestToken };
    }

    getCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, guestToken } = this.resolveCartIdentity(req, res, true);
            const cart = await this.getCartUseCase.execute({ userId, guestToken });
            return res.status(200).json(ResponseHttp.success("Carrito obtenido con éxito", cart));
        } catch (error) {
            next(error);
        }
    };

    addItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, guestToken } = this.resolveCartIdentity(req, res, true);
            const { variantId, quantity } = req.body;

            const cart = await this.addCartItemUseCase.execute({
                userId,
                guestToken,
                variantId,
                quantity: Number(quantity),
            });

            return res.status(200).json(ResponseHttp.success("Item agregado al carrito", cart));
        } catch (error) {
            next(error);
        }
    };

    updateItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, guestToken } = this.resolveCartIdentity(req, res, false);
            const variantId = req.params.variantId as string;
            const { quantity } = req.body;

            const cart = await this.updateCartItemQuantityUseCase.execute({
                userId,
                guestToken,
                variantId,
                quantity: Number(quantity),
            });

            return res.status(200).json(ResponseHttp.success("Cantidad actualizada con éxito", cart));
        } catch (error) {
            next(error);
        }
    };

    removeItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, guestToken } = this.resolveCartIdentity(req, res, false);
            const variantId = req.params.variantId as string;

            const cart = await this.removeCartItemUseCase.execute({
                userId,
                guestToken,
                variantId,
            });

            return res.status(200).json(ResponseHttp.success("Item eliminado del carrito", cart));
        } catch (error) {
            next(error);
        }
    };

    clearCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, guestToken } = this.resolveCartIdentity(req, res, false);

            const cart = await this.clearCartUseCase.execute({
                userId,
                guestToken,
            });

            return res.status(200).json(ResponseHttp.success("Carrito vaciado con éxito", cart));
        } catch (error) {
            next(error);
        }
    };

    syncCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = res.locals.user?.id || (req as any).user?.id;
            if (!userId) {
                throw new AppError("Usuario no autenticado para sincronización", "UNAUTHORIZED", 401);
            }

            const { guestToken } = req.body;

            const cart = await this.syncCartUseCase.execute({
                userId,
                guestToken,
            });

            return res.status(200).json(ResponseHttp.success("Carrito sincronizado con éxito", cart));
        } catch (error) {
            next(error);
        }
    };
}

import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import BaseController from "@presentation/base.controller.js";
import type { ListCouponsUseCase } from "../application/list-coupons.usecase.js";
import type { CreateCouponUseCase } from "../application/create-coupon.usecase.js";
import type { UpdateCouponUseCase } from "../application/update-coupon.usecase.js";
import type { ToggleCouponStatusUseCase } from "../application/toggle-coupon-status.usecase.js";
import type { ValidateCouponUseCase } from "../application/validate-coupon.usecase.js";

export class CouponsController extends BaseController {
    constructor(
        private readonly listCouponsUseCase: ListCouponsUseCase,
        private readonly createCouponUseCase: CreateCouponUseCase,
        private readonly updateCouponUseCase: UpdateCouponUseCase,
        private readonly toggleCouponStatusUseCase: ToggleCouponStatusUseCase,
        private readonly validateCouponUseCase: ValidateCouponUseCase
    ) {
        super();
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 20)
                : 20;
            const q = req.query.q ? String(req.query.q).trim() : undefined;
            const offset = (page - 1) * limit;

            const result = await this.listCouponsUseCase.execute({
                page,
                limit,
                q,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Cupones obtenidos exitosamente",
                        result.data,
                        result.total,
                        limit,
                        offset
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const {
                code,
                discountType,
                discountValue,
                minOrderAmount,
                maxUses,
                maxUsesPerClient,
                categoryId,
                startsAt,
                expiresAt,
            } = req.body;

            const created = await this.createCouponUseCase.execute({
                code,
                discountType,
                discountValue: Number(discountValue),
                minOrderAmount: Number(minOrderAmount ?? 0),
                maxUses: Number(maxUses),
                maxUsesPerClient: Number(maxUsesPerClient ?? 1),
                categoryId: categoryId || null,
                startsAt,
                expiresAt,
                userId: user.id,
            });

            return res
                .status(201)
                .json(
                    ResponseHttp.success("Cupón creado exitosamente", created)
                );
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const body = req.body;

            const updated = await this.updateCouponUseCase.execute(id, {
                code: body.code,
                discountType: body.discountType,
                discountValue:
                    body.discountValue !== undefined
                        ? Number(body.discountValue)
                        : undefined,
                minOrderAmount:
                    body.minOrderAmount !== undefined
                        ? Number(body.minOrderAmount)
                        : undefined,
                maxUses:
                    body.maxUses !== undefined
                        ? Number(body.maxUses)
                        : undefined,
                maxUsesPerClient:
                    body.maxUsesPerClient !== undefined
                        ? Number(body.maxUsesPerClient)
                        : undefined,
                categoryId: body.categoryId ?? null,
                clearCategory:
                    body.clearCategory === true ||
                    body.categoryId === null ||
                    body.categoryId === "",
                startsAt: body.startsAt,
                expiresAt: body.expiresAt,
                isActive: body.isActive,
                userId: user.id,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Cupón actualizado exitosamente",
                        updated
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const { isActive } = req.body;

            const updated = await this.toggleCouponStatusUseCase.execute(
                id,
                Boolean(isActive),
                user.id
            );

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        `Cupón ${isActive ? "activado" : "desactivado"} exitosamente`,
                        updated
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    validate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = res.locals.user?.id || (req as any).user?.id || null;
            const headerGuestToken =
                (req.headers["x-guest-token"] as string | undefined) ||
                (req.headers["X-Guest-Token"] as string | undefined) ||
                null;

            const {
                code,
                cartId,
                subtotal,
                categorySubtotal,
                guestToken,
            } = req.body;

            const result = await this.validateCouponUseCase.execute({
                code,
                userId,
                guestToken: guestToken || headerGuestToken,
                cartId: cartId ?? null,
                subtotal:
                    subtotal !== undefined && subtotal !== null
                        ? Number(subtotal)
                        : null,
                categorySubtotal:
                    categorySubtotal !== undefined && categorySubtotal !== null
                        ? Number(categorySubtotal)
                        : null,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.success("Cupón aplicado con éxito", result)
                );
        } catch (error) {
            next(error);
        }
    };
}

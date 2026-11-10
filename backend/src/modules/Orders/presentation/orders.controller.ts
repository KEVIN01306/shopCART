import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import BaseController from "@presentation/base.controller.js";
import type {
    CreateAddressUseCase,
    DeleteAddressUseCase,
    ListAddressesUseCase,
} from "../application/addresses.usecases.js";
import type { ReserveCheckoutUseCase } from "../application/reserve-checkout.usecase.js";
import type { CreateOrderUseCase } from "../application/create-order.usecase.js";
import type { ListOrdersUseCase } from "../application/list-orders.usecase.js";
import type { GetOrderUseCase } from "../application/get-order.usecase.js";
import type { UpdateOrderStatusUseCase } from "../application/update-order-status.usecase.js";
import type { CancelOrderUseCase } from "../application/cancel-order.usecase.js";
import type { ProcessOrderReturnUseCase } from "../application/process-order-return.usecase.js";
import type { OrderStatus } from "../domain/order.entity.js";

export class OrdersController extends BaseController {
    constructor(
        private readonly listAddressesUseCase: ListAddressesUseCase,
        private readonly createAddressUseCase: CreateAddressUseCase,
        private readonly deleteAddressUseCase: DeleteAddressUseCase,
        private readonly reserveCheckoutUseCase: ReserveCheckoutUseCase,
        private readonly createOrderUseCase: CreateOrderUseCase,
        private readonly listOrdersUseCase: ListOrdersUseCase,
        private readonly getOrderUseCase: GetOrderUseCase,
        private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
        private readonly cancelOrderUseCase: CancelOrderUseCase,
        private readonly processOrderReturnUseCase: ProcessOrderReturnUseCase
    ) {
        super();
    }

    listAddresses = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const addresses = await this.listAddressesUseCase.execute(user.id);
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Direcciones obtenidas exitosamente",
                        addresses
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    createAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const {
                title,
                recipientName,
                phone,
                streetAddress,
                city,
                state,
                postalCode,
                isDefault,
            } = req.body;

            const address = await this.createAddressUseCase.execute({
                userId: user.id,
                title,
                recipientName,
                phone,
                streetAddress,
                city,
                state,
                postalCode: postalCode || null,
                isDefault: Boolean(isDefault),
            });

            return res
                .status(201)
                .json(
                    ResponseHttp.success(
                        "Dirección registrada exitosamente",
                        address
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            await this.deleteAddressUseCase.execute(id, user.id);
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Dirección eliminada exitosamente",
                        null
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    reserveCheckout = async (
        _req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const user = this.obtenerEntorno(res);
            const reservation = await this.reserveCheckoutUseCase.execute(
                user.id
            );
            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Existencias reservadas por 15 minutos",
                        reservation
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    checkout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const headerIdempotencyKey =
                (req.headers["idempotency-key"] as string | undefined) ||
                (req.headers["Idempotency-Key"] as string | undefined) ||
                "";
            const { addressId, couponCode, idempotencyKey } = req.body;

            const order = await this.createOrderUseCase.execute({
                userId: user.id,
                addressId,
                couponCode: couponCode ?? null,
                idempotencyKey: idempotencyKey || headerIdempotencyKey,
            });

            return res
                .status(201)
                .json(
                    ResponseHttp.success(
                        "Pedido procesado y confirmado exitosamente",
                        order
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    listMyOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 15)
                : 15;
            const status = req.query.status
                ? String(req.query.status).trim()
                : undefined;
            const offset = (page - 1) * limit;

            const result = await this.listOrdersUseCase.execute({
                page,
                limit,
                userId: user.id,
                status: status || null,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Mis pedidos obtenidos exitosamente",
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

    listAllOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 15)
                : 15;
            const status = req.query.status
                ? String(req.query.status).trim()
                : undefined;
            const q = req.query.q ? String(req.query.q).trim() : undefined;
            const dateFrom = req.query.dateFrom
                ? String(req.query.dateFrom)
                : undefined;
            const dateTo = req.query.dateTo
                ? String(req.query.dateTo)
                : undefined;
            const offset = (page - 1) * limit;

            const result = await this.listOrdersUseCase.execute({
                page,
                limit,
                status: status || null,
                q: q || null,
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Pedidos obtenidos exitosamente",
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

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const roles = Array.isArray(user.roles)
                ? user.roles
                : user.role
                ? [user.role]
                : ["Cliente"];

            const order = await this.getOrderUseCase.execute(id, {
                id: user.id,
                roles,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Detalle del pedido obtenido exitosamente",
                        order
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    updateStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const { status } = req.body as { status: OrderStatus };

            const updated = await this.updateOrderStatusUseCase.execute(
                id,
                status,
                user.id
            );

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        `Estado del pedido actualizado a ${status}`,
                        updated
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    cancel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const { reason } = req.body;
            const roles = Array.isArray(user.roles)
                ? user.roles
                : user.role
                ? [user.role]
                : ["Cliente"];

            const cancelled = await this.cancelOrderUseCase.execute(
                id,
                { id: user.id, roles },
                reason
            );

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Pedido cancelado y existencias reintegradas al Kardex",
                        cancelled
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    processReturn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const id = req.params.id as string;
            const { orderItemId, quantity, reason } = req.body;

            const updated = await this.processOrderReturnUseCase.execute({
                orderId: id,
                orderItemId,
                quantity: Number(quantity),
                reason,
                userId: user.id,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Devolución procesada y stock reintegrado al Kardex",
                        updated
                    )
                );
        } catch (error) {
            next(error);
        }
    };
}

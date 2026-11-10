import { Router } from "express";
import { ordersController } from "../orders.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import {
    AddressIdParamSchema,
    CancelOrderSchema,
    CheckoutOrderSchema,
    CreateAddressSchema,
    OrderIdParamSchema,
    ProcessOrderReturnSchema,
    UpdateOrderStatusSchema,
} from "./validators/orders.schemas.js";

const router = Router();
const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

router.use(authMiddleware.routeProtect);

// ── Direcciones de Entrega (RF-01 / RF-06) ───────────────────────────────────
router.get("/addresses", ordersController.listAddresses);

router.post(
    "/addresses",
    validatedMiddleware.validateBody(CreateAddressSchema),
    ordersController.createAddress
);

router.delete(
    "/addresses/:id",
    validatedMiddleware.validateParams(AddressIdParamSchema),
    ordersController.deleteAddress
);

// ── Reserva de 15 min y Checkout Atómico con Idempotencia (RF-06) ────────────
router.post("/checkout/reserve", ordersController.reserveCheckout);

router.post(
    "/checkout",
    validatedMiddleware.validateBody(CheckoutOrderSchema),
    ordersController.checkout
);

// ── Consulta de Pedidos Propios del Cliente (RF-07) ──────────────────────────
router.get("/my", ordersController.listMyOrders);

// ── Gestión Operativa / Administrativa de Pedidos (RF-01, RF-07) ─────────────
router.get(
    "/",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    ordersController.listAllOrders
);

router.get(
    "/:id",
    validatedMiddleware.validateParams(OrderIdParamSchema),
    ordersController.getById
);

router.patch(
    "/:id/status",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(OrderIdParamSchema),
    validatedMiddleware.validateBody(UpdateOrderStatusSchema),
    ordersController.updateStatus
);

router.post(
    "/:id/cancel",
    validatedMiddleware.validateParams(OrderIdParamSchema),
    validatedMiddleware.validateBody(CancelOrderSchema),
    ordersController.cancel
);

router.post(
    "/:id/returns",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    validatedMiddleware.validateParams(OrderIdParamSchema),
    validatedMiddleware.validateBody(ProcessOrderReturnSchema),
    ordersController.processReturn
);

export default router;

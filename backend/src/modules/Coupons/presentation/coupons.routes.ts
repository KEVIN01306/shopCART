import { Router } from "express";
import { couponsController } from "../coupons.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import {
    CreateCouponSchema,
    UpdateCouponSchema,
    ToggleCouponStatusSchema,
    CouponIdParamSchema,
    ValidateCouponSchema,
} from "./validators/coupons.schemas.js";

const router = Router();
const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

// 1. Validar y aplicar cupón en carrito o checkout (público / auth opcional)
router.post(
    "/validate",
    authMiddleware.optionalAuth,
    validatedMiddleware.validateBody(ValidateCouponSchema),
    couponsController.validate
);

// 2. Endpoints administrativos protegidos (Exclusivo Rol Administrador)
router.use(authMiddleware.routeProtect);
router.use(authMiddleware.checkRole(["Administrador"]));

router.get("/", couponsController.list);

router.post(
    "/",
    validatedMiddleware.validateBody(CreateCouponSchema),
    couponsController.create
);

router.put(
    "/:id",
    validatedMiddleware.validateParams(CouponIdParamSchema),
    validatedMiddleware.validateBody(UpdateCouponSchema),
    couponsController.update
);

router.patch(
    "/:id/status",
    validatedMiddleware.validateParams(CouponIdParamSchema),
    validatedMiddleware.validateBody(ToggleCouponStatusSchema),
    couponsController.toggleStatus
);

export default router;

import { Router } from "express";
import { cartsController } from "../carts.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import {
    AddCartItemSchema,
    UpdateCartItemSchema,
    VariantIdParamSchema,
    SyncCartSchema,
} from "./validators/carts.schemas.js";

const router = Router();
const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

// Middleware de autenticación opcional para el carrito público / invitado / cliente
router.use(authMiddleware.optionalAuth);

// 1. Obtener carrito
router.get("/", cartsController.getCart);

// 2. Agregar item al carrito
router.post(
    "/items",
    validatedMiddleware.validateBody(AddCartItemSchema),
    cartsController.addItem
);

// 3. Actualizar cantidad exacta de un item
router.put(
    "/items/:variantId",
    validatedMiddleware.validateParams(VariantIdParamSchema),
    validatedMiddleware.validateBody(UpdateCartItemSchema),
    cartsController.updateItem
);

// 4. Eliminar item específico
router.delete(
    "/items/:variantId",
    validatedMiddleware.validateParams(VariantIdParamSchema),
    cartsController.removeItem
);

// 5. Vaciar carrito completo
router.delete("/", cartsController.clearCart);

// 6. Sincronizar carrito de invitado con el del usuario autenticado (requiere auth obligatoria)
router.post(
    "/sync",
    authMiddleware.routeProtect,
    validatedMiddleware.validateBody(SyncCartSchema),
    cartsController.syncCart
);

export default router;

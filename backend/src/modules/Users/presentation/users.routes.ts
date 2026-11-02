import { Router } from "express";
import { usersController } from "../users.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import { CreateUserSchema, UpdateUserSchema, UserIdSchema, ChangePasswordSchema } from "./users.schemas.js";

const router = Router();
const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

// Protect routes - requires authentication
router.use(authMiddleware.routeProtect);

router.get(
    "/roles",
    authMiddleware.checkRole(["Administrador"]),
    usersController.listRoles
);

router.patch(
    "/me/password",
    validatedMiddleware.validateBody(ChangePasswordSchema),
    usersController.changePassword
);

router.get(
    "/",
    authMiddleware.checkRole(["Administrador"]),
    usersController.list
);

router.post(
    "/",
    authMiddleware.checkRole(["Administrador"]),
    validatedMiddleware.validateBody(CreateUserSchema),
    usersController.create
);

router.put(
    "/:id",
    authMiddleware.checkRole(["Administrador"]),
    validatedMiddleware.validateParams(UserIdSchema),
    validatedMiddleware.validateBody(UpdateUserSchema),
    usersController.update
);

router.patch(
    "/:id/activate",
    authMiddleware.checkRole(["Administrador"]),
    validatedMiddleware.validateParams(UserIdSchema),
    usersController.activate
);

router.patch(
    "/:id/disable",
    authMiddleware.checkRole(["Administrador"]),
    validatedMiddleware.validateParams(UserIdSchema),
    usersController.disable
);

router.delete(
    "/:id",
    authMiddleware.checkRole(["Administrador"]),
    validatedMiddleware.validateParams(UserIdSchema),
    usersController.delete
);

export default router;

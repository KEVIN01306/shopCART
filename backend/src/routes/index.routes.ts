import { Router } from "express";
import { ErrorMiddleware } from "@app/middleware/Error.middleware.js";
import AuthRoutes from "@modules/Auth/presentation/auth.routes.js";
import UsersRoutes from "@modules/Users/presentation/users.routes.js";
import ProductsRoutes from "@modules/Products/presentation/products.routes.js";
import CartRoutes from "@modules/Carts/presentation/carts.routes.js";
import CouponsRoutes from "@modules/Coupons/presentation/coupons.routes.js";

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/users', UsersRoutes);
router.use('/products', ProductsRoutes);
router.use('/cart', CartRoutes);
router.use('/coupons', CouponsRoutes);

router.use(ErrorMiddleware);

export default router;

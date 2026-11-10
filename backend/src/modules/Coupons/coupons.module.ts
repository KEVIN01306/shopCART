import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlCouponsRepository } from "./infrastructure/mssql-coupons.repository.js";
import { ListCouponsUseCase } from "./application/list-coupons.usecase.js";
import { CreateCouponUseCase } from "./application/create-coupon.usecase.js";
import { UpdateCouponUseCase } from "./application/update-coupon.usecase.js";
import { ToggleCouponStatusUseCase } from "./application/toggle-coupon-status.usecase.js";
import { ValidateCouponUseCase } from "./application/validate-coupon.usecase.js";
import { CouponsController } from "./presentation/coupons.controller.js";
import { cartsRepository } from "@modules/Carts/carts.module.js";

export const couponsRepository = new MssqlCouponsRepository(getPool);

export const listCouponsUseCase = new ListCouponsUseCase(couponsRepository);
export const createCouponUseCase = new CreateCouponUseCase(couponsRepository);
export const updateCouponUseCase = new UpdateCouponUseCase(couponsRepository);
export const toggleCouponStatusUseCase = new ToggleCouponStatusUseCase(
    couponsRepository
);
export const validateCouponUseCase = new ValidateCouponUseCase(
    couponsRepository,
    cartsRepository
);

export const couponsController = new CouponsController(
    listCouponsUseCase,
    createCouponUseCase,
    updateCouponUseCase,
    toggleCouponStatusUseCase,
    validateCouponUseCase
);

import "dotenv/config";
import assert from "node:assert/strict";
import type sql from "mssql";
import { MssqlCouponsRepository } from "./infrastructure/mssql-coupons.repository.js";
import { CreateCouponUseCase } from "./application/create-coupon.usecase.js";
import { ListCouponsUseCase } from "./application/list-coupons.usecase.js";
import { UpdateCouponUseCase } from "./application/update-coupon.usecase.js";
import { ToggleCouponStatusUseCase } from "./application/toggle-coupon-status.usecase.js";
import { ValidateCouponUseCase } from "./application/validate-coupon.usecase.js";
import { MssqlCartsRepository } from "../Carts/infrastructure/mssql-carts.repository.js";
import { AddCartItemUseCase } from "../Carts/application/add-cart-item.usecase.js";
import { UpdateCartItemQuantityUseCase } from "../Carts/application/update-cart-item.usecase.js";
import type { CouponDbRow, ValidatedCouponDbRow } from "./infrastructure/mappers/coupon.mapper.js";
import type { CartDbRow, CartItemDbRow } from "../Carts/infrastructure/mappers/cart.mapper.js";
import AppError from "@shared/errors/AppError.js";

interface MockCouponState {
    coupons: Map<string, CouponDbRow>;
    couponUsages: Array<{ coupon_id: string; user_id: string; order_id: string }>;
    categories: Map<string, { id: string; name: string }>;
    products: Map<string, { id: string; category_id: string; name: string; main_image_url: string }>;
    variants: Map<string, { id: string; product_id: string; sku: string; price: number; stock_physical: number; stock_reserved: number; is_active: number }>;
    carts: Map<string, CartDbRow>;
    cartItems: Map<string, { id: string; cart_id: string; variant_id: string; quantity: number; created_at: Date; updated_at: Date }>;
    auditLogs: Array<{ entity: string; action: string; new_value: string | null }>;
}

function createMockPool(state: MockCouponState): sql.ConnectionPool {
    const pool = {
        request() {
            const inputs: Record<string, any> = {};
            const req = {
                input(name: string, _type: any, value: any) {
                    inputs[name] = value;
                    return req;
                },
                async execute(spName: string) {
                    switch (spName) {
                        case "SP_Cupones_Crear": {
                            const code = String(inputs.p_code).trim().toUpperCase();
                            const exists = Array.from(state.coupons.values()).some(
                                (c) => c.code.toUpperCase() === code
                            );
                            if (exists) {
                                const err: any = new Error("DUPLICADO: Ya existe un cupón con ese código.");
                                err.number = 50003;
                                throw err;
                            }
                            if (inputs.p_discount_type === "PORCENTAJE" && Number(inputs.p_discount_value) > 100) {
                                const err: any = new Error("DATOS_INVALIDOS: El porcentaje de descuento no puede superar el 100%.");
                                err.number = 50005;
                                throw err;
                            }
                            const cat = inputs.p_category_id ? state.categories.get(inputs.p_category_id) : undefined;
                            const row: CouponDbRow = {
                                id: inputs.p_id,
                                code,
                                discount_type: inputs.p_discount_type,
                                discount_value: Number(inputs.p_discount_value),
                                min_order_amount: Number(inputs.p_min_order_amount ?? 0),
                                max_uses: Number(inputs.p_max_uses),
                                current_uses: 0,
                                max_uses_per_client: Number(inputs.p_max_uses_per_client ?? 1),
                                category_id: inputs.p_category_id ?? null,
                                category_name: cat?.name ?? null,
                                starts_at: new Date(inputs.p_starts_at),
                                expires_at: new Date(inputs.p_expires_at),
                                is_active: 1,
                                created_at: new Date(),
                            };
                            state.coupons.set(row.id, row);
                            state.auditLogs.push({
                                entity: "CUPON",
                                action: "CREAR",
                                new_value: JSON.stringify({ id: row.id, code: row.code }),
                            });
                            return { recordset: [row], rowsAffected: [1] };
                        }

                        case "SP_Cupones_Listar": {
                            const all = Array.from(state.coupons.values());
                            const rows = all.map((r) => ({
                                ...r,
                                total_count: all.length,
                            }));
                            return { recordset: rows, rowsAffected: [rows.length] };
                        }

                        case "SP_Cupones_Actualizar": {
                            const existing = state.coupons.get(inputs.p_id);
                            if (!existing) {
                                const err: any = new Error("NO_ENCONTRADO: El cupón no existe.");
                                err.number = 50001;
                                throw err;
                            }
                            if (inputs.p_code) existing.code = String(inputs.p_code).trim().toUpperCase();
                            if (inputs.p_discount_type) existing.discount_type = inputs.p_discount_type;
                            if (inputs.p_discount_value !== null && inputs.p_discount_value !== undefined) {
                                existing.discount_value = Number(inputs.p_discount_value);
                            }
                            if (inputs.p_min_order_amount !== null && inputs.p_min_order_amount !== undefined) {
                                existing.min_order_amount = Number(inputs.p_min_order_amount);
                            }
                            if (inputs.p_max_uses !== null && inputs.p_max_uses !== undefined) {
                                existing.max_uses = Number(inputs.p_max_uses);
                            }
                            return { recordset: [existing], rowsAffected: [1] };
                        }

                        case "SP_Cupones_CambiarEstadoActivo": {
                            const existing = state.coupons.get(inputs.p_id);
                            if (!existing) {
                                const err: any = new Error("NO_ENCONTRADO: El cupón no existe.");
                                err.number = 50001;
                                throw err;
                            }
                            existing.is_active = inputs.p_is_active ? 1 : 0;
                            return { recordset: [existing], rowsAffected: [1] };
                        }

                        case "SP_Cupones_ValidarYAplicar": {
                            const code = String(inputs.p_code).trim().toUpperCase();
                            const coupon = Array.from(state.coupons.values()).find(
                                (c) => c.code.toUpperCase() === code
                            );
                            if (!coupon || !coupon.is_active) {
                                const err: any = new Error("NO_ENCONTRADO: El cupón ingresado no existe o se encuentra inactivo.");
                                err.number = 50001;
                                throw err;
                            }

                            const now = new Date();
                            if (now < new Date(coupon.starts_at)) {
                                const err: any = new Error("DATOS_INVALIDOS: El cupón aún no ha iniciado su vigencia.");
                                err.number = 50005;
                                throw err;
                            }
                            if (now > new Date(coupon.expires_at)) {
                                const err: any = new Error("DATOS_INVALIDOS: El cupón ha vencido.");
                                err.number = 50005;
                                throw err;
                            }
                            if (coupon.current_uses >= coupon.max_uses) {
                                const err: any = new Error("DATOS_INVALIDOS: El cupón se ha agotado (límite global de usos alcanzado).");
                                err.number = 50005;
                                throw err;
                            }

                            if (inputs.p_user_id) {
                                const clientUses = state.couponUsages.filter(
                                    (u) => u.coupon_id === coupon.id && u.user_id === inputs.p_user_id
                                ).length;
                                if (clientUses >= coupon.max_uses_per_client) {
                                    const err: any = new Error("DATOS_INVALIDOS: Has alcanzado el límite máximo de usos permitidos por cliente para este cupón.");
                                    err.number = 50005;
                                    throw err;
                                }
                            }

                            let cartSubtotal = 0;
                            let eligibleSubtotal = 0;
                            const cartItems = inputs.p_cart_id
                                ? Array.from(state.cartItems.values()).filter((ci) => ci.cart_id === inputs.p_cart_id)
                                : [];

                            if (cartItems.length > 0) {
                                for (const ci of cartItems) {
                                    const v = state.variants.get(ci.variant_id);
                                    const p = v ? state.products.get(v.product_id) : undefined;
                                    const lineTotal = Number((ci.quantity * (v?.price ?? 0)).toFixed(2));
                                    cartSubtotal = Number((cartSubtotal + lineTotal).toFixed(2));
                                    if (!coupon.category_id || p?.category_id === coupon.category_id) {
                                        eligibleSubtotal = Number((eligibleSubtotal + lineTotal).toFixed(2));
                                    }
                                }
                            } else {
                                cartSubtotal = Number(inputs.p_subtotal ?? 0);
                                eligibleSubtotal = coupon.category_id
                                    ? Number(inputs.p_category_subtotal ?? cartSubtotal)
                                    : cartSubtotal;
                            }

                            if (cartSubtotal < Number(coupon.min_order_amount)) {
                                const err: any = new Error("DATOS_INVALIDOS: No se alcanza el monto mínimo de compra requerido para este cupón.");
                                err.number = 50005;
                                throw err;
                            }

                            if (coupon.category_id && eligibleSubtotal <= 0) {
                                const err: any = new Error("DATOS_INVALIDOS: Este cupón solo aplica a productos de una categoría específica que no está en tu carrito.");
                                err.number = 50005;
                                throw err;
                            }

                            let discount =
                                coupon.discount_type === "PORCENTAJE"
                                    ? Number((eligibleSubtotal * (Number(coupon.discount_value) / 100)).toFixed(2))
                                    : Number(coupon.discount_value);

                            if (discount > eligibleSubtotal) discount = eligibleSubtotal;
                            if (discount > cartSubtotal) discount = cartSubtotal;

                            const finalTotal = Math.max(0, Number((cartSubtotal - discount).toFixed(2)));

                            const resRow: ValidatedCouponDbRow = {
                                coupon_id: coupon.id,
                                code: coupon.code,
                                discount_type: coupon.discount_type,
                                discount_value: coupon.discount_value,
                                min_order_amount: coupon.min_order_amount,
                                category_id: coupon.category_id,
                                category_name: coupon.category_name ?? null,
                                subtotal: cartSubtotal,
                                eligible_subtotal: eligibleSubtotal,
                                discount_amount: discount,
                                final_total: finalTotal,
                            };

                            return { recordset: [resRow], rowsAffected: [1] };
                        }

                        case "SP_Carritos_ObtenerOcrear": {
                            let cart = Array.from(state.carts.values()).find(
                                (c) =>
                                    (inputs.p_user_id && c.user_id === inputs.p_user_id) ||
                                    (inputs.p_guest_token && c.guest_token === inputs.p_guest_token)
                            );
                            if (!cart) {
                                cart = {
                                    id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                    user_id: inputs.p_user_id ?? null,
                                    guest_token: inputs.p_guest_token ?? null,
                                    created_at: new Date(),
                                    updated_at: new Date(),
                                };
                                state.carts.set(cart.id, cart);
                            }
                            return { recordset: [cart], rowsAffected: [1] };
                        }

                        case "SP_Carritos_AgregarOActualizarItem": {
                            const variant = state.variants.get(inputs.p_variant_id);
                            if (!variant || !variant.is_active) {
                                const err: any = new Error("La variante de producto no existe o está inactiva.");
                                err.number = 50001;
                                throw err;
                            }
                            const availableStock = variant.stock_physical - variant.stock_reserved;
                            let existing = Array.from(state.cartItems.values()).find(
                                (ci) => ci.cart_id === inputs.p_cart_id && ci.variant_id === inputs.p_variant_id
                            );
                            const desiredQty = (existing?.quantity ?? 0) + Number(inputs.p_quantity);
                            if (desiredQty > availableStock) {
                                const err: any = new Error("STOCK_INSUFICIENTE: La cantidad solicitada supera las existencias disponibles en inventario.");
                                err.number = 50002;
                                throw err;
                            }
                            if (existing) {
                                existing.quantity = desiredQty;
                            } else {
                                existing = {
                                    id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                    cart_id: inputs.p_cart_id,
                                    variant_id: inputs.p_variant_id,
                                    quantity: desiredQty,
                                    created_at: new Date(),
                                    updated_at: new Date(),
                                };
                                state.cartItems.set(existing.id, existing);
                            }
                            const prod = state.products.get(variant.product_id);
                            const cat = prod ? state.categories.get(prod.category_id) : undefined;
                            const row: CartItemDbRow = {
                                item_id: existing.id,
                                cart_id: existing.cart_id,
                                variant_id: existing.variant_id,
                                quantity: existing.quantity,
                                sku: variant.sku,
                                attributes: "{}",
                                price: variant.price,
                                stock_physical: variant.stock_physical,
                                stock_reserved: variant.stock_reserved,
                                stock_available: availableStock,
                                product_id: prod?.id || "",
                                product_name: prod?.name || "",
                                main_image_url: null,
                                category_id: prod?.category_id,
                                category_name: cat?.name || "",
                            };
                            return { recordset: [row], rowsAffected: [1] };
                        }

                        case "SP_Carritos_ActualizarCantidadItem": {
                            const variant = state.variants.get(inputs.p_variant_id);
                            const availableStock = (variant?.stock_physical ?? 0) - (variant?.stock_reserved ?? 0);
                            if (Number(inputs.p_quantity) > availableStock) {
                                const err: any = new Error("STOCK_INSUFICIENTE: La cantidad solicitada supera las existencias disponibles en inventario.");
                                err.number = 50002;
                                throw err;
                            }
                            const existing = Array.from(state.cartItems.values()).find(
                                (ci) => ci.cart_id === inputs.p_cart_id && ci.variant_id === inputs.p_variant_id
                            );
                            if (existing) existing.quantity = Number(inputs.p_quantity);
                            return { recordset: [], rowsAffected: [1] };
                        }

                        case "SP_Carritos_ObtenerDetalle": {
                            const items = Array.from(state.cartItems.values()).filter(
                                (ci) => ci.cart_id === inputs.p_cart_id
                            );
                            const rows: CartItemDbRow[] = items.map((ci) => {
                                const v = state.variants.get(ci.variant_id)!;
                                const p = state.products.get(v.product_id)!;
                                const c = state.categories.get(p.category_id)!;
                                return {
                                    item_id: ci.id,
                                    cart_id: ci.cart_id,
                                    variant_id: ci.variant_id,
                                    quantity: ci.quantity,
                                    sku: v.sku,
                                    attributes: "{}",
                                    price: v.price,
                                    stock_physical: v.stock_physical,
                                    stock_reserved: v.stock_reserved,
                                    stock_available: v.stock_physical - v.stock_reserved,
                                    product_id: p.id,
                                    product_name: p.name,
                                    main_image_url: p.main_image_url,
                                    category_id: p.category_id,
                                    category_name: c.name,
                                };
                            });
                            return { recordset: rows, rowsAffected: [rows.length] };
                        }

                        default:
                            throw new Error(`Mock SP not implemented: ${spName}`);
                    }
                },
            };
            return req;
        },
    } as unknown as sql.ConnectionPool;

    return pool;
}

export async function runCouponsAndStockValidationTestSuite() {
    console.log("\n🧪 Starting Coupons & Strict Cart Stock Validation Test Suite (RF-04 & RF-05)...");

    const state: MockCouponState = {
        coupons: new Map(),
        couponUsages: [],
        categories: new Map(),
        products: new Map(),
        variants: new Map(),
        carts: new Map(),
        cartItems: new Map(),
        auditLogs: [],
    };

    // Seed Categories, Products, Variants
    state.categories.set("cat-tech", { id: "cat-tech", name: "Tecnología" });
    state.categories.set("cat-home", { id: "cat-home", name: "Hogar" });

    state.products.set("prod-laptop", {
        id: "prod-laptop",
        category_id: "cat-tech",
        name: "Laptop Pro 16",
        main_image_url: "https://example.com/laptop.jpg",
    });
    state.products.set("prod-chair", {
        id: "prod-chair",
        category_id: "cat-home",
        name: "Silla Ergonómica",
        main_image_url: "https://example.com/chair.jpg",
    });

    state.variants.set("var-laptop", {
        id: "var-laptop",
        product_id: "prod-laptop",
        sku: "LAP-16-PRO",
        price: 1000.0,
        stock_physical: 5,
        stock_reserved: 2, // Available = 3
        is_active: 1,
    });
    state.variants.set("var-chair", {
        id: "var-chair",
        product_id: "prod-chair",
        sku: "CHAIR-ERGO-01",
        price: 200.0,
        stock_physical: 10,
        stock_reserved: 0, // Available = 10
        is_active: 1,
    });

    const mockPool = createMockPool(state);
    const poolProvider = async () => mockPool;

    const cartsRepository = new MssqlCartsRepository(poolProvider);
    const addCartItemUseCase = new AddCartItemUseCase(cartsRepository);
    const updateCartItemUseCase = new UpdateCartItemQuantityUseCase(cartsRepository);

    const couponsRepository = new MssqlCouponsRepository(poolProvider);
    const createCouponUseCase = new CreateCouponUseCase(couponsRepository);
    const listCouponsUseCase = new ListCouponsUseCase(couponsRepository);
    const updateCouponUseCase = new UpdateCouponUseCase(couponsRepository);
    const toggleCouponStatusUseCase = new ToggleCouponStatusUseCase(couponsRepository);
    const validateCouponUseCase = new ValidateCouponUseCase(couponsRepository, cartsRepository);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Validación estricta de stock disponible en carrito (RF-04)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [1/7]: Strict stock validation when adding/updating cart items...");
    const guestToken = "guest-stock-check-001";

    // Available stock of var-laptop is 5 - 2 = 3. Adding 3 succeeds:
    const cartOk = await addCartItemUseCase.execute({
        guestToken,
        variantId: "var-laptop",
        quantity: 3,
    });
    assert.equal(cartOk.items[0]?.quantity, 3);
    assert.equal(cartOk.items[0]?.availableStock, 3);
    assert.equal(cartOk.items[0]?.categoryId, "cat-tech");

    // Trying to add 1 more (total 4 > 3 available) must throw 409 INSUFFICIENT_STOCK
    await assert.rejects(
        async () => {
            await addCartItemUseCase.execute({
                guestToken,
                variantId: "var-laptop",
                quantity: 1,
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 409);
            assert.equal(err.code, "INSUFFICIENT_STOCK");
            return true;
        }
    );

    // Trying to update quantity to 5 (> 3 available) must throw 409 INSUFFICIENT_STOCK
    await assert.rejects(
        async () => {
            await updateCartItemUseCase.execute({
                guestToken,
                variantId: "var-laptop",
                quantity: 5,
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 409);
            assert.equal(err.code, "INSUFFICIENT_STOCK");
            return true;
        }
    );
    console.log("✅ [1/7] Cart enforces (StockPhysical - StockReserved) limit on add and update.");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Administrador crea cupones de porcentaje y monto fijo (RF-05)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [2/7]: Admin creates percentage and fixed-amount coupons...");
    const now = Date.now();
    const pastDate = new Date(now - 7 * 86400000).toISOString();
    const futureDate = new Date(now + 30 * 86400000).toISOString();
    const expiredDate = new Date(now - 1 * 86400000).toISOString();

    const pctCoupon = await createCouponUseCase.execute({
        code: "tech10",
        discountType: "PORCENTAJE",
        discountValue: 10,
        minOrderAmount: 500,
        maxUses: 100,
        maxUsesPerClient: 2,
        categoryId: "cat-tech",
        startsAt: pastDate,
        expiresAt: futureDate,
    });
    assert.equal(pctCoupon.code, "TECH10");
    assert.equal(pctCoupon.discountType, "PORCENTAJE");
    assert.equal(pctCoupon.discountValue, 10);
    assert.equal(pctCoupon.categoryId, "cat-tech");

    const fixedCoupon = await createCouponUseCase.execute({
        code: "BONO500",
        discountType: "MONTO_FIJO",
        discountValue: 500,
        minOrderAmount: 100,
        maxUses: 50,
        maxUsesPerClient: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
    });
    assert.equal(fixedCoupon.code, "BONO500");
    assert.equal(fixedCoupon.discountType, "MONTO_FIJO");

    const listed = await listCouponsUseCase.execute({ page: 1, limit: 10 });
    assert.equal(listed.total, 2);

    // Update & toggle test
    const updatedFixed = await updateCouponUseCase.execute(fixedCoupon.id, {
        minOrderAmount: 150,
    });
    assert.equal(updatedFixed.minOrderAmount, 150);

    const toggled = await toggleCouponStatusUseCase.execute(fixedCoupon.id, true);
    assert.equal(toggled.isActive, true);
    console.log("✅ [2/7] Admin created, listed, updated, and toggled percentage & fixed coupons.");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Rechazo de cupón vencido con mensaje claro
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [3/7]: Reject expired coupon with exact message...");
    await createCouponUseCase.execute({
        code: "EXPIRADO2025",
        discountType: "PORCENTAJE",
        discountValue: 15,
        minOrderAmount: 0,
        maxUses: 10,
        startsAt: new Date(now - 10 * 86400000).toISOString(),
        expiresAt: expiredDate,
    });

    await assert.rejects(
        async () => {
            await validateCouponUseCase.execute({
                code: "EXPIRADO2025",
                guestToken,
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /El cupón ha vencido/i);
            return true;
        }
    );
    console.log("✅ [3/7] Expired coupon rejected with 'El cupón ha vencido.'.");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Rechazo de cupón agotado (MaxUses alcanzado)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [4/7]: Reject exhausted coupon...");
    const exhausted = await createCouponUseCase.execute({
        code: "AGOTADO1",
        discountType: "MONTO_FIJO",
        discountValue: 50,
        minOrderAmount: 0,
        maxUses: 1,
        startsAt: pastDate,
        expiresAt: futureDate,
    });
    // Simulate that current_uses reached max_uses
    state.coupons.get(exhausted.id)!.current_uses = 1;

    await assert.rejects(
        async () => {
            await validateCouponUseCase.execute({
                code: "AGOTADO1",
                guestToken,
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /El cupón se ha agotado/i);
            return true;
        }
    );
    console.log("✅ [4/7] Exhausted coupon rejected with 'El cupón se ha agotado'.");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Rechazo por no alcanzar el monto mínimo de compra
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [5/7]: Reject when minimum purchase amount is not met...");
    await createCouponUseCase.execute({
        code: "VIP10000",
        discountType: "PORCENTAJE",
        discountValue: 20,
        minOrderAmount: 10000,
        maxUses: 10,
        startsAt: pastDate,
        expiresAt: futureDate,
    });

    // Current cart has 3 * 1000 = 3000 (< 10000)
    await assert.rejects(
        async () => {
            await validateCouponUseCase.execute({
                code: "VIP10000",
                guestToken,
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /No se alcanza el monto mínimo/i);
            return true;
        }
    );
    console.log("✅ [5/7] Minimum purchase requirement enforced with 'No se alcanza el monto mínimo'.");

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Cupón por categoría específica aplica solo a productos elegibles
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [6/7]: Category-specific coupon applies only to items of that category...");
    // Add 2 chairs (Hogar: 2 * 200 = 400) to the cart that already has 3 laptops (Tecnología: 3 * 1000 = 3000)
    // Total cart subtotal = 3400. Eligible Tecnología subtotal = 3000.
    await addCartItemUseCase.execute({
        guestToken,
        variantId: "var-chair",
        quantity: 2,
    });

    // Apply TECH10 (10% on cat-tech): should discount 10% of 3000 = 300 (NOT 10% of 3400)
    const techApplied = await validateCouponUseCase.execute({
        code: "TECH10",
        guestToken,
    });
    assert.equal(techApplied.subtotal, 3400.0);
    assert.equal(techApplied.eligibleSubtotal, 3000.0);
    assert.equal(techApplied.discountAmount, 300.0);
    assert.equal(techApplied.finalTotal, 3100.0);
    console.log("✅ [6/7] Category-specific coupon calculated exclusively over eligible category items.");

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Tope de descuento fijo para que el total nunca sea negativo (>= Q0.00)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [7/7]: Fixed discount larger than subtotal is capped so total >= Q0.00...");
    await createCouponUseCase.execute({
        code: "MEGA5000",
        discountType: "MONTO_FIJO",
        discountValue: 5000,
        minOrderAmount: 100,
        maxUses: 10,
        startsAt: pastDate,
        expiresAt: futureDate,
    });

    const cappedResult = await validateCouponUseCase.execute({
        code: "MEGA5000",
        guestToken,
    });
    assert.equal(cappedResult.subtotal, 3400.0);
    assert.equal(cappedResult.discountAmount, 3400.0); // Capped at 3400 instead of 5000
    assert.equal(cappedResult.finalTotal, 0.0);
    console.log("✅ [7/7] Fixed discount capped at subtotal; finalTotal is Q0.00 (never negative).");

    console.log("\n🎉 ALL 7 COUPONS & CART STOCK VALIDATION TEST CASES PASSED SUCCESSFULLY!\n");
}

const isDirect = process.argv[1] && process.argv[1].includes("coupons.test.ts");
if (isDirect) {
    runCouponsAndStockValidationTestSuite().catch((err) => {
        console.error("❌ Coupons test suite failed:", err);
        process.exit(1);
    });
}

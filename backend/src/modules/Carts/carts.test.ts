import 'dotenv/config';
import assert from 'node:assert/strict';
import type sql from 'mssql';
import { MssqlCartsRepository } from './infrastructure/mssql-carts.repository.js';
import { GetCartUseCase } from './application/get-cart.usecase.js';
import { AddCartItemUseCase } from './application/add-cart-item.usecase.js';
import { UpdateCartItemQuantityUseCase } from './application/update-cart-item.usecase.js';
import { RemoveCartItemUseCase } from './application/remove-cart-item.usecase.js';
import { ClearCartUseCase } from './application/clear-cart.usecase.js';
import { SyncCartUseCase } from './application/sync-cart.usecase.js';
import { RegisterUseCase } from '../Auth/application/register.usecase.js';
import { MssqlAuthRepository } from '../Auth/infrastructure/mssql-auth.repository.js';
import { Argon2HashProvider } from '../../shared/infrastructure/argon2-hash.provider.js';
import JwtProvider from '../Auth/domain/jwt.provider.js';
import type { CartDbRow, CartItemDbRow } from './infrastructure/mappers/cart.mapper.js';
import type { AuthUserDbRow } from '../Auth/infrastructure/mappers/auth.mapper.js';
import AppError from '../../shared/errors/AppError.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-shopcart-2026';
process.env.JWT_ISS = process.env.JWT_ISS || 'shopcart-api';
process.env.JWT_AUD = process.env.JWT_AUD || 'shopcart-client';

interface MockDbState {
    users: Map<string, AuthUserDbRow>;
    sessions: Map<string, { id: string; user_id: string; token: string; expires_at: Date; created_at: Date }>;
    carts: Map<string, CartDbRow>;
    cartItems: Map<string, { id: string; cart_id: string; variant_id: string; quantity: number; created_at: Date; updated_at: Date }>;
    variants: Map<string, { id: string; product_id: string; sku: string; price: number; stock_physical: number; stock_reserved: number; is_active: number }>;
    products: Map<string, { id: string; category_id: string; name: string; main_image_url: string; is_active: number }>;
    categories: Map<string, { id: string; name: string }>;
}

function createMockPool(state: MockDbState) {
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
                        case 'SP_Usuarios_CrearUsuario': {
                            const exists = Array.from(state.users.values()).some((u) => u.email === inputs.p_email);
                            if (exists) {
                                const err: any = new Error("DUPLICADO: El correo electrónico ya está registrado.");
                                err.number = 2627;
                                throw err;
                            }
                            const row: AuthUserDbRow = {
                                id: inputs.p_id,
                                email: inputs.p_email,
                                password_hash: inputs.p_password_hash,
                                first_name: inputs.p_first_name,
                                last_name: inputs.p_last_name,
                                avatar_url: inputs.p_avatar_url ?? null,
                                role: inputs.p_role || 'Cliente',
                                is_active: 1,
                                is_verify: inputs.p_is_verify ? 1 : 0,
                                created_at: new Date(),
                                updated_at: new Date(),
                            };
                            state.users.set(row.id, row);
                            return { recordset: [row], rowsAffected: [1] };
                        }

                        case 'SP_Auth_UpsertSesion': {
                            state.sessions.set(inputs.p_user_id, {
                                id: inputs.p_id,
                                user_id: inputs.p_user_id,
                                token: inputs.p_token,
                                expires_at: inputs.p_expires_at,
                                created_at: new Date(),
                            });
                            return { recordset: [], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_ObtenerOcrear': {
                            let cart: CartDbRow | undefined;
                            if (inputs.p_user_id) {
                                cart = Array.from(state.carts.values()).find((c) => c.user_id === inputs.p_user_id);
                                if (!cart) {
                                    cart = {
                                        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        user_id: inputs.p_user_id,
                                        guest_token: null,
                                        created_at: new Date(),
                                        updated_at: new Date(),
                                    };
                                    state.carts.set(cart.id, cart);
                                }
                            } else if (inputs.p_guest_token) {
                                cart = Array.from(state.carts.values()).find((c) => c.guest_token === inputs.p_guest_token);
                                if (!cart) {
                                    cart = {
                                        id: `cart-guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        user_id: null,
                                        guest_token: inputs.p_guest_token,
                                        created_at: new Date(),
                                        updated_at: new Date(),
                                    };
                                    state.carts.set(cart.id, cart);
                                }
                            } else {
                                throw new Error("Debe proporcionar user_id o guest_token.");
                            }
                            return { recordset: [cart], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_ObtenerDetalle': {
                            const cartId = inputs.p_cart_id;
                            const items = Array.from(state.cartItems.values()).filter((ci) => ci.cart_id === cartId);
                            const resultRows: CartItemDbRow[] = items.map((ci) => {
                                const variant = state.variants.get(ci.variant_id);
                                const product = variant ? state.products.get(variant.product_id) : undefined;
                                const category = product ? state.categories.get(product.category_id) : undefined;

                                return {
                                    item_id: ci.id,
                                    cart_id: ci.cart_id,
                                    variant_id: ci.variant_id,
                                    quantity: ci.quantity,
                                    sku: variant?.sku || 'SKU-UNKNOWN',
                                    attributes: JSON.stringify({ talla: 'M' }),
                                    price: variant?.price || 0,
                                    stock_physical: variant?.stock_physical || 0,
                                    stock_reserved: variant?.stock_reserved || 0,
                                    stock_available: (variant?.stock_physical || 0) - (variant?.stock_reserved || 0),
                                    product_id: product?.id || '',
                                    product_name: product?.name || '',
                                    main_image_url: product?.main_image_url || null,
                                    category_name: category?.name || '',
                                    created_at: ci.created_at,
                                    updated_at: ci.updated_at,
                                };
                            });
                            return { recordset: resultRows, rowsAffected: [resultRows.length] };
                        }

                        case 'SP_Carritos_AgregarOActualizarItem': {
                            const cartId = inputs.p_cart_id;
                            const variantId = inputs.p_variant_id;
                            const quantity = inputs.p_quantity;

                            let existing = Array.from(state.cartItems.values()).find(
                                (ci) => ci.cart_id === cartId && ci.variant_id === variantId
                            );

                            if (existing) {
                                existing.quantity += quantity;
                                existing.updated_at = new Date();
                            } else {
                                existing = {
                                    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                    cart_id: cartId,
                                    variant_id: variantId,
                                    quantity,
                                    created_at: new Date(),
                                    updated_at: new Date(),
                                };
                                state.cartItems.set(existing.id, existing);
                            }

                            const cart = state.carts.get(cartId);
                            if (cart) cart.updated_at = new Date();

                            const variant = state.variants.get(variantId);
                            const product = variant ? state.products.get(variant.product_id) : undefined;
                            const category = product ? state.categories.get(product.category_id) : undefined;

                            const row: CartItemDbRow = {
                                item_id: existing.id,
                                cart_id: existing.cart_id,
                                variant_id: existing.variant_id,
                                quantity: existing.quantity,
                                sku: variant?.sku || 'SKU-001',
                                attributes: JSON.stringify({ talla: 'M' }),
                                price: variant?.price || 150.0,
                                stock_physical: variant?.stock_physical || 10,
                                stock_reserved: variant?.stock_reserved || 0,
                                stock_available: 10,
                                product_id: product?.id || 'prod-1',
                                product_name: product?.name || 'Playera Sport',
                                main_image_url: product?.main_image_url || null,
                                category_name: category?.name || 'Ropa',
                                created_at: existing.created_at,
                                updated_at: existing.updated_at,
                            };

                            return { recordset: [row], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_ActualizarCantidadItem': {
                            const cartId = inputs.p_cart_id;
                            const variantId = inputs.p_variant_id;
                            const quantity = inputs.p_quantity;

                            const existing = Array.from(state.cartItems.values()).find(
                                (ci) => ci.cart_id === cartId && ci.variant_id === variantId
                            );

                            if (quantity <= 0) {
                                if (existing) state.cartItems.delete(existing.id);
                                return { recordset: [], rowsAffected: [1] };
                            }

                            if (!existing) {
                                const err: any = new Error("El item no existe en el carrito.");
                                err.number = 50001;
                                throw err;
                            }

                            existing.quantity = quantity;
                            existing.updated_at = new Date();

                            const variant = state.variants.get(variantId);
                            const product = variant ? state.products.get(variant.product_id) : undefined;
                            const category = product ? state.categories.get(product.category_id) : undefined;

                            const row: CartItemDbRow = {
                                item_id: existing.id,
                                cart_id: existing.cart_id,
                                variant_id: existing.variant_id,
                                quantity: existing.quantity,
                                sku: variant?.sku || 'SKU-001',
                                attributes: JSON.stringify({ talla: 'M' }),
                                price: variant?.price || 150.0,
                                stock_physical: variant?.stock_physical || 10,
                                stock_reserved: variant?.stock_reserved || 0,
                                stock_available: 10,
                                product_id: product?.id || 'prod-1',
                                product_name: product?.name || 'Playera Sport',
                                main_image_url: product?.main_image_url || null,
                                category_name: category?.name || 'Ropa',
                                created_at: existing.created_at,
                                updated_at: existing.updated_at,
                            };

                            return { recordset: [row], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_EliminarItem': {
                            const cartId = inputs.p_cart_id;
                            const variantId = inputs.p_variant_id;

                            for (const [key, ci] of state.cartItems.entries()) {
                                if (ci.cart_id === cartId && ci.variant_id === variantId) {
                                    state.cartItems.delete(key);
                                }
                            }
                            return { recordset: [], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_Vaciar': {
                            const cartId = inputs.p_cart_id;
                            for (const [key, ci] of state.cartItems.entries()) {
                                if (ci.cart_id === cartId) {
                                    state.cartItems.delete(key);
                                }
                            }
                            return { recordset: [], rowsAffected: [1] };
                        }

                        case 'SP_Carritos_SincronizarInvitado': {
                            const userId = inputs.p_user_id;
                            const guestToken = inputs.p_guest_token;

                            let guestCart = Array.from(state.carts.values()).find((c) => c.guest_token === guestToken);
                            let userCart = Array.from(state.carts.values()).find((c) => c.user_id === userId);

                            if (!guestCart) {
                                if (!userCart) {
                                    userCart = {
                                        id: `cart-user-${Date.now()}`,
                                        user_id: userId,
                                        guest_token: null,
                                        created_at: new Date(),
                                        updated_at: new Date(),
                                    };
                                    state.carts.set(userCart.id, userCart);
                                }
                                return { recordset: [userCart], rowsAffected: [1] };
                            }

                            if (!userCart) {
                                guestCart.user_id = userId;
                                guestCart.guest_token = null;
                                guestCart.updated_at = new Date();
                                return { recordset: [guestCart], rowsAffected: [1] };
                            }

                            // Ambos carritos existen: fusionar
                            const guestItems = Array.from(state.cartItems.values()).filter((ci) => ci.cart_id === guestCart!.id);
                            for (const gi of guestItems) {
                                const matchingUserItem = Array.from(state.cartItems.values()).find(
                                    (ui) => ui.cart_id === userCart!.id && ui.variant_id === gi.variant_id
                                );
                                if (matchingUserItem) {
                                    matchingUserItem.quantity += gi.quantity;
                                    matchingUserItem.updated_at = new Date();
                                } else {
                                    state.cartItems.set(gi.id, {
                                        ...gi,
                                        cart_id: userCart.id,
                                        updated_at: new Date(),
                                    });
                                }
                                state.cartItems.delete(gi.id);
                            }

                            state.carts.delete(guestCart.id);
                            userCart.updated_at = new Date();

                            return { recordset: [userCart], rowsAffected: [1] };
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

export async function runCartsAndRegistrationTestSuite() {
    console.log("\n🧪 Starting Carts & Client Registration Test Suite (MSSQL SP)...");

    const state: MockDbState = {
        users: new Map(),
        sessions: new Map(),
        carts: new Map(),
        cartItems: new Map(),
        variants: new Map(),
        products: new Map(),
        categories: new Map(),
    };

    // Inicializar catálogo ficticio para pruebas de items
    state.categories.set("cat-1", { id: "cat-1", name: "Tecnología" });
    state.products.set("prod-1", {
        id: "prod-1",
        category_id: "cat-1",
        name: "Smartphone Pro Max",
        main_image_url: "https://example.com/phone.jpg",
        is_active: 1,
    });
    state.variants.set("var-1", {
        id: "var-1",
        product_id: "prod-1",
        sku: "SP-PRO-256GB",
        price: 2500.0,
        stock_physical: 20,
        stock_reserved: 0,
        is_active: 1,
    });
    state.variants.set("var-2", {
        id: "var-2",
        product_id: "prod-1",
        sku: "SP-PRO-512GB",
        price: 3200.0,
        stock_physical: 10,
        stock_reserved: 0,
        is_active: 1,
    });

    const mockPool = createMockPool(state);
    const poolProvider = async () => mockPool;

    const hashProvider = new Argon2HashProvider();
    const jwtProvider = new JwtProvider();
    const authRepository = new MssqlAuthRepository(poolProvider);
    const registerUseCase = new RegisterUseCase(authRepository, jwtProvider, hashProvider);

    const cartsRepository = new MssqlCartsRepository(poolProvider);
    const getCartUseCase = new GetCartUseCase(cartsRepository);
    const addCartItemUseCase = new AddCartItemUseCase(cartsRepository);
    const updateCartItemQuantityUseCase = new UpdateCartItemQuantityUseCase(cartsRepository);
    const removeCartItemUseCase = new RemoveCartItemUseCase(cartsRepository);
    const clearCartUseCase = new ClearCartUseCase(cartsRepository);
    const syncCartUseCase = new SyncCartUseCase(cartsRepository);

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Registro Inmediato de Cliente (sin OTP)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Register new customer without OTP...");
    const regResult = await registerUseCase.execute({
        firstName: "Carlos",
        lastName: "Gómez",
        email: "carlos.gomez@test.com",
        password: "securePassword123!",
    });

    assert.ok(regResult.accessToken, "Should generate accessToken immediately");
    assert.ok(regResult.refreshToken, "Should generate refreshToken immediately");
    assert.equal(regResult.user.role, "Cliente", "Registered user role must be 'Cliente'");
    assert.equal(regResult.user.isVerify, true, "Customer must have isVerify = true (no blocking OTP required)");
    assert.equal(regResult.user.email, "carlos.gomez@test.com");
    console.log("✅ [1/7] Customer registered immediately with tokens and role 'Cliente'.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Control de Correo Duplicado (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Duplicate email registration prevention (409 Conflict)...");
    let duplicateErrorThrown = false;
    try {
        await registerUseCase.execute({
            firstName: "Carlos",
            lastName: "Gómez",
            email: "carlos.gomez@test.com",
            password: "anotherPassword456!",
        });
    } catch (err: any) {
        duplicateErrorThrown = true;
        assert.equal(err instanceof AppError, true);
        assert.equal(err.statusCode, 409, "Must return HTTP 409 Conflict");
        assert.equal(err.code, "EMAIL_ALREADY_EXISTS");
    }
    assert.ok(duplicateErrorThrown, "Duplicate registration must fail with 409 Conflict");
    console.log("✅ [2/7] Duplicate email blocked with 409 Conflict as expected.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Carrito de Invitado: Agregar Items y Calcular Totales
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Guest cart item addition and totals calculation...");
    const guestToken = "guest-session-uuid-12345";

    const cartWithItem1 = await addCartItemUseCase.execute({
        guestToken,
        variantId: "var-1",
        quantity: 2,
    });

    assert.equal(cartWithItem1.guestToken, guestToken);
    assert.equal(cartWithItem1.items.length, 1);
    assert.equal(cartWithItem1.itemCount, 2);
    assert.equal(cartWithItem1.subtotal, 5000.0); // 2 * 2500

    const cartWithItem2 = await addCartItemUseCase.execute({
        guestToken,
        variantId: "var-2",
        quantity: 1,
    });

    assert.equal(cartWithItem2.items.length, 2);
    assert.equal(cartWithItem2.itemCount, 3);
    assert.equal(cartWithItem2.subtotal, 8200.0); // 5000 + 3200
    console.log("✅ [3/7] Guest cart handles multi-item additions, item counts, and GTQ subtotals.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Actualizar Cantidad de Item
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Update cart item quantity...");
    const cartUpdated = await updateCartItemQuantityUseCase.execute({
        guestToken,
        variantId: "var-1",
        quantity: 3, // Changed from 2 to 3
    });

    assert.equal(cartUpdated.itemCount, 4); // 3 of var-1 + 1 of var-2
    assert.equal(cartUpdated.subtotal, 10700.0); // (3 * 2500) + 3200 = 7500 + 3200 = 10700
    console.log("✅ [4/7] Cart item quantity successfully updated and totals recalculated.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Eliminar Item Específico
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Remove item from cart...");
    const cartAfterRemoval = await removeCartItemUseCase.execute({
        guestToken,
        variantId: "var-2",
    });

    assert.equal(cartAfterRemoval.items.length, 1);
    assert.equal(cartAfterRemoval.items[0]?.variantId, "var-1");
    assert.equal(cartAfterRemoval.itemCount, 3);
    assert.equal(cartAfterRemoval.subtotal, 7500.0);
    console.log("✅ [5/7] Item removed from cart successfully.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Sincronización de Carrito Invitado al Iniciar Sesión (Merge)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Merge guest cart into customer cart upon login...");
    const customerId = regResult.user.id;

    // Customer previously added var-1 with quantity 1
    await addCartItemUseCase.execute({
        userId: customerId,
        variantId: "var-1",
        quantity: 1,
    });

    // Customer merges guest cart (which has var-1 with quantity 3)
    const mergedCart = await syncCartUseCase.execute({
        userId: customerId,
        guestToken,
    });

    assert.equal(mergedCart.userId, customerId);
    assert.equal(mergedCart.items.length, 1);
    // Quantity should be 1 + 3 = 4
    assert.equal(mergedCart.items[0]?.quantity, 4);
    assert.equal(mergedCart.itemCount, 4);
    assert.equal(mergedCart.subtotal, 10000.0); // 4 * 2500
    console.log("✅ [6/7] Guest cart items merged seamlessly into customer cart.");

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. Vaciar Carrito
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("Testing: Clear cart...");
    const clearedCart = await clearCartUseCase.execute({
        userId: customerId,
    });

    assert.equal(clearedCart.items.length, 0);
    assert.equal(clearedCart.itemCount, 0);
    assert.equal(clearedCart.subtotal, 0);

    const fetchedCart = await getCartUseCase.execute({
        userId: customerId,
    });
    assert.equal(fetchedCart.items.length, 0);
    assert.equal(fetchedCart.subtotal, 0);
    console.log("✅ [7/7] Cart emptied completely.");

    console.log("\n🎉 ALL 7 CARTS & REGISTRATION TEST CASES PASSED SUCCESSFULLY!\n");
}

const isDirect = process.argv[1] && process.argv[1].includes("carts.test.ts");
if (isDirect) {
    runCartsAndRegistrationTestSuite().catch((err) => {
        console.error("❌ Test suite failed:", err);
        process.exit(1);
    });
}

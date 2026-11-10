import "dotenv/config";
import assert from "node:assert/strict";
import type sql from "mssql";
import { MssqlOrdersRepository } from "./infrastructure/mssql-orders.repository.js";
import {
    CreateAddressUseCase,
    DeleteAddressUseCase,
    ListAddressesUseCase,
} from "./application/addresses.usecases.js";
import { ReserveCheckoutUseCase } from "./application/reserve-checkout.usecase.js";
import { CreateOrderUseCase } from "./application/create-order.usecase.js";
import { ListOrdersUseCase } from "./application/list-orders.usecase.js";
import { GetOrderUseCase } from "./application/get-order.usecase.js";
import { UpdateOrderStatusUseCase } from "./application/update-order-status.usecase.js";
import { CancelOrderUseCase } from "./application/cancel-order.usecase.js";
import { ProcessOrderReturnUseCase } from "./application/process-order-return.usecase.js";
import type {
    AddressDbRow,
    OrderHeaderDbRow,
    OrderItemDbRow,
    OrderReturnDbRow,
    OrderStatusHistoryDbRow,
    OrderSummaryDbRow,
} from "./infrastructure/mappers/order.mapper.js";
import AppError from "@shared/errors/AppError.js";

interface MockOrdersState {
    users: Map<string, { id: string; email: string; name: string }>;
    addresses: Map<string, AddressDbRow>;
    variants: Map<
        string,
        {
            id: string;
            product_id: string;
            product_name: string;
            category_id: string;
            sku: string;
            price: number;
            stock_physical: number;
            stock_reserved: number;
            is_active: number;
        }
    >;
    carts: Map<string, { id: string; user_id: string }>;
    cartItems: Array<{ id: string; cart_id: string; variant_id: string; quantity: number }>;
    reservations: Array<{
        id: string;
        variant_id: string;
        cart_id: string;
        quantity: number;
        expires_at: Date;
        is_released: number;
    }>;
    coupons: Map<
        string,
        {
            id: string;
            code: string;
            discount_type: "PORCENTAJE" | "MONTO_FIJO";
            discount_value: number;
            min_order_amount: number;
            max_uses: number;
            current_uses: number;
            max_uses_per_client: number;
            category_id: string | null;
            is_active: number;
        }
    >;
    orders: Map<string, OrderHeaderDbRow>;
    orderItems: Map<string, OrderItemDbRow[]>;
    statusHistory: Map<string, OrderStatusHistoryDbRow[]>;
    orderReturns: Map<string, OrderReturnDbRow[]>;
    kardex: Array<{
        variant_id: string;
        movement_type: string;
        quantity: number;
        previous_stock: number;
        new_stock: number;
        reason: string;
    }>;
}

function buildOrderDetailResult(state: MockOrdersState, orderId: string) {
    const header = state.orders.get(orderId);
    if (!header) {
        return { recordsets: [[], [], [], []], recordset: [] };
    }
    const items = state.orderItems.get(orderId) ?? [];
    const history = state.statusHistory.get(orderId) ?? [];
    const returns = state.orderReturns.get(orderId) ?? [];
    return {
        recordsets: [[header], items, history, returns],
        recordset: [header],
    };
}

function releaseExpiredReservations(state: MockOrdersState) {
    const now = new Date();
    for (const r of state.reservations) {
        if (r.is_released === 0 && r.expires_at < now) {
            const v = state.variants.get(r.variant_id);
            if (v) {
                v.stock_reserved = Math.max(0, v.stock_reserved - r.quantity);
            }
            r.is_released = 1;
        }
    }
}

function createMockOrdersPool(state: MockOrdersState): sql.ConnectionPool {
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
                        case "SP_Direcciones_ListarPorUsuario": {
                            const rows = Array.from(state.addresses.values()).filter(
                                (a) => a.user_id === inputs.p_user_id
                            );
                            return { recordset: rows };
                        }

                        case "SP_Direcciones_Crear": {
                            const userAddrs = Array.from(state.addresses.values()).filter(
                                (a) => a.user_id === inputs.p_user_id
                            );
                            const isDef = inputs.p_is_default === 1 || userAddrs.length === 0 ? 1 : 0;
                            if (isDef === 1) {
                                for (const a of userAddrs) a.is_default = 0;
                            }
                            const row: AddressDbRow = {
                                id: inputs.p_id,
                                user_id: inputs.p_user_id,
                                title: inputs.p_title,
                                recipient_name: inputs.p_recipient_name,
                                phone: inputs.p_phone,
                                street_address: inputs.p_street_address,
                                city: inputs.p_city,
                                state: inputs.p_state,
                                postal_code: inputs.p_postal_code ?? null,
                                is_default: isDef,
                                created_at: new Date(),
                            };
                            state.addresses.set(row.id, row);
                            return { recordset: [row] };
                        }

                        case "SP_Direcciones_Eliminar": {
                            const addr = state.addresses.get(inputs.p_id);
                            if (!addr || addr.user_id !== inputs.p_user_id) {
                                const err: any = new Error("NO_ENCONTRADO: La dirección no existe.");
                                err.number = 50001;
                                throw err;
                            }
                            const usedInOrder = Array.from(state.orders.values()).some(
                                (o) => o.address_id === inputs.p_id
                            );
                            if (usedInOrder) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: No se puede eliminar una dirección asociada a pedidos históricos."
                                );
                                err.number = 50005;
                                throw err;
                            }
                            state.addresses.delete(inputs.p_id);
                            return { recordset: [] };
                        }

                        case "SP_Checkout_IniciarReservaCarrito": {
                            releaseExpiredReservations(state);

                            const cart = Array.from(state.carts.values()).find(
                                (c) => c.user_id === inputs.p_user_id
                            );
                            const items = cart
                                ? state.cartItems.filter((ci) => ci.cart_id === cart.id)
                                : [];

                            if (!cart || items.length === 0) {
                                const err: any = new Error("DATOS_INVALIDOS: El carrito está vacío.");
                                err.number = 50005;
                                throw err;
                            }

                            // Release active reservations of this cart first
                            for (const r of state.reservations) {
                                if (r.cart_id === cart.id && r.is_released === 0) {
                                    const v = state.variants.get(r.variant_id);
                                    if (v) {
                                        v.stock_reserved = Math.max(0, v.stock_reserved - r.quantity);
                                    }
                                    r.is_released = 1;
                                }
                            }

                            // Verify available stock
                            for (const ci of items) {
                                const v = state.variants.get(ci.variant_id);
                                if (!v || !v.is_active || ci.quantity > v.stock_physical - v.stock_reserved) {
                                    const err: any = new Error(
                                        "STOCK_INSUFICIENTE: Uno o más productos de tu carrito ya no cuentan con stock disponible suficiente."
                                    );
                                    err.number = 50002;
                                    throw err;
                                }
                            }

                            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
                            for (const ci of items) {
                                const v = state.variants.get(ci.variant_id)!;
                                v.stock_reserved += ci.quantity;
                                state.reservations.push({
                                    id: `res-${Date.now()}-${Math.random()}`,
                                    variant_id: ci.variant_id,
                                    cart_id: cart.id,
                                    quantity: ci.quantity,
                                    expires_at: expiresAt,
                                    is_released: 0,
                                });
                            }

                            return {
                                recordset: [
                                    {
                                        cart_id: cart.id,
                                        expires_at: expiresAt,
                                        reserved_items_count: items.length,
                                    },
                                ],
                            };
                        }

                        case "SP_Pedidos_CrearCheckoutAtomico": {
                            // 1. Idempotency check
                            const existingOrder = Array.from(state.orders.values()).find(
                                (o) => o.idempotency_key === inputs.p_idempotency_key
                            );
                            if (existingOrder) {
                                return buildOrderDetailResult(state, existingOrder.id);
                            }

                            releaseExpiredReservations(state);

                            const addr = state.addresses.get(inputs.p_address_id);
                            if (!addr || addr.user_id !== inputs.p_user_id) {
                                const err: any = new Error(
                                    "NO_ENCONTRADO: La dirección de entrega seleccionada no es válida."
                                );
                                err.number = 50001;
                                throw err;
                            }

                            const cart = Array.from(state.carts.values()).find(
                                (c) => c.user_id === inputs.p_user_id
                            );
                            const items = cart
                                ? state.cartItems.filter((ci) => ci.cart_id === cart.id)
                                : [];

                            if (!cart || items.length === 0) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: El carrito está vacío para procesar el pedido."
                                );
                                err.number = 50005;
                                throw err;
                            }

                            // Release active reservation of this cart before deducting physical stock
                            for (const r of state.reservations) {
                                if (r.cart_id === cart.id && r.is_released === 0) {
                                    const v = state.variants.get(r.variant_id);
                                    if (v) {
                                        v.stock_reserved = Math.max(0, v.stock_reserved - r.quantity);
                                    }
                                    r.is_released = 1;
                                }
                            }

                            for (const ci of items) {
                                const v = state.variants.get(ci.variant_id);
                                if (!v || !v.is_active || v.stock_physical - v.stock_reserved < ci.quantity) {
                                    const err: any = new Error(
                                        "STOCK_INSUFICIENTE: Stock insuficiente para completar el pedido."
                                    );
                                    err.number = 50002;
                                    throw err;
                                }
                            }

                            let subtotal = 0;
                            for (const ci of items) {
                                const v = state.variants.get(ci.variant_id)!;
                                subtotal = Number((subtotal + v.price * ci.quantity).toFixed(2));
                            }

                            let couponId: string | null = null;
                            let couponCode: string | null = null;
                            let discount = 0;

                            if (inputs.p_coupon_code) {
                                const cleanCode = String(inputs.p_coupon_code).trim().toUpperCase();
                                const cp = Array.from(state.coupons.values()).find(
                                    (c) => c.code.toUpperCase() === cleanCode
                                );
                                if (!cp || !cp.is_active) {
                                    const err: any = new Error("NO_ENCONTRADO: Cupón inválido.");
                                    err.number = 50001;
                                    throw err;
                                }
                                couponId = cp.id;
                                couponCode = cp.code;
                                discount =
                                    cp.discount_type === "PORCENTAJE"
                                        ? Number((subtotal * (cp.discount_value / 100)).toFixed(2))
                                        : cp.discount_value;
                                if (discount > subtotal) discount = subtotal;
                                cp.current_uses += 1;
                            }

                            const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
                            const user = state.users.get(inputs.p_user_id)!;
                            const now = new Date();

                            const header: OrderHeaderDbRow = {
                                id: inputs.p_order_id,
                                order_number: inputs.p_order_number,
                                user_id: inputs.p_user_id,
                                customer_email: user.email,
                                customer_name: user.name,
                                address_id: addr.id,
                                address_title: addr.title,
                                recipient_name: addr.recipient_name,
                                recipient_phone: addr.phone,
                                street_address: addr.street_address,
                                city: addr.city,
                                state: addr.state,
                                postal_code: addr.postal_code,
                                coupon_id: couponId,
                                coupon_code: couponCode,
                                idempotency_key: inputs.p_idempotency_key,
                                status: "PAGADO",
                                subtotal,
                                discount,
                                total,
                                created_at: now,
                                updated_at: now,
                            };
                            state.orders.set(header.id, header);

                            const orderItemRows: OrderItemDbRow[] = [];
                            for (const ci of items) {
                                const v = state.variants.get(ci.variant_id)!;
                                const prevStock = v.stock_physical;
                                v.stock_physical -= ci.quantity;

                                state.kardex.push({
                                    variant_id: v.id,
                                    movement_type: "SALIDA",
                                    quantity: -ci.quantity,
                                    previous_stock: prevStock,
                                    new_stock: v.stock_physical,
                                    reason: `Venta en pedido ${header.order_number}`,
                                });

                                orderItemRows.push({
                                    id: `oi-${v.id}-${header.id}`,
                                    order_id: header.id,
                                    variant_id: v.id,
                                    product_name: v.product_name,
                                    variant_sku: v.sku,
                                    attributes: '{"Color":"Negro"}',
                                    main_image_url: null,
                                    unit_price: v.price,
                                    quantity: ci.quantity,
                                    returned_quantity: 0,
                                    available_to_return: ci.quantity,
                                    subtotal: Number((v.price * ci.quantity).toFixed(2)),
                                });
                            }
                            state.orderItems.set(header.id, orderItemRows);

                            state.statusHistory.set(header.id, [
                                {
                                    id: `osh-1-${header.id}`,
                                    order_id: header.id,
                                    user_id: user.id,
                                    changed_by_name: user.name,
                                    previous_status: null,
                                    new_status: "PAGADO",
                                    changed_at: now,
                                },
                            ]);
                            state.orderReturns.set(header.id, []);

                            // Empty cart
                            state.cartItems = state.cartItems.filter((ci) => ci.cart_id !== cart.id);

                            return buildOrderDetailResult(state, header.id);
                        }

                        case "SP_Pedidos_ObtenerDetalle": {
                            return buildOrderDetailResult(state, inputs.p_order_id);
                        }

                        case "SP_Pedidos_Listar": {
                            let all = Array.from(state.orders.values());
                            if (inputs.p_user_id) {
                                all = all.filter((o) => o.user_id === inputs.p_user_id);
                            }
                            if (inputs.p_status) {
                                all = all.filter((o) => o.status === inputs.p_status);
                            }
                            const rows: OrderSummaryDbRow[] = all.map((o) => ({
                                id: o.id,
                                order_number: o.order_number,
                                user_id: o.user_id,
                                customer_email: o.customer_email,
                                customer_name: o.customer_name,
                                address_id: o.address_id,
                                shipping_address_summary: `${o.street_address}, ${o.city}, ${o.state}`,
                                coupon_code: o.coupon_code,
                                status: o.status,
                                subtotal: o.subtotal,
                                discount: o.discount,
                                total: o.total,
                                items_count: (state.orderItems.get(o.id) ?? []).reduce(
                                    (s, i) => s + i.quantity,
                                    0
                                ),
                                created_at: o.created_at,
                                updated_at: o.updated_at,
                                total_count: all.length,
                            }));
                            return { recordset: rows };
                        }

                        case "SP_Pedidos_AvanzarEstado": {
                            const order = state.orders.get(inputs.p_order_id);
                            if (!order) {
                                const err: any = new Error("NO_ENCONTRADO: El pedido especificado no existe.");
                                err.number = 50001;
                                throw err;
                            }
                            const cur = order.status;
                            const next = inputs.p_new_status;
                            const valid =
                                (cur === "CREADO" && next === "PAGADO") ||
                                (cur === "PAGADO" && next === "PREPARACION") ||
                                (cur === "PREPARACION" && next === "DESPACHADO") ||
                                (cur === "DESPACHADO" && next === "ENTREGADO");

                            if (!valid) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: Transición de estado no permitida para el flujo del pedido."
                                );
                                err.number = 50005;
                                throw err;
                            }

                            order.status = next;
                            order.updated_at = new Date();
                            const history = state.statusHistory.get(order.id) ?? [];
                            history.push({
                                id: `osh-${history.length + 1}-${order.id}`,
                                order_id: order.id,
                                user_id: inputs.p_user_id,
                                changed_by_name: "Operador",
                                previous_status: cur,
                                new_status: next,
                                changed_at: new Date(),
                            });
                            state.statusHistory.set(order.id, history);
                            return buildOrderDetailResult(state, order.id);
                        }

                        case "SP_Pedidos_Cancelar": {
                            const order = state.orders.get(inputs.p_order_id);
                            if (!order) {
                                const err: any = new Error("NO_ENCONTRADO: El pedido especificado no existe.");
                                err.number = 50001;
                                throw err;
                            }

                            if (!["CREADO", "PAGADO", "PREPARACION"].includes(order.status)) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: No se puede cancelar un pedido que ya ha sido despachado o entregado."
                                );
                                err.number = 50005;
                                throw err;
                            }

                            const items = state.orderItems.get(order.id) ?? [];
                            for (const oi of items) {
                                const qtyToRestore = oi.quantity - oi.returned_quantity;
                                if (qtyToRestore > 0) {
                                    const v = state.variants.get(oi.variant_id)!;
                                    const prev = v.stock_physical;
                                    v.stock_physical += qtyToRestore;
                                    state.kardex.push({
                                        variant_id: v.id,
                                        movement_type: "ENTRADA",
                                        quantity: qtyToRestore,
                                        previous_stock: prev,
                                        new_stock: v.stock_physical,
                                        reason: `Reintegro por cancelación de pedido ${order.order_number}: ${inputs.p_reason}`,
                                    });
                                }
                            }

                            const oldStatus = order.status;
                            order.status = "CANCELADO";
                            order.updated_at = new Date();
                            const history = state.statusHistory.get(order.id) ?? [];
                            history.push({
                                id: `osh-cancel-${order.id}`,
                                order_id: order.id,
                                user_id: inputs.p_user_id,
                                changed_by_name: "Usuario",
                                previous_status: oldStatus,
                                new_status: "CANCELADO",
                                changed_at: new Date(),
                            });
                            return buildOrderDetailResult(state, order.id);
                        }

                        case "SP_Pedidos_ProcesarDevolucion": {
                            const order = state.orders.get(inputs.p_order_id);
                            if (!order) {
                                const err: any = new Error("NO_ENCONTRADO: El pedido no existe.");
                                err.number = 50001;
                                throw err;
                            }

                            if (!["DESPACHADO", "ENTREGADO", "DEVUELTO"].includes(order.status)) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: Solo se pueden procesar devoluciones de pedidos despachados o entregados."
                                );
                                err.number = 50005;
                                throw err;
                            }

                            const items = state.orderItems.get(order.id) ?? [];
                            const targetItem = items.find((i) => i.id === inputs.p_order_item_id);
                            if (!targetItem) {
                                const err: any = new Error("NO_ENCONTRADO: El ítem indicado no pertenece al pedido.");
                                err.number = 50001;
                                throw err;
                            }

                            const qty = Number(inputs.p_quantity);
                            if (targetItem.returned_quantity + qty > targetItem.quantity) {
                                const err: any = new Error(
                                    "DATOS_INVALIDOS: No se puede devolver una cantidad mayor a la comprada."
                                );
                                err.number = 50005;
                                throw err;
                            }

                            targetItem.returned_quantity += qty;
                            targetItem.available_to_return =
                                targetItem.quantity - targetItem.returned_quantity;

                            const v = state.variants.get(targetItem.variant_id)!;
                            const prevStock = v.stock_physical;
                            v.stock_physical += qty;

                            state.kardex.push({
                                variant_id: v.id,
                                movement_type: "DEVOLUCION",
                                quantity: qty,
                                previous_stock: prevStock,
                                new_stock: v.stock_physical,
                                reason: `Devolución autorizada en pedido ${order.order_number}: ${inputs.p_reason}`,
                            });

                            const returns = state.orderReturns.get(order.id) ?? [];
                            returns.unshift({
                                id: `ret-${returns.length + 1}-${order.id}`,
                                order_id: order.id,
                                order_item_id: targetItem.id,
                                product_name: targetItem.product_name,
                                variant_sku: targetItem.variant_sku,
                                user_id: inputs.p_user_id,
                                processed_by_name: "Operador",
                                quantity: qty,
                                reason: inputs.p_reason,
                                created_at: new Date(),
                            });
                            state.orderReturns.set(order.id, returns);

                            const allReturned = items.every(
                                (i) => i.returned_quantity >= i.quantity
                            );
                            if (allReturned && order.status !== "DEVUELTO") {
                                const prev = order.status;
                                order.status = "DEVUELTO";
                                const history = state.statusHistory.get(order.id) ?? [];
                                history.push({
                                    id: `osh-ret-${order.id}`,
                                    order_id: order.id,
                                    user_id: inputs.p_user_id,
                                    changed_by_name: "Operador",
                                    previous_status: prev,
                                    new_status: "DEVUELTO",
                                    changed_at: new Date(),
                                });
                            }

                            return buildOrderDetailResult(state, order.id);
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

export async function runOrdersLifecycleAndCheckoutTestSuite() {
    console.log(
        "\n🧪 Starting Orders, 15-Min Reservation, Idempotent Atomic Checkout & Returns Test Suite (RF-01, RF-06, RF-07)..."
    );

    const state: MockOrdersState = {
        users: new Map([
            ["user-1", { id: "user-1", email: "cliente1@shopcart.gt", name: "Ana Morales" }],
            ["user-2", { id: "user-2", email: "cliente2@shopcart.gt", name: "Carlos Pérez" }],
            ["op-1", { id: "op-1", email: "operador@shopcart.gt", name: "Luis Operador" }],
        ]),
        addresses: new Map(),
        variants: new Map([
            [
                "var-console",
                {
                    id: "var-console",
                    product_id: "prod-console",
                    product_name: "Consola NextGen 1TB",
                    category_id: "cat-gaming",
                    sku: "CON-1TB-BLK",
                    price: 4000.0,
                    stock_physical: 3,
                    stock_reserved: 0,
                    is_active: 1,
                },
            ],
        ]),
        carts: new Map([
            ["cart-u1", { id: "cart-u1", user_id: "user-1" }],
            ["cart-u2", { id: "cart-u2", user_id: "user-2" }],
        ]),
        cartItems: [],
        reservations: [],
        coupons: new Map([
            [
                "cp-10",
                {
                    id: "cp-10",
                    code: "GAMER10",
                    discount_type: "PORCENTAJE",
                    discount_value: 10,
                    min_order_amount: 1000,
                    max_uses: 10,
                    current_uses: 0,
                    max_uses_per_client: 2,
                    category_id: null,
                    is_active: 1,
                },
            ],
        ]),
        orders: new Map(),
        orderItems: new Map(),
        statusHistory: new Map(),
        orderReturns: new Map(),
        kardex: [],
    };

    const mockPool = createMockOrdersPool(state);
    const ordersRepository = new MssqlOrdersRepository(async () => mockPool);

    const listAddressesUseCase = new ListAddressesUseCase(ordersRepository);
    const createAddressUseCase = new CreateAddressUseCase(ordersRepository);
    const deleteAddressUseCase = new DeleteAddressUseCase(ordersRepository);
    const reserveCheckoutUseCase = new ReserveCheckoutUseCase(ordersRepository);
    const createOrderUseCase = new CreateOrderUseCase(ordersRepository);
    const listOrdersUseCase = new ListOrdersUseCase(ordersRepository);
    const getOrderUseCase = new GetOrderUseCase(ordersRepository);
    const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(ordersRepository);
    const cancelOrderUseCase = new CancelOrderUseCase(ordersRepository);
    const processOrderReturnUseCase = new ProcessOrderReturnUseCase(ordersRepository);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Address Creation & Listing (RF-01)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [1/6]: Customer creates and lists shipping addresses...");
    const addr1 = await createAddressUseCase.execute({
        userId: "user-1",
        title: "Casa",
        recipientName: "Ana Morales",
        phone: "5555-1234",
        streetAddress: "6a Avenida 12-34 Zona 10",
        city: "Ciudad de Guatemala",
        state: "Guatemala",
        postalCode: "01010",
    });
    assert.equal(addr1.isDefault, true);

    const user1Addresses = await listAddressesUseCase.execute("user-1");
    assert.equal(user1Addresses.length, 1);
    assert.equal(user1Addresses[0]?.title, "Casa");
    console.log("✅ [1/6] Shipping address created and listed with automatic default flag.");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. 15-Minute Stock Reservation & Concurrency / Anti-Overselling (RF-06)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [2/6]: 15-minute stock reservation and anti-overselling when 2 users compete...");
    // Variant has 3 physical units. User-1 puts 2 in cart; User-2 puts 2 in cart.
    state.cartItems.push(
        { id: "ci-1", cart_id: "cart-u1", variant_id: "var-console", quantity: 2 },
        { id: "ci-2", cart_id: "cart-u2", variant_id: "var-console", quantity: 2 }
    );

    // User-1 enters checkout -> reserves 2 units for 15 minutes (StockReserved = 2, Available = 1)
    const reservation1 = await reserveCheckoutUseCase.execute("user-1");
    assert.equal(reservation1.reservedItemsCount, 1);
    assert.equal(state.variants.get("var-console")?.stock_reserved, 2);

    // User-2 tries to reserve 2 units while only 1 is available -> rejected with 409 INSUFFICIENT_STOCK
    await assert.rejects(
        async () => {
            await reserveCheckoutUseCase.execute("user-2");
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 409);
            assert.equal(err.code, "INSUFFICIENT_STOCK");
            return true;
        }
    );
    console.log("✅ [2/6] 15-minute reservation locked 2 units and prevented overselling to second user.");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Atomic Checkout with IdempotencyKey & Coupon Consumption (RF-06)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [3/6]: Atomic checkout with IdempotencyKey (double-click protection)...");
    const idempotencyKey = "idem-checkout-u1-0001";

    const createdOrder = await createOrderUseCase.execute({
        userId: "user-1",
        addressId: addr1.id,
        couponCode: "GAMER10",
        idempotencyKey,
    });

    assert.equal(createdOrder.status, "PAGADO");
    assert.equal(createdOrder.subtotal, 8000.0); // 2 * 4000
    assert.equal(createdOrder.discount, 800.0); // 10%
    assert.equal(createdOrder.total, 7200.0);
    // Physical stock decremented from 3 to 1; reserved stock released from 2 to 0
    assert.equal(state.variants.get("var-console")?.stock_physical, 1);
    assert.equal(state.variants.get("var-console")?.stock_reserved, 0);
    assert.equal(state.kardex.length, 1);
    assert.equal(state.kardex[0]?.movement_type, "SALIDA");
    assert.equal(state.kardex[0]?.quantity, -2);

    // Second call with the SAME idempotencyKey (simulating double click / network retry)
    const duplicateAttemptOrder = await createOrderUseCase.execute({
        userId: "user-1",
        addressId: addr1.id,
        couponCode: "GAMER10",
        idempotencyKey,
    });
    assert.equal(duplicateAttemptOrder.id, createdOrder.id);
    assert.equal(duplicateAttemptOrder.orderNumber, createdOrder.orderNumber);
    // Stock and Kardex must NOT be deducted a second time!
    assert.equal(state.variants.get("var-console")?.stock_physical, 1);
    assert.equal(state.kardex.length, 1);

    // Verify ownership check: User-2 (Cliente) cannot read User-1's order (403 FORBIDDEN)
    await assert.rejects(
        async () => {
            await getOrderUseCase.execute(createdOrder.id, {
                id: "user-2",
                roles: ["Cliente"],
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 403);
            assert.equal(err.code, "FORBIDDEN");
            return true;
        }
    );

    // Address used in an order cannot be deleted
    await assert.rejects(
        async () => {
            await deleteAddressUseCase.execute(addr1.id, "user-1");
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            return true;
        }
    );
    console.log("✅ [3/6] Atomic checkout succeeded, idempotency prevented duplicate charge, and 403 ownership check passed.");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Controlled State Machine Transitions (PAGADO -> PREPARACION -> DESPACHADO -> ENTREGADO)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [4/6]: Controlled state machine transitions and status history...");
    // Invalid jump PAGADO -> ENTREGADO must fail with 400
    await assert.rejects(
        async () => {
            await updateOrderStatusUseCase.execute(createdOrder.id, "ENTREGADO", "op-1");
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            return true;
        }
    );

    const inPrep = await updateOrderStatusUseCase.execute(createdOrder.id, "PREPARACION", "op-1");
    assert.equal(inPrep.status, "PREPARACION");

    const dispatched = await updateOrderStatusUseCase.execute(createdOrder.id, "DESPACHADO", "op-1");
    assert.equal(dispatched.status, "DESPACHADO");

    const delivered = await updateOrderStatusUseCase.execute(createdOrder.id, "ENTREGADO", "op-1");
    assert.equal(delivered.status, "ENTREGADO");
    assert.equal(delivered.statusHistory.length, 4); // NULL->PAGADO, PAGADO->PREPARACION, PREPARACION->DESPACHADO, DESPACHADO->ENTREGADO
    console.log("✅ [4/6] Controlled state transitions enforced and traced in OrderStatusHistory.");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Cancellation Rules (Blocked after DESPACHADO; Allowed before DESPACHADO with Kardex restock)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [5/6]: Cancellation blocked after dispatch, allowed before dispatch with Kardex restock...");
    // Trying to cancel an ENTREGADO/DESPACHADO order must fail with 400
    await assert.rejects(
        async () => {
            await cancelOrderUseCase.execute(
                createdOrder.id,
                { id: "op-1", roles: ["Operador"] },
                "Intento tardío"
            );
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /No se puede cancelar un pedido que ya ha sido despachado/i);
            return true;
        }
    );

    // Create a second order for user-1 with the remaining 1 unit in stock and cancel it while in PAGADO
    state.cartItems.push({
        id: "ci-u1-second",
        cart_id: "cart-u1",
        variant_id: "var-console",
        quantity: 1,
    });
    const secondOrder = await createOrderUseCase.execute({
        userId: "user-1",
        addressId: addr1.id,
        idempotencyKey: "idem-checkout-u1-0002",
    });
    assert.equal(state.variants.get("var-console")?.stock_physical, 0);

    const cancelledOrder = await cancelOrderUseCase.execute(
        secondOrder.id,
        { id: "user-1", roles: ["Cliente"] },
        "Cliente solicitó cambio de método de pago"
    );
    assert.equal(cancelledOrder.status, "CANCELADO");
    // Stock restored from 0 back to 1 and logged as ENTRADA in Kardex
    assert.equal(state.variants.get("var-console")?.stock_physical, 1);
    assert.equal(state.kardex.at(-1)?.movement_type, "ENTRADA");
    assert.equal(state.kardex.at(-1)?.quantity, 1);
    console.log("✅ [5/6] Cancellation blocked after dispatch and pre-dispatch cancellation restored stock via Kardex.");

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Partial & Total Item Returns with Kardex Restock & Over-return Rejection (RF-07)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("Testing [6/6]: Partial and total item returns with Kardex restock...");
    const orderItemId = delivered.items[0]!.id; // Purchased quantity = 2

    // Return 1 unit partially -> succeeds, stock goes from 1 to 2, status remains ENTREGADO
    const afterPartialReturn = await processOrderReturnUseCase.execute({
        orderId: delivered.id,
        orderItemId,
        quantity: 1,
        reason: "Empaque abierto",
        userId: "op-1",
    });
    assert.equal(afterPartialReturn.status, "ENTREGADO");
    assert.equal(afterPartialReturn.items[0]?.returnedQuantity, 1);
    assert.equal(afterPartialReturn.items[0]?.availableToReturn, 1);
    assert.equal(state.variants.get("var-console")?.stock_physical, 2);
    assert.equal(state.kardex.at(-1)?.movement_type, "DEVOLUCION");

    // Attempting to return 2 more units (1 + 2 = 3 > 2 purchased) must fail with 400
    await assert.rejects(
        async () => {
            await processOrderReturnUseCase.execute({
                orderId: delivered.id,
                orderItemId,
                quantity: 2,
                reason: "Exceso de cantidad",
                userId: "op-1",
            });
        },
        (err: any) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /No se puede devolver una cantidad mayor a la comprada/i);
            return true;
        }
    );

    // Return the remaining 1 unit -> all items returned, order status transitions to DEVUELTO
    const afterFullReturn = await processOrderReturnUseCase.execute({
        orderId: delivered.id,
        orderItemId,
        quantity: 1,
        reason: "Devolución de segunda unidad",
        userId: "op-1",
    });
    assert.equal(afterFullReturn.status, "DEVUELTO");
    assert.equal(afterFullReturn.items[0]?.returnedQuantity, 2);
    assert.equal(afterFullReturn.items[0]?.availableToReturn, 0);
    assert.equal(state.variants.get("var-console")?.stock_physical, 3);

    const listedAll = await listOrdersUseCase.execute({ page: 1, limit: 15 });
    assert.equal(listedAll.total, 2);
    console.log("✅ [6/6] Partial & full returns processed with Kardex restock and over-return rejected.");

    console.log(
        "\n🎉 ALL 6 ORDERS, RESERVATION, IDEMPOTENT CHECKOUT & RETURNS TEST SUITES PASSED SUCCESSFULLY!\n"
    );
}

const isDirect = process.argv[1] && process.argv[1].includes("orders.test.ts");
if (isDirect) {
    runOrdersLifecycleAndCheckoutTestSuite().catch((err) => {
        console.error("❌ Orders test suite failed:", err);
        process.exit(1);
    });
}

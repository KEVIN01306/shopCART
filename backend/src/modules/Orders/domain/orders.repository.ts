import type {
    CheckoutReservationResult,
    CreateOrderAtomicInput,
    CreateShippingAddress,
    ListOrdersOptions,
    OrderDetail,
    OrderStatus,
    OrderSummary,
    ProcessOrderReturnInput,
    ShippingAddress,
} from "./order.entity.js";

export interface OrdersRepository {
    listAddressesByUser(userId: string): Promise<ShippingAddress[]>;
    createAddress(data: CreateShippingAddress): Promise<ShippingAddress>;
    deleteAddress(id: string, userId: string): Promise<void>;

    reserveCartForCheckout(userId: string): Promise<CheckoutReservationResult>;
    createOrderAtomic(data: CreateOrderAtomicInput): Promise<OrderDetail>;

    findById(orderId: string): Promise<OrderDetail | null>;
    listOrders(
        options: ListOrdersOptions
    ): Promise<{ data: OrderSummary[]; total: number }>;

    advanceStatus(
        orderId: string,
        newStatus: OrderStatus,
        userId: string
    ): Promise<OrderDetail>;

    cancelOrder(
        orderId: string,
        userId: string,
        reason?: string
    ): Promise<OrderDetail>;

    processReturn(input: ProcessOrderReturnInput): Promise<OrderDetail>;
}

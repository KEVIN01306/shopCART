export type OrderStatus =
    | "CREADO"
    | "PAGADO"
    | "PREPARACION"
    | "DESPACHADO"
    | "ENTREGADO"
    | "CANCELADO"
    | "DEVUELTO";

export interface ShippingAddress {
    id: string;
    userId: string;
    title: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string | null;
    isDefault: boolean;
    createdAt: Date;
}

export interface CreateShippingAddress {
    id: string;
    userId: string;
    title: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode?: string | null;
    isDefault?: boolean;
}

export interface CheckoutReservationResult {
    cartId: string;
    expiresAt: Date;
    reservedItemsCount: number;
}

export interface OrderItem {
    id: string;
    orderId: string;
    variantId: string;
    productName: string;
    variantSku: string;
    attributes: Record<string, unknown>;
    mainImageUrl: string | null;
    unitPrice: number;
    quantity: number;
    returnedQuantity: number;
    availableToReturn: number;
    subtotal: number;
}

export interface OrderStatusHistoryEntry {
    id: string;
    orderId: string;
    userId: string | null;
    changedByName: string;
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus;
    changedAt: Date;
}

export interface OrderReturnEntry {
    id: string;
    orderId: string;
    orderItemId: string;
    productName: string;
    variantSku: string;
    userId: string;
    processedByName: string;
    quantity: number;
    reason: string;
    createdAt: Date;
}

export interface OrderSummary {
    id: string;
    orderNumber: string;
    userId: string;
    customerEmail: string;
    customerName: string;
    addressId: string;
    shippingAddressSummary: string;
    couponCode: string | null;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    itemsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderDetail {
    id: string;
    orderNumber: string;
    userId: string;
    customerEmail: string;
    customerName: string;
    address: {
        id: string;
        title: string;
        recipientName: string;
        phone: string;
        streetAddress: string;
        city: string;
        state: string;
        postalCode: string | null;
    };
    couponId: string | null;
    couponCode: string | null;
    idempotencyKey: string;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
    items: OrderItem[];
    statusHistory: OrderStatusHistoryEntry[];
    returns: OrderReturnEntry[];
}

export interface CreateOrderAtomicInput {
    orderId: string;
    orderNumber: string;
    userId: string;
    addressId: string;
    couponCode?: string | null;
    idempotencyKey: string;
}

export interface ListOrdersOptions {
    page?: number;
    limit?: number;
    userId?: string | null;
    status?: OrderStatus | string | null;
    q?: string | null;
    dateFrom?: Date | string | null;
    dateTo?: Date | string | null;
}

export interface ProcessOrderReturnInput {
    orderId: string;
    orderItemId: string;
    quantity: number;
    reason: string;
    userId: string;
}

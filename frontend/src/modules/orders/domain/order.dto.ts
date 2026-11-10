export type OrderStatus =
    | 'CREADO'
    | 'PAGADO'
    | 'PREPARACION'
    | 'DESPACHADO'
    | 'ENTREGADO'
    | 'CANCELADO'
    | 'DEVUELTO';

export interface ShippingAddressDto {
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
    createdAt: string;
}

export interface CreateShippingAddressPayload {
    title: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode?: string | null;
    isDefault?: boolean;
}

export interface CheckoutReservationDto {
    cartId: string;
    expiresAt: string;
    reservedItemsCount: number;
}

export interface OrderItemDto {
    id: string;
    orderId: string;
    variantId: string;
    productName: string;
    variantSku: string;
    attributes: Record<string, string>;
    mainImageUrl: string | null;
    unitPrice: number;
    quantity: number;
    returnedQuantity: number;
    availableToReturn: number;
    subtotal: number;
}

export interface OrderStatusHistoryDto {
    id: string;
    orderId: string;
    userId: string | null;
    changedByName: string;
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus;
    changedAt: string;
}

export interface OrderReturnDto {
    id: string;
    orderId: string;
    orderItemId: string;
    productName: string;
    variantSku: string;
    userId: string;
    processedByName: string;
    quantity: number;
    reason: string;
    createdAt: string;
}

export interface OrderSummaryDto {
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
    createdAt: string;
    updatedAt: string;
}

export interface OrderDetailDto {
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
    createdAt: string;
    updatedAt: string;
    items: OrderItemDto[];
    statusHistory: OrderStatusHistoryDto[];
    returns: OrderReturnDto[];
}

export interface PaginatedOrdersResponse {
    data: OrderSummaryDto[];
    total: number;
    limit: number;
    offset: number;
}

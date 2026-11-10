import type {
    CheckoutReservationResult,
    OrderDetail,
    OrderItem,
    OrderReturnEntry,
    OrderStatus,
    OrderStatusHistoryEntry,
    OrderSummary,
    ShippingAddress,
} from "../../domain/order.entity.js";

export interface AddressDbRow {
    id: string;
    user_id: string;
    title: string;
    recipient_name: string;
    phone: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string | null;
    is_default: boolean | number;
    created_at: Date;
}

export interface ReservationDbRow {
    cart_id: string;
    expires_at: Date;
    reserved_items_count: number;
}

export interface OrderSummaryDbRow {
    id: string;
    order_number: string;
    user_id: string;
    customer_email: string;
    customer_name: string;
    address_id: string;
    shipping_address_summary: string;
    coupon_code: string | null;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    items_count: number;
    created_at: Date;
    updated_at: Date;
    total_count?: number;
}

export interface OrderHeaderDbRow {
    id: string;
    order_number: string;
    user_id: string;
    customer_email: string;
    customer_name: string;
    address_id: string;
    address_title: string;
    recipient_name: string;
    recipient_phone: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string | null;
    coupon_id: string | null;
    coupon_code: string | null;
    idempotency_key: string;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    created_at: Date;
    updated_at: Date;
}

export interface OrderItemDbRow {
    id: string;
    order_id: string;
    variant_id: string;
    product_name: string;
    variant_sku: string;
    attributes: string | null;
    main_image_url: string | null;
    unit_price: number;
    quantity: number;
    returned_quantity: number;
    available_to_return: number;
    subtotal: number;
}

export interface OrderStatusHistoryDbRow {
    id: string;
    order_id: string;
    user_id: string | null;
    changed_by_name: string;
    previous_status: OrderStatus | null;
    new_status: OrderStatus;
    changed_at: Date;
}

export interface OrderReturnDbRow {
    id: string;
    order_id: string;
    order_item_id: string;
    product_name: string;
    variant_sku: string;
    user_id: string;
    processed_by_name: string;
    quantity: number;
    reason: string;
    created_at: Date;
}

function parseAttributes(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export class OrderMapper {
    static toAddress(row: AddressDbRow): ShippingAddress {
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            recipientName: row.recipient_name,
            phone: row.phone,
            streetAddress: row.street_address,
            city: row.city,
            state: row.state,
            postalCode: row.postal_code ?? null,
            isDefault: Boolean(row.is_default),
            createdAt: new Date(row.created_at),
        };
    }

    static toReservation(row: ReservationDbRow): CheckoutReservationResult {
        return {
            cartId: row.cart_id,
            expiresAt: new Date(row.expires_at),
            reservedItemsCount: Number(row.reserved_items_count ?? 0),
        };
    }

    static toSummary(row: OrderSummaryDbRow): OrderSummary {
        return {
            id: row.id,
            orderNumber: row.order_number,
            userId: row.user_id,
            customerEmail: row.customer_email,
            customerName: row.customer_name,
            addressId: row.address_id,
            shippingAddressSummary: row.shipping_address_summary,
            couponCode: row.coupon_code ?? null,
            status: row.status,
            subtotal: Number(row.subtotal ?? 0),
            discount: Number(row.discount ?? 0),
            total: Number(row.total ?? 0),
            itemsCount: Number(row.items_count ?? 0),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    static toOrderItem(row: OrderItemDbRow): OrderItem {
        return {
            id: row.id,
            orderId: row.order_id,
            variantId: row.variant_id,
            productName: row.product_name,
            variantSku: row.variant_sku,
            attributes: parseAttributes(row.attributes),
            mainImageUrl: row.main_image_url ?? null,
            unitPrice: Number(row.unit_price ?? 0),
            quantity: Number(row.quantity ?? 0),
            returnedQuantity: Number(row.returned_quantity ?? 0),
            availableToReturn: Number(
                row.available_to_return ??
                    Number(row.quantity ?? 0) - Number(row.returned_quantity ?? 0)
            ),
            subtotal: Number(row.subtotal ?? 0),
        };
    }

    static toStatusHistory(
        row: OrderStatusHistoryDbRow
    ): OrderStatusHistoryEntry {
        return {
            id: row.id,
            orderId: row.order_id,
            userId: row.user_id ?? null,
            changedByName: row.changed_by_name,
            previousStatus: row.previous_status ?? null,
            newStatus: row.new_status,
            changedAt: new Date(row.changed_at),
        };
    }

    static toReturnEntry(row: OrderReturnDbRow): OrderReturnEntry {
        return {
            id: row.id,
            orderId: row.order_id,
            orderItemId: row.order_item_id,
            productName: row.product_name,
            variantSku: row.variant_sku,
            userId: row.user_id,
            processedByName: row.processed_by_name,
            quantity: Number(row.quantity ?? 0),
            reason: row.reason,
            createdAt: new Date(row.created_at),
        };
    }

    static toDetail(
        header: OrderHeaderDbRow,
        items: OrderItemDbRow[] = [],
        history: OrderStatusHistoryDbRow[] = [],
        returns: OrderReturnDbRow[] = []
    ): OrderDetail {
        return {
            id: header.id,
            orderNumber: header.order_number,
            userId: header.user_id,
            customerEmail: header.customer_email,
            customerName: header.customer_name,
            address: {
                id: header.address_id,
                title: header.address_title,
                recipientName: header.recipient_name,
                phone: header.recipient_phone,
                streetAddress: header.street_address,
                city: header.city,
                state: header.state,
                postalCode: header.postal_code ?? null,
            },
            couponId: header.coupon_id ?? null,
            couponCode: header.coupon_code ?? null,
            idempotencyKey: header.idempotency_key,
            status: header.status,
            subtotal: Number(header.subtotal ?? 0),
            discount: Number(header.discount ?? 0),
            total: Number(header.total ?? 0),
            createdAt: new Date(header.created_at),
            updatedAt: new Date(header.updated_at),
            items: items.map((r) => OrderMapper.toOrderItem(r)),
            statusHistory: history.map((r) => OrderMapper.toStatusHistory(r)),
            returns: returns.map((r) => OrderMapper.toReturnEntry(r)),
        };
    }
}

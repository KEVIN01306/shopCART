import type { Cart, CartBase, CartItem } from "../../domain/cart.entity.js";
import { calculateCartTotals } from "../../domain/cart.entity.js";

export interface CartDbRow {
    id: string;
    user_id: string | null;
    guest_token: string | null;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface CartItemDbRow {
    item_id: string;
    cart_id: string;
    variant_id: string;
    quantity: number;
    created_at?: Date | string;
    updated_at?: Date | string;
    sku: string;
    attributes: string | Record<string, any> | null;
    price: number | string;
    stock_physical: number;
    stock_reserved: number;
    stock_available: number;
    product_id: string;
    product_name: string;
    main_image_url: string | null;
    category_name: string;
}

export class CartMapper {
    static toCartBase(row: CartDbRow): CartBase {
        return {
            id: row.id,
            userId: row.user_id ?? null,
            guestToken: row.guest_token ?? null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    static toCartItem(row: CartItemDbRow): CartItem {
        let parsedAttributes: Record<string, any> | null = null;
        if (typeof row.attributes === "string") {
            try {
                parsedAttributes = JSON.parse(row.attributes);
            } catch {
                parsedAttributes = null;
            }
        } else if (row.attributes && typeof row.attributes === "object") {
            parsedAttributes = row.attributes;
        }

        const price = Number(row.price);
        const quantity = Number(row.quantity);
        const itemTotal = Number((price * quantity).toFixed(2));

        return {
            id: row.item_id,
            cartId: row.cart_id,
            variantId: row.variant_id,
            quantity,
            sku: row.sku,
            attributes: parsedAttributes,
            price,
            stockPhysical: Number(row.stock_physical),
            reservedStock: Number(row.stock_reserved),
            availableStock: Number(row.stock_available),
            productId: row.product_id,
            productName: row.product_name,
            mainImageUrl: row.main_image_url ?? null,
            categoryName: row.category_name,
            itemTotal,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        };
    }

    static toFullCart(cartBase: CartBase, items: CartItem[]): Cart {
        const { itemCount, subtotal } = calculateCartTotals(items);
        return {
            ...cartBase,
            items,
            itemCount,
            subtotal,
        };
    }
}

import type { Cart, CartBase, CartItem } from "../../domain/cart.entity.js";
import { calculateCartTotals } from "../../domain/cart.entity.js";

export interface CartDbRow {
    id: string;
    user_id: string | null;
    guest_token: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    // Dual compatibility with PascalCase schema (Carts)
    IDCart?: string;
    IDUser?: string | null;
    GuestToken?: string | null;
    CreatedAt?: Date | string;
    UpdatedAt?: Date | string;
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
    category_id?: string;
    category_name: string;
    // Dual compatibility with PascalCase schema (CartItems / ProductVariants / Products / ProductImages)
    IDCartItem?: string;
    IDCart?: string;
    IDVariant?: string;
    Quantity?: number;
    CreatedAt?: Date | string;
    UpdatedAt?: Date | string;
    SKU?: string;
    Attributes?: string | Record<string, any> | null;
    Price?: number | string;
    StockPhysical?: number;
    StockReserved?: number;
    IDProduct?: string;
    IDCategory?: string;
    ImageURL?: string | null;
}

export class CartMapper {
    static toCartBase(row: CartDbRow): CartBase {
        return {
            id: row.id ?? row.IDCart ?? '',
            userId: row.user_id ?? row.IDUser ?? null,
            guestToken: row.guest_token ?? row.GuestToken ?? null,
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
            updatedAt: new Date(row.updated_at ?? row.UpdatedAt ?? new Date()),
        };
    }

    static toCartItem(row: CartItemDbRow): CartItem {
        const rawAttributes = row.attributes ?? row.Attributes;
        let parsedAttributes: Record<string, any> | null = null;
        if (typeof rawAttributes === "string") {
            try {
                parsedAttributes = JSON.parse(rawAttributes);
            } catch {
                parsedAttributes = null;
            }
        } else if (rawAttributes && typeof rawAttributes === "object") {
            parsedAttributes = rawAttributes;
        }

        const price = Number(row.price ?? row.Price ?? 0);
        const quantity = Number(row.quantity ?? row.Quantity ?? 0);
        const itemTotal = Number((price * quantity).toFixed(2));
        const stockPhysical = Number(row.stock_physical ?? row.StockPhysical ?? 0);
        const reservedStock = Number(row.stock_reserved ?? row.StockReserved ?? 0);
        const availableStock =
            row.stock_available !== undefined
                ? Number(row.stock_available)
                : stockPhysical - reservedStock;
        const createdRaw = row.created_at ?? row.CreatedAt;
        const updatedRaw = row.updated_at ?? row.UpdatedAt;

        return {
            id: row.item_id ?? row.IDCartItem ?? '',
            cartId: row.cart_id ?? row.IDCart ?? '',
            variantId: row.variant_id ?? row.IDVariant ?? '',
            quantity,
            sku: row.sku ?? row.SKU ?? '',
            attributes: parsedAttributes,
            price,
            stockPhysical,
            reservedStock,
            availableStock,
            productId: row.product_id ?? row.IDProduct ?? '',
            productName: row.product_name,
            mainImageUrl: row.main_image_url ?? row.ImageURL ?? null,
            categoryId: row.category_id ?? row.IDCategory ?? undefined,
            categoryName: row.category_name,
            itemTotal,
            createdAt: createdRaw ? new Date(createdRaw) : new Date(),
            updatedAt: updatedRaw ? new Date(updatedRaw) : new Date(),
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

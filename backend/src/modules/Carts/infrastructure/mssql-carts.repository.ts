import { getPool, sql } from "@infrastructure/config/mssql.config.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import type { CartsRepository, GetOrCreateCartParams } from "../domain/carts.repository.js";
import type { CartBase, CartItem } from "../domain/cart.entity.js";
import { CartMapper, type CartDbRow, type CartItemDbRow } from "./mappers/cart.mapper.js";

export class MssqlCartsRepository implements CartsRepository {
    constructor(
        private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool
    ) {}

    async getOrCreateCart(params: GetOrCreateCartParams): Promise<CartBase> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_user_id", sql.VarChar(36), params.userId ?? null)
                .input("p_guest_token", sql.VarChar(255), params.guestToken ?? null)
                .execute<CartDbRow>("SP_Carritos_ObtenerOcrear");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CartMapper.toCartBase(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async getCartDetails(cartId: string): Promise<CartItem[]> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_cart_id", sql.VarChar(36), cartId)
                .execute<CartItemDbRow>("SP_Carritos_ObtenerDetalle");

            const rows = result.recordset ?? [];
            return rows.map((r) => CartMapper.toCartItem(r));
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async addItem(cartId: string, variantId: string, quantity: number): Promise<CartItem> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_cart_id", sql.VarChar(36), cartId)
                .input("p_variant_id", sql.VarChar(36), variantId)
                .input("p_quantity", sql.Int, quantity)
                .execute<CartItemDbRow>("SP_Carritos_AgregarOActualizarItem");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CartMapper.toCartItem(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateItemQuantity(cartId: string, variantId: string, quantity: number): Promise<CartItem | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_cart_id", sql.VarChar(36), cartId)
                .input("p_variant_id", sql.VarChar(36), variantId)
                .input("p_quantity", sql.Int, quantity)
                .execute<CartItemDbRow>("SP_Carritos_ActualizarCantidadItem");

            const row = result.recordset?.[0];
            return row ? CartMapper.toCartItem(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async removeItem(cartId: string, variantId: string): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_cart_id", sql.VarChar(36), cartId)
                .input("p_variant_id", sql.VarChar(36), variantId)
                .execute("SP_Carritos_EliminarItem");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async clearCart(cartId: string): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_cart_id", sql.VarChar(36), cartId)
                .execute("SP_Carritos_Vaciar");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async syncGuestCart(userId: string, guestToken: string): Promise<CartBase> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_user_id", sql.VarChar(36), userId)
                .input("p_guest_token", sql.VarChar(255), guestToken)
                .execute<CartDbRow>("SP_Carritos_SincronizarInvitado");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }

            return CartMapper.toCartBase(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}

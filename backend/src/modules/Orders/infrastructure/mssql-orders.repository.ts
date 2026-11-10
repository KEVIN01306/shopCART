import sql from "mssql";
import type { OrdersRepository } from "../domain/orders.repository.js";
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
} from "../domain/order.entity.js";
import {
    OrderMapper,
    type AddressDbRow,
    type OrderHeaderDbRow,
    type OrderItemDbRow,
    type OrderReturnDbRow,
    type OrderStatusHistoryDbRow,
    type OrderSummaryDbRow,
    type ReservationDbRow,
} from "./mappers/order.mapper.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";

export type PoolProvider = () => Promise<sql.ConnectionPool>;

export class MssqlOrdersRepository implements OrdersRepository {
    constructor(private readonly getPool: PoolProvider) {}

    private extractMultiSetOrderDetail(
        result: sql.IProcedureResult<unknown>
    ): OrderDetail | null {
        const recordsets = result.recordsets as unknown as [
            OrderHeaderDbRow[]?,
            OrderItemDbRow[]?,
            OrderStatusHistoryDbRow[]?,
            OrderReturnDbRow[]?,
        ];

        const header =
            recordsets?.[0]?.[0] ??
            ((result.recordset as unknown as OrderHeaderDbRow[])?.[0] ||
                undefined);

        if (!header) {
            return null;
        }

        const items = recordsets?.[1] ?? [];
        const history = recordsets?.[2] ?? [];
        const returns = recordsets?.[3] ?? [];

        return OrderMapper.toDetail(header, items, history, returns);
    }

    async listAddressesByUser(userId: string): Promise<ShippingAddress[]> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_user_id", sql.VarChar(36), userId)
                .execute<AddressDbRow>("SP_Direcciones_ListarPorUsuario");

            const rows = result.recordset ?? [];
            return rows.map((r) => OrderMapper.toAddress(r));
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async createAddress(data: CreateShippingAddress): Promise<ShippingAddress> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), data.id)
                .input("p_user_id", sql.VarChar(36), data.userId)
                .input("p_title", sql.VarChar(50), data.title)
                .input("p_recipient_name", sql.VarChar(150), data.recipientName)
                .input("p_phone", sql.VarChar(20), data.phone)
                .input("p_street_address", sql.VarChar(255), data.streetAddress)
                .input("p_city", sql.VarChar(100), data.city)
                .input("p_state", sql.VarChar(100), data.state)
                .input(
                    "p_postal_code",
                    sql.VarChar(20),
                    data.postalCode ?? null
                )
                .input("p_is_default", sql.Bit, data.isDefault ? 1 : 0)
                .execute<AddressDbRow>("SP_Direcciones_Crear");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return OrderMapper.toAddress(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async deleteAddress(id: string, userId: string): Promise<void> {
        try {
            const pool = await this.getPool();
            await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_user_id", sql.VarChar(36), userId)
                .execute("SP_Direcciones_Eliminar");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async reserveCartForCheckout(
        userId: string
    ): Promise<CheckoutReservationResult> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_user_id", sql.VarChar(36), userId)
                .execute<ReservationDbRow>("SP_Checkout_IniciarReservaCarrito");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return OrderMapper.toReservation(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async createOrderAtomic(
        data: CreateOrderAtomicInput
    ): Promise<OrderDetail> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_order_id", sql.VarChar(36), data.orderId)
                .input("p_order_number", sql.VarChar(30), data.orderNumber)
                .input("p_user_id", sql.VarChar(36), data.userId)
                .input("p_address_id", sql.VarChar(36), data.addressId)
                .input(
                    "p_coupon_code",
                    sql.VarChar(50),
                    data.couponCode ?? null
                )
                .input(
                    "p_idempotency_key",
                    sql.VarChar(100),
                    data.idempotencyKey
                )
                .execute("SP_Pedidos_CrearCheckoutAtomico");

            const detail = this.extractMultiSetOrderDetail(result);
            if (!detail) {
                throw new NotFoundPersistenceError();
            }
            return detail;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async findById(orderId: string): Promise<OrderDetail | null> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_order_id", sql.VarChar(36), orderId)
                .execute("SP_Pedidos_ObtenerDetalle");

            return this.extractMultiSetOrderDetail(result);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async listOrders(
        options: ListOrdersOptions
    ): Promise<{ data: OrderSummary[]; total: number }> {
        try {
            const pool = await this.getPool();
            const page = options.page ?? 1;
            const limit = options.limit ?? 15;

            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input("p_user_id", sql.VarChar(36), options.userId ?? null)
                .input(
                    "p_status",
                    sql.VarChar(30),
                    options.status ? String(options.status) : null
                )
                .input("p_q", sql.NVarChar(100), options.q ?? null)
                .input(
                    "p_date_from",
                    sql.DateTime2,
                    options.dateFrom ? new Date(options.dateFrom) : null
                )
                .input(
                    "p_date_to",
                    sql.DateTime2,
                    options.dateTo ? new Date(options.dateTo) : null
                )
                .execute<OrderSummaryDbRow>("SP_Pedidos_Listar");

            const rows = result.recordset ?? [];
            const data = rows.map((r) => OrderMapper.toSummary(r));
            const total =
                rows.length > 0
                    ? Number(rows[0]?.total_count ?? rows.length)
                    : 0;

            return { data, total };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async advanceStatus(
        orderId: string,
        newStatus: OrderStatus,
        userId: string
    ): Promise<OrderDetail> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_order_id", sql.VarChar(36), orderId)
                .input("p_new_status", sql.VarChar(30), newStatus)
                .input("p_user_id", sql.VarChar(36), userId)
                .execute("SP_Pedidos_AvanzarEstado");

            const detail = this.extractMultiSetOrderDetail(result);
            if (!detail) {
                throw new NotFoundPersistenceError();
            }
            return detail;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async cancelOrder(
        orderId: string,
        userId: string,
        reason?: string
    ): Promise<OrderDetail> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_order_id", sql.VarChar(36), orderId)
                .input("p_user_id", sql.VarChar(36), userId)
                .input(
                    "p_reason",
                    sql.NVarChar(255),
                    reason?.trim() || "Cancelación de pedido"
                )
                .execute("SP_Pedidos_Cancelar");

            const detail = this.extractMultiSetOrderDetail(result);
            if (!detail) {
                throw new NotFoundPersistenceError();
            }
            return detail;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async processReturn(input: ProcessOrderReturnInput): Promise<OrderDetail> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_order_id", sql.VarChar(36), input.orderId)
                .input("p_order_item_id", sql.VarChar(36), input.orderItemId)
                .input("p_quantity", sql.Int, input.quantity)
                .input("p_reason", sql.NVarChar(255), input.reason)
                .input("p_user_id", sql.VarChar(36), input.userId)
                .execute("SP_Pedidos_ProcesarDevolucion");

            const detail = this.extractMultiSetOrderDetail(result);
            if (!detail) {
                throw new NotFoundPersistenceError();
            }
            return detail;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }
}

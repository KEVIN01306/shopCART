import "dotenv/config";
import assert from "node:assert/strict";
import type sql from "mssql";
import { MssqlReportsRepository } from "./infrastructure/mssql-reports.repository.js";
import { GetDashboardMetricsUseCase } from "./application/get-dashboard-metrics.usecase.js";
import { ListAuditLogsUseCase } from "./application/list-audit-logs.usecase.js";
import type { AuditLogDbRow } from "./infrastructure/mappers/report.mapper.js";
import AppError from "@shared/errors/AppError.js";

interface MockOrderRow {
    id: string;
    status:
        | "CREADO"
        | "PAGADO"
        | "PREPARACION"
        | "DESPACHADO"
        | "ENTREGADO"
        | "CANCELADO"
        | "DEVUELTO";
    total: number;
    created_at: Date;
}

interface MockOrderItemRow {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    category_id: string;
    category_name: string;
    unit_price: number;
    quantity: number;
    returned_quantity: number;
}

interface MockReportsState {
    orders: MockOrderRow[];
    orderItems: MockOrderItemRow[];
    auditLogs: AuditLogDbRow[];
}

function getIsoWeekLabel(d: Date): string {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
        ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function createMockReportsPool(state: MockReportsState): sql.ConnectionPool {
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
                        case "SP_Reportes_ObtenerDashboard": {
                            const dateFrom = inputs.p_date_from
                                ? new Date(inputs.p_date_from).getTime()
                                : null;
                            const dateTo = inputs.p_date_to
                                ? new Date(inputs.p_date_to).getTime()
                                : null;
                            const granularity: "day" | "week" | "month" =
                                inputs.p_granularity === "week" ||
                                inputs.p_granularity === "month"
                                    ? inputs.p_granularity
                                    : "day";

                            const inDateRange = (d: Date) => {
                                const t = d.getTime();
                                if (dateFrom !== null && t < dateFrom)
                                    return false;
                                if (dateTo !== null && t > dateTo) return false;
                                return true;
                            };

                            const validStatuses = new Set([
                                "PAGADO",
                                "PREPARACION",
                                "DESPACHADO",
                                "ENTREGADO",
                            ]);

                            const validOrders: Array<{
                                order: MockOrderRow;
                                netTotal: number;
                                netUnits: number;
                            }> = [];

                            let cancelledCount = 0;
                            let returnedUnitsCount = 0;

                            for (const order of state.orders) {
                                if (!inDateRange(order.created_at)) continue;

                                if (order.status === "CANCELADO") {
                                    cancelledCount += 1;
                                }

                                const items = state.orderItems.filter(
                                    (oi) => oi.order_id === order.id
                                );
                                let returnedValue = 0;
                                let netUnits = 0;

                                for (const item of items) {
                                    returnedUnitsCount += item.returned_quantity;
                                    returnedValue +=
                                        item.returned_quantity *
                                        item.unit_price;
                                    netUnits +=
                                        item.quantity - item.returned_quantity;
                                }

                                if (
                                    validStatuses.has(order.status) &&
                                    netUnits > 0
                                ) {
                                    const netTotal = Math.max(
                                        0,
                                        Number(
                                            (
                                                order.total - returnedValue
                                            ).toFixed(2)
                                        )
                                    );
                                    validOrders.push({
                                        order,
                                        netTotal,
                                        netUnits,
                                    });
                                }
                            }

                            const totalRevenue = Number(
                                validOrders
                                    .reduce((acc, v) => acc + v.netTotal, 0)
                                    .toFixed(2)
                            );
                            const totalOrders = validOrders.length;
                            const averageTicket =
                                totalOrders > 0
                                    ? Number(
                                          (totalRevenue / totalOrders).toFixed(
                                              2
                                          )
                                      )
                                    : 0;
                            const totalUnitsSold = validOrders.reduce(
                                (acc, v) => acc + v.netUnits,
                                0
                            );

                            const kpiRow = {
                                total_revenue_gtq: totalRevenue,
                                total_orders: totalOrders,
                                average_ticket_gtq: averageTicket,
                                total_units_sold: totalUnitsSold,
                                cancelled_orders_count: cancelledCount,
                                returned_units_count: returnedUnitsCount,
                            };

                            // Resultset 2: Sales Series
                            const seriesMap = new Map<
                                string,
                                { revenue: number; count: number }
                            >();
                            for (const vo of validOrders) {
                                const d = vo.order.created_at;
                                const iso = d.toISOString();
                                const label =
                                    granularity === "week"
                                        ? getIsoWeekLabel(d)
                                        : granularity === "month"
                                        ? iso.slice(0, 7)
                                        : iso.slice(0, 10);

                                const current = seriesMap.get(label) ?? {
                                    revenue: 0,
                                    count: 0,
                                };
                                current.revenue = Number(
                                    (current.revenue + vo.netTotal).toFixed(2)
                                );
                                current.count += 1;
                                seriesMap.set(label, current);
                            }

                            const seriesRows = Array.from(seriesMap.entries())
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([period_label, val]) => ({
                                    period_label,
                                    revenue_gtq: val.revenue,
                                    orders_count: val.count,
                                }));

                            // Resultset 3: Sales by Category
                            const validOrderIds = new Set(
                                validOrders.map((vo) => vo.order.id)
                            );
                            const categoryMap = new Map<
                                string,
                                {
                                    category_id: string;
                                    category_name: string;
                                    units_sold: number;
                                    revenue_gtq: number;
                                    orderIds: Set<string>;
                                }
                            >();

                            // Resultset 4: Top 10 Products
                            const productMap = new Map<
                                string,
                                {
                                    product_id: string;
                                    product_name: string;
                                    category_name: string;
                                    units_sold: number;
                                    revenue_gtq: number;
                                }
                            >();

                            for (const item of state.orderItems) {
                                if (!validOrderIds.has(item.order_id)) continue;
                                const netQty =
                                    item.quantity - item.returned_quantity;
                                if (netQty <= 0) continue;
                                const itemRev = Number(
                                    (netQty * item.unit_price).toFixed(2)
                                );

                                const cat = categoryMap.get(
                                    item.category_id
                                ) ?? {
                                    category_id: item.category_id,
                                    category_name: item.category_name,
                                    units_sold: 0,
                                    revenue_gtq: 0,
                                    orderIds: new Set<string>(),
                                };
                                cat.units_sold += netQty;
                                cat.revenue_gtq = Number(
                                    (cat.revenue_gtq + itemRev).toFixed(2)
                                );
                                cat.orderIds.add(item.order_id);
                                categoryMap.set(item.category_id, cat);

                                const prod = productMap.get(
                                    item.product_id
                                ) ?? {
                                    product_id: item.product_id,
                                    product_name: item.product_name,
                                    category_name: item.category_name,
                                    units_sold: 0,
                                    revenue_gtq: 0,
                                };
                                prod.units_sold += netQty;
                                prod.revenue_gtq = Number(
                                    (prod.revenue_gtq + itemRev).toFixed(2)
                                );
                                productMap.set(item.product_id, prod);
                            }

                            const categoryRows = Array.from(
                                categoryMap.values()
                            )
                                .map((c) => ({
                                    category_id: c.category_id,
                                    category_name: c.category_name,
                                    units_sold: c.units_sold,
                                    revenue_gtq: c.revenue_gtq,
                                    orders_count: c.orderIds.size,
                                }))
                                .sort((a, b) => b.revenue_gtq - a.revenue_gtq);

                            const topProductRows = Array.from(
                                productMap.values()
                            )
                                .sort((a, b) =>
                                    b.units_sold !== a.units_sold
                                        ? b.units_sold - a.units_sold
                                        : b.revenue_gtq - a.revenue_gtq
                                )
                                .slice(0, 10);

                            return {
                                recordsets: [
                                    [kpiRow],
                                    seriesRows,
                                    categoryRows,
                                    topProductRows,
                                ],
                                recordset: [kpiRow],
                            };
                        }

                        case "SP_Auditoria_ListarPaginado": {
                            const page = Math.max(1, inputs.p_page || 1);
                            const limit = Math.max(1, inputs.p_limit || 20);
                            const entity = inputs.p_entity || null;
                            const action = inputs.p_action || null;
                            const q = inputs.p_q
                                ? String(inputs.p_q).toLowerCase()
                                : null;

                            const filtered = state.auditLogs
                                .filter((row) => {
                                    if (entity && row.entity !== entity)
                                        return false;
                                    if (action && row.action !== action)
                                        return false;
                                    if (q) {
                                        const hay = `${row.entity} ${row.action} ${row.old_value ?? ""} ${row.new_value ?? ""} ${row.user_name ?? ""} ${row.user_email ?? ""}`.toLowerCase();
                                        if (!hay.includes(q)) return false;
                                    }
                                    return true;
                                })
                                .sort(
                                    (a, b) =>
                                        new Date(b.created_at).getTime() -
                                        new Date(a.created_at).getTime()
                                );

                            const total = filtered.length;
                            const offset = (page - 1) * limit;
                            const slice = filtered
                                .slice(offset, offset + limit)
                                .map((r) => ({ ...r, total_count: total }));

                            return { recordset: slice };
                        }

                        default:
                            throw new Error(`Unexpected SP: ${spName}`);
                    }
                },
            };
            return req;
        },
    };

    return pool as unknown as sql.ConnectionPool;
}

async function runTests() {
    console.log(
        "Running Reports & AuditLogs (RF-08, RF-09) unit tests..."
    );

    const state: MockReportsState = {
        orders: [
            // 1. Pedido ENTREGADO sin devoluciones: Q1,500.00 (2 uds * Q750)
            {
                id: "ord-1",
                status: "ENTREGADO",
                total: 1500.0,
                created_at: new Date("2026-10-05T10:00:00Z"),
            },
            // 2. Pedido ENTREGADO con devolución parcial: Total original Q1,000.00 (2 uds * Q500), 1 devuelta (-Q500) => Neto Q500.00
            {
                id: "ord-2",
                status: "ENTREGADO",
                total: 1000.0,
                created_at: new Date("2026-10-05T15:30:00Z"),
            },
            // 3. Pedido PAGADO válido en otro mes: Q300.00 (3 uds * Q100)
            {
                id: "ord-3",
                status: "PAGADO",
                total: 300.0,
                created_at: new Date("2026-11-02T12:00:00Z"),
            },
            // 4. Pedido CANCELADO: Q2,000.00 — DEBE EXCLUIRSE de ingresos y pedidos completados
            {
                id: "ord-4",
                status: "CANCELADO",
                total: 2000.0,
                created_at: new Date("2026-10-06T09:00:00Z"),
            },
            // 5. Pedido DEVUELTO total: Q400.00 (1 ud * Q400, 1 devuelta) — DEBE EXCLUIRSE
            {
                id: "ord-5",
                status: "DEVUELTO",
                total: 400.0,
                created_at: new Date("2026-10-07T11:00:00Z"),
            },
        ],
        orderItems: [
            {
                id: "oi-1",
                order_id: "ord-1",
                product_id: "prod-laptop",
                product_name: "Monitor Gamer 27\"",
                category_id: "cat-tech",
                category_name: "Tecnología",
                unit_price: 750.0,
                quantity: 2,
                returned_quantity: 0,
            },
            {
                id: "oi-2",
                order_id: "ord-2",
                product_id: "prod-headset",
                product_name: "Audífonos Pro Wireless",
                category_id: "cat-audio",
                category_name: "Audio",
                unit_price: 500.0,
                quantity: 2,
                returned_quantity: 1, // 1 devuelta -> queda 1 neta (Q500)
            },
            {
                id: "oi-3",
                order_id: "ord-3",
                product_id: "prod-mouse",
                product_name: "Mouse Óptico RGB",
                category_id: "cat-tech",
                category_name: "Tecnología",
                unit_price: 100.0,
                quantity: 3,
                returned_quantity: 0,
            },
            {
                id: "oi-4",
                order_id: "ord-4",
                product_id: "prod-laptop",
                product_name: "Monitor Gamer 27\"",
                category_id: "cat-tech",
                category_name: "Tecnología",
                unit_price: 1000.0,
                quantity: 2,
                returned_quantity: 0,
            },
            {
                id: "oi-5",
                order_id: "ord-5",
                product_id: "prod-keyboard",
                product_name: "Teclado Mecánico",
                category_id: "cat-tech",
                category_name: "Tecnología",
                unit_price: 400.0,
                quantity: 1,
                returned_quantity: 1,
            },
        ],
        auditLogs: [
            {
                id: "aud-1",
                user_id: "u-admin",
                user_name: "Admin Principal",
                user_email: "admin@shopcart.com",
                user_role: "Administrador",
                entity: "PRECIO",
                action: "CAMBIO_PRECIO",
                old_value: JSON.stringify({ SKU: "MON-27", Price: 700.0 }),
                new_value: JSON.stringify({ SKU: "MON-27", Price: 750.0 }),
                created_at: new Date("2026-10-01T08:00:00Z"),
            },
            {
                id: "aud-2",
                user_id: "u-oper",
                user_name: "Operador Bodega",
                user_email: "operador@shopcart.com",
                user_role: "Operador",
                entity: "EXISTENCIA",
                action: "AJUSTE_STOCK",
                old_value: JSON.stringify({ StockPhysical: 10 }),
                new_value: JSON.stringify({ StockPhysical: 25 }),
                created_at: new Date("2026-10-03T10:00:00Z"),
            },
            {
                id: "aud-3",
                user_id: "u-oper",
                user_name: "Operador Bodega",
                user_email: "operador@shopcart.com",
                user_role: "Operador",
                entity: "PEDIDO",
                action: "CAMBIO_ESTADO_PEDIDO",
                old_value: JSON.stringify({ Status: "PAGADO" }),
                new_value: JSON.stringify({ Status: "ENTREGADO" }),
                created_at: new Date("2026-10-05T16:00:00Z"),
            },
            {
                id: "aud-4",
                user_id: "u-admin",
                user_name: "Admin Principal",
                user_email: "admin@shopcart.com",
                user_role: "Administrador",
                entity: "CUPON",
                action: "CREAR_CUPON",
                old_value: null,
                new_value: JSON.stringify({
                    Code: "PROMO10",
                    DiscountValue: 10,
                }),
                created_at: new Date("2026-10-08T11:00:00Z"),
            },
        ],
    };

    const pool = createMockReportsPool(state);
    const repo = new MssqlReportsRepository(async () => pool);
    const getDashboardUseCase = new GetDashboardMetricsUseCase(repo);
    const listAuditLogsUseCase = new ListAuditLogsUseCase(repo);

    // Test 1: KPIs netos en GTQ (Excluye CANCELADO y DEVUELTO total, descuenta devoluciones parciales)
    const dashboardDay = await getDashboardUseCase.execute({
        granularity: "day",
    });

    // Ingresos netos esperados: ord-1 (1500) + ord-2 (1000 - 500 = 500) + ord-3 (300) = Q2,300.00
    assert.equal(dashboardDay.kpis.totalRevenueGtq, 2300.0);
    // Pedidos completados válidos: ord-1, ord-2, ord-3 = 3
    assert.equal(dashboardDay.kpis.totalOrders, 3);
    // Ticket promedio: 2300 / 3 = 766.67
    assert.equal(dashboardDay.kpis.averageTicketGtq, 766.67);
    // Unidades netas vendidas: 2 + (2 - 1) + 3 = 6
    assert.equal(dashboardDay.kpis.totalUnitsSold, 6);
    // Cancelados: 1 (ord-4)
    assert.equal(dashboardDay.kpis.cancelledOrdersCount, 1);
    // Unidades devueltas totales: 1 (ord-2) + 1 (ord-5) = 2
    assert.equal(dashboardDay.kpis.returnedUnitsCount, 2);

    // Test 2: Serie de ventas por Día y por Mes
    assert.equal(dashboardDay.salesSeries.length, 2);
    assert.deepEqual(dashboardDay.salesSeries[0], {
        periodLabel: "2026-10-05",
        revenueGtq: 2000.0,
        ordersCount: 2,
    });
    assert.deepEqual(dashboardDay.salesSeries[1], {
        periodLabel: "2026-11-02",
        revenueGtq: 300.0,
        ordersCount: 1,
    });

    const dashboardMonth = await getDashboardUseCase.execute({
        granularity: "month",
    });
    assert.equal(dashboardMonth.salesSeries.length, 2);
    assert.equal(dashboardMonth.salesSeries[0]?.periodLabel, "2026-10");
    assert.equal(dashboardMonth.salesSeries[0]?.revenueGtq, 2000.0);
    assert.equal(dashboardMonth.salesSeries[1]?.periodLabel, "2026-11");
    assert.equal(dashboardMonth.salesSeries[1]?.revenueGtq, 300.0);

    // Test 3: Ventas por Categoría y Top 10 Productos Más Vendidos
    assert.equal(dashboardDay.salesByCategory.length, 2);
    assert.equal(dashboardDay.salesByCategory[0]?.categoryName, "Tecnología");
    assert.equal(dashboardDay.salesByCategory[0]?.revenueGtq, 1800.0);
    assert.equal(dashboardDay.salesByCategory[0]?.unitsSold, 5);
    assert.equal(dashboardDay.salesByCategory[1]?.categoryName, "Audio");
    assert.equal(dashboardDay.salesByCategory[1]?.revenueGtq, 500.0);
    assert.equal(dashboardDay.salesByCategory[1]?.unitsSold, 1);

    assert.equal(dashboardDay.topProducts.length, 3);
    assert.equal(
        dashboardDay.topProducts[0]?.productName,
        "Mouse Óptico RGB"
    );
    assert.equal(dashboardDay.topProducts[0]?.unitsSold, 3);
    assert.equal(
        dashboardDay.topProducts[1]?.productName,
        'Monitor Gamer 27"'
    );
    assert.equal(dashboardDay.topProducts[1]?.unitsSold, 2);

    // Test 4: Validación de rango de fechas inválido (dateFrom > dateTo)
    await assert.rejects(
        async () => {
            await getDashboardUseCase.execute({
                dateFrom: "2026-11-10",
                dateTo: "2026-10-01",
            });
        },
        (err: unknown) => err instanceof AppError && err.statusCode === 400
    );

    // Test 5: Bitácora de Auditoría paginada y filtrado por entidad (RF-09)
    const allLogs = await listAuditLogsUseCase.execute({
        page: 1,
        limit: 10,
    });
    assert.equal(allLogs.total, 4);
    assert.equal(allLogs.data.length, 4);
    assert.equal(allLogs.data[0]?.entity, "CUPON");

    const priceLogs = await listAuditLogsUseCase.execute({
        page: 1,
        limit: 10,
        entity: "PRECIO",
    });
    assert.equal(priceLogs.total, 1);
    assert.equal(priceLogs.data[0]?.action, "CAMBIO_PRECIO");
    assert.deepEqual(priceLogs.data[0]?.oldValue, {
        SKU: "MON-27",
        Price: 700.0,
    });
    assert.deepEqual(priceLogs.data[0]?.newValue, {
        SKU: "MON-27",
        Price: 750.0,
    });

    console.log(
        "All Reports & AuditLogs (RF-08, RF-09) unit tests passed!"
    );
}

runTests().catch((error) => {
    console.error("Reports & AuditLogs unit tests failed:", error);
    process.exit(1);
});

-- =============================================================================
-- STORED PROCEDURES: MÓDULO REPORTES, DASHBOARD Y AUDITORÍA (RF-08, RF-09)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- Tablas: Orders, OrderItems, OrderReturns, ProductVariants, Products,
--         Categories, AuditLogs, Users
-- =============================================================================

-- 1. Obtener métricas del Dashboard Comercial (KPIs en GTQ, Serie de Ventas, Ventas por Categoría y Top 10 Productos)
CREATE OR ALTER PROCEDURE SP_Reportes_ObtenerDashboard
    @p_date_from DATETIME2 = NULL,
    @p_date_to DATETIME2 = NULL,
    @p_granularity VARCHAR(15) = 'day'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_granularity VARCHAR(15) = LOWER(ISNULL(LTRIM(RTRIM(@p_granularity)), 'day'));
    IF @v_granularity NOT IN ('day', 'week', 'month')
    BEGIN
        SET @v_granularity = 'day';
    END

    -- Tabla temporal en memoria para pedidos válidos dentro del rango de fechas
    -- RF-08: Excluir pedidos en estado 'CREADO', 'CANCELADO' y 'DEVUELTO' (cuando se devolvió todo)
    -- y descontar el monto de los ítems devueltos (ReturnedQuantity * UnitPrice)
    DECLARE @ValidOrders TABLE (
        IDOrder VARCHAR(36) PRIMARY KEY,
        CreatedAt DATETIME2 NOT NULL,
        NetTotal DECIMAL(12, 2) NOT NULL,
        NetUnits INT NOT NULL
    );

    INSERT INTO @ValidOrders (IDOrder, CreatedAt, NetTotal, NetUnits)
    SELECT
        o.IDOrder,
        o.CreatedAt,
        CASE
            WHEN (o.Total - ISNULL(agg.returned_value, 0.00)) > 0
                THEN CAST(o.Total - ISNULL(agg.returned_value, 0.00) AS DECIMAL(12, 2))
            ELSE CAST(0.00 AS DECIMAL(12, 2))
        END AS NetTotal,
        ISNULL(agg.net_units, 0) AS NetUnits
    FROM Orders o
    OUTER APPLY (
        SELECT
            SUM(CAST(oi.ReturnedQuantity * oi.UnitPrice AS DECIMAL(12, 2))) AS returned_value,
            SUM(oi.Quantity - oi.ReturnedQuantity) AS net_units
        FROM OrderItems oi
        WHERE oi.IDOrder = o.IDOrder
    ) agg
    WHERE o.Status IN ('PAGADO', 'PREPARACION', 'DESPACHADO', 'ENTREGADO')
      AND ISNULL(agg.net_units, 0) > 0
      AND (@p_date_from IS NULL OR o.CreatedAt >= @p_date_from)
      AND (@p_date_to IS NULL OR o.CreatedAt <= @p_date_to);

    DECLARE @v_total_revenue DECIMAL(12, 2) = ISNULL((SELECT SUM(NetTotal) FROM @ValidOrders), 0.00);
    DECLARE @v_total_orders INT = ISNULL((SELECT COUNT(1) FROM @ValidOrders), 0);
    DECLARE @v_avg_ticket DECIMAL(12, 2) = CASE
        WHEN @v_total_orders > 0 THEN CAST(@v_total_revenue / @v_total_orders AS DECIMAL(12, 2))
        ELSE CAST(0.00 AS DECIMAL(12, 2))
    END;
    DECLARE @v_total_units_sold INT = ISNULL((SELECT SUM(NetUnits) FROM @ValidOrders), 0);

    DECLARE @v_cancelled_orders INT = ISNULL((
        SELECT COUNT(1)
        FROM Orders o
        WHERE o.Status = 'CANCELADO'
          AND (@p_date_from IS NULL OR o.CreatedAt >= @p_date_from)
          AND (@p_date_to IS NULL OR o.CreatedAt <= @p_date_to)
    ), 0);

    DECLARE @v_returned_units INT = ISNULL((
        SELECT SUM(oi.ReturnedQuantity)
        FROM OrderItems oi
        INNER JOIN Orders o ON o.IDOrder = oi.IDOrder
        WHERE oi.ReturnedQuantity > 0
          AND (@p_date_from IS NULL OR o.CreatedAt >= @p_date_from)
          AND (@p_date_to IS NULL OR o.CreatedAt <= @p_date_to)
    ), 0);

    -- Resultset 1: KPIs Principales en GTQ
    SELECT
        @v_total_revenue AS total_revenue_gtq,
        @v_total_orders AS total_orders,
        @v_avg_ticket AS average_ticket_gtq,
        @v_total_units_sold AS total_units_sold,
        @v_cancelled_orders AS cancelled_orders_count,
        @v_returned_units AS returned_units_count;

    -- Resultset 2: Serie de Ventas por Día, Semana o Mes
    SELECT
         p.period_label,
        CAST(SUM(p.NetTotal) AS DECIMAL(12, 2)) AS revenue_gtq,
        COUNT(1) AS orders_count
    FROM (
        SELECT
            vo.IDOrder,
            vo.NetTotal,
            CASE
                WHEN @v_granularity = 'week' THEN CONCAT(
                    YEAR(vo.CreatedAt),
                    '-W',
                    RIGHT('0' + CAST(DATEPART(ISO_WEEK, vo.CreatedAt) AS VARCHAR(2)), 2)
                )
                WHEN @v_granularity = 'month' THEN CONVERT(VARCHAR(7), vo.CreatedAt, 126)
                ELSE CONVERT(VARCHAR(10), vo.CreatedAt, 23)
            END AS period_label
        FROM @ValidOrders vo
    ) p
    GROUP BY p.period_label
    ORDER BY p.period_label ASC;

    -- Resultset 3: Ventas por Categoría en GTQ
    SELECT
        c.IDCategory AS category_id,
        c.Name AS category_name,
        SUM(oi.Quantity - oi.ReturnedQuantity) AS units_sold,
        CAST(SUM(CAST((oi.Quantity - oi.ReturnedQuantity) * oi.UnitPrice AS DECIMAL(12, 2))) AS DECIMAL(12, 2)) AS revenue_gtq,
        COUNT(DISTINCT vo.IDOrder) AS orders_count
    FROM @ValidOrders vo
    INNER JOIN OrderItems oi ON oi.IDOrder = vo.IDOrder
    INNER JOIN ProductVariants pv ON pv.IDVariant = oi.IDVariant
    INNER JOIN Products p ON p.IDProduct = pv.IDProduct
    INNER JOIN Categories c ON c.IDCategory = p.IDCategory
    WHERE (oi.Quantity - oi.ReturnedQuantity) > 0
    GROUP BY c.IDCategory, c.Name
    ORDER BY revenue_gtq DESC;

    -- Resultset 4: Top 10 Productos Más Vendidos
    SELECT TOP 10
        p.IDProduct AS product_id,
        p.Name AS product_name,
        c.Name AS category_name,
        SUM(oi.Quantity - oi.ReturnedQuantity) AS units_sold,
        CAST(SUM(CAST((oi.Quantity - oi.ReturnedQuantity) * oi.UnitPrice AS DECIMAL(12, 2))) AS DECIMAL(12, 2)) AS revenue_gtq
    FROM @ValidOrders vo
    INNER JOIN OrderItems oi ON oi.IDOrder = vo.IDOrder
    INNER JOIN ProductVariants pv ON pv.IDVariant = oi.IDVariant
    INNER JOIN Products p ON p.IDProduct = pv.IDProduct
    INNER JOIN Categories c ON c.IDCategory = p.IDCategory
    WHERE (oi.Quantity - oi.ReturnedQuantity) > 0
    GROUP BY p.IDProduct, p.Name, c.Name
    ORDER BY units_sold DESC, revenue_gtq DESC;
END;
GO

-- 2. Listar Bitácora de Auditoría paginada (RF-09)
CREATE OR ALTER PROCEDURE SP_Auditoria_ListarPaginado
    @p_page INT = 1,
    @p_limit INT = 20,
    @p_entity VARCHAR(50) = NULL,
    @p_action VARCHAR(50) = NULL,
    @p_q NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page IS NULL OR @p_page < 1 SET @p_page = 1;
    IF @p_limit IS NULL OR @p_limit < 1 SET @p_limit = 20;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;

    SELECT
        al.IDAuditLog AS id,
        al.IDUser AS user_id,
        CASE
            WHEN u.IDUser IS NOT NULL THEN CONCAT(u.FirstName, ' ', u.LastName)
            ELSE 'Sistema / Trigger SQL'
        END AS user_name,
        u.Email AS user_email,
        u.Role AS user_role,
        al.Entity AS entity,
        al.Action AS action,
        al.OldValue AS old_value,
        al.NewValue AS new_value,
        al.CreatedAt AS created_at,
        COUNT(*) OVER() AS total_count
    FROM AuditLogs al
    LEFT JOIN Users u ON u.IDUser = al.IDUser
    WHERE (@p_entity IS NULL OR al.Entity = @p_entity)
      AND (@p_action IS NULL OR al.Action = @p_action)
      AND (
          @p_q IS NULL
          OR al.Entity LIKE '%' + @p_q + '%'
          OR al.Action LIKE '%' + @p_q + '%'
          OR al.OldValue LIKE '%' + @p_q + '%'
          OR al.NewValue LIKE '%' + @p_q + '%'
          OR u.Email LIKE '%' + @p_q + '%'
          OR CONCAT(u.FirstName, ' ', u.LastName) LIKE '%' + @p_q + '%'
      )
    ORDER BY al.CreatedAt DESC
    OFFSET @v_offset ROWS FETCH NEXT @p_limit ROWS ONLY;
END;
GO

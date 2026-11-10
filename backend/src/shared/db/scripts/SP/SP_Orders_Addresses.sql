-- =============================================================================
-- STORED PROCEDURES: MÓDULO DIRECCIONES, RESERVAS, CHECKOUT Y PEDIDOS (RF-01, RF-06, RF-07)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- Tablas: Addresses, Carts, CartItems, StockReservations, Coupons, CouponUsages,
--         Orders, OrderItems, OrderStatusHistory, OrderReturns, ProductVariants,
--         Products, ProductImages, KardexMovements, AuditLogs, Users
-- =============================================================================

-- 1. Listar direcciones por usuario
CREATE OR ALTER PROCEDURE SP_Direcciones_ListarPorUsuario
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDAddress AS id,
        IDUser AS user_id,
        Title AS title,
        RecipientName AS recipient_name,
        Phone AS phone,
        StreetAddress AS street_address,
        City AS city,
        State AS state,
        PostalCode AS postal_code,
        IsDefault AS is_default,
        CreatedAt AS created_at
    FROM Addresses
    WHERE IDUser = @p_user_id
    ORDER BY IsDefault DESC, CreatedAt DESC;
END;
GO

-- 2. Crear dirección de entrega
CREATE OR ALTER PROCEDURE SP_Direcciones_Crear
    @p_id VARCHAR(36),
    @p_user_id VARCHAR(36),
    @p_title VARCHAR(50),
    @p_recipient_name VARCHAR(150),
    @p_phone VARCHAR(20),
    @p_street_address VARCHAR(255),
    @p_city VARCHAR(100),
    @p_state VARCHAR(100),
    @p_postal_code VARCHAR(20) = NULL,
    @p_is_default BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @v_has_existing BIT = 0;
        IF EXISTS (SELECT 1 FROM Addresses WHERE IDUser = @p_user_id)
        BEGIN
            SET @v_has_existing = 1;
        END

        DECLARE @v_effective_default BIT = CASE
            WHEN @p_is_default = 1 OR @v_has_existing = 0 THEN 1
            ELSE 0
        END;

        IF @v_effective_default = 1
        BEGIN
            UPDATE Addresses
            SET IsDefault = 0
            WHERE IDUser = @p_user_id;
        END

        INSERT INTO Addresses (
            IDAddress,
            IDUser,
            Title,
            RecipientName,
            Phone,
            StreetAddress,
            City,
            State,
            PostalCode,
            IsDefault,
            CreatedAt
        )
        VALUES (
            @p_id,
            @p_user_id,
            LTRIM(RTRIM(@p_title)),
            LTRIM(RTRIM(@p_recipient_name)),
            LTRIM(RTRIM(@p_phone)),
            LTRIM(RTRIM(@p_street_address)),
            LTRIM(RTRIM(@p_city)),
            LTRIM(RTRIM(@p_state)),
            @p_postal_code,
            @v_effective_default,
            GETDATE()
        );

        COMMIT TRAN;

        SELECT
            IDAddress AS id,
            IDUser AS user_id,
            Title AS title,
            RecipientName AS recipient_name,
            Phone AS phone,
            StreetAddress AS street_address,
            City AS city,
            State AS state,
            PostalCode AS postal_code,
            IsDefault AS is_default,
            CreatedAt AS created_at
        FROM Addresses
        WHERE IDAddress = @p_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 3. Eliminar dirección de entrega (validando pertenencia y que no esté en pedidos históricos)
CREATE OR ALTER PROCEDURE SP_Direcciones_Eliminar
    @p_id VARCHAR(36),
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Addresses WHERE IDAddress = @p_id AND IDUser = @p_user_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La dirección no existe o no pertenece al usuario.', 1;
    END

    IF EXISTS (SELECT 1 FROM Orders WHERE IDAddress = @p_id)
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: No se puede eliminar una dirección asociada a pedidos históricos.', 1;
    END

    DELETE FROM Addresses
    WHERE IDAddress = @p_id AND IDUser = @p_user_id;
END;
GO

-- 4. Iniciar reserva de 15 minutos en Checkout con control de concurrencia (RF-06)
CREATE OR ALTER PROCEDURE SP_Checkout_IniciarReservaCarrito
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- 1. Liberar globalmente todas las reservas vencidas (ExpiresAt < GETDATE() AND IsReleased = 0)
        UPDATE pv
        SET pv.StockReserved = CASE
                WHEN pv.StockReserved >= exp_agg.TotalExpired THEN pv.StockReserved - exp_agg.TotalExpired
                ELSE 0
            END,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv WITH (UPDLOCK, ROWLOCK)
        INNER JOIN (
            SELECT IDVariant, SUM(Quantity) AS TotalExpired
            FROM StockReservations WITH (UPDLOCK, ROWLOCK)
            WHERE ExpiresAt < GETDATE() AND IsReleased = 0
            GROUP BY IDVariant
        ) exp_agg ON pv.IDVariant = exp_agg.IDVariant;

        UPDATE StockReservations
        SET IsReleased = 1
        WHERE ExpiresAt < GETDATE() AND IsReleased = 0;

        -- 2. Obtener carrito del usuario y validar que no esté vacío
        DECLARE @v_cart_id VARCHAR(36);
        SELECT @v_cart_id = IDCart
        FROM Carts
        WHERE IDUser = @p_user_id;

        IF @v_cart_id IS NULL OR NOT EXISTS (SELECT 1 FROM CartItems WHERE IDCart = @v_cart_id)
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: El carrito está vacío.', 1;
        END

        -- 3. Liberar reservas activas previas de este mismo carrito para renovar ventana de 15 minutos sin doble reserva
        UPDATE pv
        SET pv.StockReserved = CASE
                WHEN pv.StockReserved >= cart_agg.TotalReserved THEN pv.StockReserved - cart_agg.TotalReserved
                ELSE 0
            END,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv WITH (UPDLOCK, ROWLOCK)
        INNER JOIN (
            SELECT IDVariant, SUM(Quantity) AS TotalReserved
            FROM StockReservations WITH (UPDLOCK, ROWLOCK)
            WHERE IDCart = @v_cart_id AND IsReleased = 0
            GROUP BY IDVariant
        ) cart_agg ON pv.IDVariant = cart_agg.IDVariant;

        UPDATE StockReservations
        SET IsReleased = 1
        WHERE IDCart = @v_cart_id AND IsReleased = 0;

        -- 4 y 5. Bloquear variantes del carrito (UPDLOCK, ROWLOCK) y verificar disponibilidad física real
        IF EXISTS (
            SELECT 1
            FROM CartItems ci
            INNER JOIN ProductVariants pv WITH (UPDLOCK, ROWLOCK) ON ci.IDVariant = pv.IDVariant
            WHERE ci.IDCart = @v_cart_id
              AND (pv.IsActive = 0 OR ci.Quantity > (pv.StockPhysical - pv.StockReserved))
        )
        BEGIN
            THROW 50002, 'STOCK_INSUFICIENTE: Uno o más productos de tu carrito ya no cuentan con stock disponible suficiente.', 1;
        END

        -- 6. Incrementar StockReserved y registrar las reservas por 15 minutos exactos
        DECLARE @v_expires_at DATETIME2 = DATEADD(MINUTE, 15, GETDATE());

        UPDATE pv
        SET pv.StockReserved = pv.StockReserved + ci.Quantity,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv
        INNER JOIN CartItems ci ON pv.IDVariant = ci.IDVariant
        WHERE ci.IDCart = @v_cart_id;

        INSERT INTO StockReservations (
            IDReservation,
            IDVariant,
            IDCart,
            Quantity,
            ExpiresAt,
            IsReleased,
            CreatedAt
        )
        SELECT
            CONVERT(VARCHAR(36), NEWID()),
            ci.IDVariant,
            ci.IDCart,
            ci.Quantity,
            @v_expires_at,
            0,
            GETDATE()
        FROM CartItems ci
        WHERE ci.IDCart = @v_cart_id;

        DECLARE @v_reserved_items INT = 0;
        SELECT @v_reserved_items = COUNT(1)
        FROM CartItems
        WHERE IDCart = @v_cart_id;

        COMMIT TRAN;

        SELECT
            @v_cart_id AS cart_id,
            @v_expires_at AS expires_at,
            @v_reserved_items AS reserved_items_count;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 5. Obtener detalle completo de un pedido (4 Resultsets: Header, Items, StatusHistory, Returns)
CREATE OR ALTER PROCEDURE SP_Pedidos_ObtenerDetalle
    @p_order_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    -- Resultset 1: Encabezado del pedido + Cliente + Dirección + Cupón
    SELECT
        o.IDOrder AS id,
        o.OrderNumber AS order_number,
        o.IDUser AS user_id,
        u.Email AS customer_email,
        CONCAT(u.FirstName, ' ', u.LastName) AS customer_name,
        o.IDAddress AS address_id,
        a.Title AS address_title,
        a.RecipientName AS recipient_name,
        a.Phone AS recipient_phone,
        a.StreetAddress AS street_address,
        a.City AS city,
        a.State AS state,
        a.PostalCode AS postal_code,
        o.IDCoupon AS coupon_id,
        cp.Code AS coupon_code,
        o.IdempotencyKey AS idempotency_key,
        o.Status AS status,
        o.Subtotal AS subtotal,
        o.Discount AS discount,
        o.Total AS total,
        o.CreatedAt AS created_at,
        o.UpdatedAt AS updated_at
    FROM Orders o
    INNER JOIN Users u ON o.IDUser = u.IDUser
    INNER JOIN Addresses a ON o.IDAddress = a.IDAddress
    LEFT JOIN Coupons cp ON o.IDCoupon = cp.IDCoupon
    WHERE o.IDOrder = @p_order_id;

    -- Resultset 2: Detalle de líneas del pedido (OrderItems)
    SELECT
        oi.IDOrderItem AS id,
        oi.IDOrder AS order_id,
        oi.IDVariant AS variant_id,
        oi.ProductName AS product_name,
        oi.VariantSKU AS variant_sku,
        pv.Attributes AS attributes,
        coverImg.ImageURL AS main_image_url,
        oi.UnitPrice AS unit_price,
        oi.Quantity AS quantity,
        oi.ReturnedQuantity AS returned_quantity,
        (oi.Quantity - oi.ReturnedQuantity) AS available_to_return,
        oi.Subtotal AS subtotal
    FROM OrderItems oi
    INNER JOIN ProductVariants pv ON oi.IDVariant = pv.IDVariant
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = pv.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    WHERE oi.IDOrder = @p_order_id
    ORDER BY oi.ProductName ASC;

    -- Resultset 3: Historial de estados del pedido (OrderStatusHistory)
    SELECT
        osh.IDStatusHistory AS id,
        osh.IDOrder AS order_id,
        osh.IDUser AS user_id,
        CASE
            WHEN u.IDUser IS NOT NULL THEN CONCAT(u.FirstName, ' ', u.LastName)
            ELSE 'Sistema'
        END AS changed_by_name,
        osh.PreviousStatus AS previous_status,
        osh.NewStatus AS new_status,
        osh.ChangedAt AS changed_at
    FROM OrderStatusHistory osh
    LEFT JOIN Users u ON osh.IDUser = u.IDUser
    WHERE osh.IDOrder = @p_order_id
    ORDER BY osh.ChangedAt ASC;

    -- Resultset 4: Devoluciones registradas del pedido (OrderReturns)
    SELECT
        r.IDReturn AS id,
        r.IDOrder AS order_id,
        r.IDOrderItem AS order_item_id,
        oi.ProductName AS product_name,
        oi.VariantSKU AS variant_sku,
        r.IDUser AS user_id,
        CONCAT(u.FirstName, ' ', u.LastName) AS processed_by_name,
        r.Quantity AS quantity,
        r.Reason AS reason,
        r.CreatedAt AS created_at
    FROM OrderReturns r
    INNER JOIN OrderItems oi ON r.IDOrderItem = oi.IDOrderItem
    INNER JOIN Users u ON r.IDUser = u.IDUser
    WHERE r.IDOrder = @p_order_id
    ORDER BY r.CreatedAt DESC;
END;
GO

-- 6. Crear pedido en Checkout Atómico con Idempotencia, Concurrencia y Kardex (RF-06)
CREATE OR ALTER PROCEDURE SP_Pedidos_CrearCheckoutAtomico
    @p_order_id VARCHAR(36),
    @p_order_number VARCHAR(30),
    @p_user_id VARCHAR(36),
    @p_address_id VARCHAR(36),
    @p_coupon_code VARCHAR(50) = NULL,
    @p_idempotency_key VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- 1. Verificación de Idempotencia (bloqueo sobre IdempotencyKey para evitar cobros/pedidos duplicados)
        DECLARE @v_existing_order_id VARCHAR(36);
        SELECT @v_existing_order_id = IDOrder
        FROM Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE IdempotencyKey = @p_idempotency_key;

        IF @v_existing_order_id IS NOT NULL
        BEGIN
            COMMIT TRAN;
            EXEC SP_Pedidos_ObtenerDetalle @p_order_id = @v_existing_order_id;
            RETURN;
        END

        -- 2. Liberar reservas expiradas globalmente
        UPDATE pv
        SET pv.StockReserved = CASE
                WHEN pv.StockReserved >= exp_agg.TotalExpired THEN pv.StockReserved - exp_agg.TotalExpired
                ELSE 0
            END,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv WITH (UPDLOCK, ROWLOCK)
        INNER JOIN (
            SELECT IDVariant, SUM(Quantity) AS TotalExpired
            FROM StockReservations WITH (UPDLOCK, ROWLOCK)
            WHERE ExpiresAt < GETDATE() AND IsReleased = 0
            GROUP BY IDVariant
        ) exp_agg ON pv.IDVariant = exp_agg.IDVariant;

        UPDATE StockReservations
        SET IsReleased = 1
        WHERE ExpiresAt < GETDATE() AND IsReleased = 0;

        -- 3. Validar dirección de entrega del cliente
        IF NOT EXISTS (SELECT 1 FROM Addresses WHERE IDAddress = @p_address_id AND IDUser = @p_user_id)
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: La dirección de entrega seleccionada no es válida.', 1;
        END

        -- 4. Validar carrito y concurrencia de existencias (UPDLOCK, ROWLOCK)
        DECLARE @v_cart_id VARCHAR(36);
        SELECT @v_cart_id = IDCart
        FROM Carts
        WHERE IDUser = @p_user_id;

        IF @v_cart_id IS NULL OR NOT EXISTS (SELECT 1 FROM CartItems WHERE IDCart = @v_cart_id)
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: El carrito está vacío para procesar el pedido.', 1;
        END

        -- Liberar reserva activa propia de este carrito antes de descontar el stock físico definitivo
        UPDATE pv
        SET pv.StockReserved = CASE
                WHEN pv.StockReserved >= cart_agg.TotalReserved THEN pv.StockReserved - cart_agg.TotalReserved
                ELSE 0
            END,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv WITH (UPDLOCK, ROWLOCK)
        INNER JOIN (
            SELECT IDVariant, SUM(Quantity) AS TotalReserved
            FROM StockReservations WITH (UPDLOCK, ROWLOCK)
            WHERE IDCart = @v_cart_id AND IsReleased = 0
            GROUP BY IDVariant
        ) cart_agg ON pv.IDVariant = cart_agg.IDVariant;

        UPDATE StockReservations
        SET IsReleased = 1
        WHERE IDCart = @v_cart_id AND IsReleased = 0;

        -- Bloquear las variantes del carrito y verificar disponibilidad contra otros compradores
        IF EXISTS (
            SELECT 1
            FROM CartItems ci
            INNER JOIN ProductVariants pv WITH (UPDLOCK, ROWLOCK) ON ci.IDVariant = pv.IDVariant
            WHERE ci.IDCart = @v_cart_id
              AND (pv.IsActive = 0 OR (pv.StockPhysical - pv.StockReserved) < ci.Quantity)
        )
        BEGIN
            THROW 50002, 'STOCK_INSUFICIENTE: Stock insuficiente para completar el pedido.', 1;
        END

        -- 5. Calcular Subtotal y validar/consumir Cupón si fue enviado
        DECLARE @v_subtotal DECIMAL(12, 2) = 0.00;
        SELECT @v_subtotal = ISNULL(SUM(ROUND(pv.Price * CAST(ci.Quantity AS DECIMAL(12, 2)), 2)), 0.00)
        FROM CartItems ci
        INNER JOIN ProductVariants pv ON ci.IDVariant = pv.IDVariant
        WHERE ci.IDCart = @v_cart_id;

        DECLARE @v_coupon_id VARCHAR(36) = NULL;
        DECLARE @v_discount DECIMAL(12, 2) = 0.00;

        IF @p_coupon_code IS NOT NULL AND LTRIM(RTRIM(@p_coupon_code)) <> ''
        BEGIN
            DECLARE @v_clean_code VARCHAR(50) = UPPER(LTRIM(RTRIM(@p_coupon_code)));
            DECLARE @v_discount_type VARCHAR(20);
            DECLARE @v_discount_value DECIMAL(12, 2);
            DECLARE @v_min_order_amount DECIMAL(12, 2);
            DECLARE @v_max_uses INT;
            DECLARE @v_current_uses INT;
            DECLARE @v_max_uses_per_client INT;
            DECLARE @v_coupon_category_id VARCHAR(36);
            DECLARE @v_starts_at DATETIME2;
            DECLARE @v_expires_at DATETIME2;
            DECLARE @v_coupon_active BIT;

            SELECT
                @v_coupon_id = IDCoupon,
                @v_discount_type = DiscountType,
                @v_discount_value = DiscountValue,
                @v_min_order_amount = MinOrderAmount,
                @v_max_uses = MaxUses,
                @v_current_uses = CurrentUses,
                @v_max_uses_per_client = MaxUsesPerClient,
                @v_coupon_category_id = IDCategory,
                @v_starts_at = StartsAt,
                @v_expires_at = ExpiresAt,
                @v_coupon_active = IsActive
            FROM Coupons WITH (UPDLOCK, ROWLOCK)
            WHERE UPPER(LTRIM(RTRIM(Code))) = @v_clean_code;

            IF @v_coupon_id IS NULL OR @v_coupon_active = 0
            BEGIN
                THROW 50001, 'NO_ENCONTRADO: El cupón ingresado no existe o está inactivo.', 1;
            END

            IF GETDATE() < @v_starts_at OR GETDATE() > @v_expires_at
            BEGIN
                THROW 50005, 'DATOS_INVALIDOS: El cupón se encuentra fuera de su rango de vigencia.', 1;
            END

            IF @v_current_uses >= @v_max_uses
            BEGIN
                THROW 50005, 'DATOS_INVALIDOS: El cupón ha alcanzado su límite global de usos.', 1;
            END

            DECLARE @v_client_uses INT = 0;
            SELECT @v_client_uses = COUNT(1)
            FROM CouponUsages
            WHERE IDCoupon = @v_coupon_id AND IDUser = @p_user_id;

            IF @v_client_uses >= @v_max_uses_per_client
            BEGIN
                THROW 50005, 'DATOS_INVALIDOS: Ya has alcanzado el límite de usos permitido para este cupón.', 1;
            END

            IF @v_subtotal < @v_min_order_amount
            BEGIN
                THROW 50005, 'DATOS_INVALIDOS: El subtotal del pedido no alcanza el mínimo requerido por el cupón.', 1;
            END

            DECLARE @v_eligible_subtotal DECIMAL(12, 2) = 0.00;
            SELECT @v_eligible_subtotal = ISNULL(SUM(
                CASE
                    WHEN @v_coupon_category_id IS NULL OR p.IDCategory = @v_coupon_category_id
                    THEN ROUND(pv.Price * CAST(ci.Quantity AS DECIMAL(12, 2)), 2)
                    ELSE 0.00
                END
            ), 0.00)
            FROM CartItems ci
            INNER JOIN ProductVariants pv ON ci.IDVariant = pv.IDVariant
            INNER JOIN Products p ON pv.IDProduct = p.IDProduct
            WHERE ci.IDCart = @v_cart_id;

            IF @v_coupon_category_id IS NOT NULL AND @v_eligible_subtotal <= 0
            BEGIN
                THROW 50005, 'DATOS_INVALIDOS: El cupón no aplica a ninguno de los productos del carrito.', 1;
            END

            IF @v_discount_type = 'PORCENTAJE'
                SET @v_discount = ROUND(@v_eligible_subtotal * (@v_discount_value / 100.00), 2);
            ELSE
                SET @v_discount = @v_discount_value;

            IF @v_discount > @v_eligible_subtotal SET @v_discount = @v_eligible_subtotal;
            IF @v_discount > @v_subtotal SET @v_discount = @v_subtotal;

            UPDATE Coupons
            SET CurrentUses = CurrentUses + 1
            WHERE IDCoupon = @v_coupon_id;
        END

        -- 6. Insertar Pedido (Status = 'PAGADO') y uso de cupón
        DECLARE @v_total DECIMAL(12, 2) = @v_subtotal - @v_discount;
        IF @v_total < 0.00 SET @v_total = 0.00;

        INSERT INTO Orders (
            IDOrder,
            OrderNumber,
            IDUser,
            IDAddress,
            IDCoupon,
            IdempotencyKey,
            Status,
            Subtotal,
            Discount,
            Total,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            @p_order_id,
            @p_order_number,
            @p_user_id,
            @p_address_id,
            @v_coupon_id,
            @p_idempotency_key,
            'PAGADO',
            @v_subtotal,
            @v_discount,
            @v_total,
            GETDATE(),
            GETDATE()
        );

        IF @v_coupon_id IS NOT NULL
        BEGIN
            INSERT INTO CouponUsages (IDCouponUsage, IDCoupon, IDUser, IDOrder, UsedAt)
            VALUES (CONVERT(VARCHAR(36), NEWID()), @v_coupon_id, @p_user_id, @p_order_id, GETDATE());
        END

        -- 7. Insertar OrderItems, registrar movimientos SALIDA en Kardex y descontar StockPhysical
        INSERT INTO OrderItems (
            IDOrderItem,
            IDOrder,
            IDVariant,
            ProductName,
            VariantSKU,
            UnitPrice,
            Quantity,
            ReturnedQuantity,
            Subtotal
        )
        SELECT
            CONVERT(VARCHAR(36), NEWID()),
            @p_order_id,
            ci.IDVariant,
            p.Name,
            pv.SKU,
            pv.Price,
            ci.Quantity,
            0,
            ROUND(pv.Price * CAST(ci.Quantity AS DECIMAL(12, 2)), 2)
        FROM CartItems ci
        INNER JOIN ProductVariants pv ON ci.IDVariant = pv.IDVariant
        INNER JOIN Products p ON pv.IDProduct = p.IDProduct
        WHERE ci.IDCart = @v_cart_id;

        INSERT INTO KardexMovements (
            IDKardex,
            IDVariant,
            IDUser,
            MovementType,
            Quantity,
            PreviousStock,
            NewStock,
            Reason,
            CreatedAt
        )
        SELECT
            CONVERT(VARCHAR(36), NEWID()),
            ci.IDVariant,
            @p_user_id,
            'SALIDA',
            -ci.Quantity,
            pv.StockPhysical,
            pv.StockPhysical - ci.Quantity,
            CONCAT(N'Venta en pedido ', @p_order_number),
            GETDATE()
        FROM CartItems ci
        INNER JOIN ProductVariants pv ON ci.IDVariant = pv.IDVariant
        WHERE ci.IDCart = @v_cart_id;

        UPDATE pv
        SET pv.StockPhysical = pv.StockPhysical - ci.Quantity,
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv
        INNER JOIN CartItems ci ON pv.IDVariant = ci.IDVariant
        WHERE ci.IDCart = @v_cart_id;

        -- 8. Registrar historial de estado inicial (NULL -> PAGADO) y Bitácora de Auditoría
        INSERT INTO OrderStatusHistory (
            IDStatusHistory,
            IDOrder,
            IDUser,
            PreviousStatus,
            NewStatus,
            ChangedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_order_id,
            @p_user_id,
            NULL,
            'PAGADO',
            GETDATE()
        );

        INSERT INTO AuditLogs (
            IDAuditLog,
            IDUser,
            Entity,
            Action,
            OldValue,
            NewValue,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_user_id,
            'PEDIDO',
            'CREAR_PAGADO',
            NULL,
            CONCAT(
                N'{"orderId":"', @p_order_id,
                N'","orderNumber":"', @p_order_number,
                N'","status":"PAGADO","subtotal":', CONVERT(VARCHAR(30), @v_subtotal),
                N',"discount":', CONVERT(VARCHAR(30), @v_discount),
                N',"total":', CONVERT(VARCHAR(30), @v_total), N'}'
            ),
            GETDATE()
        );

        -- 9. Vaciar el carrito del usuario
        DELETE FROM CartItems WHERE IDCart = @v_cart_id;
        UPDATE Carts SET UpdatedAt = GETDATE() WHERE IDCart = @v_cart_id;

        COMMIT TRAN;

        EXEC SP_Pedidos_ObtenerDetalle @p_order_id = @p_order_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 7. Listar pedidos con paginación y filtros del lado del servidor (RF-07, RF-08)
CREATE OR ALTER PROCEDURE SP_Pedidos_Listar
    @p_page INT = 1,
    @p_limit INT = 15,
    @p_user_id VARCHAR(36) = NULL,
    @p_status VARCHAR(30) = NULL,
    @p_q NVARCHAR(100) = NULL,
    @p_date_from DATETIME2 = NULL,
    @p_date_to DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page < 1 SET @p_page = 1;
    IF @p_limit < 1 SET @p_limit = 15;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;
    DECLARE @v_search NVARCHAR(102) = CASE
        WHEN @p_q IS NOT NULL AND LTRIM(RTRIM(@p_q)) <> ''
        THEN '%' + LTRIM(RTRIM(@p_q)) + '%'
        ELSE NULL
    END;

    SELECT
        o.IDOrder AS id,
        o.OrderNumber AS order_number,
        o.IDUser AS user_id,
        u.Email AS customer_email,
        CONCAT(u.FirstName, ' ', u.LastName) AS customer_name,
        o.IDAddress AS address_id,
        CONCAT(a.StreetAddress, ', ', a.City, ', ', a.State) AS shipping_address_summary,
        cp.Code AS coupon_code,
        o.Status AS status,
        o.Subtotal AS subtotal,
        o.Discount AS discount,
        o.Total AS total,
        ISNULL(item_agg.TotalItems, 0) AS items_count,
        o.CreatedAt AS created_at,
        o.UpdatedAt AS updated_at,
        COUNT(*) OVER() AS total_count
    FROM Orders o
    INNER JOIN Users u ON o.IDUser = u.IDUser
    INNER JOIN Addresses a ON o.IDAddress = a.IDAddress
    LEFT JOIN Coupons cp ON o.IDCoupon = cp.IDCoupon
    OUTER APPLY (
        SELECT SUM(oi.Quantity) AS TotalItems
        FROM OrderItems oi
        WHERE oi.IDOrder = o.IDOrder
    ) item_agg
    WHERE (@p_user_id IS NULL OR o.IDUser = @p_user_id)
      AND (@p_status IS NULL OR @p_status = '' OR o.Status = @p_status)
      AND (
          @v_search IS NULL
          OR o.OrderNumber LIKE @v_search
          OR u.Email LIKE @v_search
          OR CONCAT(u.FirstName, ' ', u.LastName) LIKE @v_search
      )
      AND (@p_date_from IS NULL OR o.CreatedAt >= @p_date_from)
      AND (@p_date_to IS NULL OR o.CreatedAt <= @p_date_to)
    ORDER BY o.CreatedAt DESC
    OFFSET @v_offset ROWS FETCH NEXT @p_limit ROWS ONLY;
END;
GO

-- 8. Avanzar estado del pedido con máquina de estados controlada (RF-07)
CREATE OR ALTER PROCEDURE SP_Pedidos_AvanzarEstado
    @p_order_id VARCHAR(36),
    @p_new_status VARCHAR(30),
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @v_current_status VARCHAR(30);
        DECLARE @v_order_number VARCHAR(30);

        SELECT
            @v_current_status = Status,
            @v_order_number = OrderNumber
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE IDOrder = @p_order_id;

        IF @v_current_status IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: El pedido especificado no existe.', 1;
        END

        -- Validar transición estricta: CREADO -> PAGADO -> PREPARACION -> DESPACHADO -> ENTREGADO
        DECLARE @v_is_valid_transition BIT = 0;
        IF (@v_current_status = 'CREADO' AND @p_new_status = 'PAGADO')
            OR (@v_current_status = 'PAGADO' AND @p_new_status = 'PREPARACION')
            OR (@v_current_status = 'PREPARACION' AND @p_new_status = 'DESPACHADO')
            OR (@v_current_status = 'DESPACHADO' AND @p_new_status = 'ENTREGADO')
        BEGIN
            SET @v_is_valid_transition = 1;
        END

        IF @v_is_valid_transition = 0
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: Transición de estado no permitida para el flujo del pedido.', 1;
        END

        UPDATE Orders
        SET Status = @p_new_status,
            UpdatedAt = GETDATE()
        WHERE IDOrder = @p_order_id;

        INSERT INTO OrderStatusHistory (
            IDStatusHistory,
            IDOrder,
            IDUser,
            PreviousStatus,
            NewStatus,
            ChangedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_order_id,
            @p_user_id,
            @v_current_status,
            @p_new_status,
            GETDATE()
        );

        INSERT INTO AuditLogs (
            IDAuditLog,
            IDUser,
            Entity,
            Action,
            OldValue,
            NewValue,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_user_id,
            'PEDIDO',
            'CAMBIO_ESTADO',
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderNumber":"', @v_order_number, N'","status":"', @v_current_status, N'"}'),
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderNumber":"', @v_order_number, N'","status":"', @p_new_status, N'"}'),
            GETDATE()
        );

        COMMIT TRAN;

        EXEC SP_Pedidos_ObtenerDetalle @p_order_id = @p_order_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 9. Cancelar pedido antes de ser despachado con reintegro automático al Kardex (RF-07)
CREATE OR ALTER PROCEDURE SP_Pedidos_Cancelar
    @p_order_id VARCHAR(36),
    @p_user_id VARCHAR(36),
    @p_reason NVARCHAR(255) = N'Cancelación de pedido'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @v_current_status VARCHAR(30);
        DECLARE @v_order_number VARCHAR(30);

        SELECT
            @v_current_status = Status,
            @v_order_number = OrderNumber
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE IDOrder = @p_order_id;

        IF @v_current_status IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: El pedido especificado no existe.', 1;
        END

        -- Solo se permite cancelar antes de ser despachado (CREADO, PAGADO, PREPARACION)
        IF @v_current_status NOT IN ('CREADO', 'PAGADO', 'PREPARACION')
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: No se puede cancelar un pedido que ya ha sido despachado o entregado.', 1;
        END

        -- Registrar movimientos de ENTRADA en el Kardex y restaurar StockPhysical de cada ítem
        INSERT INTO KardexMovements (
            IDKardex,
            IDVariant,
            IDUser,
            MovementType,
            Quantity,
            PreviousStock,
            NewStock,
            Reason,
            CreatedAt
        )
        SELECT
            CONVERT(VARCHAR(36), NEWID()),
            oi.IDVariant,
            @p_user_id,
            'ENTRADA',
            (oi.Quantity - oi.ReturnedQuantity),
            pv.StockPhysical,
            pv.StockPhysical + (oi.Quantity - oi.ReturnedQuantity),
            CONCAT(N'Reintegro por cancelación de pedido ', @v_order_number, N': ', ISNULL(@p_reason, N'Cancelación')),
            GETDATE()
        FROM OrderItems oi
        INNER JOIN ProductVariants pv WITH (UPDLOCK, ROWLOCK) ON oi.IDVariant = pv.IDVariant
        WHERE oi.IDOrder = @p_order_id
          AND (oi.Quantity - oi.ReturnedQuantity) > 0;

        UPDATE pv
        SET pv.StockPhysical = pv.StockPhysical + (oi.Quantity - oi.ReturnedQuantity),
            pv.UpdatedAt = GETDATE()
        FROM ProductVariants pv
        INNER JOIN OrderItems oi ON pv.IDVariant = oi.IDVariant
        WHERE oi.IDOrder = @p_order_id
          AND (oi.Quantity - oi.ReturnedQuantity) > 0;

        UPDATE Orders
        SET Status = 'CANCELADO',
            UpdatedAt = GETDATE()
        WHERE IDOrder = @p_order_id;

        INSERT INTO OrderStatusHistory (
            IDStatusHistory,
            IDOrder,
            IDUser,
            PreviousStatus,
            NewStatus,
            ChangedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_order_id,
            @p_user_id,
            @v_current_status,
            'CANCELADO',
            GETDATE()
        );

        INSERT INTO AuditLogs (
            IDAuditLog,
            IDUser,
            Entity,
            Action,
            OldValue,
            NewValue,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_user_id,
            'PEDIDO',
            'CANCELAR',
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderNumber":"', @v_order_number, N'","status":"', @v_current_status, N'"}'),
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderNumber":"', @v_order_number, N'","status":"CANCELADO","reason":"', ISNULL(@p_reason, N'Cancelación'), N'"}'),
            GETDATE()
        );

        COMMIT TRAN;

        EXEC SP_Pedidos_ObtenerDetalle @p_order_id = @p_order_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 10. Procesar devolución parcial o total de un ítem con reintegro en Kardex (RF-07)
CREATE OR ALTER PROCEDURE SP_Pedidos_ProcesarDevolucion
    @p_order_id VARCHAR(36),
    @p_order_item_id VARCHAR(36),
    @p_quantity INT,
    @p_reason NVARCHAR(255),
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        IF @p_quantity IS NULL OR @p_quantity <= 0
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: La cantidad a devolver debe ser mayor a 0.', 1;
        END

        DECLARE @v_order_status VARCHAR(30);
        DECLARE @v_order_number VARCHAR(30);

        SELECT
            @v_order_status = Status,
            @v_order_number = OrderNumber
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE IDOrder = @p_order_id;

        IF @v_order_status IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: El pedido no existe.', 1;
        END

        IF @v_order_status NOT IN ('DESPACHADO', 'ENTREGADO', 'DEVUELTO')
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: Solo se pueden procesar devoluciones de pedidos despachados o entregados.', 1;
        END

        DECLARE @v_variant_id VARCHAR(36);
        DECLARE @v_purchased_qty INT;
        DECLARE @v_returned_qty INT;
        DECLARE @v_product_name VARCHAR(200);

        SELECT
            @v_variant_id = IDVariant,
            @v_purchased_qty = Quantity,
            @v_returned_qty = ReturnedQuantity,
            @v_product_name = ProductName
        FROM OrderItems WITH (UPDLOCK, ROWLOCK)
        WHERE IDOrderItem = @p_order_item_id AND IDOrder = @p_order_id;

        IF @v_variant_id IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: El ítem indicado no pertenece al pedido.', 1;
        END

        IF (@v_returned_qty + @p_quantity) > @v_purchased_qty
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: No se puede devolver una cantidad mayor a la comprada.', 1;
        END

        DECLARE @v_prev_stock INT;
        SELECT @v_prev_stock = StockPhysical
        FROM ProductVariants WITH (UPDLOCK, ROWLOCK)
        WHERE IDVariant = @v_variant_id;

        UPDATE OrderItems
        SET ReturnedQuantity = ReturnedQuantity + @p_quantity
        WHERE IDOrderItem = @p_order_item_id;

        INSERT INTO OrderReturns (
            IDReturn,
            IDOrder,
            IDOrderItem,
            IDUser,
            Quantity,
            Reason,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_order_id,
            @p_order_item_id,
            @p_user_id,
            @p_quantity,
            LTRIM(RTRIM(@p_reason)),
            GETDATE()
        );

        UPDATE ProductVariants
        SET StockPhysical = StockPhysical + @p_quantity,
            UpdatedAt = GETDATE()
        WHERE IDVariant = @v_variant_id;

        INSERT INTO KardexMovements (
            IDKardex,
            IDVariant,
            IDUser,
            MovementType,
            Quantity,
            PreviousStock,
            NewStock,
            Reason,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @v_variant_id,
            @p_user_id,
            'DEVOLUCION',
            @p_quantity,
            @v_prev_stock,
            @v_prev_stock + @p_quantity,
            CONCAT(N'Devolución autorizada en pedido ', @v_order_number, N': ', LTRIM(RTRIM(@p_reason))),
            GETDATE()
        );

        -- Si todos los ítems del pedido han sido devueltos por completo, marcar pedido como DEVUELTO
        IF NOT EXISTS (
            SELECT 1
            FROM OrderItems
            WHERE IDOrder = @p_order_id
              AND ReturnedQuantity < Quantity
        ) AND @v_order_status <> 'DEVUELTO'
        BEGIN
            UPDATE Orders
            SET Status = 'DEVUELTO',
                UpdatedAt = GETDATE()
            WHERE IDOrder = @p_order_id;

            INSERT INTO OrderStatusHistory (
                IDStatusHistory,
                IDOrder,
                IDUser,
                PreviousStatus,
                NewStatus,
                ChangedAt
            )
            VALUES (
                CONVERT(VARCHAR(36), NEWID()),
                @p_order_id,
                @p_user_id,
                @v_order_status,
                'DEVUELTO',
                GETDATE()
            );
        END
        ELSE
        BEGIN
            UPDATE Orders
            SET UpdatedAt = GETDATE()
            WHERE IDOrder = @p_order_id;
        END

        INSERT INTO AuditLogs (
            IDAuditLog,
            IDUser,
            Entity,
            Action,
            OldValue,
            NewValue,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_user_id,
            'PEDIDO',
            'DEVOLUCION_ITEM',
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderItemId":"', @p_order_item_id, N'","returnedQuantity":', CONVERT(VARCHAR(20), @v_returned_qty), N'}'),
            CONCAT(N'{"orderId":"', @p_order_id, N'","orderItemId":"', @p_order_item_id, N'","returnedQuantity":', CONVERT(VARCHAR(20), @v_returned_qty + @p_quantity), N',"reason":"', LTRIM(RTRIM(@p_reason)), N'"}'),
            GETDATE()
        );

        COMMIT TRAN;

        EXEC SP_Pedidos_ObtenerDetalle @p_order_id = @p_order_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

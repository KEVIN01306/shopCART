-- =============================================================================
-- STORED PROCEDURES: RESERVAS DE INVENTARIO Y CONFIGURACIÓN DEL SISTEMA (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tablas: ProductVariants, StockReservations, SystemSettings
-- =============================================================================

-- 1. SP para crear reserva de stock atómica (Checkout con prevención de sobreventa)
CREATE OR ALTER PROCEDURE SP_Inventario_ReservarExistencia
    @p_cart_id VARCHAR(36),
    @p_variant_id VARCHAR(36),
    @p_quantity INT,
    @p_reservation_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    DECLARE @available_stock INT;

    -- Bloqueo de fila para evitar concurrencia y sobreventa
    SELECT @available_stock = (StockPhysical - StockReserved)
    FROM ProductVariants WITH (UPDLOCK, ROWLOCK)
    WHERE IDVariant = @p_variant_id;

    IF @available_stock >= @p_quantity
    BEGIN
        UPDATE ProductVariants
        SET StockReserved = StockReserved + @p_quantity,
            UpdatedAt = GETDATE()
        WHERE IDVariant = @p_variant_id;

        INSERT INTO StockReservations (
            IDReservation,
            IDVariant,
            IDCart,
            Quantity,
            ExpiresAt,
            IsReleased,
            CreatedAt
        )
        VALUES (
            @p_reservation_id,
            @p_variant_id,
            @p_cart_id,
            @p_quantity,
            DATEADD(MINUTE, 15, GETDATE()),
            0,
            GETDATE()
        );

        COMMIT TRANSACTION;
        SELECT 1 AS success, 'Reserva creada con éxito' AS message;
    END
    ELSE
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS success, 'Stock insuficiente para la variante' AS message;
    END
END;
GO

-- 2. SP para liberar reservas expiradas automáticamente
CREATE OR ALTER PROCEDURE SP_Inventario_LiberarReservasVencidas
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    -- Devolver stock reservado
    UPDATE pv
    SET pv.StockReserved = pv.StockReserved - sr.Quantity,
        pv.UpdatedAt = GETDATE()
    FROM ProductVariants pv
    INNER JOIN StockReservations sr ON pv.IDVariant = sr.IDVariant
    WHERE sr.ExpiresAt < GETDATE() AND sr.IsReleased = 0;

    -- Marcar como liberadas
    UPDATE StockReservations
    SET IsReleased = 1
    WHERE ExpiresAt < GETDATE() AND IsReleased = 0;

    COMMIT TRANSACTION;
END;
GO

-- 3. SP para insertar o actualizar parámetro en SystemSettings (Configuración del sistema)
CREATE OR ALTER PROCEDURE SP_Configuracion_UpsertParametro
    @p_key_name VARCHAR(50),
    @p_key_value VARCHAR(255),
    @p_description VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM SystemSettings WHERE KeyName = @p_key_name)
    BEGIN
        UPDATE SystemSettings
        SET KeyValue = @p_key_value,
            Description = COALESCE(@p_description, Description),
            UpdatedAt = GETDATE()
        WHERE KeyName = @p_key_name;
    END
    ELSE
    BEGIN
        INSERT INTO SystemSettings (
            KeyName,
            KeyValue,
            Description,
            UpdatedAt
        )
        VALUES (
            @p_key_name,
            @p_key_value,
            @p_description,
            GETDATE()
        );
    END

    SELECT
        IDSetting AS id,
        KeyName AS key_name,
        KeyValue AS key_value,
        Description AS description,
        UpdatedAt AS updated_at
    FROM SystemSettings
    WHERE KeyName = @p_key_name;
END;
GO

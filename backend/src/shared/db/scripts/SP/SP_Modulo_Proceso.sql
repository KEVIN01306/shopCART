-- 1. SP para crear reserva de stock atómica (Checkout con prevención de sobreventa)
CREATE PROCEDURE SP_Inventario_ReservarExistencia
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
    SELECT @available_stock = (stock_physical - stock_reserved)
    FROM product_variants WITH (UPDLOCK, ROWLOCK)
    WHERE id = @p_variant_id;

    IF @available_stock >= @p_quantity
    BEGIN
        UPDATE product_variants
        SET stock_reserved = stock_reserved + @p_quantity,
            updated_at = GETDATE()
        WHERE id = @p_variant_id;

        INSERT INTO stock_reservations (id, variant_id, cart_id, quantity, expires_at)
        VALUES (@p_reservation_id, @p_variant_id, @p_cart_id, @p_quantity, DATEADD(MINUTE, 15, GETDATE()));

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
CREATE PROCEDURE SP_Inventario_LiberarReservasVencidas
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    -- Devolver stock reservado
    UPDATE pv
    SET pv.stock_reserved = pv.stock_reserved - sr.quantity,
        pv.updated_at = GETDATE()
    FROM product_variants pv
    INNER JOIN stock_reservations sr ON pv.id = sr.variant_id
    WHERE sr.expires_at < GETDATE() AND sr.is_released = 0;

    -- Marcar como liberadas
    UPDATE stock_reservations
    SET is_released = 1
    WHERE expires_at < GETDATE() AND is_released = 0;

    COMMIT TRANSACTION;
END;
GO
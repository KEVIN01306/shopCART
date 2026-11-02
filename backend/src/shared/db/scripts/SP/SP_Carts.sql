-- =============================================================================
-- STORED PROCEDURES: MÓDULO CARRITOS (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- =============================================================================

-- 1. Obtener o crear carrito (por usuario autenticado o token de invitado)
CREATE OR ALTER PROCEDURE SP_Carritos_ObtenerOcrear
    @p_user_id VARCHAR(36) = NULL,
    @p_guest_token VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_cart_id VARCHAR(36);

    IF @p_user_id IS NOT NULL
    BEGIN
        SELECT @v_cart_id = id
        FROM carts
        WHERE user_id = @p_user_id;

        IF @v_cart_id IS NULL
        BEGIN
            SET @v_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO carts (id, user_id, guest_token, created_at, updated_at)
            VALUES (@v_cart_id, @p_user_id, NULL, GETDATE(), GETDATE());
        END
    END
    ELSE IF @p_guest_token IS NOT NULL
    BEGIN
        SELECT @v_cart_id = id
        FROM carts
        WHERE guest_token = @p_guest_token;

        IF @v_cart_id IS NULL
        BEGIN
            SET @v_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO carts (id, user_id, guest_token, created_at, updated_at)
            VALUES (@v_cart_id, NULL, @p_guest_token, GETDATE(), GETDATE());
        END
    END
    ELSE
    BEGIN
        THROW 50000, 'Debe proporcionar user_id o guest_token.', 1;
    END

    SELECT
        id,
        user_id,
        guest_token,
        created_at,
        updated_at
    FROM carts
    WHERE id = @v_cart_id;
END;
GO

-- 2. Obtener detalle de items de un carrito con datos de variantes, productos y categorías
CREATE OR ALTER PROCEDURE SP_Carritos_ObtenerDetalle
    @p_cart_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ci.id AS item_id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        p.id AS product_id,
        p.name AS product_name,
        p.main_image_url,
        c.name AS category_name
    FROM cart_items ci
    INNER JOIN product_variants v ON ci.variant_id = v.id
    INNER JOIN products p ON v.product_id = p.id
    INNER JOIN categories c ON p.category_id = c.id
    WHERE ci.cart_id = @p_cart_id
    ORDER BY ci.created_at ASC;
END;
GO

-- 3. Agregar o incrementar cantidad de un item en el carrito
CREATE OR ALTER PROCEDURE SP_Carritos_AgregarOActualizarItem
    @p_cart_id VARCHAR(36),
    @p_variant_id VARCHAR(36),
    @p_quantity INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_quantity <= 0
    BEGIN
        THROW 50000, 'La cantidad debe ser mayor a 0.', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM carts WHERE id = @p_cart_id)
    BEGIN
        THROW 50001, 'El carrito no existe.', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM product_variants WHERE id = @p_variant_id AND is_active = 1)
    BEGIN
        THROW 50001, 'La variante de producto no existe o está inactiva.', 1;
    END

    IF EXISTS (SELECT 1 FROM cart_items WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id)
    BEGIN
        UPDATE cart_items
        SET quantity = quantity + @p_quantity,
            updated_at = GETDATE()
        WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id;
    END
    ELSE
    BEGIN
        INSERT INTO cart_items (id, cart_id, variant_id, quantity, created_at, updated_at)
        VALUES (CAST(NEWID() AS VARCHAR(36)), @p_cart_id, @p_variant_id, @p_quantity, GETDATE(), GETDATE());
    END

    UPDATE carts
    SET updated_at = GETDATE()
    WHERE id = @p_cart_id;

    SELECT
        ci.id AS item_id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        p.id AS product_id,
        p.name AS product_name,
        p.main_image_url,
        c.name AS category_name
    FROM cart_items ci
    INNER JOIN product_variants v ON ci.variant_id = v.id
    INNER JOIN products p ON v.product_id = p.id
    INNER JOIN categories c ON p.category_id = c.id
    WHERE ci.cart_id = @p_cart_id AND ci.variant_id = @p_variant_id;
END;
GO

-- 4. Actualizar cantidad exacta de un item (si es <= 0, elimina el item)
CREATE OR ALTER PROCEDURE SP_Carritos_ActualizarCantidadItem
    @p_cart_id VARCHAR(36),
    @p_variant_id VARCHAR(36),
    @p_quantity INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM carts WHERE id = @p_cart_id)
    BEGIN
        THROW 50001, 'El carrito no existe.', 1;
    END

    IF @p_quantity <= 0
    BEGIN
        DELETE FROM cart_items
        WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id;
    END
    ELSE
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id)
        BEGIN
            THROW 50001, 'El item no existe en el carrito.', 1;
        END

        UPDATE cart_items
        SET quantity = @p_quantity,
            updated_at = GETDATE()
        WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id;
    END

    UPDATE carts
    SET updated_at = GETDATE()
    WHERE id = @p_cart_id;

    SELECT
        ci.id AS item_id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        p.id AS product_id,
        p.name AS product_name,
        p.main_image_url,
        c.name AS category_name
    FROM cart_items ci
    INNER JOIN product_variants v ON ci.variant_id = v.id
    INNER JOIN products p ON v.product_id = p.id
    INNER JOIN categories c ON p.category_id = c.id
    WHERE ci.cart_id = @p_cart_id AND ci.variant_id = @p_variant_id;
END;
GO

-- 5. Eliminar item específico del carrito
CREATE OR ALTER PROCEDURE SP_Carritos_EliminarItem
    @p_cart_id VARCHAR(36),
    @p_variant_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM cart_items
    WHERE cart_id = @p_cart_id AND variant_id = @p_variant_id;

    UPDATE carts
    SET updated_at = GETDATE()
    WHERE id = @p_cart_id;
END;
GO

-- 6. Vaciar todos los items del carrito
CREATE OR ALTER PROCEDURE SP_Carritos_Vaciar
    @p_cart_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM cart_items
    WHERE cart_id = @p_cart_id;

    UPDATE carts
    SET updated_at = GETDATE()
    WHERE id = @p_cart_id;
END;
GO

-- 7. Sincronizar / fusionar carrito de invitado al iniciar sesión
CREATE OR ALTER PROCEDURE SP_Carritos_SincronizarInvitado
    @p_user_id VARCHAR(36),
    @p_guest_token VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_guest_cart_id VARCHAR(36);
    DECLARE @v_user_cart_id VARCHAR(36);

    SELECT @v_guest_cart_id = id
    FROM carts
    WHERE guest_token = @p_guest_token;

    SELECT @v_user_cart_id = id
    FROM carts
    WHERE user_id = @p_user_id;

    -- Caso 1: No existe carrito para ese guest_token
    IF @v_guest_cart_id IS NULL
    BEGIN
        IF @v_user_cart_id IS NULL
        BEGIN
            SET @v_user_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO carts (id, user_id, guest_token, created_at, updated_at)
            VALUES (@v_user_cart_id, @p_user_id, NULL, GETDATE(), GETDATE());
        END
    END
    -- Caso 2: Existe carrito de invitado pero el usuario no tenía un carrito previo
    ELSE IF @v_user_cart_id IS NULL
    BEGIN
        UPDATE carts
        SET user_id = @p_user_id,
            guest_token = NULL,
            updated_at = GETDATE()
        WHERE id = @v_guest_cart_id;

        SET @v_user_cart_id = @v_guest_cart_id;
    END
    -- Caso 3: Ambos carritos existen -> fusionar items del invitado en el del usuario
    ELSE
    BEGIN
        -- 3a. Incrementar cantidad para variantes coincidentes
        UPDATE u
        SET u.quantity = u.quantity + g.quantity,
            u.updated_at = GETDATE()
        FROM cart_items u
        INNER JOIN cart_items g ON u.variant_id = g.variant_id
        WHERE u.cart_id = @v_user_cart_id AND g.cart_id = @v_guest_cart_id;

        -- 3b. Insertar items exclusivos del carrito invitado
        INSERT INTO cart_items (id, cart_id, variant_id, quantity, created_at, updated_at)
        SELECT
            CAST(NEWID() AS VARCHAR(36)),
            @v_user_cart_id,
            g.variant_id,
            g.quantity,
            GETDATE(),
            GETDATE()
        FROM cart_items g
        WHERE g.cart_id = @v_guest_cart_id
          AND NOT EXISTS (
              SELECT 1
              FROM cart_items u
              WHERE u.cart_id = @v_user_cart_id AND u.variant_id = g.variant_id
          );

        -- 3c. Eliminar items y el carrito de invitado
        DELETE FROM cart_items WHERE cart_id = @v_guest_cart_id;
        DELETE FROM carts WHERE id = @v_guest_cart_id;

        UPDATE carts
        SET updated_at = GETDATE()
        WHERE id = @v_user_cart_id;
    END

    SELECT
        id,
        user_id,
        guest_token,
        created_at,
        updated_at
    FROM carts
    WHERE id = @v_user_cart_id;
END;
GO

-- =============================================================================
-- STORED PROCEDURES: MÓDULO CARRITOS (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- Tablas: Carts, CartItems, ProductVariants, Products, ProductImages, Categories
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
        SELECT @v_cart_id = IDCart
        FROM Carts
        WHERE IDUser = @p_user_id;

        IF @v_cart_id IS NULL
        BEGIN
            SET @v_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO Carts (IDCart, IDUser, GuestToken, CreatedAt, UpdatedAt)
            VALUES (@v_cart_id, @p_user_id, NULL, GETDATE(), GETDATE());
        END
    END
    ELSE IF @p_guest_token IS NOT NULL
    BEGIN
        SELECT @v_cart_id = IDCart
        FROM Carts
        WHERE GuestToken = @p_guest_token;

        IF @v_cart_id IS NULL
        BEGIN
            SET @v_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO Carts (IDCart, IDUser, GuestToken, CreatedAt, UpdatedAt)
            VALUES (@v_cart_id, NULL, @p_guest_token, GETDATE(), GETDATE());
        END
    END
    ELSE
    BEGIN
        THROW 50000, 'Debe proporcionar user_id o guest_token.', 1;
    END

    SELECT
        IDCart AS id,
        IDUser AS user_id,
        GuestToken AS guest_token,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Carts
    WHERE IDCart = @v_cart_id;
END;
GO

-- 2. Obtener detalle de items de un carrito con datos de variantes, productos y categorías
CREATE OR ALTER PROCEDURE SP_Carritos_ObtenerDetalle
    @p_cart_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ci.IDCartItem AS item_id,
        ci.IDCart AS cart_id,
        ci.IDVariant AS variant_id,
        ci.Quantity AS quantity,
        ci.CreatedAt AS created_at,
        ci.UpdatedAt AS updated_at,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        p.IDProduct AS product_id,
        p.Name AS product_name,
        coverImg.ImageURL AS main_image_url,
        c.Name AS category_name
    FROM CartItems ci
    INNER JOIN ProductVariants v ON ci.IDVariant = v.IDVariant
    INNER JOIN Products p ON v.IDProduct = p.IDProduct
    INNER JOIN Categories c ON p.IDCategory = c.IDCategory
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    WHERE ci.IDCart = @p_cart_id
    ORDER BY ci.CreatedAt ASC;
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

    IF NOT EXISTS (SELECT 1 FROM Carts WHERE IDCart = @p_cart_id)
    BEGIN
        THROW 50001, 'El carrito no existe.', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM ProductVariants WHERE IDVariant = @p_variant_id AND IsActive = 1)
    BEGIN
        THROW 50001, 'La variante de producto no existe o está inactiva.', 1;
    END

    IF EXISTS (SELECT 1 FROM CartItems WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id)
    BEGIN
        UPDATE CartItems
        SET Quantity = Quantity + @p_quantity,
            UpdatedAt = GETDATE()
        WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id;
    END
    ELSE
    BEGIN
        INSERT INTO CartItems (IDCartItem, IDCart, IDVariant, Quantity, CreatedAt, UpdatedAt)
        VALUES (CAST(NEWID() AS VARCHAR(36)), @p_cart_id, @p_variant_id, @p_quantity, GETDATE(), GETDATE());
    END

    UPDATE Carts
    SET UpdatedAt = GETDATE()
    WHERE IDCart = @p_cart_id;

    SELECT
        ci.IDCartItem AS item_id,
        ci.IDCart AS cart_id,
        ci.IDVariant AS variant_id,
        ci.Quantity AS quantity,
        ci.CreatedAt AS created_at,
        ci.UpdatedAt AS updated_at,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        p.IDProduct AS product_id,
        p.Name AS product_name,
        coverImg.ImageURL AS main_image_url,
        c.Name AS category_name
    FROM CartItems ci
    INNER JOIN ProductVariants v ON ci.IDVariant = v.IDVariant
    INNER JOIN Products p ON v.IDProduct = p.IDProduct
    INNER JOIN Categories c ON p.IDCategory = c.IDCategory
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    WHERE ci.IDCart = @p_cart_id AND ci.IDVariant = @p_variant_id;
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

    IF NOT EXISTS (SELECT 1 FROM Carts WHERE IDCart = @p_cart_id)
    BEGIN
        THROW 50001, 'El carrito no existe.', 1;
    END

    IF @p_quantity <= 0
    BEGIN
        DELETE FROM CartItems
        WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id;
    END
    ELSE
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM CartItems WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id)
        BEGIN
            THROW 50001, 'El item no existe en el carrito.', 1;
        END

        UPDATE CartItems
        SET Quantity = @p_quantity,
            UpdatedAt = GETDATE()
        WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id;
    END

    UPDATE Carts
    SET UpdatedAt = GETDATE()
    WHERE IDCart = @p_cart_id;

    SELECT
        ci.IDCartItem AS item_id,
        ci.IDCart AS cart_id,
        ci.IDVariant AS variant_id,
        ci.Quantity AS quantity,
        ci.CreatedAt AS created_at,
        ci.UpdatedAt AS updated_at,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        p.IDProduct AS product_id,
        p.Name AS product_name,
        coverImg.ImageURL AS main_image_url,
        c.Name AS category_name
    FROM CartItems ci
    INNER JOIN ProductVariants v ON ci.IDVariant = v.IDVariant
    INNER JOIN Products p ON v.IDProduct = p.IDProduct
    INNER JOIN Categories c ON p.IDCategory = c.IDCategory
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    WHERE ci.IDCart = @p_cart_id AND ci.IDVariant = @p_variant_id;
END;
GO

-- 5. Eliminar item específico del carrito
CREATE OR ALTER PROCEDURE SP_Carritos_EliminarItem
    @p_cart_id VARCHAR(36),
    @p_variant_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM CartItems
    WHERE IDCart = @p_cart_id AND IDVariant = @p_variant_id;

    UPDATE Carts
    SET UpdatedAt = GETDATE()
    WHERE IDCart = @p_cart_id;
END;
GO

-- 6. Vaciar todos los items del carrito
CREATE OR ALTER PROCEDURE SP_Carritos_Vaciar
    @p_cart_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM CartItems
    WHERE IDCart = @p_cart_id;

    UPDATE Carts
    SET UpdatedAt = GETDATE()
    WHERE IDCart = @p_cart_id;
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

    SELECT @v_guest_cart_id = IDCart
    FROM Carts
    WHERE GuestToken = @p_guest_token;

    SELECT @v_user_cart_id = IDCart
    FROM Carts
    WHERE IDUser = @p_user_id;

    -- Caso 1: No existe carrito para ese guest_token
    IF @v_guest_cart_id IS NULL
    BEGIN
        IF @v_user_cart_id IS NULL
        BEGIN
            SET @v_user_cart_id = CAST(NEWID() AS VARCHAR(36));
            INSERT INTO Carts (IDCart, IDUser, GuestToken, CreatedAt, UpdatedAt)
            VALUES (@v_user_cart_id, @p_user_id, NULL, GETDATE(), GETDATE());
        END
    END
    -- Caso 2: Existe carrito de invitado pero el usuario no tenía un carrito previo
    ELSE IF @v_user_cart_id IS NULL
    BEGIN
        UPDATE Carts
        SET IDUser = @p_user_id,
            GuestToken = NULL,
            UpdatedAt = GETDATE()
        WHERE IDCart = @v_guest_cart_id;

        SET @v_user_cart_id = @v_guest_cart_id;
    END
    -- Caso 3: Ambos carritos existen -> fusionar items del invitado en el del usuario
    ELSE
    BEGIN
        -- 3a. Incrementar cantidad para variantes coincidentes
        UPDATE u
        SET u.Quantity = u.Quantity + g.Quantity,
            u.UpdatedAt = GETDATE()
        FROM CartItems u
        INNER JOIN CartItems g ON u.IDVariant = g.IDVariant
        WHERE u.IDCart = @v_user_cart_id AND g.IDCart = @v_guest_cart_id;

        -- 3b. Insertar items exclusivos del carrito invitado
        INSERT INTO CartItems (IDCartItem, IDCart, IDVariant, Quantity, CreatedAt, UpdatedAt)
        SELECT
            CAST(NEWID() AS VARCHAR(36)),
            @v_user_cart_id,
            g.IDVariant,
            g.Quantity,
            GETDATE(),
            GETDATE()
        FROM CartItems g
        WHERE g.IDCart = @v_guest_cart_id
          AND NOT EXISTS (
              SELECT 1
              FROM CartItems u
              WHERE u.IDCart = @v_user_cart_id AND u.IDVariant = g.IDVariant
          );

        -- 3c. Eliminar items y el carrito de invitado
        DELETE FROM CartItems WHERE IDCart = @v_guest_cart_id;
        DELETE FROM Carts WHERE IDCart = @v_guest_cart_id;

        UPDATE Carts
        SET UpdatedAt = GETDATE()
        WHERE IDCart = @v_user_cart_id;
    END

    SELECT
        IDCart AS id,
        IDUser AS user_id,
        GuestToken AS guest_token,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Carts
    WHERE IDCart = @v_user_cart_id;
END;
GO

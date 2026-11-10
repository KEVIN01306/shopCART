-- =============================================================================
-- STORED PROCEDURES: MÓDULO CUPONES Y PROMOCIONES (ShopCart - RF-05)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- Tablas: Coupons, CouponUsages, Categories, CartItems, ProductVariants, Products, AuditLogs, Users
-- =============================================================================

-- 1. Listar cupones con paginación y filtro por código o categoría
CREATE OR ALTER PROCEDURE SP_Cupones_Listar
    @p_page INT = 1,
    @p_limit INT = 20,
    @p_q NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page < 1 SET @p_page = 1;
    IF @p_limit < 1 SET @p_limit = 20;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;
    DECLARE @v_search NVARCHAR(102) = CASE
        WHEN @p_q IS NOT NULL AND LTRIM(RTRIM(@p_q)) <> ''
        THEN '%' + LTRIM(RTRIM(@p_q)) + '%'
        ELSE NULL
    END;

    SELECT
        cp.IDCoupon AS id,
        cp.Code AS code,
        cp.DiscountType AS discount_type,
        cp.DiscountValue AS discount_value,
        cp.MinOrderAmount AS min_order_amount,
        cp.MaxUses AS max_uses,
        cp.CurrentUses AS current_uses,
        cp.MaxUsesPerClient AS max_uses_per_client,
        cp.IDCategory AS category_id,
        c.Name AS category_name,
        cp.StartsAt AS starts_at,
        cp.ExpiresAt AS expires_at,
        cp.IsActive AS is_active,
        cp.CreatedAt AS created_at,
        COUNT(*) OVER() AS total_count
    FROM Coupons cp
    LEFT JOIN Categories c ON c.IDCategory = cp.IDCategory
    WHERE (@v_search IS NULL OR cp.Code LIKE @v_search OR c.Name LIKE @v_search)
    ORDER BY cp.CreatedAt DESC
    OFFSET @v_offset ROWS FETCH NEXT @p_limit ROWS ONLY;
END;
GO

-- 2. Obtener cupón por ID
CREATE OR ALTER PROCEDURE SP_Cupones_ObtenerPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        cp.IDCoupon AS id,
        cp.Code AS code,
        cp.DiscountType AS discount_type,
        cp.DiscountValue AS discount_value,
        cp.MinOrderAmount AS min_order_amount,
        cp.MaxUses AS max_uses,
        cp.CurrentUses AS current_uses,
        cp.MaxUsesPerClient AS max_uses_per_client,
        cp.IDCategory AS category_id,
        c.Name AS category_name,
        cp.StartsAt AS starts_at,
        cp.ExpiresAt AS expires_at,
        cp.IsActive AS is_active,
        cp.CreatedAt AS created_at
    FROM Coupons cp
    LEFT JOIN Categories c ON c.IDCategory = cp.IDCategory
    WHERE cp.IDCoupon = @p_id;
END;
GO

-- 3. Crear cupón con registro en bitácora de auditoría
CREATE OR ALTER PROCEDURE SP_Cupones_Crear
    @p_id VARCHAR(36),
    @p_code VARCHAR(50),
    @p_discount_type VARCHAR(20),
    @p_discount_value DECIMAL(12, 2),
    @p_min_order_amount DECIMAL(12, 2) = 0.00,
    @p_max_uses INT,
    @p_max_uses_per_client INT = 1,
    @p_category_id VARCHAR(36) = NULL,
    @p_starts_at DATETIME2,
    @p_expires_at DATETIME2,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_clean_code VARCHAR(50) = UPPER(LTRIM(RTRIM(@p_code)));

    IF @v_clean_code = ''
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El código del cupón es obligatorio.', 1;
    END

    IF EXISTS (SELECT 1 FROM Coupons WHERE UPPER(LTRIM(RTRIM(Code))) = @v_clean_code)
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe un cupón con ese código.', 1;
    END

    IF @p_discount_type NOT IN ('PORCENTAJE', 'MONTO_FIJO')
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El tipo de descuento debe ser PORCENTAJE o MONTO_FIJO.', 1;
    END

    IF @p_discount_value <= 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El valor de descuento debe ser mayor a 0.', 1;
    END

    IF @p_discount_type = 'PORCENTAJE' AND @p_discount_value > 100
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El porcentaje de descuento no puede superar el 100%.', 1;
    END

    IF @p_min_order_amount < 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El monto mínimo de compra no puede ser negativo.', 1;
    END

    IF @p_max_uses < 1 OR @p_max_uses_per_client < 1
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Los límites de uso deben ser al menos 1.', 1;
    END

    IF @p_expires_at <= @p_starts_at
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: La fecha de expiración debe ser posterior a la fecha de inicio.', 1;
    END

    IF @p_category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Categories WHERE IDCategory = @p_category_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría especificada no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    INSERT INTO Coupons (
        IDCoupon,
        Code,
        DiscountType,
        DiscountValue,
        MinOrderAmount,
        MaxUses,
        CurrentUses,
        MaxUsesPerClient,
        IDCategory,
        StartsAt,
        ExpiresAt,
        IsActive,
        CreatedAt
    )
    VALUES (
        @p_id,
        @v_clean_code,
        @p_discount_type,
        @p_discount_value,
        @p_min_order_amount,
        @p_max_uses,
        0,
        @p_max_uses_per_client,
        @p_category_id,
        @p_starts_at,
        @p_expires_at,
        1,
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
        @v_valid_user_id,
        'CUPON',
        'CREAR',
        NULL,
        CONCAT(
            N'{"id":"', @p_id,
            N'","code":"', @v_clean_code,
            N'","discountType":"', @p_discount_type,
            N'","discountValue":', CONVERT(VARCHAR(30), @p_discount_value),
            N',"minOrderAmount":', CONVERT(VARCHAR(30), @p_min_order_amount),
            N',"maxUses":', CONVERT(VARCHAR(20), @p_max_uses),
            N'}'
        ),
        GETDATE()
    );

    EXEC SP_Cupones_ObtenerPorId @p_id = @p_id;
END;
GO

-- 4. Actualizar cupón con registro en bitácora de auditoría
CREATE OR ALTER PROCEDURE SP_Cupones_Actualizar
    @p_id VARCHAR(36),
    @p_code VARCHAR(50) = NULL,
    @p_discount_type VARCHAR(20) = NULL,
    @p_discount_value DECIMAL(12, 2) = NULL,
    @p_min_order_amount DECIMAL(12, 2) = NULL,
    @p_max_uses INT = NULL,
    @p_max_uses_per_client INT = NULL,
    @p_category_id VARCHAR(36) = NULL,
    @p_clear_category BIT = 0,
    @p_starts_at DATETIME2 = NULL,
    @p_expires_at DATETIME2 = NULL,
    @p_is_active BIT = NULL,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_old_code VARCHAR(50);
    DECLARE @v_old_type VARCHAR(20);
    DECLARE @v_old_value DECIMAL(12, 2);
    DECLARE @v_old_min DECIMAL(12, 2);
    DECLARE @v_old_max_uses INT;
    DECLARE @v_old_max_client INT;
    DECLARE @v_old_cat VARCHAR(36);
    DECLARE @v_old_starts DATETIME2;
    DECLARE @v_old_expires DATETIME2;
    DECLARE @v_old_active BIT;

    SELECT
        @v_old_code = Code,
        @v_old_type = DiscountType,
        @v_old_value = DiscountValue,
        @v_old_min = MinOrderAmount,
        @v_old_max_uses = MaxUses,
        @v_old_max_client = MaxUsesPerClient,
        @v_old_cat = IDCategory,
        @v_old_starts = StartsAt,
        @v_old_expires = ExpiresAt,
        @v_old_active = IsActive
    FROM Coupons
    WHERE IDCoupon = @p_id;

    IF @v_old_code IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El cupón no existe.', 1;
    END

    DECLARE @v_new_code VARCHAR(50) = CASE
        WHEN @p_code IS NOT NULL AND LTRIM(RTRIM(@p_code)) <> ''
        THEN UPPER(LTRIM(RTRIM(@p_code)))
        ELSE @v_old_code
    END;

    IF EXISTS (
        SELECT 1
        FROM Coupons
        WHERE UPPER(LTRIM(RTRIM(Code))) = @v_new_code
          AND IDCoupon <> @p_id
    )
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe otro cupón con ese código.', 1;
    END

    DECLARE @v_new_type VARCHAR(20) = COALESCE(@p_discount_type, @v_old_type);
    DECLARE @v_new_value DECIMAL(12, 2) = COALESCE(@p_discount_value, @v_old_value);

    IF @v_new_type NOT IN ('PORCENTAJE', 'MONTO_FIJO')
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El tipo de descuento debe ser PORCENTAJE o MONTO_FIJO.', 1;
    END

    IF @v_new_value <= 0 OR (@v_new_type = 'PORCENTAJE' AND @v_new_value > 100)
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Valor de descuento fuera de rango permitido.', 1;
    END

    DECLARE @v_new_cat VARCHAR(36) = CASE
        WHEN @p_clear_category = 1 THEN NULL
        WHEN @p_category_id IS NOT NULL THEN @p_category_id
        ELSE @v_old_cat
    END;

    IF @v_new_cat IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Categories WHERE IDCategory = @v_new_cat)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría especificada no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    UPDATE Coupons
    SET Code = @v_new_code,
        DiscountType = @v_new_type,
        DiscountValue = @v_new_value,
        MinOrderAmount = COALESCE(@p_min_order_amount, MinOrderAmount),
        MaxUses = COALESCE(@p_max_uses, MaxUses),
        MaxUsesPerClient = COALESCE(@p_max_uses_per_client, MaxUsesPerClient),
        IDCategory = @v_new_cat,
        StartsAt = COALESCE(@p_starts_at, StartsAt),
        ExpiresAt = COALESCE(@p_expires_at, ExpiresAt),
        IsActive = COALESCE(@p_is_active, IsActive)
    WHERE IDCoupon = @p_id;

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
        @v_valid_user_id,
        'CUPON',
        'ACTUALIZAR',
        CONCAT(N'{"id":"', @p_id, N'","code":"', @v_old_code, N'","discountValue":', CONVERT(VARCHAR(30), @v_old_value), N'}'),
        CONCAT(N'{"id":"', @p_id, N'","code":"', @v_new_code, N'","discountValue":', CONVERT(VARCHAR(30), @v_new_value), N'}'),
        GETDATE()
    );

    EXEC SP_Cupones_ObtenerPorId @p_id = @p_id;
END;
GO

-- 5. Cambiar estado activo de un cupón
CREATE OR ALTER PROCEDURE SP_Cupones_CambiarEstadoActivo
    @p_id VARCHAR(36),
    @p_is_active BIT,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_old_active BIT;
    DECLARE @v_code VARCHAR(50);

    SELECT
        @v_old_active = IsActive,
        @v_code = Code
    FROM Coupons
    WHERE IDCoupon = @p_id;

    IF @v_code IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El cupón no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    UPDATE Coupons
    SET IsActive = @p_is_active
    WHERE IDCoupon = @p_id;

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
        @v_valid_user_id,
        'CUPON',
        CASE WHEN @p_is_active = 1 THEN 'ACTIVAR' ELSE 'DESACTIVAR' END,
        CONCAT(N'{"id":"', @p_id, N'","code":"', @v_code, N'","isActive":', CASE WHEN @v_old_active = 1 THEN 'true' ELSE 'false' END, N'}'),
        CONCAT(N'{"id":"', @p_id, N'","code":"', @v_code, N'","isActive":', CASE WHEN @p_is_active = 1 THEN 'true' ELSE 'false' END, N'}'),
        GETDATE()
    );

    EXEC SP_Cupones_ObtenerPorId @p_id = @p_id;
END;
GO

-- 6. Validar y aplicar cupón sobre el carrito o subtotal enviado (RF-05)
CREATE OR ALTER PROCEDURE SP_Cupones_ValidarYAplicar
    @p_code VARCHAR(50),
    @p_user_id VARCHAR(36) = NULL,
    @p_cart_id VARCHAR(36) = NULL,
    @p_subtotal DECIMAL(12, 2) = NULL,
    @p_category_subtotal DECIMAL(12, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_id VARCHAR(36);
    DECLARE @v_code VARCHAR(50);
    DECLARE @v_discount_type VARCHAR(20);
    DECLARE @v_discount_value DECIMAL(12, 2);
    DECLARE @v_min_order_amount DECIMAL(12, 2);
    DECLARE @v_max_uses INT;
    DECLARE @v_current_uses INT;
    DECLARE @v_max_uses_per_client INT;
    DECLARE @v_category_id VARCHAR(36);
    DECLARE @v_category_name VARCHAR(100);
    DECLARE @v_starts_at DATETIME2;
    DECLARE @v_expires_at DATETIME2;
    DECLARE @v_is_active BIT;

    SELECT
        @v_id = cp.IDCoupon,
        @v_code = cp.Code,
        @v_discount_type = cp.DiscountType,
        @v_discount_value = cp.DiscountValue,
        @v_min_order_amount = cp.MinOrderAmount,
        @v_max_uses = cp.MaxUses,
        @v_current_uses = cp.CurrentUses,
        @v_max_uses_per_client = cp.MaxUsesPerClient,
        @v_category_id = cp.IDCategory,
        @v_category_name = c.Name,
        @v_starts_at = cp.StartsAt,
        @v_expires_at = cp.ExpiresAt,
        @v_is_active = cp.IsActive
    FROM Coupons cp
    LEFT JOIN Categories c ON c.IDCategory = cp.IDCategory
    WHERE UPPER(LTRIM(RTRIM(cp.Code))) = UPPER(LTRIM(RTRIM(@p_code)));

    IF @v_id IS NULL OR @v_is_active = 0
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El cupón ingresado no existe o se encuentra inactivo.', 1;
    END

    IF GETDATE() < @v_starts_at
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El cupón aún no ha iniciado su vigencia.', 1;
    END

    IF GETDATE() > @v_expires_at
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El cupón ha vencido.', 1;
    END

    IF @v_current_uses >= @v_max_uses
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El cupón se ha agotado (límite global de usos alcanzado).', 1;
    END

    IF @p_user_id IS NOT NULL
    BEGIN
        DECLARE @v_client_uses INT = 0;
        SELECT @v_client_uses = COUNT(1)
        FROM CouponUsages
        WHERE IDCoupon = @v_id AND IDUser = @p_user_id;

        IF @v_client_uses >= @v_max_uses_per_client
        BEGIN
            THROW 50005, 'DATOS_INVALIDOS: Has alcanzado el límite máximo de usos permitidos por cliente para este cupón.', 1;
        END
    END

    DECLARE @v_cart_subtotal DECIMAL(12, 2) = 0.00;
    DECLARE @v_eligible_subtotal DECIMAL(12, 2) = 0.00;
    DECLARE @v_has_cart_items BIT = 0;

    IF @p_cart_id IS NOT NULL AND EXISTS (SELECT 1 FROM CartItems WHERE IDCart = @p_cart_id)
    BEGIN
        SET @v_has_cart_items = 1;

        SELECT
            @v_cart_subtotal = ISNULL(SUM(CAST(ci.Quantity AS DECIMAL(12, 2)) * v.Price), 0.00),
            @v_eligible_subtotal = ISNULL(SUM(
                CASE
                    WHEN @v_category_id IS NULL OR p.IDCategory = @v_category_id
                    THEN CAST(ci.Quantity AS DECIMAL(12, 2)) * v.Price
                    ELSE 0.00
                END
            ), 0.00)
        FROM CartItems ci
        INNER JOIN ProductVariants v ON ci.IDVariant = v.IDVariant
        INNER JOIN Products p ON v.IDProduct = p.IDProduct
        WHERE ci.IDCart = @p_cart_id;
    END

    IF @v_has_cart_items = 0
    BEGIN
        SET @v_cart_subtotal = ISNULL(@p_subtotal, 0.00);
        IF @v_category_id IS NULL
            SET @v_eligible_subtotal = @v_cart_subtotal;
        ELSE
            SET @v_eligible_subtotal = ISNULL(@p_category_subtotal, @v_cart_subtotal);
    END

    IF @v_cart_subtotal <= 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Tu carrito está vacío para aplicar un cupón.', 1;
    END

    IF @v_cart_subtotal < @v_min_order_amount
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: No se alcanza el monto mínimo de compra requerido para este cupón.', 1;
    END

    IF @v_category_id IS NOT NULL AND @v_eligible_subtotal <= 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Este cupón solo aplica a productos de una categoría específica que no está en tu carrito.', 1;
    END

    DECLARE @v_discount DECIMAL(12, 2) = 0.00;
    IF @v_discount_type = 'PORCENTAJE'
    BEGIN
        SET @v_discount = ROUND(@v_eligible_subtotal * (@v_discount_value / 100.00), 2);
    END
    ELSE
    BEGIN
        SET @v_discount = @v_discount_value;
    END

    IF @v_discount > @v_eligible_subtotal
        SET @v_discount = @v_eligible_subtotal;

    IF @v_discount > @v_cart_subtotal
        SET @v_discount = @v_cart_subtotal;

    DECLARE @v_final_total DECIMAL(12, 2) = @v_cart_subtotal - @v_discount;
    IF @v_final_total < 0.00
        SET @v_final_total = 0.00;

    SELECT
        @v_id AS coupon_id,
        @v_code AS code,
        @v_discount_type AS discount_type,
        @v_discount_value AS discount_value,
        @v_min_order_amount AS min_order_amount,
        @v_category_id AS category_id,
        @v_category_name AS category_name,
        @v_cart_subtotal AS subtotal,
        @v_eligible_subtotal AS eligible_subtotal,
        @v_discount AS discount_amount,
        @v_final_total AS final_total;
END;
GO

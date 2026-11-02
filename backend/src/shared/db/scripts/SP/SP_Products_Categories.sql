-- =============================================================================
-- STORED PROCEDURES: CATEGORÍAS, PRODUCTOS, VARIANTES Y KARDEX (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- =============================================================================

-- 1. Listar categorías con conteo de productos activos
CREATE OR ALTER PROCEDURE SP_Categorias_Listar
    @p_only_active BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(CASE WHEN p.is_active = 1 THEN p.id END) AS product_count
    FROM categories c
    LEFT JOIN products p
        ON p.category_id = c.id
    WHERE (@p_only_active = 0 OR c.is_active = 1)
    GROUP BY
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at
    ORDER BY c.name ASC;
END;
GO

-- 2. Obtener categoría por ID
CREATE OR ALTER PROCEDURE SP_Categorias_ObtenerPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(CASE WHEN p.is_active = 1 THEN p.id END) AS product_count
    FROM categories c
    LEFT JOIN products p
        ON p.category_id = c.id
    WHERE c.id = @p_id
    GROUP BY
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at;
END;
GO

-- 3. Crear categoría
CREATE OR ALTER PROCEDURE SP_Categorias_Crear
    @p_id VARCHAR(36),
    @p_name VARCHAR(100),
    @p_description VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM categories WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@p_name))))
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe una categoría con ese nombre.', 1;
    END

    INSERT INTO categories (
        id,
        name,
        description,
        is_active,
        created_at
    )
    VALUES (
        @p_id,
        LTRIM(RTRIM(@p_name)),
        @p_description,
        1,
        GETDATE()
    );

    SELECT
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        0 AS product_count
    FROM categories c
    WHERE c.id = @p_id;
END;
GO

-- 4. Actualizar categoría
CREATE OR ALTER PROCEDURE SP_Categorias_Actualizar
    @p_id VARCHAR(36),
    @p_name VARCHAR(100) = NULL,
    @p_description VARCHAR(255) = NULL,
    @p_is_active BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría no existe.', 1;
    END

    IF @p_name IS NOT NULL AND EXISTS (
        SELECT 1
        FROM categories
        WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@p_name)))
          AND id <> @p_id
    )
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe otra categoría con ese nombre.', 1;
    END

    UPDATE categories
    SET name = COALESCE(LTRIM(RTRIM(@p_name)), name),
        description = CASE WHEN @p_description IS NOT NULL THEN @p_description ELSE description END,
        is_active = COALESCE(@p_is_active, is_active)
    WHERE id = @p_id;

    EXEC SP_Categorias_ObtenerPorId @p_id = @p_id;
END;
GO

-- 5. Listar catálogo público de productos (con filtros, ordenamiento y sus variantes activas)
CREATE OR ALTER PROCEDURE SP_Productos_ListarCatalogo
    @p_page INT = 1,
    @p_limit INT = 12,
    @p_q NVARCHAR(100) = NULL,
    @p_category_id VARCHAR(36) = NULL,
    @p_min_price DECIMAL(12, 2) = NULL,
    @p_max_price DECIMAL(12, 2) = NULL,
    @p_sort_by VARCHAR(30) = 'latest'
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page < 1 SET @p_page = 1;
    IF @p_limit < 1 SET @p_limit = 12;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;
    DECLARE @v_search NVARCHAR(102) = CASE
        WHEN @p_q IS NOT NULL AND LTRIM(RTRIM(@p_q)) <> ''
        THEN '%' + LTRIM(RTRIM(@p_q)) + '%'
        ELSE NULL
    END;

    DECLARE @PagedCatalog TABLE (
        row_num INT IDENTITY(1,1),
        id VARCHAR(36),
        category_id VARCHAR(36),
        category_name VARCHAR(100),
        name VARCHAR(200),
        description NVARCHAR(MAX),
        main_image_url VARCHAR(500),
        is_active BIT,
        created_at DATETIME2,
        updated_at DATETIME2,
        min_price DECIMAL(12, 2),
        max_price DECIMAL(12, 2),
        total_stock_available INT,
        variants_count INT,
        default_variant_id VARCHAR(36),
        default_variant_sku VARCHAR(60),
        default_variant_attributes NVARCHAR(MAX),
        total_count INT
    );

    ;WITH VariantStats AS (
        SELECT
            v.product_id,
            MIN(v.price) AS min_price,
            MAX(v.price) AS max_price,
            SUM(v.stock_physical - v.stock_reserved) AS total_stock_available,
            COUNT(v.id) AS variants_count
        FROM product_variants v
        WHERE v.is_active = 1
          AND (@p_min_price IS NULL OR v.price >= @p_min_price)
          AND (@p_max_price IS NULL OR v.price <= @p_max_price)
        GROUP BY v.product_id
    ),
    DefaultVariant AS (
        SELECT
            v.product_id,
            v.id AS default_variant_id,
            v.sku AS default_variant_sku,
            v.attributes AS default_variant_attributes,
            ROW_NUMBER() OVER (PARTITION BY v.product_id ORDER BY v.price ASC, v.created_at ASC) AS rn
        FROM product_variants v
        WHERE v.is_active = 1
          AND (@p_min_price IS NULL OR v.price >= @p_min_price)
          AND (@p_max_price IS NULL OR v.price <= @p_max_price)
    )
    INSERT INTO @PagedCatalog (
        id,
        category_id,
        category_name,
        name,
        description,
        main_image_url,
        is_active,
        created_at,
        updated_at,
        min_price,
        max_price,
        total_stock_available,
        variants_count,
        default_variant_id,
        default_variant_sku,
        default_variant_attributes,
        total_count
    )
    SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.main_image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        vs.min_price,
        vs.max_price,
        vs.total_stock_available,
        vs.variants_count,
        dv.default_variant_id,
        dv.default_variant_sku,
        dv.default_variant_attributes,
        COUNT(*) OVER() AS total_count
    FROM products p
    INNER JOIN categories c
        ON c.id = p.category_id
       AND c.is_active = 1
    INNER JOIN VariantStats vs
        ON vs.product_id = p.id
    LEFT JOIN DefaultVariant dv
        ON dv.product_id = p.id
       AND dv.rn = 1
    WHERE p.is_active = 1
      AND (@p_category_id IS NULL OR p.category_id = @p_category_id)
      AND (
          @v_search IS NULL
          OR p.name LIKE @v_search
          OR p.description LIKE @v_search
          OR c.name LIKE @v_search
          OR EXISTS (
              SELECT 1
              FROM product_variants pv
              WHERE pv.product_id = p.id
                AND pv.is_active = 1
                AND (pv.sku LIKE @v_search OR pv.attributes LIKE @v_search)
          )
      )
    ORDER BY
        CASE WHEN @p_sort_by = 'price_asc' THEN vs.min_price END ASC,
        CASE WHEN @p_sort_by = 'price_desc' THEN vs.min_price END DESC,
        CASE WHEN @p_sort_by = 'name_asc' THEN p.name END ASC,
        CASE WHEN @p_sort_by = 'latest' OR @p_sort_by IS NULL THEN p.created_at END DESC,
        p.created_at DESC
    OFFSET @v_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;

    -- Primer Resultset: Productos paginados
    SELECT
        id,
        category_id,
        category_name,
        name,
        description,
        main_image_url,
        is_active,
        created_at,
        updated_at,
        min_price,
        max_price,
        total_stock_available,
        variants_count,
        default_variant_id,
        default_variant_sku,
        default_variant_attributes,
        total_count
    FROM @PagedCatalog
    ORDER BY row_num ASC;

    -- Segundo Resultset: Variantes activas pertenecientes a los productos devueltos
    SELECT
        v.id,
        v.product_id,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        v.is_active,
        v.created_at,
        v.updated_at
    FROM product_variants v
    INNER JOIN @PagedCatalog pc
        ON pc.id = v.product_id
    WHERE v.is_active = 1
    ORDER BY pc.row_num ASC, v.price ASC, v.created_at ASC;
END;
GO

-- 6. Listar productos para el panel administrativo (activos e inactivos + sus variantes)
CREATE OR ALTER PROCEDURE SP_Productos_ListarAdmin
    @p_page INT = 1,
    @p_limit INT = 10,
    @p_q NVARCHAR(100) = NULL,
    @p_category_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page < 1 SET @p_page = 1;
    IF @p_limit < 1 SET @p_limit = 10;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;
    DECLARE @v_search NVARCHAR(102) = CASE
        WHEN @p_q IS NOT NULL AND LTRIM(RTRIM(@p_q)) <> ''
        THEN '%' + LTRIM(RTRIM(@p_q)) + '%'
        ELSE NULL
    END;

    DECLARE @PagedAdmin TABLE (
        row_num INT IDENTITY(1,1),
        id VARCHAR(36),
        category_id VARCHAR(36),
        category_name VARCHAR(100),
        name VARCHAR(200),
        description NVARCHAR(MAX),
        main_image_url VARCHAR(500),
        is_active BIT,
        created_at DATETIME2,
        updated_at DATETIME2,
        min_price DECIMAL(12, 2),
        max_price DECIMAL(12, 2),
        total_stock_physical INT,
        total_stock_reserved INT,
        total_stock_available INT,
        variants_count INT,
        total_count INT
    );

    INSERT INTO @PagedAdmin (
        id,
        category_id,
        category_name,
        name,
        description,
        main_image_url,
        is_active,
        created_at,
        updated_at,
        min_price,
        max_price,
        total_stock_physical,
        total_stock_reserved,
        total_stock_available,
        variants_count,
        total_count
    )
    SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.main_image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(MIN(v.price), 0.00) AS min_price,
        COALESCE(MAX(v.price), 0.00) AS max_price,
        COALESCE(SUM(v.stock_physical), 0) AS total_stock_physical,
        COALESCE(SUM(v.stock_reserved), 0) AS total_stock_reserved,
        COALESCE(SUM(v.stock_physical - v.stock_reserved), 0) AS total_stock_available,
        COUNT(v.id) AS variants_count,
        COUNT(*) OVER() AS total_count
    FROM products p
    INNER JOIN categories c
        ON c.id = p.category_id
    LEFT JOIN product_variants v
        ON v.product_id = p.id
    WHERE (@p_category_id IS NULL OR p.category_id = @p_category_id)
      AND (
          @v_search IS NULL
          OR p.name LIKE @v_search
          OR p.description LIKE @v_search
          OR c.name LIKE @v_search
          OR EXISTS (
              SELECT 1
              FROM product_variants pv
              WHERE pv.product_id = p.id
                AND (pv.sku LIKE @v_search OR pv.attributes LIKE @v_search)
          )
      )
    GROUP BY
        p.id,
        p.category_id,
        c.name,
        p.name,
        p.description,
        p.main_image_url,
        p.is_active,
        p.created_at,
        p.updated_at
    ORDER BY p.created_at DESC
    OFFSET @v_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;

    -- Primer Resultset: Productos paginados
    SELECT
        id,
        category_id,
        category_name,
        name,
        description,
        main_image_url,
        is_active,
        created_at,
        updated_at,
        min_price,
        max_price,
        total_stock_physical,
        total_stock_reserved,
        total_stock_available,
        variants_count,
        total_count
    FROM @PagedAdmin
    ORDER BY row_num ASC;

    -- Segundo Resultset: Todas las variantes de los productos devueltos
    SELECT
        v.id,
        v.product_id,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        v.is_active,
        v.created_at,
        v.updated_at
    FROM product_variants v
    INNER JOIN @PagedAdmin pa
        ON pa.id = v.product_id
    ORDER BY pa.row_num ASC, v.price ASC, v.created_at ASC;
END;
GO

-- 7. Obtener producto por ID con sus variantes
CREATE OR ALTER PROCEDURE SP_Productos_ObtenerPorId
    @p_id VARCHAR(36),
    @p_only_active BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- Primer Resultset: Datos del producto + estadísticas
    SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.main_image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(MIN(v.price), 0.00) AS min_price,
        COALESCE(MAX(v.price), 0.00) AS max_price,
        COALESCE(SUM(v.stock_physical), 0) AS total_stock_physical,
        COALESCE(SUM(v.stock_reserved), 0) AS total_stock_reserved,
        COALESCE(SUM(v.stock_physical - v.stock_reserved), 0) AS total_stock_available,
        COUNT(v.id) AS variants_count
    FROM products p
    INNER JOIN categories c
        ON c.id = p.category_id
    LEFT JOIN product_variants v
        ON v.product_id = p.id
       AND (@p_only_active = 0 OR v.is_active = 1)
    WHERE p.id = @p_id
      AND (@p_only_active = 0 OR (p.is_active = 1 AND c.is_active = 1))
    GROUP BY
        p.id,
        p.category_id,
        c.name,
        p.name,
        p.description,
        p.main_image_url,
        p.is_active,
        p.created_at,
        p.updated_at;

    -- Segundo Resultset: Variantes del producto
    SELECT
        v.id,
        v.product_id,
        v.sku,
        v.attributes,
        v.price,
        v.stock_physical,
        v.stock_reserved,
        (v.stock_physical - v.stock_reserved) AS stock_available,
        v.is_active,
        v.created_at,
        v.updated_at
    FROM product_variants v
    INNER JOIN products p
        ON p.id = v.product_id
    INNER JOIN categories c
        ON c.id = p.category_id
    WHERE v.product_id = @p_id
      AND (@p_only_active = 0 OR (v.is_active = 1 AND p.is_active = 1 AND c.is_active = 1))
    ORDER BY v.price ASC, v.created_at ASC;
END;
GO

-- 8. Crear producto y registrar en bitácora de auditoría
CREATE OR ALTER PROCEDURE SP_Productos_CrearProducto
    @p_id VARCHAR(36),
    @p_category_id VARCHAR(36),
    @p_name VARCHAR(200),
    @p_description NVARCHAR(MAX) = NULL,
    @p_main_image_url VARCHAR(500) = NULL,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = @p_category_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría especificada no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    INSERT INTO products (
        id,
        category_id,
        name,
        description,
        main_image_url,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        @p_id,
        @p_category_id,
        LTRIM(RTRIM(@p_name)),
        @p_description,
        @p_main_image_url,
        1,
        GETDATE(),
        GETDATE()
    );

    INSERT INTO audit_logs (
        id,
        user_id,
        entity,
        action,
        old_value,
        new_value,
        created_at
    )
    VALUES (
        CONVERT(VARCHAR(36), NEWID()),
        @v_valid_user_id,
        'PRODUCTO',
        'CREAR',
        NULL,
        CONCAT(N'{"id":"', @p_id, N'","name":"', REPLACE(@p_name, '"', '\"'), N'","categoryId":"', @p_category_id, N'"}'),
        GETDATE()
    );

    EXEC SP_Productos_ObtenerPorId @p_id = @p_id, @p_only_active = 0;
END;
GO

-- 9. Actualizar producto y registrar en bitácora de auditoría
CREATE OR ALTER PROCEDURE SP_Productos_ActualizarProducto
    @p_id VARCHAR(36),
    @p_category_id VARCHAR(36) = NULL,
    @p_name VARCHAR(200) = NULL,
    @p_description NVARCHAR(MAX) = NULL,
    @p_main_image_url VARCHAR(500) = NULL,
    @p_is_active BIT = NULL,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_old_name VARCHAR(200);
    DECLARE @v_old_category VARCHAR(36);
    DECLARE @v_old_active BIT;

    SELECT
        @v_old_name = name,
        @v_old_category = category_id,
        @v_old_active = is_active
    FROM products
    WHERE id = @p_id;

    IF @v_old_name IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto no existe.', 1;
    END

    IF @p_category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = @p_category_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría especificada no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    UPDATE products
    SET category_id = COALESCE(@p_category_id, category_id),
        name = COALESCE(LTRIM(RTRIM(@p_name)), name),
        description = CASE WHEN @p_description IS NOT NULL THEN @p_description ELSE description END,
        main_image_url = CASE WHEN @p_main_image_url IS NOT NULL THEN @p_main_image_url ELSE main_image_url END,
        is_active = COALESCE(@p_is_active, is_active),
        updated_at = GETDATE()
    WHERE id = @p_id;

    INSERT INTO audit_logs (
        id,
        user_id,
        entity,
        action,
        old_value,
        new_value,
        created_at
    )
    VALUES (
        CONVERT(VARCHAR(36), NEWID()),
        @v_valid_user_id,
        'PRODUCTO',
        'ACTUALIZAR',
        CONCAT(N'{"id":"', @p_id, N'","name":"', REPLACE(@v_old_name, '"', '\"'), N'","categoryId":"', @v_old_category, N'","isActive":', CASE WHEN @v_old_active = 1 THEN 'true' ELSE 'false' END, N'}'),
        CONCAT(N'{"id":"', @p_id, N'","name":"', REPLACE(COALESCE(@p_name, @v_old_name), '"', '\"'), N'","categoryId":"', COALESCE(@p_category_id, @v_old_category), N'","isActive":', CASE WHEN COALESCE(@p_is_active, @v_old_active) = 1 THEN 'true' ELSE 'false' END, N'}'),
        GETDATE()
    );

    EXEC SP_Productos_ObtenerPorId @p_id = @p_id, @p_only_active = 0;
END;
GO

-- 10. Cambiar estado activo de producto (Borrado lógico / Reactivación)
CREATE OR ALTER PROCEDURE SP_Productos_CambiarEstadoActivo
    @p_id VARCHAR(36),
    @p_is_active BIT,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_old_active BIT;
    DECLARE @v_name VARCHAR(200);

    SELECT
        @v_old_active = is_active,
        @v_name = name
    FROM products
    WHERE id = @p_id;

    IF @v_name IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    UPDATE products
    SET is_active = @p_is_active,
        updated_at = GETDATE()
    WHERE id = @p_id;

    INSERT INTO audit_logs (
        id,
        user_id,
        entity,
        action,
        old_value,
        new_value,
        created_at
    )
    VALUES (
        CONVERT(VARCHAR(36), NEWID()),
        @v_valid_user_id,
        'PRODUCTO',
        CASE WHEN @p_is_active = 1 THEN 'ACTIVAR' ELSE 'DESACTIVAR' END,
        CONCAT(N'{"id":"', @p_id, N'","isActive":', CASE WHEN @v_old_active = 1 THEN 'true' ELSE 'false' END, N'}'),
        CONCAT(N'{"id":"', @p_id, N'","isActive":', CASE WHEN @p_is_active = 1 THEN 'true' ELSE 'false' END, N'}'),
        GETDATE()
    );

    EXEC SP_Productos_ObtenerPorId @p_id = @p_id, @p_only_active = 0;
END;
GO

-- 11. Crear variante de producto con registro inicial en Kardex y Auditoría
CREATE OR ALTER PROCEDURE SP_Productos_CrearVariante
    @p_id VARCHAR(36),
    @p_product_id VARCHAR(36),
    @p_sku VARCHAR(60),
    @p_attributes NVARCHAR(MAX) = NULL,
    @p_price DECIMAL(12, 2),
    @p_stock_physical INT = 0,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM products WHERE id = @p_product_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto padre no existe.', 1;
    END

    IF @p_price < 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El precio no puede ser negativo.', 1;
    END

    IF @p_stock_physical < 0
    BEGIN
        THROW 50002, 'STOCK_INSUFICIENTE: El stock físico inicial no puede ser negativo.', 1;
    END

    IF EXISTS (SELECT 1 FROM product_variants WHERE LOWER(LTRIM(RTRIM(sku))) = LOWER(LTRIM(RTRIM(@p_sku))))
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe una variante con ese SKU.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        INSERT INTO product_variants (
            id,
            product_id,
            sku,
            attributes,
            price,
            stock_physical,
            stock_reserved,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            @p_id,
            @p_product_id,
            LTRIM(RTRIM(@p_sku)),
            @p_attributes,
            @p_price,
            @p_stock_physical,
            0,
            1,
            GETDATE(),
            GETDATE()
        );

        IF @p_stock_physical > 0
        BEGIN
            INSERT INTO kardex_movements (
                id,
                variant_id,
                user_id,
                movement_type,
                quantity,
                previous_stock,
                new_stock,
                reason,
                created_at
            )
            VALUES (
                CONVERT(VARCHAR(36), NEWID()),
                @p_id,
                @v_valid_user_id,
                'ENTRADA',
                @p_stock_physical,
                0,
                @p_stock_physical,
                N'Inventario inicial en creación de variante',
                GETDATE()
            );
        END

        INSERT INTO audit_logs (
            id,
            user_id,
            entity,
            action,
            old_value,
            new_value,
            created_at
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @v_valid_user_id,
            'PRODUCTO',
            'CREAR_VARIANTE',
            NULL,
            CONCAT(N'{"variantId":"', @p_id, N'","productId":"', @p_product_id, N'","sku":"', LTRIM(RTRIM(@p_sku)), N'","price":', CONVERT(VARCHAR(30), @p_price), N',"stockPhysical":', CONVERT(VARCHAR(20), @p_stock_physical), N'}'),
            GETDATE()
        );

        COMMIT TRAN;

        SELECT
            v.id,
            v.product_id,
            v.sku,
            v.attributes,
            v.price,
            v.stock_physical,
            v.stock_reserved,
            (v.stock_physical - v.stock_reserved) AS stock_available,
            v.is_active,
            v.created_at,
            v.updated_at
        FROM product_variants v
        WHERE v.id = @p_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 12. Actualizar variante de producto (con auditoría de cambio de precio)
CREATE OR ALTER PROCEDURE SP_Productos_ActualizarVariante
    @p_id VARCHAR(36),
    @p_sku VARCHAR(60) = NULL,
    @p_attributes NVARCHAR(MAX) = NULL,
    @p_price DECIMAL(12, 2) = NULL,
    @p_is_active BIT = NULL,
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @v_old_sku VARCHAR(60);
    DECLARE @v_old_price DECIMAL(12, 2);
    DECLARE @v_old_active BIT;
    DECLARE @v_product_id VARCHAR(36);

    SELECT
        @v_old_sku = sku,
        @v_old_price = price,
        @v_old_active = is_active,
        @v_product_id = product_id
    FROM product_variants
    WHERE id = @p_id;

    IF @v_old_sku IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La variante no existe.', 1;
    END

    IF @p_price IS NOT NULL AND @p_price < 0
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El precio no puede ser negativo.', 1;
    END

    IF @p_sku IS NOT NULL AND EXISTS (
        SELECT 1
        FROM product_variants
        WHERE LOWER(LTRIM(RTRIM(sku))) = LOWER(LTRIM(RTRIM(@p_sku)))
          AND id <> @p_id
    )
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe otra variante con ese SKU.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        UPDATE product_variants
        SET sku = COALESCE(LTRIM(RTRIM(@p_sku)), sku),
            attributes = CASE WHEN @p_attributes IS NOT NULL THEN @p_attributes ELSE attributes END,
            price = COALESCE(@p_price, price),
            is_active = COALESCE(@p_is_active, is_active),
            updated_at = GETDATE()
        WHERE id = @p_id;

        IF @p_price IS NOT NULL AND @p_price <> @v_old_price
        BEGIN
            INSERT INTO audit_logs (
                id,
                user_id,
                entity,
                action,
                old_value,
                new_value,
                created_at
            )
            VALUES (
                CONVERT(VARCHAR(36), NEWID()),
                @v_valid_user_id,
                'PRECIO',
                'ACTUALIZAR_PRECIO',
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', @v_old_sku, N'","price":', CONVERT(VARCHAR(30), @v_old_price), N'}'),
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', COALESCE(LTRIM(RTRIM(@p_sku)), @v_old_sku), N'","price":', CONVERT(VARCHAR(30), @p_price), N'}'),
                GETDATE()
            );
        END
        ELSE
        BEGIN
            INSERT INTO audit_logs (
                id,
                user_id,
                entity,
                action,
                old_value,
                new_value,
                created_at
            )
            VALUES (
                CONVERT(VARCHAR(36), NEWID()),
                @v_valid_user_id,
                'PRODUCTO',
                'ACTUALIZAR_VARIANTE',
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', @v_old_sku, N'","price":', CONVERT(VARCHAR(30), @v_old_price), N'}'),
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', COALESCE(LTRIM(RTRIM(@p_sku)), @v_old_sku), N'","price":', CONVERT(VARCHAR(30), COALESCE(@p_price, @v_old_price)), N'}'),
                GETDATE()
            );
        END

        COMMIT TRAN;

        SELECT
            v.id,
            v.product_id,
            v.sku,
            v.attributes,
            v.price,
            v.stock_physical,
            v.stock_reserved,
            (v.stock_physical - v.stock_reserved) AS stock_available,
            v.is_active,
            v.created_at,
            v.updated_at
        FROM product_variants v
        WHERE v.id = @p_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 13. Ajustar stock de variante con bloqueo transaccional (UPDLOCK, ROWLOCK), Kardex y Auditoría
CREATE OR ALTER PROCEDURE SP_Productos_AjustarStockVariante
    @p_variant_id VARCHAR(36),
    @p_movement_type VARCHAR(20),
    @p_quantity INT,
    @p_reason NVARCHAR(255),
    @p_user_id VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @p_movement_type NOT IN ('ENTRADA', 'SALIDA', 'AJUSTE')
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Tipo de movimiento inválido.', 1;
    END

    IF @p_reason IS NULL OR LTRIM(RTRIM(@p_reason)) = ''
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El motivo del movimiento de Kardex es obligatorio.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @v_prev_stock INT;
        DECLARE @v_stock_reserved INT;
        DECLARE @v_sku VARCHAR(60);

        SELECT
            @v_prev_stock = stock_physical,
            @v_stock_reserved = stock_reserved,
            @v_sku = sku
        FROM product_variants WITH (UPDLOCK, ROWLOCK)
        WHERE id = @p_variant_id;

        IF @v_sku IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: La variante no existe.', 1;
        END

        DECLARE @v_new_stock INT;
        DECLARE @v_signed_qty INT;

        IF @p_movement_type = 'ENTRADA'
        BEGIN
            SET @v_signed_qty = ABS(@p_quantity);
            SET @v_new_stock = @v_prev_stock + @v_signed_qty;
        END
        ELSE IF @p_movement_type = 'SALIDA'
        BEGIN
            SET @v_signed_qty = -ABS(@p_quantity);
            SET @v_new_stock = @v_prev_stock - ABS(@p_quantity);
        END
        ELSE
        BEGIN
            SET @v_signed_qty = @p_quantity;
            SET @v_new_stock = @v_prev_stock + @p_quantity;
        END

        IF @v_new_stock < 0 OR @v_new_stock < @v_stock_reserved
        BEGIN
            THROW 50002, 'STOCK_INSUFICIENTE: La existencia física no puede quedar en negativo ni ser menor al stock reservado.', 1;
        END

        UPDATE product_variants
        SET stock_physical = @v_new_stock,
            updated_at = GETDATE()
        WHERE id = @p_variant_id;

        INSERT INTO kardex_movements (
            id,
            variant_id,
            user_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            created_at
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_variant_id,
            @v_valid_user_id,
            @p_movement_type,
            @v_signed_qty,
            @v_prev_stock,
            @v_new_stock,
            LTRIM(RTRIM(@p_reason)),
            GETDATE()
        );

        INSERT INTO audit_logs (
            id,
            user_id,
            entity,
            action,
            old_value,
            new_value,
            created_at
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @v_valid_user_id,
            'EXISTENCIA',
            @p_movement_type,
            CONCAT(N'{"variantId":"', @p_variant_id, N'","sku":"', @v_sku, N'","stockPhysical":', CONVERT(VARCHAR(20), @v_prev_stock), N'}'),
            CONCAT(N'{"variantId":"', @p_variant_id, N'","sku":"', @v_sku, N'","stockPhysical":', CONVERT(VARCHAR(20), @v_new_stock), N',"reason":"', REPLACE(LTRIM(RTRIM(@p_reason)), '"', '\"'), N'"}'),
            GETDATE()
        );

        COMMIT TRAN;

        SELECT
            v.id,
            v.product_id,
            v.sku,
            v.attributes,
            v.price,
            v.stock_physical,
            v.stock_reserved,
            (v.stock_physical - v.stock_reserved) AS stock_available,
            v.is_active,
            v.created_at,
            v.updated_at
        FROM product_variants v
        WHERE v.id = @p_variant_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

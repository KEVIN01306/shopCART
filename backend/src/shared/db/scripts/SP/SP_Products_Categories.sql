-- =============================================================================
-- STORED PROCEDURES: CATEGORÍAS, PRODUCTOS, IMÁGENES, VARIANTES Y KARDEX (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tipos numéricos: DECIMAL(12, 2) e INT (Prohibido FLOAT o REAL)
-- Tablas: Categories, Products, ProductImages, ProductVariants, KardexMovements, AuditLogs, Users
-- =============================================================================

-- 1. Listar categorías con conteo de productos activos
CREATE OR ALTER PROCEDURE SP_Categorias_Listar
    @p_only_active BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.IDCategory AS id,
        c.Name AS name,
        c.Description AS description,
        c.IsActive AS is_active,
        c.CreatedAt AS created_at,
        COUNT(CASE WHEN p.IsActive = 1 THEN p.IDProduct END) AS product_count
    FROM Categories c
    LEFT JOIN Products p
        ON p.IDCategory = c.IDCategory
    WHERE (@p_only_active = 0 OR c.IsActive = 1)
    GROUP BY
        c.IDCategory,
        c.Name,
        c.Description,
        c.IsActive,
        c.CreatedAt
    ORDER BY c.Name ASC;
END;
GO

-- 2. Obtener categoría por ID
CREATE OR ALTER PROCEDURE SP_Categorias_ObtenerPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.IDCategory AS id,
        c.Name AS name,
        c.Description AS description,
        c.IsActive AS is_active,
        c.CreatedAt AS created_at,
        COUNT(CASE WHEN p.IsActive = 1 THEN p.IDProduct END) AS product_count
    FROM Categories c
    LEFT JOIN Products p
        ON p.IDCategory = c.IDCategory
    WHERE c.IDCategory = @p_id
    GROUP BY
        c.IDCategory,
        c.Name,
        c.Description,
        c.IsActive,
        c.CreatedAt;
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

    IF EXISTS (SELECT 1 FROM Categories WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@p_name))))
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe una categoría con ese nombre.', 1;
    END

    INSERT INTO Categories (
        IDCategory,
        Name,
        Description,
        IsActive,
        CreatedAt
    )
    VALUES (
        @p_id,
        LTRIM(RTRIM(@p_name)),
        @p_description,
        1,
        GETDATE()
    );

    SELECT
        c.IDCategory AS id,
        c.Name AS name,
        c.Description AS description,
        c.IsActive AS is_active,
        c.CreatedAt AS created_at,
        0 AS product_count
    FROM Categories c
    WHERE c.IDCategory = @p_id;
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

    IF NOT EXISTS (SELECT 1 FROM Categories WHERE IDCategory = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría no existe.', 1;
    END

    IF @p_name IS NOT NULL AND EXISTS (
        SELECT 1
        FROM Categories
        WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@p_name)))
          AND IDCategory <> @p_id
    )
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe otra categoría con ese nombre.', 1;
    END

    UPDATE Categories
    SET Name = COALESCE(LTRIM(RTRIM(@p_name)), Name),
        Description = CASE WHEN @p_description IS NOT NULL THEN @p_description ELSE Description END,
        IsActive = COALESCE(@p_is_active, IsActive)
    WHERE IDCategory = @p_id;

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
    @p_sort_by VARCHAR(30) = 'latest',
    @p_in_stock BIT = NULL
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
        images_json NVARCHAR(MAX),
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
            v.IDProduct AS product_id,
            MIN(v.Price) AS min_price,
            MAX(v.Price) AS max_price,
            SUM(v.StockPhysical - v.StockReserved) AS total_stock_available,
            COUNT(v.IDVariant) AS variants_count
        FROM ProductVariants v
        WHERE v.IsActive = 1
          AND (@p_min_price IS NULL OR v.Price >= @p_min_price)
          AND (@p_max_price IS NULL OR v.Price <= @p_max_price)
        GROUP BY v.IDProduct
    ),
    DefaultVariant AS (
        SELECT
            v.IDProduct AS product_id,
            v.IDVariant AS default_variant_id,
            v.SKU AS default_variant_sku,
            v.Attributes AS default_variant_attributes,
            ROW_NUMBER() OVER (PARTITION BY v.IDProduct ORDER BY v.Price ASC, v.CreatedAt ASC) AS rn
        FROM ProductVariants v
        WHERE v.IsActive = 1
          AND (@p_min_price IS NULL OR v.Price >= @p_min_price)
          AND (@p_max_price IS NULL OR v.Price <= @p_max_price)
    )
    INSERT INTO @PagedCatalog (
        id,
        category_id,
        category_name,
        name,
        description,
        main_image_url,
        images_json,
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
        p.IDProduct AS id,
        p.IDCategory AS category_id,
        c.Name AS category_name,
        p.Name AS name,
        p.Description AS description,
        coverImg.ImageURL AS main_image_url,
        prodImgs.images_json AS images_json,
        p.IsActive AS is_active,
        p.CreatedAt AS created_at,
        p.UpdatedAt AS updated_at,
        vs.min_price,
        vs.max_price,
        vs.total_stock_available,
        vs.variants_count,
        dv.default_variant_id,
        dv.default_variant_sku,
        dv.default_variant_attributes,
        COUNT(*) OVER() AS total_count
    FROM Products p
    INNER JOIN Categories c
        ON c.IDCategory = p.IDCategory
       AND c.IsActive = 1
    INNER JOIN VariantStats vs
        ON vs.product_id = p.IDProduct
    LEFT JOIN DefaultVariant dv
        ON dv.product_id = p.IDProduct
       AND dv.rn = 1
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    OUTER APPLY (
        SELECT (
            SELECT
                pi.IDImage AS id,
                pi.ImageURL AS imageUrl,
                pi.SortOrder AS sortOrder,
                pi.IsCover AS isCover
            FROM ProductImages pi
            WHERE pi.IDProduct = p.IDProduct
            ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
            FOR JSON PATH
        ) AS images_json
    ) prodImgs
    WHERE p.IsActive = 1
      AND (@p_category_id IS NULL OR p.IDCategory = @p_category_id)
      AND (@p_in_stock IS NULL OR @p_in_stock = 0 OR vs.total_stock_available > 0)
      AND (
          @v_search IS NULL
          OR p.Name LIKE @v_search
          OR p.Description LIKE @v_search
          OR c.Name LIKE @v_search
          OR EXISTS (
              SELECT 1
              FROM ProductVariants pv
              WHERE pv.IDProduct = p.IDProduct
                AND pv.IsActive = 1
                AND (pv.SKU LIKE @v_search OR pv.Attributes LIKE @v_search)
          )
      )
    ORDER BY
        CASE WHEN @p_sort_by = 'price_asc' THEN vs.min_price END ASC,
        CASE WHEN @p_sort_by = 'price_desc' THEN vs.min_price END DESC,
        CASE WHEN @p_sort_by = 'name_asc' THEN p.Name END ASC,
        CASE WHEN @p_sort_by = 'latest' OR @p_sort_by IS NULL THEN p.CreatedAt END DESC,
        p.CreatedAt DESC
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
        images_json,
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
        v.IDVariant AS id,
        v.IDProduct AS product_id,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        v.IsActive AS is_active,
        v.CreatedAt AS created_at,
        v.UpdatedAt AS updated_at
    FROM ProductVariants v
    INNER JOIN @PagedCatalog pc
        ON pc.id = v.IDProduct
    WHERE v.IsActive = 1
    ORDER BY pc.row_num ASC, v.Price ASC, v.CreatedAt ASC;
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
        images_json NVARCHAR(MAX),
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
        images_json,
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
        p.IDProduct AS id,
        p.IDCategory AS category_id,
        c.Name AS category_name,
        p.Name AS name,
        p.Description AS description,
        coverImg.ImageURL AS main_image_url,
        MAX(prodImgs.images_json) AS images_json,
        p.IsActive AS is_active,
        p.CreatedAt AS created_at,
        p.UpdatedAt AS updated_at,
        COALESCE(MIN(v.Price), 0.00) AS min_price,
        COALESCE(MAX(v.Price), 0.00) AS max_price,
        COALESCE(SUM(v.StockPhysical), 0) AS total_stock_physical,
        COALESCE(SUM(v.StockReserved), 0) AS total_stock_reserved,
        COALESCE(SUM(v.StockPhysical - v.StockReserved), 0) AS total_stock_available,
        COUNT(v.IDVariant) AS variants_count,
        COUNT(*) OVER() AS total_count
    FROM Products p
    INNER JOIN Categories c
        ON c.IDCategory = p.IDCategory
    LEFT JOIN ProductVariants v
        ON v.IDProduct = p.IDProduct
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    OUTER APPLY (
        SELECT (
            SELECT
                pi.IDImage AS id,
                pi.ImageURL AS imageUrl,
                pi.SortOrder AS sortOrder,
                pi.IsCover AS isCover
            FROM ProductImages pi
            WHERE pi.IDProduct = p.IDProduct
            ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
            FOR JSON PATH
        ) AS images_json
    ) prodImgs
    WHERE (@p_category_id IS NULL OR p.IDCategory = @p_category_id)
      AND (
          @v_search IS NULL
          OR p.Name LIKE @v_search
          OR p.Description LIKE @v_search
          OR c.Name LIKE @v_search
          OR EXISTS (
              SELECT 1
              FROM ProductVariants pv
              WHERE pv.IDProduct = p.IDProduct
                AND (pv.SKU LIKE @v_search OR pv.Attributes LIKE @v_search)
          )
      )
    GROUP BY
        p.IDProduct,
        p.IDCategory,
        c.Name,
        p.Name,
        p.Description,
        coverImg.ImageURL,
        p.IsActive,
        p.CreatedAt,
        p.UpdatedAt
    ORDER BY p.CreatedAt DESC
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
        images_json,
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
        v.IDVariant AS id,
        v.IDProduct AS product_id,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        v.IsActive AS is_active,
        v.CreatedAt AS created_at,
        v.UpdatedAt AS updated_at
    FROM ProductVariants v
    INNER JOIN @PagedAdmin pa
        ON pa.id = v.IDProduct
    ORDER BY pa.row_num ASC, v.Price ASC, v.CreatedAt ASC;
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
        p.IDProduct AS id,
        p.IDCategory AS category_id,
        c.Name AS category_name,
        p.Name AS name,
        p.Description AS description,
        coverImg.ImageURL AS main_image_url,
        MAX(prodImgs.images_json) AS images_json,
        p.IsActive AS is_active,
        p.CreatedAt AS created_at,
        p.UpdatedAt AS updated_at,
        COALESCE(MIN(v.Price), 0.00) AS min_price,
        COALESCE(MAX(v.Price), 0.00) AS max_price,
        COALESCE(SUM(v.StockPhysical), 0) AS total_stock_physical,
        COALESCE(SUM(v.StockReserved), 0) AS total_stock_reserved,
        COALESCE(SUM(v.StockPhysical - v.StockReserved), 0) AS total_stock_available,
        COUNT(v.IDVariant) AS variants_count
    FROM Products p
    INNER JOIN Categories c
        ON c.IDCategory = p.IDCategory
    LEFT JOIN ProductVariants v
        ON v.IDProduct = p.IDProduct
       AND (@p_only_active = 0 OR v.IsActive = 1)
    OUTER APPLY (
        SELECT TOP 1 pi.ImageURL
        FROM ProductImages pi
        WHERE pi.IDProduct = p.IDProduct
        ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
    ) coverImg
    OUTER APPLY (
        SELECT (
            SELECT
                pi.IDImage AS id,
                pi.ImageURL AS imageUrl,
                pi.SortOrder AS sortOrder,
                pi.IsCover AS isCover
            FROM ProductImages pi
            WHERE pi.IDProduct = p.IDProduct
            ORDER BY pi.IsCover DESC, pi.SortOrder ASC, pi.CreatedAt ASC
            FOR JSON PATH
        ) AS images_json
    ) prodImgs
    WHERE p.IDProduct = @p_id
      AND (@p_only_active = 0 OR (p.IsActive = 1 AND c.IsActive = 1))
    GROUP BY
        p.IDProduct,
        p.IDCategory,
        c.Name,
        p.Name,
        p.Description,
        coverImg.ImageURL,
        p.IsActive,
        p.CreatedAt,
        p.UpdatedAt;

    -- Segundo Resultset: Variantes del producto
    SELECT
        v.IDVariant AS id,
        v.IDProduct AS product_id,
        v.SKU AS sku,
        v.Attributes AS attributes,
        v.Price AS price,
        v.StockPhysical AS stock_physical,
        v.StockReserved AS stock_reserved,
        (v.StockPhysical - v.StockReserved) AS stock_available,
        v.IsActive AS is_active,
        v.CreatedAt AS created_at,
        v.UpdatedAt AS updated_at
    FROM ProductVariants v
    INNER JOIN Products p
        ON p.IDProduct = v.IDProduct
    INNER JOIN Categories c
        ON c.IDCategory = p.IDCategory
    WHERE v.IDProduct = @p_id
      AND (@p_only_active = 0 OR (v.IsActive = 1 AND p.IsActive = 1 AND c.IsActive = 1))
    ORDER BY v.Price ASC, v.CreatedAt ASC;
END;
GO

-- 8. Crear producto y registrar imagen de portada y bitácora de auditoría
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

    IF NOT EXISTS (SELECT 1 FROM Categories WHERE IDCategory = @p_category_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: La categoría especificada no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    INSERT INTO Products (
        IDProduct,
        IDCategory,
        Name,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        @p_id,
        @p_category_id,
        LTRIM(RTRIM(@p_name)),
        @p_description,
        1,
        GETDATE(),
        GETDATE()
    );

    IF @p_main_image_url IS NOT NULL AND LTRIM(RTRIM(@p_main_image_url)) <> ''
    BEGIN
        INSERT INTO ProductImages (
            IDImage,
            IDProduct,
            ImageURL,
            SortOrder,
            IsCover,
            CreatedAt
        )
        VALUES (
            CONVERT(VARCHAR(36), NEWID()),
            @p_id,
            LTRIM(RTRIM(@p_main_image_url)),
            0,
            1,
            GETDATE()
        );
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

-- 9. Actualizar producto, imagen de portada y registrar en bitácora de auditoría
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
        @v_old_name = Name,
        @v_old_category = IDCategory,
        @v_old_active = IsActive
    FROM Products
    WHERE IDProduct = @p_id;

    IF @v_old_name IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto no existe.', 1;
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

    UPDATE Products
    SET IDCategory = COALESCE(@p_category_id, IDCategory),
        Name = COALESCE(LTRIM(RTRIM(@p_name)), Name),
        Description = CASE WHEN @p_description IS NOT NULL THEN @p_description ELSE Description END,
        IsActive = COALESCE(@p_is_active, IsActive),
        UpdatedAt = GETDATE()
    WHERE IDProduct = @p_id;

    IF @p_main_image_url IS NOT NULL
    BEGIN
        IF LTRIM(RTRIM(@p_main_image_url)) = ''
        BEGIN
            DELETE FROM ProductImages
            WHERE IDProduct = @p_id AND IsCover = 1;
        END
        ELSE IF EXISTS (SELECT 1 FROM ProductImages WHERE IDProduct = @p_id AND IsCover = 1)
        BEGIN
            UPDATE ProductImages
            SET ImageURL = LTRIM(RTRIM(@p_main_image_url))
            WHERE IDProduct = @p_id AND IsCover = 1;
        END
        ELSE
        BEGIN
            INSERT INTO ProductImages (
                IDImage,
                IDProduct,
                ImageURL,
                SortOrder,
                IsCover,
                CreatedAt
            )
            VALUES (
                CONVERT(VARCHAR(36), NEWID()),
                @p_id,
                LTRIM(RTRIM(@p_main_image_url)),
                0,
                1,
                GETDATE()
            );
        END
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
        @v_old_active = IsActive,
        @v_name = Name
    FROM Products
    WHERE IDProduct = @p_id;

    IF @v_name IS NULL
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto no existe.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    UPDATE Products
    SET IsActive = @p_is_active,
        UpdatedAt = GETDATE()
    WHERE IDProduct = @p_id;

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

    IF NOT EXISTS (SELECT 1 FROM Products WHERE IDProduct = @p_product_id)
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

    IF EXISTS (SELECT 1 FROM ProductVariants WHERE LOWER(LTRIM(RTRIM(SKU))) = LOWER(LTRIM(RTRIM(@p_sku))))
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe una variante con ese SKU.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        INSERT INTO ProductVariants (
            IDVariant,
            IDProduct,
            SKU,
            Attributes,
            Price,
            StockPhysical,
            StockReserved,
            IsActive,
            CreatedAt,
            UpdatedAt
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
            'PRODUCTO',
            'CREAR_VARIANTE',
            NULL,
            CONCAT(N'{"variantId":"', @p_id, N'","productId":"', @p_product_id, N'","sku":"', LTRIM(RTRIM(@p_sku)), N'","price":', CONVERT(VARCHAR(30), @p_price), N',"stockPhysical":', CONVERT(VARCHAR(20), @p_stock_physical), N'}'),
            GETDATE()
        );

        COMMIT TRAN;

        SELECT
            v.IDVariant AS id,
            v.IDProduct AS product_id,
            v.SKU AS sku,
            v.Attributes AS attributes,
            v.Price AS price,
            v.StockPhysical AS stock_physical,
            v.StockReserved AS stock_reserved,
            (v.StockPhysical - v.StockReserved) AS stock_available,
            v.IsActive AS is_active,
            v.CreatedAt AS created_at,
            v.UpdatedAt AS updated_at
        FROM ProductVariants v
        WHERE v.IDVariant = @p_id;
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
        @v_old_sku = SKU,
        @v_old_price = Price,
        @v_old_active = IsActive,
        @v_product_id = IDProduct
    FROM ProductVariants
    WHERE IDVariant = @p_id;

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
        FROM ProductVariants
        WHERE LOWER(LTRIM(RTRIM(SKU))) = LOWER(LTRIM(RTRIM(@p_sku)))
          AND IDVariant <> @p_id
    )
    BEGIN
        THROW 50003, 'DUPLICADO: Ya existe otra variante con ese SKU.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        UPDATE ProductVariants
        SET SKU = COALESCE(LTRIM(RTRIM(@p_sku)), SKU),
            Attributes = CASE WHEN @p_attributes IS NOT NULL THEN @p_attributes ELSE Attributes END,
            Price = COALESCE(@p_price, Price),
            IsActive = COALESCE(@p_is_active, IsActive),
            UpdatedAt = GETDATE()
        WHERE IDVariant = @p_id;

        IF @p_price IS NOT NULL AND @p_price <> @v_old_price
        BEGIN
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
                'PRECIO',
                'ACTUALIZAR_PRECIO',
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', @v_old_sku, N'","price":', CONVERT(VARCHAR(30), @v_old_price), N'}'),
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', COALESCE(LTRIM(RTRIM(@p_sku)), @v_old_sku), N'","price":', CONVERT(VARCHAR(30), @p_price), N'}'),
                GETDATE()
            );
        END
        ELSE
        BEGIN
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
                'PRODUCTO',
                'ACTUALIZAR_VARIANTE',
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', @v_old_sku, N'","price":', CONVERT(VARCHAR(30), @v_old_price), N'}'),
                CONCAT(N'{"variantId":"', @p_id, N'","sku":"', COALESCE(LTRIM(RTRIM(@p_sku)), @v_old_sku), N'","price":', CONVERT(VARCHAR(30), COALESCE(@p_price, @v_old_price)), N'}'),
                GETDATE()
            );
        END

        COMMIT TRAN;

        SELECT
            v.IDVariant AS id,
            v.IDProduct AS product_id,
            v.SKU AS sku,
            v.Attributes AS attributes,
            v.Price AS price,
            v.StockPhysical AS stock_physical,
            v.StockReserved AS stock_reserved,
            (v.StockPhysical - v.StockReserved) AS stock_available,
            v.IsActive AS is_active,
            v.CreatedAt AS created_at,
            v.UpdatedAt AS updated_at
        FROM ProductVariants v
        WHERE v.IDVariant = @p_id;
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

    IF @p_movement_type NOT IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION')
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: Tipo de movimiento inválido.', 1;
    END

    IF @p_reason IS NULL OR LTRIM(RTRIM(@p_reason)) = ''
    BEGIN
        THROW 50005, 'DATOS_INVALIDOS: El motivo del movimiento de Kardex es obligatorio.', 1;
    END

    DECLARE @v_valid_user_id VARCHAR(36) = NULL;
    IF @p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_user_id)
    BEGIN
        SET @v_valid_user_id = @p_user_id;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @v_prev_stock INT;
        DECLARE @v_stock_reserved INT;
        DECLARE @v_sku VARCHAR(60);

        SELECT
            @v_prev_stock = StockPhysical,
            @v_stock_reserved = StockReserved,
            @v_sku = SKU
        FROM ProductVariants WITH (UPDLOCK, ROWLOCK)
        WHERE IDVariant = @p_variant_id;

        IF @v_sku IS NULL
        BEGIN
            THROW 50001, 'NO_ENCONTRADO: La variante no existe.', 1;
        END

        DECLARE @v_new_stock INT;
        DECLARE @v_signed_qty INT;

        IF @p_movement_type IN ('ENTRADA', 'DEVOLUCION')
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

        UPDATE ProductVariants
        SET StockPhysical = @v_new_stock,
            UpdatedAt = GETDATE()
        WHERE IDVariant = @p_variant_id;

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
            @p_variant_id,
            @v_valid_user_id,
            @p_movement_type,
            @v_signed_qty,
            @v_prev_stock,
            @v_new_stock,
            LTRIM(RTRIM(@p_reason)),
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
            'EXISTENCIA',
            @p_movement_type,
            CONCAT(N'{"variantId":"', @p_variant_id, N'","sku":"', @v_sku, N'","stockPhysical":', CONVERT(VARCHAR(20), @v_prev_stock), N'}'),
            CONCAT(N'{"variantId":"', @p_variant_id, N'","sku":"', @v_sku, N'","stockPhysical":', CONVERT(VARCHAR(20), @v_new_stock), N',"reason":"', REPLACE(LTRIM(RTRIM(@p_reason)), '"', '\"'), N'"}'),
            GETDATE()
        );

        COMMIT TRAN;

        SELECT
            v.IDVariant AS id,
            v.IDProduct AS product_id,
            v.SKU AS sku,
            v.Attributes AS attributes,
            v.Price AS price,
            v.StockPhysical AS stock_physical,
            v.StockReserved AS stock_reserved,
            (v.StockPhysical - v.StockReserved) AS stock_available,
            v.IsActive AS is_active,
            v.CreatedAt AS created_at,
            v.UpdatedAt AS updated_at
        FROM ProductVariants v
        WHERE v.IDVariant = @p_variant_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 14. Sincronizar galería de múltiples imágenes de un producto (ProductImages)
CREATE OR ALTER PROCEDURE SP_Productos_SincronizarImagenes
    @p_product_id VARCHAR(36),
    @p_images_json NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Products WHERE IDProduct = @p_product_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El producto no existe.', 1;
    END

    BEGIN TRY
        BEGIN TRAN;

        DELETE FROM ProductImages
        WHERE IDProduct = @p_product_id;

        IF @p_images_json IS NOT NULL AND ISJSON(@p_images_json) = 1
        BEGIN
            INSERT INTO ProductImages (
                IDImage,
                IDProduct,
                ImageURL,
                SortOrder,
                IsCover,
                CreatedAt
            )
            SELECT
                CONVERT(VARCHAR(36), NEWID()),
                @p_product_id,
                LTRIM(RTRIM(
                    CASE
                        WHEN j.[type] = 5 THEN JSON_VALUE(j.[value], '$.imageUrl')
                        ELSE j.[value]
                    END
                )),
                COALESCE(
                    TRY_CAST(JSON_VALUE(CASE WHEN j.[type] = 5 THEN j.[value] END, '$.sortOrder') AS INT),
                    TRY_CAST(j.[key] AS INT),
                    0
                ),
                CASE
                    WHEN j.[type] = 5 AND JSON_VALUE(j.[value], '$.isCover') IN ('true', '1') THEN 1
                    WHEN TRY_CAST(j.[key] AS INT) = 0 THEN 1
                    ELSE 0
                END,
                GETDATE()
            FROM OPENJSON(@p_images_json) j
            WHERE LTRIM(RTRIM(COALESCE(
                CASE
                    WHEN j.[type] = 5 THEN JSON_VALUE(j.[value], '$.imageUrl')
                    ELSE j.[value]
                END,
                ''
            ))) <> '';
        END

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH
END;
GO

-- 15. Listar historial paginado de movimientos de Kardex (Auditoría de existencias)
CREATE OR ALTER PROCEDURE SP_Kardex_ListarMovimientos
    @p_page INT = 1,
    @p_limit INT = 15,
    @p_product_id VARCHAR(36) = NULL,
    @p_variant_id VARCHAR(36) = NULL,
    @p_movement_type VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_page < 1 SET @p_page = 1;
    IF @p_limit < 1 SET @p_limit = 15;

    DECLARE @v_offset INT = (@p_page - 1) * @p_limit;

    SELECT
        km.IDKardex AS id,
        km.IDVariant AS variant_id,
        pv.SKU AS sku,
        pv.Attributes AS attributes,
        p.IDProduct AS product_id,
        p.Name AS product_name,
        km.IDUser AS user_id,
        CONCAT(u.FirstName, ' ', u.LastName) AS user_name,
        u.Email AS user_email,
        km.MovementType AS movement_type,
        km.Quantity AS quantity,
        km.PreviousStock AS previous_stock,
        km.NewStock AS new_stock,
        km.Reason AS reason,
        km.CreatedAt AS created_at,
        COUNT(*) OVER() AS total_count
    FROM KardexMovements km
    INNER JOIN ProductVariants pv
        ON pv.IDVariant = km.IDVariant
    INNER JOIN Products p
        ON p.IDProduct = pv.IDProduct
    LEFT JOIN Users u
        ON u.IDUser = km.IDUser
    WHERE (@p_product_id IS NULL OR p.IDProduct = @p_product_id)
      AND (@p_variant_id IS NULL OR km.IDVariant = @p_variant_id)
      AND (@p_movement_type IS NULL OR km.MovementType = @p_movement_type)
    ORDER BY km.CreatedAt DESC
    OFFSET @v_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;
END;
GO

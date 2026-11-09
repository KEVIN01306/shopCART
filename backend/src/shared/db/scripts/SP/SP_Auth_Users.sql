-- =============================================================================
-- STORED PROCEDURES: AUTH Y USUARIOS (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- Tablas: Users, UserSessions (Esquema PascalCase estandarizado)
-- =============================================================================

-- 1. Obtener usuario activo por email (Autenticación)
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerUsuarioPorEmail
    @p_email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE Email = @p_email
      AND IsActive = 1;
END;
GO

-- 2. Obtener usuario activo por ID (Autenticación / Perfil)
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerUsuarioPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE IDUser = @p_id
      AND IsActive = 1;
END;
GO

-- 3. Crear o actualizar sesión de usuario (Refresh Token con rotación y familia)
CREATE OR ALTER PROCEDURE SP_Auth_UpsertSesion
    @p_id VARCHAR(36),
    @p_user_id VARCHAR(36),
    @p_token VARCHAR(500),
    @p_expires_at DATETIME2,
    @p_family VARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM UserSessions WHERE IDUser = @p_user_id)
    BEGIN
        UPDATE UserSessions
        SET RefreshToken = @p_token,
            Family = COALESCE(@p_family, Family, @p_id),
            IsRevoked = 0,
            ExpiresAt = @p_expires_at,
            CreatedAt = GETDATE()
        WHERE IDUser = @p_user_id;
    END
    ELSE
    BEGIN
        INSERT INTO UserSessions (
            IDSession,
            IDUser,
            RefreshToken,
            Family,
            IsRevoked,
            ExpiresAt,
            CreatedAt
        )
        VALUES (
            @p_id,
            @p_user_id,
            @p_token,
            COALESCE(@p_family, @p_id),
            0,
            @p_expires_at,
            GETDATE()
        );
    END

    SELECT
        IDSession AS id,
        IDUser AS user_id,
        RefreshToken AS token,
        Family AS family,
        IsRevoked AS is_revoked,
        ExpiresAt AS expires_at,
        CreatedAt AS created_at
    FROM UserSessions
    WHERE IDUser = @p_user_id
      AND IsRevoked = 0;
END;
GO

-- 4. Obtener sesión por token
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerSesionPorToken
    @p_token VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDSession AS id,
        IDUser AS user_id,
        RefreshToken AS token,
        Family AS family,
        IsRevoked AS is_revoked,
        ExpiresAt AS expires_at,
        CreatedAt AS created_at
    FROM UserSessions
    WHERE RefreshToken = @p_token
      AND IsRevoked = 0;
END;
GO

-- 5. Obtener sesión por usuario
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerSesionPorUsuario
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDSession AS id,
        IDUser AS user_id,
        RefreshToken AS token,
        Family AS family,
        IsRevoked AS is_revoked,
        ExpiresAt AS expires_at,
        CreatedAt AS created_at
    FROM UserSessions
    WHERE IDUser = @p_user_id
      AND IsRevoked = 0;
END;
GO

-- 6. Eliminar sesión por usuario (Logout / Revocación)
CREATE OR ALTER PROCEDURE SP_Auth_EliminarSesion
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM UserSessions
    WHERE IDUser = @p_user_id;
END;
GO

-- 7. Crear nuevo usuario
CREATE OR ALTER PROCEDURE SP_Usuarios_CrearUsuario
    @p_id VARCHAR(36),
    @p_email VARCHAR(255),
    @p_password_hash VARCHAR(255),
    @p_first_name VARCHAR(100),
    @p_last_name VARCHAR(100),
    @p_avatar_url VARCHAR(500) = NULL,
    @p_role VARCHAR(20) = 'Cliente',
    @p_is_verify BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Users (
        IDUser,
        Email,
        PasswordHash,
        FirstName,
        LastName,
        AvatarURL,
        Role,
        IsActive,
        IsVerify,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        @p_id,
        @p_email,
        @p_password_hash,
        @p_first_name,
        @p_last_name,
        @p_avatar_url,
        @p_role,
        1,
        @p_is_verify,
        GETDATE(),
        GETDATE()
    );

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE IDUser = @p_id;
END;
GO

-- 8. Actualizar usuario existente
CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarUsuario
    @p_id VARCHAR(36),
    @p_email VARCHAR(255) = NULL,
    @p_password_hash VARCHAR(255) = NULL,
    @p_first_name VARCHAR(100) = NULL,
    @p_last_name VARCHAR(100) = NULL,
    @p_avatar_url VARCHAR(500) = NULL,
    @p_role VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE Users
    SET Email = COALESCE(@p_email, Email),
        PasswordHash = COALESCE(@p_password_hash, PasswordHash),
        FirstName = COALESCE(@p_first_name, FirstName),
        LastName = COALESCE(@p_last_name, LastName),
        AvatarURL = CASE WHEN @p_avatar_url IS NOT NULL THEN @p_avatar_url ELSE AvatarURL END,
        Role = COALESCE(@p_role, Role),
        UpdatedAt = GETDATE()
    WHERE IDUser = @p_id;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE IDUser = @p_id;
END;
GO

-- 9. Obtener usuario por ID (sin filtro is_active para administración)
CREATE OR ALTER PROCEDURE SP_Usuarios_ObtenerPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE IDUser = @p_id;
END;
GO

-- 10. Obtener usuario por Email (sin filtro is_active para validación de unicidad/estado)
CREATE OR ALTER PROCEDURE SP_Usuarios_ObtenerPorEmail
    @p_email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE Email = @p_email;
END;
GO

-- 11. Listar usuarios paginados con búsqueda opcional
-- Nota: Incluye total_count como columna ventana (COUNT(*) OVER()) en el primer resultset
-- y adicionalmente devuelve un segundo resultset con SELECT COUNT(*) AS total.
CREATE OR ALTER PROCEDURE SP_Usuarios_ListarPaginado
    @p_page INT = 1,
    @p_limit INT = 10,
    @p_q NVARCHAR(100) = NULL
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

    -- Primer resultset: Filas paginadas + total_count por ventana
    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at,
        COUNT(*) OVER() AS total_count
    FROM Users
    WHERE (@v_search IS NULL
        OR Email LIKE @v_search
        OR FirstName LIKE @v_search
        OR LastName LIKE @v_search
        OR Role LIKE @v_search)
    ORDER BY CreatedAt DESC
    OFFSET @v_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;

    -- Segundo resultset: Total global para clientes que leen recordsets[1]
    SELECT COUNT(*) AS total
    FROM Users
    WHERE (@v_search IS NULL
        OR Email LIKE @v_search
        OR FirstName LIKE @v_search
        OR LastName LIKE @v_search
        OR Role LIKE @v_search);
END;
GO

-- 12. Cambiar estado activo de usuario (Borrado lógico / Reactivación)
CREATE OR ALTER PROCEDURE SP_Usuarios_CambiarEstadoActivo
    @p_id VARCHAR(36),
    @p_is_active BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE Users
    SET IsActive = @p_is_active,
        UpdatedAt = GETDATE()
    WHERE IDUser = @p_id;

    SELECT
        IDUser AS id,
        Email AS email,
        PasswordHash AS password_hash,
        FirstName AS first_name,
        LastName AS last_name,
        AvatarURL AS avatar_url,
        Role AS role,
        IsActive AS is_active,
        IsVerify AS is_verify,
        CreatedAt AS created_at,
        UpdatedAt AS updated_at
    FROM Users
    WHERE IDUser = @p_id;
END;
GO

-- 13. Actualizar contraseña de usuario
CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarPassword
    @p_id VARCHAR(36),
    @p_password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE Users
    SET PasswordHash = @p_password_hash,
        UpdatedAt = GETDATE()
    WHERE IDUser = @p_id;
END;
GO

-- 14. Actualizar estado de verificación (OTP / Email)
CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarVerificacion
    @p_id VARCHAR(36),
    @p_is_verify BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE IDUser = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE Users
    SET IsVerify = @p_is_verify,
        UpdatedAt = GETDATE()
    WHERE IDUser = @p_id;
END;
GO

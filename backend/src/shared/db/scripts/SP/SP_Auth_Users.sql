-- =============================================================================
-- STORED PROCEDURES: AUTH Y USUARIOS (ShopCart)
-- Convención obligatoria: SP_Modulo_Proceso
-- =============================================================================

-- 1. Obtener usuario activo por email (Autenticación)
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerUsuarioPorEmail
    @p_email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE email = @p_email
      AND is_active = 1;
END;
GO

-- 2. Obtener usuario activo por ID (Autenticación / Perfil)
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerUsuarioPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE id = @p_id
      AND is_active = 1;
END;
GO

-- 3. Crear o actualizar sesión de usuario (Refresh Token con rotación)
CREATE OR ALTER PROCEDURE SP_Auth_UpsertSesion
    @p_id VARCHAR(36),
    @p_user_id VARCHAR(36),
    @p_token VARCHAR(500),
    @p_expires_at DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM user_sessions WHERE user_id = @p_user_id)
    BEGIN
        UPDATE user_sessions
        SET token = @p_token,
            expires_at = @p_expires_at,
            created_at = GETDATE()
        WHERE user_id = @p_user_id;
    END
    ELSE
    BEGIN
        INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
        VALUES (@p_id, @p_user_id, @p_token, @p_expires_at, GETDATE());
    END

    SELECT
        id,
        user_id,
        token,
        expires_at,
        created_at
    FROM user_sessions
    WHERE user_id = @p_user_id;
END;
GO

-- 4. Obtener sesión por token
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerSesionPorToken
    @p_token VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        user_id,
        token,
        expires_at,
        created_at
    FROM user_sessions
    WHERE token = @p_token;
END;
GO

-- 5. Obtener sesión por usuario
CREATE OR ALTER PROCEDURE SP_Auth_ObtenerSesionPorUsuario
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        user_id,
        token,
        expires_at,
        created_at
    FROM user_sessions
    WHERE user_id = @p_user_id;
END;
GO

-- 6. Eliminar sesión por usuario (Logout / Revocación)
CREATE OR ALTER PROCEDURE SP_Auth_EliminarSesion
    @p_user_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM user_sessions
    WHERE user_id = @p_user_id;
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

    INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
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
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE id = @p_id;
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

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE users
    SET email = COALESCE(@p_email, email),
        password_hash = COALESCE(@p_password_hash, password_hash),
        first_name = COALESCE(@p_first_name, first_name),
        last_name = COALESCE(@p_last_name, last_name),
        avatar_url = CASE WHEN @p_avatar_url IS NOT NULL THEN @p_avatar_url ELSE avatar_url END,
        role = COALESCE(@p_role, role),
        updated_at = GETDATE()
    WHERE id = @p_id;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE id = @p_id;
END;
GO

-- 9. Obtener usuario por ID (sin filtro is_active para administración)
CREATE OR ALTER PROCEDURE SP_Usuarios_ObtenerPorId
    @p_id VARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE id = @p_id;
END;
GO

-- 10. Obtener usuario por Email (sin filtro is_active para validación de unicidad/estado)
CREATE OR ALTER PROCEDURE SP_Usuarios_ObtenerPorEmail
    @p_email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE email = @p_email;
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
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at,
        COUNT(*) OVER() AS total_count
    FROM users
    WHERE (@v_search IS NULL
        OR email LIKE @v_search
        OR first_name LIKE @v_search
        OR last_name LIKE @v_search
        OR role LIKE @v_search)
    ORDER BY created_at DESC
    OFFSET @v_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;

    -- Segundo resultset: Total global para clientes que leen recordsets[1]
    SELECT COUNT(*) AS total
    FROM users
    WHERE (@v_search IS NULL
        OR email LIKE @v_search
        OR first_name LIKE @v_search
        OR last_name LIKE @v_search
        OR role LIKE @v_search);
END;
GO

-- 12. Cambiar estado activo de usuario (Borrado lógico / Reactivación)
CREATE OR ALTER PROCEDURE SP_Usuarios_CambiarEstadoActivo
    @p_id VARCHAR(36),
    @p_is_active BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE users
    SET is_active = @p_is_active,
        updated_at = GETDATE()
    WHERE id = @p_id;

    SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role,
        is_active,
        is_verify,
        created_at,
        updated_at
    FROM users
    WHERE id = @p_id;
END;
GO

-- 13. Actualizar contraseña de usuario
CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarPassword
    @p_id VARCHAR(36),
    @p_password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE users
    SET password_hash = @p_password_hash,
        updated_at = GETDATE()
    WHERE id = @p_id;
END;
GO

-- 14. Actualizar estado de verificación (OTP / Email)
CREATE OR ALTER PROCEDURE SP_Usuarios_ActualizarVerificacion
    @p_id VARCHAR(36),
    @p_is_verify BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = @p_id)
    BEGIN
        THROW 50001, 'NO_ENCONTRADO: El usuario no existe.', 1;
    END

    UPDATE users
    SET is_verify = @p_is_verify,
        updated_at = GETDATE()
    WHERE id = @p_id;
END;
GO


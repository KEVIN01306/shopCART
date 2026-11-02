-- =============================================================================
-- BASE DE DATOS: RETO SHOPCART
-- =============================================================================

-- 1. ROLES, USUARIOS Y SESIONES
CREATE TABLE users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Cliente' 
        CHECK (role IN ('Cliente', 'Operador', 'Administrador')),
    is_active BIT NOT NULL DEFAULT 1,
    is_verify BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE user_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_user_sessions_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Direcciones de entrega de clientes
CREATE TABLE addresses (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(50) NOT NULL, -- Ej: Casa, Trabajo
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    is_default BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_addresses_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. CATÁLOGO DE PRODUCTOS Y VARIANTES
CREATE TABLE categories (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE products (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    main_image_url VARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1, -- Borrado lógico
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_products_categories FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE product_variants (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    sku VARCHAR(60) NOT NULL UNIQUE,
    attributes NVARCHAR(MAX) NULL, -- JSON ej: {"talla": "M", "color": "Azul"}
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    stock_physical INT NOT NULL DEFAULT 0 CHECK (stock_physical >= 0),
    stock_reserved INT NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_variants_products FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT CK_stock_limit CHECK (stock_reserved <= stock_physical)
);

-- 3. KARDEX / INVENTARIO
CREATE TABLE kardex_movements (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    variant_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NULL, -- Operador o Sistema
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION')),
    quantity INT NOT NULL, -- Positivo o negativo según tipo
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_kardex_variants FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT FK_kardex_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. CARRITO DE COMPRAS Y RESERVAS
CREATE TABLE carts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NULL UNIQUE, -- NULL si es invitado
    guest_token VARCHAR(255) NULL UNIQUE,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_carts_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    cart_id VARCHAR(36) NOT NULL,
    variant_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_cart_variant UNIQUE (cart_id, variant_id),
    CONSTRAINT FK_cart_items_carts FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT FK_cart_items_variants FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Reservas temporales durante Checkout (15 min)
CREATE TABLE stock_reservations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    variant_id VARCHAR(36) NOT NULL,
    cart_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    expires_at DATETIME2 NOT NULL,
    is_released BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_reservations_variants FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT FK_reservations_carts FOREIGN KEY (cart_id) REFERENCES carts(id)
);

-- 5. CUPONES DE DESCUENTO
CREATE TABLE coupons (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PORCENTAJE', 'MONTO_FIJO')),
    discount_value DECIMAL(12, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    max_uses INT NOT NULL,
    current_uses INT NOT NULL DEFAULT 0,
    max_uses_per_client INT NOT NULL DEFAULT 1,
    category_id VARCHAR(36) NULL, -- Si es nulo, aplica a todo el carrito
    starts_at DATETIME2 NOT NULL,
    expires_at DATETIME2 NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_coupons_categories FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE coupon_usages (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    coupon_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    used_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_coupon_usages_coupons FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    CONSTRAINT FK_coupon_usages_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. PEDIDOS, DETALLES E IDEMPOTENCIA
CREATE TABLE orders (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    address_id VARCHAR(36) NOT NULL,
    coupon_id VARCHAR(36) NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE, -- Evita cobros/pedidos duplicados
    status VARCHAR(30) NOT NULL DEFAULT 'CREADO'
        CHECK (status IN ('CREADO', 'PAGADO', 'PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO')),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_orders_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_orders_coupons FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    CONSTRAINT FK_orders_addresses FOREIGN KEY (address_id) REFERENCES addresses(id)
);

CREATE TABLE order_items (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    variant_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    variant_sku VARCHAR(60) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0), -- Precio congelado
    quantity INT NOT NULL CHECK (quantity > 0),
    returned_quantity INT NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
    subtotal DECIMAL(12, 2) NOT NULL,
    CONSTRAINT FK_order_items_orders FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT FK_order_items_variants FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT CK_returned_limit CHECK (returned_quantity <= quantity)
);

CREATE TABLE order_status_history (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NOT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_order_history_orders FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT FK_order_history_users FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_returns (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    order_item_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL, -- Operador que autoriza
    quantity INT NOT NULL CHECK (quantity > 0),
    reason NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_returns_orders FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT FK_returns_order_items FOREIGN KEY (order_item_id) REFERENCES order_items(id),
    CONSTRAINT FK_returns_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. BITÁCORA DE AUDITORÍA (Inmutable)
CREATE TABLE audit_logs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    entity VARCHAR(50) NOT NULL, -- ej: 'PRODUCTO', 'PRECIO', 'EXISTENCIA', 'CUPON', 'PEDIDO'
    action VARCHAR(50) NOT NULL, -- ej: 'CREAR', 'ACTUALIZAR', 'DESACTIVAR'
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_audit_logs_users FOREIGN KEY (user_id) REFERENCES users(id)
);
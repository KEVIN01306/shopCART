-- 9. TRIGGERS DE INTEGRIDAD Y REGLAS ESTRICTAS
CREATE OR ALTER TRIGGER TR_AuditLogs_PreventModify
ON AuditLogs
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    RAISERROR('Operación denegada: La bitácora de auditoría es estrictamente inmutable (sin UPDATE ni DELETE).', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO
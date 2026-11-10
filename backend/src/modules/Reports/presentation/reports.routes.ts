import { Router } from "express";
import { reportsController } from "../reports.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";

const router = Router();
const authMiddleware = new AuthMiddleware();

router.use(authMiddleware.routeProtect);

// RF-08: Dashboard y Reportes Comerciales (Exclusivo Administrador)
router.get(
    "/dashboard",
    authMiddleware.checkRole(["Administrador"]),
    reportsController.getDashboard
);

// RF-09: Bitácora de Auditoría Inmutable (Exclusivo Administrador)
router.get(
    "/audit-logs",
    authMiddleware.checkRole(["Administrador"]),
    reportsController.listAuditLogs
);

export default router;

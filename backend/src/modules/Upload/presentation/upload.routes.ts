import { Router } from "express";
import multer from "multer";
import { uploadController } from "./upload.controller.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";

const router = Router();
const authMiddleware = new AuthMiddleware();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB máximo
    },
});

router.use(authMiddleware.routeProtect);

router.post(
    "/image",
    authMiddleware.checkRole(["Administrador", "Operador"]),
    upload.single("file"),
    uploadController.uploadImage
);

export default router;

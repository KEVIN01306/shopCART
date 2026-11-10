import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import path from "node:path";
import BaseController from "@presentation/base.controller.js";
import ResponseHttp from "@app/http/response.http.js";
import AppError from "@shared/errors/AppError.js";
import { CloudflareR2Provider } from "@shared/infrastructure/cloudflare-r2.provider.js";

const r2Provider = new CloudflareR2Provider();

export class UploadController extends BaseController {
    uploadImage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new AppError("No se ha enviado ningún archivo de imagen", "FILE_REQUIRED", 400);
            }

            const allowedMimeTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
                "image/avif",
                "image/svg+xml",
            ];

            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                throw new AppError(
                    "Formato de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WEBP, GIF, AVIF, SVG).",
                    "INVALID_FILE_TYPE",
                    400
                );
            }

            // Sanitizar nombre y extensión
            const origExt = path.extname(req.file.originalname).toLowerCase() || ".png";
            const randomUuid = crypto.randomUUID();
            const key = `products/${Date.now()}-${randomUuid}${origExt}`;

            const result = await r2Provider.upload({
                key,
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
            });

            return res.status(201).json(
                ResponseHttp.success("Imagen subida exitosamente a Cloudflare R2", {
                    url: result.url,
                    key: result.key,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                })
            );
        } catch (error) {
            next(error);
        }
    };
}

export const uploadController = new UploadController();

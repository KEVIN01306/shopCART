import { z } from "zod";

export const CreateCouponSchema = z
    .object({
        code: z
            .string({ message: "El código del cupón es obligatorio" })
            .trim()
            .min(3, "El código debe tener al menos 3 caracteres")
            .max(50, "El código no puede exceder 50 caracteres"),
        discountType: z.enum(["PORCENTAJE", "MONTO_FIJO"], {
            message: "El tipo de descuento debe ser PORCENTAJE o MONTO_FIJO",
        }),
        discountValue: z
            .number({ message: "El valor de descuento es obligatorio" })
            .positive("El valor de descuento debe ser mayor a 0"),
        minOrderAmount: z
            .number()
            .min(0, "El monto mínimo no puede ser negativo")
            .optional()
            .default(0),
        maxUses: z
            .number({ message: "El límite global de usos es obligatorio" })
            .int("Debe ser un número entero")
            .min(1, "El límite de usos debe ser al menos 1"),
        maxUsesPerClient: z
            .number()
            .int("Debe ser un número entero")
            .min(1, "El límite por cliente debe ser al menos 1")
            .optional()
            .default(1),
        categoryId: z.string().trim().nullable().optional(),
        startsAt: z
            .string({ message: "La fecha de inicio es obligatoria" })
            .min(1, "La fecha de inicio es obligatoria"),
        expiresAt: z
            .string({ message: "La fecha de expiración es obligatoria" })
            .min(1, "La fecha de expiración es obligatoria"),
    })
    .refine(
        (data) =>
            data.discountType !== "PORCENTAJE" || data.discountValue <= 100,
        {
            message: "El porcentaje de descuento no puede superar el 100%",
            path: ["discountValue"],
        }
    );

export const UpdateCouponSchema = z.object({
    code: z.string().trim().min(3).max(50).optional(),
    discountType: z.enum(["PORCENTAJE", "MONTO_FIJO"]).optional(),
    discountValue: z.number().positive().optional(),
    minOrderAmount: z.number().min(0).optional(),
    maxUses: z.number().int().min(1).optional(),
    maxUsesPerClient: z.number().int().min(1).optional(),
    categoryId: z.string().trim().nullable().optional(),
    clearCategory: z.boolean().optional(),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const ToggleCouponStatusSchema = z.object({
    isActive: z.boolean({ message: "El estado activo es obligatorio" }),
});

export const CouponIdParamSchema = z.object({
    id: z.string().trim().min(1, "ID de cupón inválido"),
});

export const ValidateCouponSchema = z.object({
    code: z
        .string({ message: "El código del cupón es obligatorio" })
        .trim()
        .min(1, "Ingresa un código de cupón válido"),
    cartId: z.string().trim().nullable().optional(),
    subtotal: z.number().min(0).nullable().optional(),
    categorySubtotal: z.number().min(0).nullable().optional(),
    guestToken: z.string().trim().nullable().optional(),
});

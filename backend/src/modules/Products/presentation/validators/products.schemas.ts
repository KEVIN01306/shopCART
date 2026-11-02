import { z } from "zod";

export const CategoryIdParamSchema = z.object({
    id: z.string().trim().min(1, "El ID de categoría es obligatorio"),
});

export const ProductIdParamSchema = z.object({
    id: z.string().trim().min(1, "El ID de producto es obligatorio"),
});

export const VariantParamsSchema = z.object({
    id: z.string().trim().min(1, "El ID de producto es obligatorio"),
    variantId: z.string().trim().min(1, "El ID de variante es obligatorio"),
});

export const CreateCategorySchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "El nombre de la categoría debe tener al menos 2 caracteres")
        .max(100, "El nombre de la categoría no puede exceder 100 caracteres"),
    description: z
        .string()
        .trim()
        .max(255, "La descripción no puede exceder 255 caracteres")
        .nullable()
        .optional(),
});

export const UpdateCategorySchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "El nombre de la categoría debe tener al menos 2 caracteres")
        .max(100, "El nombre de la categoría no puede exceder 100 caracteres")
        .optional(),
    description: z
        .string()
        .trim()
        .max(255, "La descripción no puede exceder 255 caracteres")
        .nullable()
        .optional(),
    isActive: z.boolean().optional(),
});

export const VariantAttributesSchema = z
    .record(z.string(), z.string())
    .nullable()
    .optional();

export const CreateVariantSchema = z.object({
    id: z.string().optional(),
    sku: z
        .string()
        .trim()
        .min(2, "El SKU debe tener al menos 2 caracteres")
        .max(60, "El SKU no puede exceder 60 caracteres"),
    attributes: VariantAttributesSchema,
    price: z.coerce
        .number()
        .nonnegative("El precio no puede ser negativo"),
    stockPhysical: z.coerce
        .number()
        .int("El stock físico debe ser un número entero")
        .nonnegative("El stock físico inicial no puede ser negativo")
        .optional()
        .default(0),
});

export const UpdateVariantSchema = z.object({
    id: z.string().optional(),
    sku: z
        .string()
        .trim()
        .min(2, "El SKU debe tener al menos 2 caracteres")
        .max(60, "El SKU no puede exceder 60 caracteres")
        .optional(),
    attributes: VariantAttributesSchema,
    price: z.coerce
        .number()
        .nonnegative("El precio no puede ser negativo")
        .optional(),
    stockPhysical: z.coerce
        .number()
        .int("El stock físico debe ser un número entero")
        .nonnegative("El stock físico no puede ser negativo")
        .optional(),
    isActive: z.boolean().optional(),
});

export const CreateProductSchema = z.object({
    categoryId: z
        .string()
        .trim()
        .min(1, "La categoría es obligatoria"),
    name: z
        .string()
        .trim()
        .min(2, "El nombre del producto debe tener al menos 2 caracteres")
        .max(200, "El nombre del producto no puede exceder 200 caracteres"),
    description: z
        .string()
        .trim()
        .nullable()
        .optional(),
    mainImageUrl: z
        .string()
        .trim()
        .max(500, "La URL de imagen no puede exceder 500 caracteres")
        .nullable()
        .optional(),
    variants: z
        .array(CreateVariantSchema)
        .min(1, "El producto debe incluir al menos una variante inicial")
        .optional(),
});

export const UpdateProductSchema = z.object({
    categoryId: z
        .string()
        .trim()
        .min(1, "La categoría no puede estar vacía")
        .optional(),
    name: z
        .string()
        .trim()
        .min(2, "El nombre del producto debe tener al menos 2 caracteres")
        .max(200, "El nombre del producto no puede exceder 200 caracteres")
        .optional(),
    description: z
        .string()
        .trim()
        .nullable()
        .optional(),
    mainImageUrl: z
        .string()
        .trim()
        .max(500, "La URL de imagen no puede exceder 500 caracteres")
        .nullable()
        .optional(),
    isActive: z.boolean().optional(),
    variants: z
        .array(
            z.object({
                id: z.string().optional(),
                sku: z
                    .string()
                    .trim()
                    .min(2, "El SKU debe tener al menos 2 caracteres")
                    .max(60, "El SKU no puede exceder 60 caracteres"),
                attributes: VariantAttributesSchema,
                price: z.coerce
                    .number()
                    .nonnegative("El precio no puede ser negativo"),
                stockPhysical: z.coerce
                    .number()
                    .int("El stock físico debe ser un número entero")
                    .nonnegative("El stock físico no puede ser negativo")
                    .optional(),
                isActive: z.boolean().optional(),
            })
        )
        .optional(),
});

export const ToggleProductStatusSchema = z.object({
    isActive: z.boolean(),
});

export const AdjustVariantStockSchema = z.object({
    movementType: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
    quantity: z.coerce
        .number()
        .int("La cantidad debe ser un número entero")
        .refine((val) => val !== 0, {
            message: "La cantidad del movimiento no puede ser 0",
        }),
    reason: z
        .string()
        .trim()
        .min(3, "El motivo del ajuste en Kardex debe tener al menos 3 caracteres")
        .max(255, "El motivo no puede exceder 255 caracteres"),
});

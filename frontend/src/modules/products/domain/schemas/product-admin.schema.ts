import { z } from 'zod';

export const attributePairSchema = z.object({
    key: z.string().trim().min(1, 'Ingrese el nombre del atributo (ej. Color)'),
    value: z.string().trim().min(1, 'Ingrese el valor (ej. Pink Gold)'),
});

export const variantFormItemSchema = z.object({
    id: z.string().optional(),
    sku: z
        .string()
        .trim()
        .min(2, 'El SKU debe tener al menos 2 caracteres')
        .max(64, 'Máximo 64 caracteres'),
    price: z
        .number({ message: 'Ingrese un precio válido' })
        .positive('El precio debe ser mayor a Q0.00'),
    stockPhysical: z
        .number({ message: 'Ingrese un stock válido' })
        .int('El stock debe ser un número entero')
        .min(0, 'El stock no puede ser negativo'),
    isActive: z.boolean().optional(),
    attributePairs: z.array(attributePairSchema),
});

export const productFormSchema = z.object({
    categoryId: z.string().trim().min(1, 'Seleccione una categoría'),
    name: z
        .string()
        .trim()
        .min(2, 'El nombre del producto debe tener al menos 2 caracteres')
        .max(200, 'Máximo 200 caracteres'),
    mainImageUrl: z
        .string()
        .trim()
        .url('Ingrese una URL de imagen válida (https://...)')
        .optional()
        .or(z.literal('')),
    description: z
        .string()
        .trim()
        .max(2000, 'Máximo 2000 caracteres')
        .optional()
        .or(z.literal('')),
    isActive: z.boolean(),
    variants: z
        .array(variantFormItemSchema)
        .min(1, 'Debe registrar al menos una variante para el producto')
        .refine(
            (variants) => {
                const skus = variants
                    .map((v) => v.sku.toLowerCase().trim())
                    .filter(Boolean);
                return new Set(skus).size === skus.length;
            },
            {
                message: 'No puedes repetir el mismo SKU en dos o más variantes',
            }
        ),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const stockAdjustSchema = z.object({
    movementType: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION']),
    quantity: z
        .number({ message: 'Ingrese una cantidad válida' })
        .int('La cantidad debe ser un número entero')
        .min(0, 'La cantidad no puede ser negativa'),
    reason: z
        .string()
        .trim()
        .min(3, 'Indique el motivo del movimiento para el Kardex (mín. 3 caracteres)')
        .max(255, 'Máximo 255 caracteres'),
});

export type StockAdjustFormValues = z.infer<typeof stockAdjustSchema>;

export const categoryFormSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'El nombre de la categoría debe tener al menos 2 caracteres')
        .max(100, 'Máximo 100 caracteres'),
    description: z
        .string()
        .trim()
        .max(300, 'Máximo 300 caracteres')
        .optional()
        .or(z.literal('')),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

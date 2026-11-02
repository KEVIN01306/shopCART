import { z } from "zod";

export const AddCartItemSchema = z.object({
    variantId: z
        .string({ message: "El ID de variante es obligatorio" })
        .uuid("El ID de variante debe ser un UUID válido"),
    quantity: z
        .number({ message: "La cantidad debe ser un número" })
        .int("La cantidad debe ser un entero")
        .min(1, "La cantidad debe ser de al menos 1 unidad"),
});

export const UpdateCartItemSchema = z.object({
    quantity: z
        .number({ message: "La cantidad debe ser un número" })
        .int("La cantidad debe ser un entero")
        .min(0, "La cantidad no puede ser negativa"),
});

export const VariantIdParamSchema = z.object({
    variantId: z
        .string({ message: "El ID de la variante es obligatorio" })
        .uuid("El ID de la variante debe ser un UUID válido"),
});

export const SyncCartSchema = z.object({
    guestToken: z
        .string({ message: "El token de invitado es obligatorio" })
        .trim()
        .min(1, "El token de invitado no puede estar vacío"),
});

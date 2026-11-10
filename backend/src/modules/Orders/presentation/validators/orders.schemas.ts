import { z } from "zod";

export const CreateAddressSchema = z.object({
    title: z
        .string({ message: "El alias de la dirección es obligatorio" })
        .trim()
        .min(2, "El alias debe tener al menos 2 caracteres")
        .max(50, "El alias no puede exceder 50 caracteres"),
    recipientName: z
        .string({ message: "El nombre del destinatario es obligatorio" })
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(150, "El nombre no puede exceder 150 caracteres"),
    phone: z
        .string({ message: "El teléfono de contacto es obligatorio" })
        .trim()
        .min(6, "El teléfono debe tener al menos 6 dígitos")
        .max(20, "El teléfono no puede exceder 20 caracteres"),
    streetAddress: z
        .string({ message: "La dirección exacta es obligatoria" })
        .trim()
        .min(5, "La dirección debe tener al menos 5 caracteres")
        .max(255, "La dirección no puede exceder 255 caracteres"),
    city: z
        .string({ message: "El municipio o ciudad es obligatorio" })
        .trim()
        .min(2, "La ciudad debe tener al menos 2 caracteres")
        .max(100, "La ciudad no puede exceder 100 caracteres"),
    state: z
        .string({ message: "El departamento es obligatorio" })
        .trim()
        .min(2, "El departamento debe tener al menos 2 caracteres")
        .max(100, "El departamento no puede exceder 100 caracteres"),
    postalCode: z
        .string()
        .trim()
        .max(20, "El código postal no puede exceder 20 caracteres")
        .nullable()
        .optional(),
    isDefault: z.boolean().optional(),
});

export const AddressIdParamSchema = z.object({
    id: z.string().trim().min(1, "ID de dirección inválido"),
});

export const OrderIdParamSchema = z.object({
    id: z.string().trim().min(1, "ID de pedido inválido"),
});

export const CheckoutOrderSchema = z.object({
    addressId: z
        .string({ message: "Debes seleccionar una dirección de entrega" })
        .trim()
        .min(1, "Dirección de entrega obligatoria"),
    couponCode: z.string().trim().max(50).nullable().optional(),
    idempotencyKey: z
        .string({ message: "La clave de idempotencia es obligatoria" })
        .trim()
        .min(4, "La clave de idempotencia debe tener al menos 4 caracteres")
        .max(100, "La clave de idempotencia no puede exceder 100 caracteres")
        .optional(),
});

export const UpdateOrderStatusSchema = z.object({
    status: z.enum(["PAGADO", "PREPARACION", "DESPACHADO", "ENTREGADO"], {
        message: "Estado de avance inválido",
    }),
});

export const CancelOrderSchema = z.object({
    reason: z
        .string()
        .trim()
        .max(255, "El motivo no puede exceder 255 caracteres")
        .optional(),
});

export const ProcessOrderReturnSchema = z.object({
    orderItemId: z
        .string({ message: "El ítem del pedido es obligatorio" })
        .trim()
        .min(1, "ID de ítem inválido"),
    quantity: z
        .number({ message: "La cantidad a devolver es obligatoria" })
        .int("La cantidad debe ser un número entero")
        .positive("La cantidad a devolver debe ser mayor a 0"),
    reason: z
        .string({ message: "El motivo de la devolución es obligatorio" })
        .trim()
        .min(3, "El motivo debe tener al menos 3 caracteres")
        .max(255, "El motivo no puede exceder 255 caracteres"),
});

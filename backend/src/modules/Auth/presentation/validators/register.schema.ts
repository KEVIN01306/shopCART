import z from "zod";

export const registerSchema = z.object({
    firstName: z
        .string({ message: "El nombre es obligatorio" })
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres"),
    lastName: z
        .string({ message: "El apellido es obligatorio" })
        .trim()
        .min(2, "El apellido debe tener al menos 2 caracteres")
        .max(100, "El apellido no puede exceder 100 caracteres"),
    email: z
        .string({ message: "El correo electrónico es obligatorio" })
        .trim()
        .email("Debe proporcionar un correo electrónico válido"),
    password: z
        .string({ message: "La contraseña es obligatoria" })
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .max(100, "La contraseña no puede exceder 100 caracteres"),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

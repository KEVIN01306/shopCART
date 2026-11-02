import { z } from 'zod';

export const VALID_SYSTEM_ROLES = ['Cliente', 'Operador', 'Administrador'] as const;

export const createUserSchema = z
    .object({
        email: z
            .string()
            .trim()
            .min(1, 'El correo electrónico es requerido')
            .email('Ingrese un correo electrónico válido'),
        passwordRaw: z.string().optional().or(z.literal('')),
        autoGeneratePassword: z.boolean().optional(),
        firstName: z
            .string()
            .trim()
            .min(1, 'El nombre es obligatorio')
            .max(50, 'Máximo 50 caracteres'),
        lastName: z
            .string()
            .trim()
            .min(1, 'El apellido es obligatorio')
            .max(50, 'Máximo 50 caracteres'),
        roles: z
            .array(z.string())
            .min(1, 'Seleccione al menos un rol para el usuario'),
    })
    .refine(
        (data) => {
            if (!data.autoGeneratePassword) {
                return typeof data.passwordRaw === 'string' && data.passwordRaw.length >= 8;
            }
            return true;
        },
        {
            message: 'La contraseña debe tener al menos 8 caracteres',
            path: ['passwordRaw'],
        }
    );

export const updateUserSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Ingrese un correo electrónico válido')
        .optional()
        .or(z.literal('')),
    passwordRaw: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .optional()
        .or(z.literal('')),
    firstName: z
        .string()
        .trim()
        .min(1, 'El nombre no puede estar vacío')
        .max(50, 'Máximo 50 caracteres')
        .optional(),
    lastName: z
        .string()
        .trim()
        .min(1, 'El apellido no puede estar vacío')
        .max(50, 'Máximo 50 caracteres')
        .optional(),
    roles: z
        .array(z.string())
        .min(1, 'Seleccione al menos un rol')
        .optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

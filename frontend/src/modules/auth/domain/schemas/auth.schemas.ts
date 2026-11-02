import { z } from 'zod';

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Por favor ingresa un correo electrónico válido'),
    password: z
        .string()
        .min(1, 'La contraseña es requerida')
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        firstName: z
            .string()
            .trim()
            .min(1, 'El nombre es requerido')
            .max(100, 'El nombre no puede exceder 100 caracteres'),
        lastName: z
            .string()
            .trim()
            .min(1, 'El apellido es requerido')
            .max(100, 'El apellido no puede exceder 100 caracteres'),
        email: z
            .string()
            .trim()
            .min(1, 'El correo electrónico es requerido')
            .email('Por favor ingresa un correo electrónico válido'),
        password: z
            .string()
            .min(6, 'La contraseña debe tener al menos 6 caracteres')
            .max(100, 'La contraseña no puede exceder 100 caracteres'),
        confirmPassword: z
            .string()
            .min(1, 'Confirma tu contraseña'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    });

export type RegisterFormValues = z.infer<typeof registerSchema>;

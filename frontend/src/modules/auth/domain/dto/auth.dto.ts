import type { AuthUser } from '../interfaces/auth.interfaces';
import type { LoginFormValues } from '../schemas/auth.schemas';

/**
 * LoginRequestDto — derived from the Zod schema (single source of truth).
 * This ensures the form values type and the API request type are always in sync.
 */
export type LoginRequestDto = LoginFormValues;

export interface RegisterRequestDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface LoginResponseDto {
    accessToken: string;
    refreshToken?: string;
    user: AuthUser;
}

export interface RefreshTokenRequestDto {
    refreshToken: string;
}

export interface RefreshTokenResponseDto {
    accessToken: string;
    refreshToken?: string;
}

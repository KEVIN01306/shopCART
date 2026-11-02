import axios from 'axios';
import { API_BASE_URL } from '../../../../core/api/config';
import type { LoginRequestDto, LoginResponseDto, RegisterRequestDto } from '../../domain/dto/auth.dto';
import type { AuthUser } from '../../domain/interfaces/auth.interfaces';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}

/**
 * Authenticates a user with email and password.
 * Uses plain axios with credentials so refreshToken cookie is set by the browser.
 */
const loginUser = async (data: LoginRequestDto): Promise<LoginResponseDto> => {
    const response = await axios.post<ApiResponse<LoginResponseDto>>(
        `${AUTH_BASE_URL}/login`,
        data,
        { withCredentials: true }
    );
    return response.data.data;
};

/**
 * Registers a new customer user (Role: Cliente) with immediate verification.
 * Saves tokens and starts session directly.
 */
const registerUser = async (data: RegisterRequestDto): Promise<LoginResponseDto> => {
    const response = await axios.post<ApiResponse<LoginResponseDto>>(
        `${AUTH_BASE_URL}/register`,
        data,
        { withCredentials: true }
    );
    return response.data.data;
};

/**
 * Refreshes the session using the httpOnly refreshToken cookie.
 * Returns new accessToken and current user.
 */
const refreshSession = async (): Promise<LoginResponseDto> => {
    const response = await axios.post<ApiResponse<LoginResponseDto>>(
        `${AUTH_BASE_URL}/refresh`,
        {},
        { withCredentials: true }
    );
    return response.data.data;
};

/**
 * Retrieves the currently authenticated user's profile.
 */
const getCurrentUser = async (accessToken: string): Promise<AuthUser> => {
    const response = await axios.get<ApiResponse<AuthUser>>(`${AUTH_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
    });
    return response.data.data;
};

export { loginUser, registerUser, refreshSession, getCurrentUser };

import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlAuthRepository } from "./infrastructure/mssql-auth.repository.js";
import { Argon2HashProvider } from "../../shared/infrastructure/argon2-hash.provider.js";
import JwtProvider from "./domain/jwt.provider.js";
import { HttpOtpProvider } from "./infrastructure/http-otp.provider.js";
import { LoginUseCase } from "./application/login.usecase.js";
import { LogoutUseCase } from "./application/logout.usecase.js";
import { AuthController } from "./presentation/auth.controller.js";
import { RefreshTokenUseCase } from "./application/refresh-token.usecase.js";
import { GetProfileUseCase } from "./application/get-profile.usecase.js";
import { SendOtpUseCase } from "./application/send-otp.usecase.js";
import { VerifyOtpUseCase } from "./application/verify-otp.usecase.js";
import { ResetPasswordWithOtpUseCase } from "./application/reset-password-with-otp.usecase.js";
import { RegisterUseCase } from "./application/register.usecase.js";
import { usersRepository } from "../Users/users.module.js";

export const authRepository = new MssqlAuthRepository(getPool);
const hashProvider = new Argon2HashProvider();
const jwtProvider = new JwtProvider();
const otpProvider = new HttpOtpProvider();

const loginUseCase = new LoginUseCase(authRepository, jwtProvider, hashProvider);
const registerUseCase = new RegisterUseCase(authRepository, jwtProvider, hashProvider);
const logoutUseCase = new LogoutUseCase(authRepository);
const refreshTokenUseCase = new RefreshTokenUseCase(authRepository, jwtProvider);
const getProfileUseCase = new GetProfileUseCase(authRepository);
const sendOtpUseCase = new SendOtpUseCase(otpProvider, usersRepository);
const verifyOtpUseCase = new VerifyOtpUseCase(otpProvider, jwtProvider, usersRepository);
const resetPasswordWithOtpUseCase = new ResetPasswordWithOtpUseCase(
    jwtProvider,
    usersRepository,
    authRepository,
    hashProvider
);

export const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    getProfileUseCase,
    logoutUseCase,
    sendOtpUseCase,
    verifyOtpUseCase,
    resetPasswordWithOtpUseCase,
    registerUseCase
);

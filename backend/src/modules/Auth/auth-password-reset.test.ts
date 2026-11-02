import 'dotenv/config';
import assert from 'node:assert/strict';
import type sql from 'mssql';
import { Argon2HashProvider } from '../../shared/infrastructure/argon2-hash.provider.js';
import JwtProvider from './domain/jwt.provider.js';
import { SendOtpUseCase } from './application/send-otp.usecase.js';
import { VerifyOtpUseCase } from './application/verify-otp.usecase.js';
import { ResetPasswordWithOtpUseCase } from './application/reset-password-with-otp.usecase.js';
import type { OtpProvider, SendOtpResult, VerifyOtpResult } from './domain/otp.provider.js';
import { MssqlUsersRepository } from '../Users/infrastructure/mssql-users.repository.js';
import { MssqlAuthRepository } from './infrastructure/mssql-auth.repository.js';
import type { UserDbRow } from '../Users/infrastructure/mappers/users.mapper.js';
import AppError from '../../shared/errors/AppError.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-shopcart-2026';
process.env.JWT_ISS = process.env.JWT_ISS || 'shopcart-api';
process.env.JWT_AUD = process.env.JWT_AUD || 'shopcart-client';

class MockOtpProvider implements OtpProvider {
    public lastSentEmail: string | null = null;
    public lastSentType: string | null = null;
    public validOtp = '123456';
    public shouldFailVerify = false;

    async sendOtp(email: string, type: 'PASSWORD_RESET' | 'OTP' = 'PASSWORD_RESET'): Promise<SendOtpResult> {
        this.lastSentEmail = email;
        this.lastSentType = type;
        return {
            success: true,
            message: 'Código OTP enviado correctamente (Mock)',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
    }

    async verifyOtp(_email: string, code: string, _type: 'PASSWORD_RESET' | 'OTP' = 'PASSWORD_RESET'): Promise<VerifyOtpResult> {
        if (this.shouldFailVerify || code !== this.validOtp) {
            throw new AppError('Código OTP incorrecto', 'INVALID_OTP', 400);
        }
        return {
            success: true,
            verified: true,
            message: 'Código verificado con éxito (Mock)',
        };
    }
}

function createMockMssqlPool() {
    const users = new Map<string, UserDbRow>();
    const sessions = new Map<string, { id: string; user_id: string; token: string; expires_at: Date; created_at: Date }>();

    const pool = {
        request() {
            const inputs: Record<string, any> = {};
            const req = {
                input(name: string, _type: any, value: any) {
                    inputs[name] = value;
                    return req;
                },
                async execute(spName: string) {
                    switch (spName) {
                        case 'SP_Usuarios_CrearUsuario': {
                            const row: UserDbRow = {
                                id: inputs.p_id,
                                email: inputs.p_email,
                                password_hash: inputs.p_password_hash,
                                first_name: inputs.p_first_name,
                                last_name: inputs.p_last_name,
                                avatar_url: inputs.p_avatar_url ?? null,
                                role: inputs.p_role || 'Cliente',
                                is_active: 1,
                                is_verify: inputs.p_is_verify ? 1 : 0,
                                created_at: new Date(),
                                updated_at: new Date(),
                            };
                            users.set(row.id, row);
                            return { recordset: [row], rowsAffected: [1] };
                        }
                        case 'SP_Usuarios_ObtenerPorEmail':
                        case 'SP_Auth_ObtenerUsuarioPorEmail': {
                            const found = Array.from(users.values()).find((u) => u.email === inputs.p_email);
                            return { recordset: found ? [found] : [], rowsAffected: [found ? 1 : 0] };
                        }
                        case 'SP_Usuarios_ObtenerPorId':
                        case 'SP_Auth_ObtenerUsuarioPorId': {
                            const found = users.get(inputs.p_id);
                            return { recordset: found ? [found] : [], rowsAffected: [found ? 1 : 0] };
                        }
                        case 'SP_Usuarios_ActualizarPassword': {
                            const found = users.get(inputs.p_id);
                            if (found) {
                                found.password_hash = inputs.p_password_hash;
                                found.updated_at = new Date();
                            }
                            return { recordset: [], rowsAffected: [found ? 1 : 0] };
                        }
                        case 'SP_Usuarios_ActualizarVerificacion': {
                            const found = users.get(inputs.p_id);
                            if (found) {
                                found.is_verify = inputs.p_is_verify ? 1 : 0;
                                found.updated_at = new Date();
                            }
                            return { recordset: [], rowsAffected: [found ? 1 : 0] };
                        }
                        case 'SP_Auth_EliminarSesion': {
                            sessions.delete(inputs.p_user_id);
                            return { recordset: [], rowsAffected: [1] };
                        }
                        default:
                            return { recordset: [], rowsAffected: [0] };
                    }
                },
            };
            return req;
        },
    } as unknown as sql.ConnectionPool;

    return async () => pool;
}

async function runTests() {
    console.log('🧪 Starting Auth & Password Reset with OTP automated test suite (MSSQL SP)...\n');

    const getMockPool = createMockMssqlPool();
    const usersRepository = new MssqlUsersRepository(getMockPool);
    const authRepository = new MssqlAuthRepository(getMockPool);
    const hashProvider = new Argon2HashProvider();
    const jwtProvider = new JwtProvider();
    const mockOtpProvider = new MockOtpProvider();

    const sendOtpUseCase = new SendOtpUseCase(mockOtpProvider, usersRepository);
    const verifyOtpUseCase = new VerifyOtpUseCase(mockOtpProvider, jwtProvider, usersRepository);
    const resetPasswordWithOtpUseCase = new ResetPasswordWithOtpUseCase(
        jwtProvider,
        usersRepository,
        authRepository,
        hashProvider
    );

    const testEmail = `test-otp-${Date.now()}@shopcart.com`;
    const initialPassword = 'InitialPassword123!';
    const initialHash = await hashProvider.hash(initialPassword);

    const testUser = await usersRepository.create({
        email: testEmail,
        passwordHash: initialHash,
        firstName: 'Test',
        lastName: 'OTP User',
        role: 'Cliente',
        roles: ['Cliente'],
    });

    console.log(`✅ [1/9] Created test user: ${testEmail} (${testUser.id}) with role ${testUser.role}`);

    // Test 1: Send OTP to non-existent user should fail
    console.log('Testing: Send OTP to non-existent user...');
    await assert.rejects(
        async () => {
            await sendOtpUseCase.execute({ email: 'nonexistent-user@shopcart.com' });
        },
        (err: any) => {
            assert.equal(err.code, 'USER_NOT_FOUND');
            return true;
        }
    );
    console.log('✅ [2/9] Non-existent user rejected as expected.');

    // Test 2: Send OTP to valid existing user
    console.log('Testing: Send OTP to valid user...');
    const sendResult = await sendOtpUseCase.execute({ email: testEmail });
    assert.equal(sendResult.success, true);
    assert.equal(mockOtpProvider.lastSentEmail, testEmail);
    assert.equal(mockOtpProvider.lastSentType, 'PASSWORD_RESET');
    console.log('✅ [3/9] Send OTP succeeded with PASSWORD_RESET type.');

    // Test 3: Verify OTP with wrong code should fail
    console.log('Testing: Verify OTP with invalid code...');
    await assert.rejects(
        async () => {
            await verifyOtpUseCase.execute({ email: testEmail, code: '000000' });
        },
        (err: any) => {
            assert.equal(err.code, 'INVALID_OTP');
            return true;
        }
    );
    console.log('✅ [4/9] Invalid OTP code rejected.');

    // Test 4: Verify OTP with correct code returns valid resetToken
    console.log('Testing: Verify OTP with valid code...');
    const verifyResult = await verifyOtpUseCase.execute({ email: testEmail, code: '123456' });
    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.verified, true);
    assert.ok(verifyResult.resetToken, 'Expected resetToken to be present');
    console.log('✅ [5/9] Valid OTP returned single-use resetToken.');

    // Test 5: Reset password with wrong current password (if currentPassword provided)
    console.log('Testing: Reset password with wrong current password...');
    await assert.rejects(
        async () => {
            await resetPasswordWithOtpUseCase.execute({
                resetToken: verifyResult.resetToken,
                currentPassword: 'WrongCurrentPassword999!',
                newPassword: 'BrandNewSecurePassword2026!',
                confirmPassword: 'BrandNewSecurePassword2026!',
            });
        },
        (err: any) => {
            assert.equal(err.code, 'INVALID_CURRENT_PASSWORD');
            return true;
        }
    );
    console.log('✅ [6/9] Wrong current password rejected.');

    // Test 6: Reset password with mismatched confirmation
    console.log('Testing: Reset password with mismatched confirmation...');
    await assert.rejects(
        async () => {
            await resetPasswordWithOtpUseCase.execute({
                resetToken: verifyResult.resetToken,
                currentPassword: initialPassword,
                newPassword: 'BrandNewSecurePassword2026!',
                confirmPassword: 'DifferentPassword123!',
            });
        },
        (err: any) => {
            assert.equal(err.code, 'PASSWORDS_DO_NOT_MATCH');
            return true;
        }
    );
    console.log('✅ [7/9] Mismatched confirmation rejected.');

    // Test 7: Reset password with valid data
    console.log('Testing: Reset password with valid token and credentials...');
    const newPassword = 'BrandNewSecurePassword2026!';
    await resetPasswordWithOtpUseCase.execute({
        resetToken: verifyResult.resetToken,
        currentPassword: initialPassword,
        newPassword,
        confirmPassword: newPassword,
    });
    console.log('✅ [8/9] Password successfully updated in database with Argon2.');

    // Verify password in DB actually changed and old password fails
    const updatedUser = await usersRepository.findByIdWithPassword(testUser.id);
    assert.ok(updatedUser?.passwordHash);
    const isOldValid = await hashProvider.compare(initialPassword, updatedUser.passwordHash);
    assert.equal(isOldValid, false, 'Old password should no longer be valid');
    const isNewValid = await hashProvider.compare(newPassword, updatedUser.passwordHash);
    assert.equal(isNewValid, true, 'New password should be valid');

    // Test 8: Replay attack prevention — Token single-use check
    console.log('Testing: Replay attack prevention (reusing consumed resetToken)...');
    await assert.rejects(
        async () => {
            await resetPasswordWithOtpUseCase.execute({
                resetToken: verifyResult.resetToken,
                newPassword: 'AnotherNewPassword999!',
                confirmPassword: 'AnotherNewPassword999!',
            });
        },
        (err: any) => {
            assert.equal(err.code, 'TOKEN_ALREADY_USED');
            return true;
        }
    );
    console.log('✅ [9/9] Replayed resetToken blocked successfully (Replay Protection).');

    console.log('\n🎉 ALL 9 TEST CASES PASSED SUCCESSFULLY!');
}

runTests().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import type sql from 'mssql';
import { Argon2HashProvider } from '../../shared/infrastructure/argon2-hash.provider.js';
import JwtProvider from '../Auth/domain/jwt.provider.js';
import { SendOtpUseCase } from '../Auth/application/send-otp.usecase.js';
import { VerifyOtpUseCase } from '../Auth/application/verify-otp.usecase.js';
import { ResetPasswordWithOtpUseCase } from '../Auth/application/reset-password-with-otp.usecase.js';
import { CreateUserUseCase } from './application/create-user.usecase.js';
import type { EmailProvider, SendEmailResult } from '../../shared/domain/email.provider.js';
import type { OtpProvider, SendOtpResult, VerifyOtpResult } from '../Auth/domain/otp.provider.js';
import { MssqlUsersRepository } from './infrastructure/mssql-users.repository.js';
import { MssqlAuthRepository } from '../Auth/infrastructure/mssql-auth.repository.js';
import type { UserDbRow } from './infrastructure/mappers/users.mapper.js';
import AppError from '../../shared/errors/AppError.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-shopcart-2026';
process.env.JWT_ISS = process.env.JWT_ISS || 'shopcart-api';
process.env.JWT_AUD = process.env.JWT_AUD || 'shopcart-client';

class MockEmailProvider implements EmailProvider {
    public lastSentTo: string | null = null;
    public lastSentSubject: string | null = null;
    public lastSentHtml: string | null = null;

    async sendEmail(options: { to: string; subject: string; htmlContent: string; logoUrl?: string; projectName?: string }): Promise<SendEmailResult> {
        this.lastSentTo = options.to;
        this.lastSentSubject = options.subject;
        this.lastSentHtml = options.htmlContent;
        return {
            success: true,
            message: 'Email enviado con éxito (Mock)',
            messageId: 'mock-msg-' + Date.now(),
        };
    }

    async sendWelcomeCredentialsEmail(to: string, _name: string, tempPassword: string, _projectName?: string): Promise<SendEmailResult> {
        this.lastSentTo = to;
        this.lastSentSubject = 'Bienvenido a ShopCart - Credenciales de Acceso';
        this.lastSentHtml = `<p>Usuario: ${to}, Password: ${tempPassword}</p>`;
        return {
            success: true,
            message: 'Email de bienvenida enviado con éxito (Mock)',
            messageId: 'mock-msg-' + Date.now(),
        };
    }
}

class MockOtpProvider implements OtpProvider {
    public lastSentEmail: string | null = null;
    public validOtp = '654321';

    async sendOtp(email: string, _type: 'PASSWORD_RESET' | 'OTP' = 'OTP'): Promise<SendOtpResult> {
        this.lastSentEmail = email;
        return {
            success: true,
            message: 'Código OTP enviado correctamente (Mock)',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
    }

    async verifyOtp(_email: string, code: string, _type: 'PASSWORD_RESET' | 'OTP' = 'OTP'): Promise<VerifyOtpResult> {
        if (code !== this.validOtp) {
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
    console.log('🧪 Starting User Creation, Welcome Email & Mandatory Activation Test Suite (MSSQL SP)...\n');

    const getMockPool = createMockMssqlPool();
    const usersRepository = new MssqlUsersRepository(getMockPool);
    const authRepository = new MssqlAuthRepository(getMockPool);
    const hashProvider = new Argon2HashProvider();
    const jwtProvider = new JwtProvider();
    const mockEmailProvider = new MockEmailProvider();
    const mockOtpProvider = new MockOtpProvider();

    const createUserUseCase = new CreateUserUseCase(usersRepository, hashProvider, mockEmailProvider);
    const sendOtpUseCase = new SendOtpUseCase(mockOtpProvider, usersRepository);
    const verifyOtpUseCase = new VerifyOtpUseCase(mockOtpProvider, jwtProvider, usersRepository);
    const resetPasswordWithOtpUseCase = new ResetPasswordWithOtpUseCase(
        jwtProvider,
        usersRepository,
        authRepository,
        hashProvider
    );

    const testEmail = `activation-test-${Date.now()}@shopcart.com`;

    // Test 1: Create user with autoGeneratePassword
    console.log('Testing: Create user with autoGeneratePassword...');
    const createdUser = await createUserUseCase.execute({
        email: testEmail,
        firstName: 'Activation',
        lastName: 'Tester',
        role: 'Operador',
        roles: ['Operador'],
        autoGeneratePassword: true,
    });

    const createdUserId = createdUser.id;
    assert.ok(createdUserId, 'User ID should be returned');
    assert.equal(createdUser.role, 'Operador');
    assert.deepEqual(createdUser.roles, ['Operador']);
    console.log(`✅ [1/8] User created: ${testEmail} (${createdUserId}) with role ${createdUser.role}`);

    // Test 2: Verify user state in DB
    console.log('Testing: User initial state in DB...');
    const userInDb = await usersRepository.findByIdWithPassword(createdUserId);
    assert.ok(userInDb, 'User must exist in DB');
    console.log(`✅ [2/8] New user correctly created with isVerify = ${userInDb.isVerify}`);

    // Test 3: Verify welcome email was triggered
    console.log('Testing: Welcome email delivery via EmailProvider...');
    assert.equal(mockEmailProvider.lastSentTo, testEmail, 'Welcome email must be sent to the user email');
    assert.ok(mockEmailProvider.lastSentSubject?.includes('ShopCart'), 'Email subject matches');
    console.log('✅ [3/8] Welcome email with credentials was dispatched successfully');

    // Test 4: Password was hashed with Argon2 (not plain text)
    console.log('Testing: Password hash format in database...');
    assert.ok(userInDb.passwordHash.startsWith('$argon2'), 'Password must be stored as Argon2 hash');
    console.log('✅ [4/8] Password is cryptographically hashed with Argon2 in DB');

    // Test 5: Step 1 of Activation - Send OTP
    console.log('Testing: Send activation OTP to unverified user...');
    const sendOtpResult = await sendOtpUseCase.execute({ email: testEmail, type: 'OTP' });
    assert.equal(sendOtpResult.success, true);
    assert.equal(mockOtpProvider.lastSentEmail, testEmail);
    console.log('✅ [5/8] Activation OTP sent successfully');

    // Test 6: Step 2 of Activation - Verify OTP and obtain resetToken
    console.log('Testing: Verify OTP code and obtain activation reset token...');
    const verifyOtpResult = await verifyOtpUseCase.execute({
        email: testEmail,
        code: '654321',
        type: 'OTP',
    });
    assert.equal(verifyOtpResult.verified, true);
    assert.ok(verifyOtpResult.resetToken, 'Single-use resetToken must be returned');
    console.log('✅ [6/8] OTP verified and single-use activation resetToken issued');

    // Test 7: Step 3 of Activation - Change password and activate account
    console.log('Testing: Mandatory password change to complete activation...');
    const newPassword = 'BrandNewPassword@2026!';
    await resetPasswordWithOtpUseCase.execute({
        resetToken: verifyOtpResult.resetToken,
        newPassword,
        confirmPassword: newPassword,
    });

    const activatedUser = await usersRepository.findByIdWithPassword(createdUserId);
    assert.ok(activatedUser);
    assert.equal(activatedUser.isVerify, true, 'User MUST have isVerify = true after completing password change');
    console.log('✅ [7/8] Password updated and user isVerify changed to TRUE');

    // Test 8: Verify new password works
    console.log('Testing: Validate that new password authenticates properly...');
    const isNewPasswordValid = await hashProvider.compare(newPassword, activatedUser.passwordHash);
    assert.equal(isNewPasswordValid, true, 'New password must match hash');
    console.log('✅ [8/8] New password authenticated successfully');

    console.log('\n🎉 ALL 8 USER CREATION & ACTIVATION TEST CASES PASSED SUCCESSFULLY!\n');
}

runTests().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error('❌ Test suite failed with error:', err);
    process.exit(1);
});

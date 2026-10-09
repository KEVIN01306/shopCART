import 'dotenv/config';

export interface EnvConfig {
    port: number;
    nodeEnv: string;
    resendApiKey: string;
    emailFrom: string;
    emailLogoUrl: string;
    otpUrl: string;
    otpProvider: string;
}

export const config: EnvConfig = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || process.env.RESEND_FROM || 'noreply@cadimportinc.com',
    emailLogoUrl: process.env.EMAIL_LOGO_URL || 'https://pub-59913b0c53f044ad8a24e05f6a21ed2e.r2.dev/assets/logo-cad.png',
    otpUrl: (process.env.OTP_URL || 'http://localhost:8000/api/v1/').replace(/\/+$/, ''),
    otpProvider: process.env.OTP_PROVIDER || '',
};

export default config;

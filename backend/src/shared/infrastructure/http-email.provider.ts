import type { EmailProvider, SendCustomEmailOptions, SendEmailResult } from "../domain/email.provider.js";

const DEFAULT_LOGO_URL = "https://pub-59913b0c53f044ad8a24e05f6a21ed2e.r2.dev/assets/logo-cad.png";

export class HttpEmailProvider implements EmailProvider {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly logoUrl: string;

    constructor(baseUrl?: string, apiKey?: string, logoUrl?: string) {
        this.baseUrl = (baseUrl || process.env.OTP_URL || "http://localhost:8000/api/v1/").replace(/\/+$/, "");
        this.apiKey = apiKey || process.env.OTP_PROVIDER || "";
        this.logoUrl = logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL;

        if (!this.apiKey) {
            console.warn("[HttpEmailProvider] Warning: OTP_PROVIDER API key is not configured.");
        }
    }

    async sendEmail(options: SendCustomEmailOptions): Promise<SendEmailResult> {
        try {
            const url = `${this.baseUrl}/email/send`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                },
                body: JSON.stringify({
                    to: options.to,
                    subject: options.subject,
                    htmlContent: options.htmlContent,
                    logoUrl: options.logoUrl || this.logoUrl,
                    projectName: options.projectName,
                }),
            });

            const data = (await response.json()) as any;

            if (!response.ok || !data.success) {
                const errorMessage = data.error || data.message || "Error al enviar el correo electrónico";
                return {
                    success: false,
                    error: errorMessage,
                };
            }

            return {
                success: true,
                messageId: data.messageId,
                message: data.message || "Correo enviado correctamente",
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || "Servicio de correo no disponible",
            };
        }
    }

    async sendWelcomeCredentialsEmail(
        to: string,
        name: string,
        tempPassword: string,
        projectName: string = "shopCART"
    ): Promise<SendEmailResult> {
        const subject = `Tus credenciales de acceso - ${projectName}`;
        const htmlContent = `
            <p style="font-size: 16px; margin: 0 0 16px 0;">Hola <strong>${name}</strong>,</p>
            <p style="font-size: 14.5px; line-height: 1.5; color: #334155; margin: 0 0 20px 0;">
                Tu cuenta ha sido creada exitosamente en la plataforma <strong>${projectName}</strong>.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 10px 0; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600;">
                    Credenciales de Acceso
                </p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">
                    <strong>Usuario:</strong> <span style="color: #0284c7;">${to}</span>
                </p>
                <p style="margin: 0; font-size: 14px; color: #1e293b;">
                    <strong>Contraseña temporal:</strong> <code style="background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 15px; font-weight: 700;">${tempPassword}</code>
                </p>
            </div>

            <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">
                Por motivos de seguridad, esta contraseña es <strong>temporal</strong>.
            </p>
            <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">
                Para activar completamente tu cuenta debes realizar los siguientes pasos al iniciar sesión:
            </p>
            <ol style="font-size: 13.5px; color: #334155; padding-left: 20px; margin: 0 0 24px 0; line-height: 1.7;">
                <li>Iniciar sesión con tus credenciales temporales.</li>
                <li>Verificar tu correo electrónico mediante el código de seguridad OTP.</li>
                <li>Establecer tu nueva contraseña personal definitiva.</li>
            </ol>
            <p style="font-size: 13px; color: #64748b; margin: 0;">
                Si tienes dudas o necesitas asistencia, contacta al administrador del sistema.
            </p>
        `.trim();

        return this.sendEmail({
            to,
            subject,
            htmlContent,
            projectName,
        });
    }
}

import type { TypographyVariantsOptions } from '@mui/material/styles';

/**
 * Typography — Ecom Marketplace
 *
 * Enfoque:
 * - Títulos y precios en azul marino (#425A8B) con pesos firmes (700 / 800) para alta legibilidad comercial.
 * - Subtítulos, marcas y categorías en azul grisáceo (#66789C / #8C9EC5).
 * - Cuerpo de texto claro y escaneable para especificaciones en viñetas y selectores de variantes.
 */
const headingFontFamily =
    "'Plus Jakarta Sans', 'Inter Tight', 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";

const bodyFontFamily =
    "'Inter', 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";

export const typography: TypographyVariantsOptions = {
    fontFamily: bodyFontFamily,

    // Hero banner principal
    h1: {
        fontFamily: headingFontFamily,
        fontSize: '2.5rem',       // 40px
        fontWeight: 800,
        lineHeight: 1.18,
        letterSpacing: '-0.02em',
        color: '#425A8B',
    },

    // Título de producto en PDP (Captura 3)
    h2: {
        fontFamily: headingFontFamily,
        fontSize: '1.875rem',     // 30px
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.015em',
        color: '#425A8B',
    },

    // Nombres de sección
    h3: {
        fontFamily: headingFontFamily,
        fontSize: '1.375rem',     // 22px
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        color: '#425A8B',
    },

    // Nombres de producto en Product Cards (Capturas 1 y 2)
    h4: {
        fontFamily: headingFontFamily,
        fontSize: '0.9375rem',    // 15px
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: '0em',
        color: '#425A8B',
    },

    // Títulos de widgets de filtro ("Product Categories", "Products Filter")
    h5: {
        fontFamily: headingFontFamily,
        fontSize: '1.0625rem',    // 17px
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: '0em',
        color: '#425A8B',
    },

    // Precios y subtítulos en cards
    h6: {
        fontFamily: headingFontFamily,
        fontSize: '1.25rem',      // 20px
        fontWeight: 800,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        color: '#425A8B',
    },

    subtitle1: {
        fontFamily: bodyFontFamily,
        fontSize: '0.9375rem',    // 15px
        fontWeight: 600,
        lineHeight: 1.5,
        color: '#425A8B',
    },

    subtitle2: {
        fontFamily: bodyFontFamily,
        fontSize: '0.8125rem',    // 13px
        fontWeight: 600,
        lineHeight: 1.5,
        color: '#66789C',
    },

    body1: {
        fontFamily: bodyFontFamily,
        fontSize: '0.9375rem',    // 15px
        fontWeight: 400,
        lineHeight: 1.6,
        color: '#425A8B',
    },

    body2: {
        fontFamily: bodyFontFamily,
        fontSize: '0.875rem',     // 14px
        fontWeight: 400,
        lineHeight: 1.55,
        color: '#66789C',
    },

    caption: {
        fontFamily: bodyFontFamily,
        fontSize: '0.75rem',      // 12px
        fontWeight: 500,
        lineHeight: 1.4,
        color: '#8C9EC5',
    },

    overline: {
        fontFamily: bodyFontFamily,
        fontSize: '0.6875rem',    // 11px
        fontWeight: 700,
        lineHeight: 1.6,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#8C9EC5',
    },

    button: {
        fontFamily: bodyFontFamily,
        fontSize: '0.875rem',     // 14px
        fontWeight: 600,
        lineHeight: 1.4,
        textTransform: 'none',
        letterSpacing: '0.005em',
    },
};

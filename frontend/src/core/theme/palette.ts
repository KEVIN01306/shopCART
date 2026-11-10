import type { PaletteOptions } from '@mui/material/styles';

/**
 * Design system palette — Ecom Marketplace
 *
 * Reglas clave:
 * - Primary Navy / Slate (#425A8B): Títulos de productos, encabezados, precios principales, bordes de botones Add To Cart y navegación.
 * - Secondary / Accent Orange (#FD9636): Estrellas de calificación (★★★★★), slider de rango de precio, checkboxes activos, bordes de variante seleccionada (Color, Style, Size).
 * - Superficies: Fondo general #F8FAFC / #FFFFFF, barra de breadcrumbs y badges de conteo en #F0F3F8, tarjetas en #FFFFFF con borde 1px solid #D5DFE4.
 * - Texto: Primario en #425A8B, secundario en #66789C, terciario/tachado en #8C9EC5.
 */
export const palette: PaletteOptions = {
    mode: 'light',

    primary: {
        main: '#425A8B',       // Ecom Primary Navy / Slate
        light: '#66789C',      // Slate Light
        dark: '#2B3E66',       // Deep Navy
        contrastText: '#FFFFFF',
    },

    secondary: {
        main: '#FD9636',       // Ecom Accent Orange
        light: '#FFF3E6',      // Soft Orange Wash
        dark: '#E07B1B',       // Deep Orange
        contrastText: '#FFFFFF',
    },

    background: {
        default: '#F8FAFC',    // Clean Storefront Canvas
        paper: '#FFFFFF',      // Pure White Card Surface
    },

    text: {
        primary: '#425A8B',    // Ecom Navy Primary Text
        secondary: '#66789C',  // Ecom Slate Secondary Text
        disabled: '#8C9EC5',   // Muted Blue-Gray (strikethrough prices, counters, disabled)
    },

    divider: '#D5DFE4',        // Ecom Card & Section Border

    error: {
        main: '#EF4444',
        light: '#FEE2E2',
        dark: '#B91C1C',
        contrastText: '#FFFFFF',
    },

    warning: {
        main: '#FD9636',
        light: '#FFF3E6',
        dark: '#E07B1B',
        contrastText: '#FFFFFF',
    },

    success: {
        main: '#10B981',
        light: '#D1FAE5',
        dark: '#047857',
        contrastText: '#FFFFFF',
    },

    info: {
        main: '#425A8B',
        light: '#F0F3F8',
        dark: '#2B3E66',
        contrastText: '#FFFFFF',
    },

    action: {
        hover: '#F0F3F8',
        selected: '#FFF3E6',
        disabledBackground: '#F0F3F8',
        disabled: '#8C9EC5',
    },
};

/**
 * Extended Ecom Marketplace design tokens for direct use in theme.ts and sx props.
 * Includes backwards-compatible alias keys so all existing modules work seamlessly.
 */
export const designTokens = {
    // Ecom Marketplace canonical tokens
    navyPrimary: '#425A8B',
    navyDark: '#2B3E66',
    slateSecondary: '#66789C',
    mutedBlue: '#8C9EC5',
    orangeAccent: '#FD9636',
    orangeDark: '#E07B1B',
    orangeLight: '#FFF3E6',
    cardBorder: '#D5DFE4',
    softDivider: '#E5E9F2',
    softWash: '#F0F3F8',

    // Mapped legacy tokens to Ecom Marketplace equivalents
    stoneCanvas: '#F8FAFC',
    pureWhite: '#FFFFFF',
    stoneBorder: '#D5DFE4',
    stoneMuted: '#8C9EC5',
    ashGray: '#8C9EC5',
    warmGray: '#66789C',
    inkBlack: '#425A8B',
    soot: '#2B3E66',
    skyWash: '#F0F3F8',
    cyanSignal: '#425A8B',
    cyanEdge: '#2B3E66',

    // Ecom clean shadows
    shadowMd: '0 10px 25px rgba(66, 90, 139, 0.08)',
    shadowSm: '0 4px 12px rgba(66, 90, 139, 0.05)',
    shadowSubtle: '0 1px 3px rgba(66, 90, 139, 0.04)',
    shadowXl: '0 16px 40px rgba(66, 90, 139, 0.14)',

    // Additional legacy aliases
    inkNavy: '#425A8B',
    signalBlue: '#425A8B',
    slateGray: '#66789C',
    mistGray: '#8C9EC5',
    cloud: '#F8FAFC',
    paper: '#FFFFFF',
    pebble: '#F0F3F8',
    hairline: '#D5DFE4',
    carbon: '#2B3E66',
    coralMagenta: '#FD9636',
    skyCyan: '#425A8B',
    deepCobalt: '#2B3E66',
    shadowBtn: '0 2px 6px rgba(66, 90, 139, 0.08)',
} as const;

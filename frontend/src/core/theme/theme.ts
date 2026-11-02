import { createTheme } from '@mui/material/styles';
import { palette, designTokens } from './palette';
import { typography } from './typography';

const {
    stoneCanvas,
    pureWhite,
    stoneBorder,
    stoneMuted,
    ashGray,
    warmGray,
    inkBlack,
    soot,
    skyWash,
    cyanSignal,
    cyanEdge,
    shadowMd,
    shadowSm,
    shadowSubtle,
    shadowXl,
} = designTokens;

const interFontFamily =
    "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";

/**
 * MUI Theme — Minimalist E-Commerce (Blue Accent)
 * 
 * Reglas de diseño:
 * - Redondeo máximo de 10px en toda la interfaz (eliminados los estilos de píldora 9999px).
 * - Botones y CTAs de compra con radio de 8px a 10px.
 * - Tarjetas de producto, contenedores e imágenes con bordes limpios (8px - 10px).
 * - Chips, inputs y badges estilizados para retail moderno (4px - 6px).
 */
export const theme = createTheme({
    palette,
    typography,

    spacing: 4,

    shape: {
        borderRadius: 8, // Base compacta dentro del límite de 10px
    },

    shadows: [
        'none',
        shadowSubtle, // elevation 1 — divisores sutiles, barras fijas
        shadowSm,     // elevation 2 — tarjetas de producto estándar
        shadowSm,     // elevation 3
        shadowSm,     // elevation 4
        shadowMd,     // elevation 5 — hover en tarjetas de producto
        shadowMd,     // elevation 6
        shadowMd,     // elevation 7
        shadowMd,     // elevation 8
        shadowMd,     // elevation 9
        shadowMd,     // elevation 10
        shadowMd,     // elevation 11
        shadowMd,     // elevation 12
        shadowMd,     // elevation 13
        shadowMd,     // elevation 14
        shadowMd,     // elevation 15
        shadowXl,     // elevation 16 — modales de carrito / checkout rápido
        shadowXl,     // elevation 17
        shadowXl,     // elevation 18
        shadowXl,     // elevation 19
        shadowXl,     // elevation 20
        shadowXl,     // elevation 21
        shadowXl,     // elevation 22
        shadowXl,     // elevation 23
        shadowXl,     // elevation 24
    ],

    components: {
        // ── Global baseline ──────────────────────────────────────────────────
        MuiCssBaseline: {
            styleOverrides: {
                '*': {
                    boxSizing: 'border-box',
                    margin: 0,
                    padding: 0,
                },
                html: {
                    MozOsxFontSmoothing: 'grayscale',
                    WebkitFontSmoothing: 'antialiased',
                    textRendering: 'optimizeLegibility',
                    scrollBehavior: 'smooth',
                },
                body: {
                    backgroundColor: stoneCanvas,
                    color: inkBlack,
                    fontFamily: interFontFamily,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${stoneMuted} ${stoneCanvas}`,
                },
                '::-webkit-scrollbar': { width: '6px', height: '6px' },
                '::-webkit-scrollbar-track': { background: stoneCanvas },
                '::-webkit-scrollbar-thumb': { background: stoneMuted, borderRadius: '4px' },
                '@import': `url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap')`,
            },
        },

        // ── Buttons (Máximo 8px-10px de redondeo, estilo e-commerce) ────────
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    transition: 'all 0.15s ease-in-out',
                },
                // Primary CTA (Add to cart, Checkout)
                contained: {
                    backgroundColor: cyanSignal,
                    border: `1px solid ${cyanSignal}`,
                    color: pureWhite,
                    fontWeight: 600,
                    boxShadow: shadowSubtle,
                    '&:hover': {
                        backgroundColor: cyanEdge,
                        borderColor: cyanEdge,
                        boxShadow: shadowSm,
                    },
                    '&:active': {
                        backgroundColor: cyanEdge,
                        boxShadow: 'none',
                    },
                    '&.Mui-disabled': {
                        backgroundColor: stoneCanvas,
                        borderColor: stoneBorder,
                        color: ashGray,
                    },
                },
                // Secondary Button (Dark style checkout / actions)
                colorSecondary: {
                    '&.MuiButton-contained': {
                        backgroundColor: soot,
                        border: `1px solid ${soot}`,
                        color: pureWhite,
                        '&:hover': {
                            backgroundColor: inkBlack,
                            borderColor: inkBlack,
                        },
                    },
                },
                // Outlined Button (Filtros, ver detalles)
                outlined: {
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    border: `1px solid ${stoneBorder}`,
                    color: inkBlack,
                    fontWeight: 500,
                    padding: '8px 16px',
                    '&:hover': {
                        borderColor: stoneMuted,
                        backgroundColor: pureWhite,
                        color: inkBlack,
                    },
                    '&.Mui-disabled': {
                        borderColor: stoneBorder,
                        color: ashGray,
                    },
                },
                // Navigation / Text Links
                text: {
                    borderRadius: 6,
                    color: warmGray,
                    fontWeight: 500,
                    padding: '6px 12px',
                    minHeight: 32,
                    '&:hover': {
                        backgroundColor: stoneBorder,
                        color: inkBlack,
                    },
                },
                sizeLarge: {
                    borderRadius: 10,
                    padding: '12px 24px',
                    fontSize: '0.9375rem',
                },
                sizeSmall: {
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                },
            },
        },

        // ── Inputs (Búsqueda, checkout y formularios: 8px) ──
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        backgroundColor: pureWhite,
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        color: inkBlack,
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        '& fieldset': {
                            borderColor: stoneBorder,
                            borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                            borderColor: stoneMuted,
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: cyanSignal,
                            borderWidth: '1.5px',
                        },
                        '&.Mui-error fieldset': {
                            borderColor: '#ef4444',
                        },
                    },
                    '& .MuiInputBase-input': {
                        padding: '10px 14px',
                        '&::placeholder': {
                            color: warmGray,
                            opacity: 1,
                        },
                    },
                    '& .MuiInputLabel-root': {
                        color: warmGray,
                        fontSize: '0.875rem',
                        '&.Mui-focused': {
                            color: cyanSignal,
                        },
                        '&.Mui-error': {
                            color: '#ef4444',
                        },
                    },
                    '& .MuiFormHelperText-root': {
                        fontSize: '0.75rem',
                        marginTop: '4px',
                        color: ashGray,
                        '&.Mui-error': {
                            color: '#ef4444',
                        },
                    },
                },
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: pureWhite,
                    color: inkBlack,
                    fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: stoneBorder,
                        borderWidth: '1px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: stoneMuted,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: cyanSignal,
                        borderWidth: '1.5px',
                    },
                },
                input: {
                    padding: '10px 14px',
                    '&::placeholder': {
                        color: warmGray,
                        opacity: 1,
                    },
                },
            },
        },

        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontFamily: interFontFamily,
                },
            },
        },

        // ── Tarjetas de Producto (Ecom Card: 1px solid #D5DFE4, hover #425A8B) ──
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: pureWhite,
                    borderRadius: 8,
                    border: `1px solid ${stoneBorder}`,
                    boxShadow: 'none',
                    backgroundImage: 'none',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                        borderColor: '#425A8B',
                        boxShadow: '0 10px 25px rgba(66, 90, 139, 0.08)',
                    },
                },
            },
        },

        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '16px',
                    '&:last-child': {
                        paddingBottom: '16px',
                    },
                },
            },
        },

        // ── Paper ────────────────────────────────────────────────────────────
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: pureWhite,
                    backgroundImage: 'none',
                    borderRadius: 10,
                    border: `1px solid ${stoneBorder}`,
                },
                elevation0: { boxShadow: 'none', border: 'none' },
                elevation1: { boxShadow: shadowSubtle },
                elevation2: { boxShadow: shadowSm },
                elevation3: { boxShadow: shadowMd },
                elevation4: { boxShadow: shadowXl },
            },
        },

        // ── Header / Navbar ──────────────────────────────────────────────────
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: pureWhite,
                    boxShadow: 'none',
                    border: 'none',
                    borderBottom: `1px solid ${stoneBorder}`,
                    color: inkBlack,
                    backgroundImage: 'none',
                    minHeight: 64,
                },
            },
        },

        MuiToolbar: {
            styleOverrides: {
                root: {
                    minHeight: '64px !important',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                },
            },
        },

        // ── Drawer (Cart Drawer / Filtros Móviles) ───────────────────────────
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: pureWhite,
                    border: 'none',
                    borderLeft: `1px solid ${stoneBorder}`,
                    boxShadow: shadowXl,
                    borderRadius: 0,
                },
            },
        },

        // ── List / Navigation items ──────────────────────────────────────────
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    margin: '2px 8px',
                    color: warmGray,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        backgroundColor: stoneCanvas,
                        color: inkBlack,
                    },
                    '&.Mui-selected': {
                        backgroundColor: skyWash,
                        color: inkBlack,
                        fontWeight: 600,
                        '& .MuiListItemIcon-root': {
                            color: cyanSignal,
                        },
                        '&:hover': {
                            backgroundColor: skyWash,
                        },
                    },
                },
            },
        },

        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: ashGray,
                    minWidth: 36,
                    transition: 'color 0.15s ease',
                },
            },
        },

        MuiListItemText: {
            styleOverrides: {
                primary: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                },
            },
        },

        // ── Chips / Tags de Producto (Descuentos, Stock, Tallas: 6px) ────────
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontFamily: interFontFamily,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    height: 24,
                    border: `1px solid ${stoneBorder}`,
                    backgroundColor: pureWhite,
                    color: inkBlack,
                    '&.MuiChip-colorPrimary': {
                        backgroundColor: skyWash,
                        borderColor: skyWash,
                        color: cyanEdge,
                    },
                    '&.MuiChip-colorSecondary': {
                        backgroundColor: soot,
                        borderColor: soot,
                        color: pureWhite,
                    },
                },
                label: {
                    padding: '0 8px',
                },
            },
        },

        // ── Alerts (Notificaciones de compra / Stock) ────────────────────────
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    border: `1px solid ${stoneBorder}`,
                },
            },
        },

        // ── Menu (Dropdowns de Categorías / Carrito flotante) ────────────────
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 10,
                    border: `1px solid ${stoneBorder}`,
                    boxShadow: shadowMd,
                    backgroundImage: 'none',
                },
            },
        },

        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    color: inkBlack,
                    padding: '8px 16px',
                    borderRadius: 6,
                    margin: '2px 4px',
                    '&:hover': {
                        backgroundColor: stoneCanvas,
                    },
                    '&.Mui-selected': {
                        backgroundColor: skyWash,
                        color: inkBlack,
                        fontWeight: 600,
                        '&:hover': {
                            backgroundColor: skyWash,
                        },
                    },
                },
            },
        },

        // ── Divider ──────────────────────────────────────────────────────────
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: stoneBorder,
                },
            },
        },

        // ── Avatar ───────────────────────────────────────────────────────────
        MuiAvatar: {
            styleOverrides: {
                root: {
                    backgroundColor: skyWash,
                    color: cyanEdge,
                    borderRadius: 8,
                    border: `1px solid ${stoneBorder}`,
                    fontFamily: interFontFamily,
                    fontWeight: 600,
                },
            },
        },

        // ── Tooltip ──────────────────────────────────────────────────────────
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: soot,
                    color: pureWhite,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: 6,
                    padding: '6px 10px',
                },
                arrow: {
                    color: soot,
                },
            },
        },

        // ── Typography ───────────────────────────────────────────────────────
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: 'inherit',
                },
            },
        },

        // ── Table (Historial de órdenes, carrito en tabla) ────────────────────
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-root': {
                        backgroundColor: stoneCanvas,
                        color: warmGray,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.025em',
                        borderBottom: `1px solid ${stoneBorder}`,
                    },
                },
            },
        },

        MuiTableBody: {
            styleOverrides: {
                root: {
                    '& .MuiTableRow-root': {
                        '&:hover': {
                            backgroundColor: stoneCanvas,
                        },
                    },
                    '& .MuiTableCell-root': {
                        color: inkBlack,
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        borderBottom: `1px solid ${stoneBorder}`,
                    },
                },
            },
        },

        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '14px 16px',
                    fontFamily: interFontFamily,
                },
            },
        },

        // ── Container ────────────────────────────────────────────────────────
        MuiContainer: {
            styleOverrides: {
                maxWidthLg: {
                    maxWidth: '1280px !important',
                },
            },
        },

        // ── Circular Progress ─────────────────────────────────────────────────
        MuiCircularProgress: {
            defaultProps: {
                color: 'primary',
            },
        },

        // ── Link ─────────────────────────────────────────────────────────────
        MuiLink: {
            styleOverrides: {
                root: {
                    color: cyanSignal,
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                        textDecoration: 'underline',
                        color: cyanEdge,
                    },
                },
            },
        },

        // ── Breadcrumbs ───────────────────────────────────────────────────────
        MuiBreadcrumbs: {
            styleOverrides: {
                root: {
                    fontSize: '0.8125rem',
                    color: warmGray,
                },
            },
        },

        // ── Badge (Contador de carrito) ──────────────────────────────────────
        MuiBadge: {
            styleOverrides: {
                badge: {
                    fontFamily: interFontFamily,
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    backgroundColor: cyanSignal,
                    color: pureWhite,
                },
            },
        },

        // ── Select ────────────────────────────────────────────────────────────
        MuiSelect: {
            styleOverrides: {
                select: {
                    backgroundColor: pureWhite,
                    color: inkBlack,
                    fontWeight: 400,
                    fontSize: '0.875rem',
                    borderRadius: 8,
                },
            },
        },

        // ── Switch ────────────────────────────────────────────────────────────
        MuiSwitch: {
            styleOverrides: {
                switchBase: {
                    '&.Mui-checked': {
                        color: cyanSignal,
                        '+ .MuiSwitch-track': {
                            backgroundColor: cyanSignal,
                        },
                    },
                },
            },
        },

        // ── Checkbox (Filtros de catálogo — Ecom Orange #FD9636) ─────────────
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    color: '#D5DFE4',
                    borderRadius: 4,
                    '&.Mui-checked': {
                        color: '#FD9636',
                    },
                },
            },
        },

        // ── Slider (Filtro de precio — Ecom Orange #FD9636) ──────────────────
        MuiSlider: {
            styleOverrides: {
                root: {
                    color: '#FD9636',
                    height: 6,
                },
                thumb: {
                    height: 18,
                    width: 18,
                    backgroundColor: '#FD9636',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 6px rgba(253, 150, 54, 0.35)',
                    '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 6px rgba(253, 150, 54, 0.16)',
                    },
                },
                track: {
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#FD9636',
                    border: 'none',
                },
                rail: {
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#D5DFE4',
                    opacity: 1,
                },
            },
        },

        // ── Radio ─────────────────────────────────────────────────────────────
        MuiRadio: {
            styleOverrides: {
                root: {
                    color: stoneMuted,
                    '&.Mui-checked': {
                        color: cyanSignal,
                    },
                },
            },
        },

        // ── Tabs (Categorías de catálogo / Fichas de producto) ───────────────
        MuiTabs: {
            styleOverrides: {
                root: {
                    borderBottom: `1px solid ${stoneBorder}`,
                },
                indicator: {
                    backgroundColor: cyanSignal,
                    height: 2,
                    borderRadius: '2px 2px 0 0',
                },
            },
        },

        MuiTab: {
            styleOverrides: {
                root: {
                    fontFamily: interFontFamily,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    color: warmGray,
                    letterSpacing: '0.01em',
                    padding: '8px 16px',
                    borderRadius: 8,
                    '&.Mui-selected': {
                        color: cyanSignal,
                        fontWeight: 600,
                    },
                },
            },
        },

        // ── Pagination (Catálogo de productos: 8px) ──────────────────────────
        MuiPaginationItem: {
            styleOverrides: {
                root: {
                    fontFamily: interFontFamily,
                    fontWeight: 500,
                    color: inkBlack,
                    borderRadius: 8,
                    border: `1px solid ${stoneBorder}`,
                    '&.Mui-selected': {
                        backgroundColor: cyanSignal,
                        borderColor: cyanSignal,
                        color: pureWhite,
                        '&:hover': {
                            backgroundColor: cyanEdge,
                        },
                    },
                },
            },
        },

        // ── Skeleton (Cards cargando) ────────────────────────────────────────
        MuiSkeleton: {
            styleOverrides: {
                root: {
                    backgroundColor: stoneBorder,
                    borderRadius: 8,
                },
            },
        },

        // ── Dialog / Quick View Modal ────────────────────────────────────────
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 10,
                    boxShadow: shadowXl,
                    border: `1px solid ${stoneBorder}`,
                },
            },
        },
    },
});
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stack,
    TextField,
    MenuItem,
    Chip,
    Switch,
    IconButton,
    Tooltip,
    Pagination,
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    InputAdornment,
} from '@mui/material';
import {
    AddRounded,
    EditOutlined,
    Inventory2Outlined,
    StorefrontOutlined,
    SearchRounded,
    CategoryOutlined,
    LayersOutlined,
    OpenInNewRounded,
    TuneRounded,
} from '@mui/icons-material';
import {
    getAdminCategories,
    getAdminProducts,
    toggleAdminProductStatus,
    createAdminCategory,
} from '../../infrastructure/services/products-admin.service';
import type {
    AdminCategoryDto,
    AdminProductDto,
    AdminProductVariantDto,
} from '../../domain/dto/product-admin.dto';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { StockAdjustDialog } from '../components/StockAdjustDialog';
import { formatMoney } from '../../../../core/utils/formatMoney';

export const ProductsListPage: React.FC = () => {
    const navigate = useNavigate();

    const [categories, setCategories] = useState<AdminCategoryDto[]>([]);
    const [products, setProducts] = useState<AdminProductDto[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [searchInput, setSearchInput] = useState<string>('');
    const [q, setQ] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // Dialog States
    const [productFormOpen, setProductFormOpen] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<AdminProductDto | null>(null);

    const [stockDialogTarget, setStockDialogTarget] = useState<{
        product: AdminProductDto;
        variant: AdminProductVariantDto;
    } | null>(null);

    // Quick Category Modal
    const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
    const [newCatName, setNewCatName] = useState<string>('');
    const [newCatDesc, setNewCatDesc] = useState<string>('');
    const [creatingCategory, setCreatingCategory] = useState<boolean>(false);

    // Snackbar feedback
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const loadCategories = useCallback(async () => {
        try {
            const list = await getAdminCategories();
            setCategories(list);
        } catch {
            setCategories([]);
        }
    }, []);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminProducts({
                page,
                limit,
                q: q || undefined,
                categoryId: selectedCategoryId || undefined,
            });
            setProducts(res.data);
            setTotal(res.meta.total);
        } catch {
            setProducts([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, q, selectedCategoryId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Computed KPI Metrics
    const metrics = useMemo(() => {
        const totalVariants = products.reduce(
            (acc, p) => acc + (p.variants?.length || p.variantsCount || 0),
            0,
        );
        const totalAvailableStock = products.reduce(
            (acc, p) => acc + (p.totalStockAvailable || 0),
            0,
        );
        return {
            totalProducts: total || products.length,
            totalVariants,
            activeCategories: categories.length,
            totalAvailableStock,
        };
    }, [products, total, categories]);

    const handleOpenCreate = () => {
        setEditingProduct(null);
        setProductFormOpen(true);
    };

    const handleOpenEdit = (prod: AdminProductDto) => {
        setEditingProduct(prod);
        setProductFormOpen(true);
    };

    const handleToggleStatus = async (prod: AdminProductDto) => {
        const nextStatus = !prod.isActive;
        try {
            await toggleAdminProductStatus(prod.id, nextStatus);
            setSnackbar({
                open: true,
                message: `Producto "${prod.name}" ${
                    nextStatus ? 'activado' : 'desactivado'
                } correctamente`,
                severity: 'success',
            });
            loadProducts();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setSnackbar({
                open: true,
                message:
                    axiosErr.response?.data?.message ||
                    'No se pudo actualizar el estado del producto',
                severity: 'error',
            });
        }
    };

    const handleCreateCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        setCreatingCategory(true);
        try {
            const created = await createAdminCategory({
                name: newCatName.trim(),
                description: newCatDesc.trim() || null,
            });
            setCategories((prev) => [...prev, created]);
            setNewCatName('');
            setNewCatDesc('');
            setCategoryModalOpen(false);
            setSnackbar({
                open: true,
                message: `Categoría "${created.name}" creada exitosamente`,
                severity: 'success',
            });
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setSnackbar({
                open: true,
                message:
                    axiosErr.response?.data?.message || 'Error al crear la categoría',
                severity: 'error',
            });
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setQ(searchInput.trim());
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <Box sx={{ width: '100%', pb: 6 }}>
            {/* Header Panel */}
            <Box
                sx={{
                    p: 3,
                    mb: 3,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2.5,
                }}
            >
                <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                        <Chip
                            label="Módulo Administrativo · Inventario & Catálogo"
                            size="small"
                            sx={{
                                backgroundColor: '#FFF3E6',
                                color: '#FD9636',
                                fontWeight: 700,
                                fontSize: '11px',
                                border: '1px solid #FD9636',
                            }}
                        />
                    </Stack>
                    <Typography
                        component="h1"
                        sx={{
                            fontSize: { xs: '22px', sm: '26px' },
                            fontWeight: 800,
                            color: '#425A8B',
                            lineHeight: 1.25,
                        }}
                    >
                        Gestión de Productos y Variantes
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: '#66789C', mt: 0.5 }}>
                        Sube productos al catálogo Ecom, administra sus variantes (Color, Style, Size, SKU) y controla el Kardex en tiempo real.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        onClick={() => navigate('/shop')}
                        startIcon={<StorefrontOutlined sx={{ fontSize: 18 }} />}
                        sx={{
                            borderRadius: '6px',
                            border: '1px solid #D5DFE4',
                            color: '#425A8B',
                            fontWeight: 600,
                            fontSize: '13px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#F0F3F8',
                                borderColor: '#425A8B',
                            },
                        }}
                    >
                        Ver Tienda Pública
                    </Button>

                    <Button
                        onClick={() => setCategoryModalOpen(true)}
                        startIcon={<CategoryOutlined sx={{ fontSize: 18 }} />}
                        sx={{
                            borderRadius: '6px',
                            border: '1px solid #425A8B',
                            color: '#425A8B',
                            fontWeight: 700,
                            fontSize: '13px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#F0F3F8',
                            },
                        }}
                    >
                        + Nueva Categoría
                    </Button>

                    <Button
                        onClick={handleOpenCreate}
                        startIcon={<AddRounded sx={{ fontSize: 20 }} />}
                        sx={{
                            borderRadius: '6px',
                            backgroundColor: '#FD9636',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            px: 2.5,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#E07B1B',
                            },
                        }}
                    >
                        + Nuevo Producto con Variantes
                    </Button>
                </Stack>
            </Box>

            {/* KPI Summary Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                }}
            >
                {[
                    {
                        label: 'Total Productos',
                        value: metrics.totalProducts,
                        icon: <Inventory2Outlined sx={{ color: '#425A8B' }} />,
                        bg: '#F0F3F8',
                    },
                    {
                        label: 'Variantes en Página',
                        value: metrics.totalVariants,
                        icon: <LayersOutlined sx={{ color: '#FD9636' }} />,
                        bg: '#FFF3E6',
                    },
                    {
                        label: 'Categorías Activas',
                        value: metrics.activeCategories,
                        icon: <CategoryOutlined sx={{ color: '#425A8B' }} />,
                        bg: '#F0F3F8',
                    },
                    {
                        label: 'Stock Disponible (Página)',
                        value: `${metrics.totalAvailableStock} uds.`,
                        icon: <TuneRounded sx={{ color: '#047857' }} />,
                        bg: '#D1FAE5',
                    },
                ].map((kpi, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            p: 2.25,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D5DFE4',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontSize: '12px', color: '#8C9EC5', fontWeight: 600 }}>
                                {kpi.label}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    color: '#425A8B',
                                    mt: 0.25,
                                }}
                            >
                                {kpi.value}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '8px',
                                backgroundColor: kpi.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {kpi.icon}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Filter & Search Bar */}
            <Box
                sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSearchSubmit}
                    sx={{ flex: 1, display: 'flex', gap: 1 }}
                >
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Buscar producto por nombre, descripción o SKU de variante..."
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            if (!e.target.value && q) {
                                setQ('');
                                setPage(1);
                            }
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchRounded sx={{ fontSize: 18, color: '#8C9EC5' }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <Button
                        type="submit"
                        sx={{
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            px: 2.5,
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': { backgroundColor: '#2B3E66' },
                        }}
                    >
                        Buscar
                    </Button>
                </Box>

                <TextField
                    select
                    size="small"
                    label="Filtrar por Categoría"
                    value={selectedCategoryId}
                    onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        setPage(1);
                    }}
                    sx={{ minWidth: 230 }}
                >
                    <MenuItem value="">Todas las categorías</MenuItem>
                    {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                            {cat.name}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            {/* Products Admin List */}
            {loading ? (
                <Stack spacing={2}>
                    {[1, 2, 3].map((n) => (
                        <Skeleton
                            key={n}
                            variant="rectangular"
                            height={180}
                            sx={{ borderRadius: '8px' }}
                        />
                    ))}
                </Stack>
            ) : products.length === 0 ? (
                <Box
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D5DFE4',
                        borderRadius: '10px',
                    }}
                >
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#425A8B', mb: 1 }}>
                        No hay productos registrados con este criterio
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: '#66789C', mb: 2.5 }}>
                        Haz clic en "+ Nuevo Producto con Variantes" para subir un producto al catálogo.
                    </Typography>
                    <Button
                        onClick={handleOpenCreate}
                        startIcon={<AddRounded />}
                        sx={{
                            backgroundColor: '#FD9636',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            px: 3,
                            py: 1,
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': { backgroundColor: '#E07B1B' },
                        }}
                    >
                        + Subir Primer Producto
                    </Button>
                </Box>
            ) : (
                <Stack spacing={2.5}>
                    {products.map((product) => (
                        <Box
                            key={product.id}
                            sx={{
                                p: 2.5,
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #D5DFE4',
                                borderRadius: '10px',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': {
                                    borderColor: '#425A8B',
                                    boxShadow: '0 8px 20px rgba(66, 90, 139, 0.06)',
                                },
                            }}
                        >
                            {/* Top Row: Product Main Info + Actions */}
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={2.5}
                                sx={{
                                    justifyContent: 'space-between',
                                    alignItems: { xs: 'flex-start', md: 'center' },
                                    pb: 2,
                                    borderBottom: '1px solid #E5E9F2',
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
                                >
                                    {/* Product Thumbnail */}
                                    <Box
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: '8px',
                                            border: '1px solid #D5DFE4',
                                            backgroundColor: '#FFFFFF',
                                            p: 0.75,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={
                                                product.mainImageUrl ||
                                                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80'
                                            }
                                            alt={product.name}
                                            sx={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}
                                        >
                                            <Chip
                                                label={product.categoryName || 'Tecnología'}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    backgroundColor: '#F0F3F8',
                                                    color: '#425A8B',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                }}
                                            />
                                            <Chip
                                                label={product.isActive ? 'Activo' : 'Inactivo'}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    backgroundColor: product.isActive
                                                        ? '#D1FAE5'
                                                        : '#FEE2E2',
                                                    color: product.isActive
                                                        ? '#047857'
                                                        : '#B91C1C',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    border: 'none',
                                                }}
                                            />
                                            <Typography sx={{ fontSize: '12px', color: '#8C9EC5' }}>
                                                • {product.variants?.length || product.variantsCount || 1} variantes
                                            </Typography>
                                        </Stack>

                                        <Typography
                                            sx={{
                                                fontSize: '16.5px',
                                                fontWeight: 800,
                                                color: '#425A8B',
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {product.name}
                                        </Typography>

                                        {product.description && (
                                            <Typography
                                                noWrap
                                                sx={{
                                                    fontSize: '12.5px',
                                                    color: '#66789C',
                                                    mt: 0.35,
                                                }}
                                            >
                                                {product.description.replace(/\r?\n/g, ' • ')}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>

                                {/* Product Actions */}
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}
                                >
                                    <Tooltip title="Activar / Desactivar en tienda">
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <Switch
                                                size="small"
                                                checked={product.isActive}
                                                onChange={() => handleToggleStatus(product)}
                                            />
                                        </Stack>
                                    </Tooltip>

                                    <Tooltip title="Ver página de detalle en la tienda">
                                        <IconButton
                                            size="small"
                                            onClick={() => navigate(`/shop/product/${product.id}`)}
                                            sx={{
                                                border: '1px solid #D5DFE4',
                                                borderRadius: '6px',
                                                color: '#425A8B',
                                            }}
                                        >
                                            <OpenInNewRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    <Button
                                        size="small"
                                        startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                                        onClick={() => handleOpenEdit(product)}
                                        sx={{
                                            borderRadius: '6px',
                                            border: '1px solid #425A8B',
                                            color: '#425A8B',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            px: 1.75,
                                            py: 0.65,
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#425A8B',
                                                color: '#FFFFFF',
                                            },
                                        }}
                                    >
                                        Editar Producto y Variantes
                                    </Button>
                                </Stack>
                            </Stack>

                            {/* Bottom Row: Variants Table / Grid */}
                            <Box sx={{ mt: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        color: '#8C9EC5',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        mb: 1,
                                    }}
                                >
                                    Variantes Configuradas (SKU · Atributos · Precio GTQ · Stock)
                                </Typography>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            md: 'repeat(2, 1fr)',
                                        },
                                        gap: 1.25,
                                    }}
                                >
                                    {(product.variants || []).map((variant) => {
                                        const attrEntries = Object.entries(
                                            variant.attributes || {},
                                        );
                                        return (
                                            <Box
                                                key={variant.id || variant.sku}
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F8FAFC',
                                                    border: '1px solid #E5E9F2',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1.5,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        sx={{ alignItems: 'center', mb: 0.5 }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                fontSize: '12.5px',
                                                                fontWeight: 700,
                                                                color: '#425A8B',
                                                            }}
                                                        >
                                                            {variant.sku}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                fontSize: '13.5px',
                                                                fontWeight: 800,
                                                                color: '#FD9636',
                                                            }}
                                                        >
                                                            {formatMoney(variant.price)}
                                                        </Typography>
                                                    </Stack>

                                                    {/* Attribute Chips */}
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        sx={{ flexWrap: 'wrap', gap: 0.5 }}
                                                    >
                                                        {attrEntries.length > 0 ? (
                                                            attrEntries.map(([k, v]) => (
                                                                <Chip
                                                                    key={k}
                                                                    label={`${k}: ${v}`}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        backgroundColor: '#FFFFFF',
                                                                        color: '#425A8B',
                                                                        border: '1px solid #D5DFE4',
                                                                    }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '11px',
                                                                    color: '#8C9EC5',
                                                                }}
                                                            >
                                                                Variante estándar
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </Box>

                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    sx={{ alignItems: 'center' }}
                                                >
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography
                                                            sx={{
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                color:
                                                                    variant.stockAvailable > 0
                                                                        ? '#047857'
                                                                        : '#B91C1C',
                                                            }}
                                                        >
                                                            Disp: {variant.stockAvailable}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                fontSize: '10.5px',
                                                                color: '#8C9EC5',
                                                            }}
                                                        >
                                                            Fís: {variant.stockPhysical} | Res:{' '}
                                                            {variant.stockReserved}
                                                        </Typography>
                                                    </Box>

                                                    <Button
                                                        size="small"
                                                        onClick={() =>
                                                            setStockDialogTarget({
                                                                product,
                                                                variant,
                                                            })
                                                        }
                                                        sx={{
                                                            minWidth: 0,
                                                            px: 1.25,
                                                            py: 0.4,
                                                            fontSize: '11.5px',
                                                            fontWeight: 700,
                                                            borderRadius: '5px',
                                                            backgroundColor: '#FFF3E6',
                                                            color: '#FD9636',
                                                            border: '1px solid #FD9636',
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                backgroundColor: '#FD9636',
                                                                color: '#FFFFFF',
                                                            },
                                                        }}
                                                    >
                                                        Kardex
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    ))}

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, nextPage) => setPage(nextPage)}
                                color="primary"
                            />
                        </Box>
                    )}
                </Stack>
            )}

            {/* Create / Edit Product + Variants Modal */}
            <ProductFormDialog
                open={productFormOpen}
                onClose={() => setProductFormOpen(false)}
                onSuccess={() => {
                    setSnackbar({
                        open: true,
                        message: editingProduct
                            ? 'Producto y variantes actualizados exitosamente'
                            : 'Producto con variantes publicado exitosamente en el catálogo',
                        severity: 'success',
                    });
                    loadProducts();
                    loadCategories();
                }}
                categories={categories}
                onCategoryCreated={(newCat) =>
                    setCategories((prev) => [...prev, newCat])
                }
                initialData={editingProduct}
            />

            {/* Stock Adjustment (Kardex) Modal */}
            <StockAdjustDialog
                open={Boolean(stockDialogTarget)}
                onClose={() => setStockDialogTarget(null)}
                onSuccess={() => {
                    setSnackbar({
                        open: true,
                        message: 'Movimiento de stock registrado en Kardex correctamente',
                        severity: 'success',
                    });
                    loadProducts();
                }}
                product={stockDialogTarget?.product || null}
                variant={stockDialogTarget?.variant || null}
            />

            {/* Standalone Create Category Modal */}
            <Dialog
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#425A8B' }}>
                    Crear Nueva Categoría
                </DialogTitle>
                <Box component="form" onSubmit={handleCreateCategorySubmit}>
                    <DialogContent>
                        <Stack spacing={2}>
                            <TextField
                                label="Nombre de Categoría *"
                                placeholder="Ej. Computers & Laptop"
                                size="small"
                                fullWidth
                                required
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                            />
                            <TextField
                                label="Descripción"
                                placeholder="Equipos portátiles, monitores y estaciones de trabajo"
                                size="small"
                                multiline
                                rows={2}
                                fullWidth
                                value={newCatDesc}
                                onChange={(e) => setNewCatDesc(e.target.value)}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => setCategoryModalOpen(false)}
                            sx={{ color: '#66789C', textTransform: 'none' }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={creatingCategory || !newCatName.trim()}
                            sx={{
                                backgroundColor: '#425A8B',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2.5,
                                borderRadius: '6px',
                                '&:hover': { backgroundColor: '#2B3E66' },
                            }}
                        >
                            {creatingCategory ? 'Guardando...' : 'Crear Categoría'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3500}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    sx={{ borderRadius: '8px', fontWeight: 600 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProductsListPage;

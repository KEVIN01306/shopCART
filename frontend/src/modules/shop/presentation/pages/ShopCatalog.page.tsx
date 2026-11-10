import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stack,
    Select,
    MenuItem,
    IconButton,
    Pagination,
    Skeleton,
    Drawer,
    Snackbar,
    Alert,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    TuneRounded,
    GridViewRounded,
    ViewListRounded,
    ChevronRightRounded,
    SearchRounded,
    Inventory2Outlined,
} from '@mui/icons-material';
import {
    getCatalogCategories,
    getCatalogProducts,
} from '../../infrastructure/services/shop.service';
import type {
    ShopCategory,
    ShopProduct,
    CatalogSortBy,
} from '../../domain/dto/shop.dto';
import { ProductCard } from '../components/ProductCard.component';
import {
    ShopFiltersSidebar,
    type PriceBracket,
} from '../components/ShopFiltersSidebar.component';
import { useCartStore } from '../../../../core/store/cartStore';
import { useAuthStore } from '../../../../core/store/authStore';
import { hasSomeRole } from '../../../../core/utils/permissions';

export const ShopCatalogPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const canManageProducts = hasSomeRole(user, ['Administrador', 'Operador']);
    const addItem = useCartStore((state) => state.addItem);

    // Filter & Query States
    const initialQ = searchParams.get('q') || '';
    const initialCat = searchParams.get('categoryId') || '';

    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(16);
    const [searchInput, setSearchInput] = useState<string>(initialQ);
    const [q, setQ] = useState<string>(initialQ);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCat);
    const [sortBy, setSortBy] = useState<CatalogSortBy>('latest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Price & Availability Filter States
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
    const [committedPriceRange, setCommittedPriceRange] = useState<[number, number]>([0, 15000]);
    const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
    const [inStockOnly, setInStockOnly] = useState<boolean>(false);

    // Mobile Filters Drawer
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

    // Toast notification
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'info';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Sync URL search params when navbar search changes
    useEffect(() => {
        const urlQ = searchParams.get('q') ?? '';
        const urlCat = searchParams.get('categoryId') ?? '';
        if (urlQ !== q) {
            setSearchInput(urlQ);
            setQ(urlQ);
            setPage(1);
        }
        if (urlCat && urlCat !== selectedCategoryId) {
            setSelectedCategoryId(urlCat);
            setPage(1);
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load categories once
    useEffect(() => {
        let active = true;
        getCatalogCategories()
            .then((cats) => {
                if (active) setCategories(cats);
            })
            .catch(() => {
                if (active) setCategories([]);
            });
        return () => {
            active = false;
        };
    }, []);

    // Load catalog products whenever filters change
    const fetchCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const minPriceParam = committedPriceRange[0] > 0 ? committedPriceRange[0] : undefined;
            const maxPriceParam =
                committedPriceRange[1] < 15000 ? committedPriceRange[1] : undefined;

            const result = await getCatalogProducts({
                page,
                limit,
                q: q || undefined,
                categoryId: selectedCategoryId || undefined,
                minPrice: minPriceParam,
                maxPrice: maxPriceParam,
                inStock: inStockOnly ? true : undefined,
                sortBy,
            });
            setProducts(result.data);
            setTotal(result.meta.total);
        } catch {
            setProducts([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, q, selectedCategoryId, committedPriceRange, inStockOnly, sortBy]);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    const handleSelectCategory = (catId: string) => {
        setSelectedCategoryId(catId);
        setPage(1);
        const nextParams = new URLSearchParams(searchParams);
        if (catId) {
            nextParams.set('categoryId', catId);
        } else {
            nextParams.delete('categoryId');
        }
        setSearchParams(nextParams, { replace: true });
    };

    const handleSelectBracket = (bracket: PriceBracket | null) => {
        if (!bracket) {
            setSelectedBracketId(null);
            setPriceRange([0, 15000]);
            setCommittedPriceRange([0, 15000]);
        } else {
            setSelectedBracketId(bracket.id);
            const nextRange: [number, number] = [bracket.min, bracket.max ?? 15000];
            setPriceRange(nextRange);
            setCommittedPriceRange(nextRange);
        }
        setPage(1);
    };

    const handleResetFilters = () => {
        setSelectedCategoryId('');
        setSearchInput('');
        setQ('');
        setPriceRange([0, 15000]);
        setCommittedPriceRange([0, 15000]);
        setSelectedBracketId(null);
        setInStockOnly(false);
        setSortBy('latest');
        setPage(1);
        setSearchParams({}, { replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setQ(searchInput.trim());
        const nextParams = new URLSearchParams(searchParams);
        if (searchInput.trim()) {
            nextParams.set('q', searchInput.trim());
        } else {
            nextParams.delete('q');
        }
        setSearchParams(nextParams, { replace: true });
    };

    const handleAddToCartFromCard = (product: ShopProduct) => {
        const defaultVariant =
            product.variants?.find((v) => v.isActive && v.stockAvailable > 0) ||
            product.variants?.[0];

        if (!defaultVariant) {
            navigate(`/shop/product/${product.id}`);
            return;
        }

        if (product.variants && product.variants.length > 1) {
            // Add default variant to cart AND inform user they can also inspect options
            addItem({
                variantId: defaultVariant.id,
                productId: product.id,
                productName: product.name,
                sku: defaultVariant.sku,
                attributes: defaultVariant.attributes || {},
                price: defaultVariant.price,
                quantity: 1,
                imageUrl: product.mainImageUrl,
            });
            setSnackbar({
                open: true,
                message: `"${product.name}" (${defaultVariant.sku}) agregado al carrito`,
                severity: 'success',
            });
            return;
        }

        addItem({
            variantId: defaultVariant.id,
            productId: product.id,
            productName: product.name,
            sku: defaultVariant.sku,
            attributes: defaultVariant.attributes || {},
            price: defaultVariant.price,
            quantity: 1,
            imageUrl: product.mainImageUrl,
        });

        setSnackbar({
            open: true,
            message: `"${product.name}" agregado al carrito`,
            severity: 'success',
        });
    };

    const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <Box sx={{ width: '100%', pb: 6 }}>
            {/* Top Ecom Breadcrumb Bar (#F0F3F8) */}
            <Box
                sx={{
                    backgroundColor: '#F0F3F8',
                    borderRadius: '8px',
                    px: { xs: 2, md: 3 },
                    py: 1.5,
                    mb: 3,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                }}
            >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography
                        onClick={() => handleResetFilters()}
                        sx={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#425A8B',
                            cursor: 'pointer',
                            '&:hover': { color: '#FD9636' },
                        }}
                    >
                        Home
                    </Typography>
                    <ChevronRightRounded sx={{ fontSize: 16, color: '#8C9EC5' }} />
                    <Typography
                        onClick={() => handleSelectCategory('')}
                        sx={{
                            fontSize: '13px',
                            fontWeight: selectedCategory ? 500 : 600,
                            color: selectedCategory ? '#66789C' : '#425A8B',
                            cursor: 'pointer',
                            '&:hover': { color: '#FD9636' },
                        }}
                    >
                        Electronics & Shop
                    </Typography>
                    {selectedCategory && (
                        <>
                            <ChevronRightRounded sx={{ fontSize: 16, color: '#8C9EC5' }} />
                            <Typography
                                sx={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#FD9636',
                                }}
                            >
                                {selectedCategory.name}
                            </Typography>
                        </>
                    )}
                </Stack>

                {/* Inline Search & Admin Quick Button */}
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box component="form" onSubmit={handleSearchSubmit}>
                        <TextField
                            size="small"
                            placeholder="Search for items, SKU..."
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                if (!e.target.value && q) {
                                    setQ('');
                                    setPage(1);
                                }
                            }}
                            sx={{
                                minWidth: { xs: 210, sm: 260 },
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '6px',
                                    height: 36,
                                    fontSize: '13px',
                                },
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton type="submit" size="small" sx={{ color: '#425A8B' }}>
                                                <SearchRounded sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>

                    {canManageProducts && (
                        <Button
                            size="small"
                            onClick={() => navigate('/products')}
                            startIcon={<Inventory2Outlined sx={{ fontSize: 16 }} />}
                            sx={{
                                backgroundColor: '#425A8B',
                                color: '#FFFFFF',
                                fontWeight: 600,
                                fontSize: '12.5px',
                                borderRadius: '6px',
                                px: 1.75,
                                py: 0.85,
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#2B3E66',
                                },
                            }}
                        >
                            Panel de Productos
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* Main 2-Column Ecom Layout: Left Sidebar (280px) + Right Content */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '275px minmax(0, 1fr)' },
                    gap: 3,
                    alignItems: 'start',
                }}
            >
                {/* Left Sidebar (Desktop) */}
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                    <ShopFiltersSidebar
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={handleSelectCategory}
                        priceRange={priceRange}
                        maxAllowedPrice={15000}
                        onPriceRangeChange={setPriceRange}
                        onPriceRangeCommit={(committed) => {
                            setSelectedBracketId(null);
                            setCommittedPriceRange(committed);
                            setPage(1);
                        }}
                        selectedBracketId={selectedBracketId}
                        onSelectBracket={handleSelectBracket}
                        inStockOnly={inStockOnly}
                        onToggleInStockOnly={(checked) => {
                            setInStockOnly(checked);
                            setPage(1);
                        }}
                        totalCatalogCount={total}
                        onResetFilters={handleResetFilters}
                    />
                </Box>

                {/* Right Main Content */}
                <Box sx={{ minWidth: 0 }}>
                    {/* Promotional Hero Banner Image */}
                    <Box
                        sx={{
                            width: '100%',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            mb: 3,
                            border: '1px solid #D5DFE4',
                            boxShadow: '0 4px 14px rgba(66, 90, 139, 0.06)',
                            backgroundColor: '#FFFFFF',
                            lineHeight: 0,
                        }}
                    >
                        <Box
                            component="img"
                            src="/banners/banner_hero.png"
                            alt="Promotional Banner"
                            sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: { xs: 220, sm: 260, md: 320 },
                                objectFit: 'cover',
                                display: 'block',
                            }}
                        />
                    </Box>

                    {/* Toolbar Row: All Filters | Showing 1–16 of X results | Sort by | Show | Grid/List */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            pb: 2,
                            mb: 2.5,
                            borderBottom: '1px solid #D5DFE4',
                        }}
                    >
                        {/* Left: All Filters Button */}
                        <Button
                            onClick={() => setMobileFiltersOpen(true)}
                            startIcon={<TuneRounded sx={{ fontSize: 17 }} />}
                            sx={{
                                backgroundColor: '#F0F3F8',
                                color: '#425A8B',
                                fontWeight: 700,
                                fontSize: '13px',
                                px: 2,
                                py: 0.9,
                                borderRadius: '6px',
                                border: '1px solid #D5DFE4',
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#E2E8F0',
                                },
                            }}
                        >
                            All Filters
                        </Button>

                        {/* Center: Showing X-Y of Z results */}
                        <Typography
                            sx={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: '#425A8B',
                                flex: { xs: '1 1 100%', sm: '0 1 auto' },
                                textAlign: { xs: 'left', sm: 'center' },
                            }}
                        >
                            Showing {startItem}–{endItem} of {total} results
                        </Typography>

                        {/* Right: Sort by | Show | View Mode */}
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                        >
                            {/* Sort by */}
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '12.5px', color: '#8C9EC5', fontWeight: 500 }}>
                                    Sort by:
                                </Typography>
                                <Select
                                    size="small"
                                    value={sortBy}
                                    onChange={(e) => {
                                        setSortBy(e.target.value as CatalogSortBy);
                                        setPage(1);
                                    }}
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#425A8B',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            border: 'none',
                                        },
                                        '& .MuiSelect-select': {
                                            py: 0.5,
                                            pr: '24px !important',
                                            pl: 0.5,
                                        },
                                    }}
                                >
                                    <MenuItem value="latest">Latest products</MenuItem>
                                    <MenuItem value="price_asc">Precio: Menor a Mayor</MenuItem>
                                    <MenuItem value="price_desc">Precio: Mayor a Menor</MenuItem>
                                    <MenuItem value="name_asc">Nombre: A - Z</MenuItem>
                                </Select>
                            </Stack>

                            <Box sx={{ width: '1px', height: 20, backgroundColor: '#D5DFE4' }} />

                            {/* Show items */}
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '12.5px', color: '#8C9EC5', fontWeight: 500 }}>
                                    Show
                                </Typography>
                                <Select
                                    size="small"
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#425A8B',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            border: 'none',
                                        },
                                        '& .MuiSelect-select': {
                                            py: 0.5,
                                            pr: '24px !important',
                                            pl: 0.5,
                                        },
                                    }}
                                >
                                    <MenuItem value={8}>8 items</MenuItem>
                                    <MenuItem value={12}>12 items</MenuItem>
                                    <MenuItem value={16}>16 items</MenuItem>
                                    <MenuItem value={24}>24 items</MenuItem>
                                    <MenuItem value={30}>30 items</MenuItem>
                                </Select>
                            </Stack>

                            {/* Grid / List View Buttons */}
                            <Stack direction="row" spacing={0.5}>
                                <IconButton
                                    size="small"
                                    aria-label="Vista en cuadrícula"
                                    onClick={() => setViewMode('grid')}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '6px',
                                        border:
                                            viewMode === 'grid'
                                                ? '1.5px solid #FD9636'
                                                : '1px solid #D5DFE4',
                                        backgroundColor:
                                            viewMode === 'grid' ? '#FFF3E6' : '#F0F3F8',
                                        color: viewMode === 'grid' ? '#FD9636' : '#425A8B',
                                    }}
                                >
                                    <GridViewRounded sx={{ fontSize: 18 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    aria-label="Vista en lista"
                                    onClick={() => setViewMode('list')}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '6px',
                                        border:
                                            viewMode === 'list'
                                                ? '1.5px solid #FD9636'
                                                : '1px solid #D5DFE4',
                                        backgroundColor:
                                            viewMode === 'list' ? '#FFF3E6' : '#F0F3F8',
                                        color: viewMode === 'list' ? '#FD9636' : '#425A8B',
                                    }}
                                >
                                    <ViewListRounded sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Products Grid / Skeleton / Empty State */}
                    {loading ? (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    md: 'repeat(3, 1fr)',
                                    xl: 'repeat(4, 1fr)',
                                },
                                gap: 2.5,
                            }}
                        >
                            {Array.from({ length: 8 }).map((_, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        p: 2.25,
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #D5DFE4',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <Skeleton variant="rectangular" height={180} sx={{ mb: 1.5, borderRadius: '6px' }} />
                                    <Skeleton width="40%" height={18} sx={{ mb: 0.5 }} />
                                    <Skeleton width="90%" height={24} sx={{ mb: 0.5 }} />
                                    <Skeleton width="60%" height={20} sx={{ mb: 1.5 }} />
                                    <Skeleton width="50%" height={32} sx={{ mb: 1.5 }} />
                                    <Skeleton variant="rectangular" height={38} sx={{ borderRadius: '6px' }} />
                                </Box>
                            ))}
                        </Box>
                    ) : products.length === 0 ? (
                        <Box
                            sx={{
                                p: 6,
                                textAlign: 'center',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #D5DFE4',
                                borderRadius: '8px',
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: '#425A8B',
                                    mb: 1,
                                }}
                            >
                                No se encontraron productos con estos filtros
                            </Typography>
                            <Typography sx={{ fontSize: '14px', color: '#66789C', mb: 2.5 }}>
                                Intenta limpiar los filtros de categoría o ampliar el rango de precio.
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
                                <Button
                                    onClick={handleResetFilters}
                                    sx={{
                                        backgroundColor: '#425A8B',
                                        color: '#FFFFFF',
                                        fontWeight: 600,
                                        px: 3,
                                        py: 1,
                                        borderRadius: '6px',
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: '#2B3E66',
                                        },
                                    }}
                                >
                                    Ver todo el catálogo
                                </Button>
                                {canManageProducts && (
                                    <Button
                                        onClick={() => navigate('/products')}
                                        sx={{
                                            border: '1px solid #FD9636',
                                            color: '#FD9636',
                                            fontWeight: 600,
                                            px: 3,
                                            py: 1,
                                            borderRadius: '6px',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#FFF3E6',
                                            },
                                        }}
                                    >
                                        + Subir Nuevo Producto
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        viewMode === 'list'
                                            ? '1fr'
                                            : {
                                                xs: '1fr',
                                                sm: 'repeat(2, 1fr)',
                                                md: 'repeat(3, 1fr)',
                                                xl: 'repeat(4, 1fr)',
                                            },
                                    gap: 2.5,
                                }}
                            >
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        viewMode={viewMode}
                                        onAddToCart={handleAddToCartFromCard}
                                    />
                                ))}
                            </Box>

                            {/* Bottom Pagination */}
                            {totalPages > 1 && (
                                <Box
                                    sx={{
                                        mt: 4,
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(_, nextPage) => {
                                            setPage(nextPage);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        sx={{
                                            '& .MuiPaginationItem-root': {
                                                color: '#425A8B',
                                                fontWeight: 700,
                                                borderColor: '#D5DFE4',
                                                '&.Mui-selected': {
                                                    backgroundColor: '#FD9636',
                                                    borderColor: '#FD9636',
                                                    color: '#FFFFFF',
                                                    '&:hover': {
                                                        backgroundColor: '#E07B1B',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Mobile/All Filters Drawer */}
            <Drawer
                anchor="left"
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: 310,
                            p: 2.5,
                            backgroundColor: '#F8FAFC',
                        },
                    },
                }}
            >
                <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                >
                    <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#425A8B' }}>
                        All Filters
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => setMobileFiltersOpen(false)}
                        sx={{ color: '#66789C', textTransform: 'none' }}
                    >
                        Cerrar
                    </Button>
                </Stack>
                <ShopFiltersSidebar
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={(catId) => {
                        handleSelectCategory(catId);
                        setMobileFiltersOpen(false);
                    }}
                    priceRange={priceRange}
                    maxAllowedPrice={15000}
                    onPriceRangeChange={setPriceRange}
                    onPriceRangeCommit={(committed) => {
                        setSelectedBracketId(null);
                        setCommittedPriceRange(committed);
                        setPage(1);
                    }}
                    selectedBracketId={selectedBracketId}
                    onSelectBracket={(bracket) => {
                        handleSelectBracket(bracket);
                        setMobileFiltersOpen(false);
                    }}
                    inStockOnly={inStockOnly}
                    onToggleInStockOnly={(checked) => {
                        setInStockOnly(checked);
                        setPage(1);
                        setMobileFiltersOpen(false);
                    }}
                    totalCatalogCount={total}
                    onResetFilters={() => {
                        handleResetFilters();
                        setMobileFiltersOpen(false);
                    }}
                />
            </Drawer>

            {/* Add to Cart Notification */}
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

export default ShopCatalogPage;

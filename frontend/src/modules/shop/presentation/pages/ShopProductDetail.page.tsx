import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stack,
    Divider,
    Chip,
    IconButton,
    Skeleton,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    ChevronRightRounded,
    StarRounded,
    FavoriteBorderRounded,
    FavoriteRounded,
    CompareArrowsRounded,
    AddRounded,
    RemoveRounded,
    ArrowBackRounded,
    ShoppingCartOutlined,
    BoltRounded,
    Inventory2Outlined,
    LocalOfferOutlined,
} from '@mui/icons-material';
import { getCatalogProductById } from '../../infrastructure/services/shop.service';
import type { ShopProduct, ProductVariantDto } from '../../domain/dto/shop.dto';
import { formatMoney } from '../../../../core/utils/formatMoney';
import { useCartStore } from '../../../../core/store/cartStore';

const FALLBACK_GALLERY_IMAGES = [
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85',
];

const extractTwoColumnSpecs = (product: ShopProduct, selectedVariant: ProductVariantDto | null): string[] => {
    const specs: string[] = [];

    if (product.description) {
        const lines = product.description
            .split(/\r?\n|•|;|\|/)
            .map((l) => l.trim())
            .filter((l) => l.length > 2);
        specs.push(...lines);
    }

    if (selectedVariant && selectedVariant.attributes) {
        Object.entries(selectedVariant.attributes).forEach(([k, v]) => {
            if (v && specs.length < 6) {
                specs.push(`${k}: ${v}`);
            }
        });
    }

    const defaults = [
        '8K super steady video & high-res display',
        'Adaptive color contrast & eye comfort shield',
        'Nightography plus portrait mode pro grade',
        'Premium design & durable craftsmanship',
        '50MP photo resolution plus bright display',
        'Long lasting battery plus fast charging',
    ];

    for (const d of defaults) {
        if (specs.length < 6) {
            specs.push(d);
        }
    }

    return specs.slice(0, 6);
};

export const ShopProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const addItem = useCartStore((state) => state.addItem);

    const [product, setProduct] = useState<ShopProduct | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
    const [activeThumbIndex, setActiveThumbIndex] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);
    const [wishlisted, setWishlisted] = useState<boolean>(false);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        if (!id) return;
        let active = true;
        setLoading(true);
        setError(null);

        getCatalogProductById(id)
            .then((prod) => {
                if (!active) return;
                setProduct(prod);
                const firstVariant =
                    prod.variants.find((v) => v.isActive && v.stockAvailable > 0) ||
                    prod.variants[0];
                if (firstVariant) {
                    setSelectedVariantId(firstVariant.id);
                    setSelectedAttributes({ ...(firstVariant.attributes || {}) });
                }
            })
            .catch(() => {
                if (!active) return;
                setError('No se pudo cargar la información del producto solicitado.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id]);

    const activeVariants = useMemo(() => {
        if (!product) return [];
        const enabled = product.variants.filter((v) => v.isActive);
        return enabled.length > 0 ? enabled : product.variants;
    }, [product]);

    const selectedVariant: ProductVariantDto | null = useMemo(() => {
        if (activeVariants.length === 0) return null;
        return (
            activeVariants.find((v) => v.id === selectedVariantId) || activeVariants[0]
        );
    }, [activeVariants, selectedVariantId]);

    // Extract dynamic attribute keys (e.g. Color, Style, Size, Capacidad, Talla) across all variants
    const attributeKeysMap = useMemo(() => {
        const map = new Map<string, string[]>();
        activeVariants.forEach((variant) => {
            Object.entries(variant.attributes || {}).forEach(([key, value]) => {
                if (!value) return;
                if (!map.has(key)) {
                    map.set(key, []);
                }
                const list = map.get(key)!;
                if (!list.includes(value)) {
                    list.push(value);
                }
            });
        });
        return map;
    }, [activeVariants]);

    // Build vertical thumbnails gallery from product.imageUrls (falling back to mainImageUrl)
    const galleryThumbnails = useMemo(() => {
        const urls =
            product?.imageUrls && product.imageUrls.length > 0
                ? product.imageUrls.filter(Boolean)
                : product?.mainImageUrl
                ? [product.mainImageUrl]
                : [FALLBACK_GALLERY_IMAGES[0]];

        if (urls.length > 1) {
            return urls.map((url, idx) => ({
                label: `Imagen ${idx + 1}`,
                url,
                filter: 'none',
                scale: 1,
            }));
        }

        const mainUrl = urls[0] || FALLBACK_GALLERY_IMAGES[0];
        return [
            { label: 'Vista frontal', url: mainUrl, filter: 'none', scale: 1 },
            { label: 'Detalle zoom', url: mainUrl, filter: 'contrast(1.04)', scale: 1.08 },
            { label: 'Perspectiva estudio', url: mainUrl, filter: 'brightness(1.03)', scale: 0.96 },
            { label: 'Acabado lateral', url: mainUrl, filter: 'saturate(1.08)', scale: 1.03 },
            { label: 'Edición completa', url: mainUrl, filter: 'contrast(1.02) saturate(0.96)', scale: 1 },
        ];
    }, [product]);

    const handleSelectAttributeValue = (attrKey: string, attrValue: string) => {
        const updatedAttrs = {
            ...(selectedVariant?.attributes || {}),
            ...selectedAttributes,
            [attrKey]: attrValue,
        };
        setSelectedAttributes(updatedAttrs);

        // Find best matching variant
        let bestVariant: ProductVariantDto | null = null;
        let maxMatches = -1;

        for (const v of activeVariants) {
            if (v.attributes?.[attrKey] !== attrValue) continue;
            let matches = 0;
            Object.entries(updatedAttrs).forEach(([k, val]) => {
                if (v.attributes?.[k] === val) matches += 1;
            });
            if (matches > maxMatches) {
                maxMatches = matches;
                bestVariant = v;
            }
        }

        if (bestVariant) {
            setSelectedVariantId(bestVariant.id);
            setSelectedAttributes({ ...(bestVariant.attributes || {}) });
            setQuantity(1);
        }
    };

    const handleSelectVariantDirect = (variant: ProductVariantDto) => {
        setSelectedVariantId(variant.id);
        setSelectedAttributes({ ...(variant.attributes || {}) });
        setQuantity(1);
    };

    const maxQty = Math.max(1, selectedVariant?.stockAvailable ?? 1);

    const handleAddToCart = (buyNow = false) => {
        if (!product || !selectedVariant) return;

        if (selectedVariant.stockAvailable <= 0) {
            setSnackbar({
                open: true,
                message: 'Esta variante se encuentra agotada temporalmente.',
                severity: 'warning',
            });
            return;
        }

        addItem({
            variantId: selectedVariant.id,
            productId: product.id,
            productName: product.name,
            sku: selectedVariant.sku,
            attributes: selectedVariant.attributes || {},
            price: selectedVariant.price,
            quantity,
            imageUrl: product.mainImageUrl,
        });

        if (buyNow) {
            navigate('/cart');
            return;
        }

        setSnackbar({
            open: true,
            message: `${quantity}x "${product.name}" (${selectedVariant.sku}) agregado al carrito.`,
            severity: 'success',
        });
    };

    if (loading) {
        return (
            <Box sx={{ py: 2 }}>
                <Skeleton variant="rectangular" height={44} sx={{ mb: 3, borderRadius: '8px' }} />
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '540px minmax(0, 1fr)' },
                        gap: 4,
                    }}
                >
                    <Skeleton variant="rectangular" height={480} sx={{ borderRadius: '10px' }} />
                    <Box>
                        <Skeleton width="85%" height={44} sx={{ mb: 1 }} />
                        <Skeleton width="60%" height={36} sx={{ mb: 2 }} />
                        <Skeleton width="40%" height={50} sx={{ mb: 3 }} />
                        <Skeleton variant="rectangular" height={120} sx={{ mb: 3, borderRadius: '8px' }} />
                        <Skeleton variant="rectangular" height={90} sx={{ mb: 3, borderRadius: '8px' }} />
                    </Box>
                </Box>
            </Box>
        );
    }

    if (error || !product) {
        return (
            <Box
                sx={{
                    p: 6,
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '10px',
                    my: 3,
                }}
            >
                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#425A8B', mb: 1 }}>
                    {error || 'Producto no encontrado'}
                </Typography>
                <Button
                    startIcon={<ArrowBackRounded />}
                    onClick={() => navigate('/shop')}
                    sx={{
                        mt: 2,
                        backgroundColor: '#425A8B',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        px: 3,
                        py: 1,
                        borderRadius: '6px',
                        '&:hover': { backgroundColor: '#2B3E66' },
                    }}
                >
                    Volver a la Tienda
                </Button>
            </Box>
        );
    }

    const currentPrice = selectedVariant?.price ?? product.minPrice ?? 0;
    const oldPrice = currentPrice > 0 ? currentPrice * 1.13 : 0;
    const specList = extractTwoColumnSpecs(product, selectedVariant);
    const activeThumb = galleryThumbnails[activeThumbIndex] || galleryThumbnails[0];

    return (
        <Box sx={{ width: '100%', pb: 6 }}>
            {/* Top Ecom Breadcrumb Bar (#F0F3F8) */}
            <Box
                sx={{
                    backgroundColor: '#F0F3F8',
                    borderRadius: '8px',
                    px: { xs: 2, md: 3 },
                    py: 1.5,
                    mb: 3.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                }}
            >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography
                        onClick={() => navigate('/shop')}
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
                        onClick={() =>
                            navigate(
                                product.categoryId
                                    ? `/shop?categoryId=${product.categoryId}`
                                    : '/shop',
                            )
                        }
                        sx={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#66789C',
                            cursor: 'pointer',
                            '&:hover': { color: '#FD9636' },
                        }}
                    >
                        {product.categoryName || 'Electronics'}
                    </Typography>
                    <ChevronRightRounded sx={{ fontSize: 16, color: '#8C9EC5' }} />
                    <Typography
                        sx={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#8C9EC5',
                            maxWidth: { xs: 200, sm: 420 },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {product.name}
                    </Typography>
                </Stack>

                <Button
                    size="small"
                    startIcon={<ArrowBackRounded sx={{ fontSize: 16 }} />}
                    onClick={() => navigate('/shop')}
                    sx={{
                        color: '#425A8B',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        textTransform: 'none',
                        '&:hover': { color: '#FD9636', backgroundColor: 'transparent' },
                    }}
                >
                    Volver al catálogo
                </Button>
            </Box>

            {/* Capture 3 Single Product Layout: Left Gallery + Right Details */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '540px minmax(0, 1fr)' },
                    gap: { xs: 3.5, lg: 5 },
                    alignItems: 'start',
                }}
            >
                {/* Left Column: Vertical Thumbnails Strip + Main Large Image Box */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column-reverse', sm: 'row' },
                        gap: 2,
                    }}
                >
                    {/* Vertical Strip of 5 Thumbnails (76x76px, active border 2px solid #FD9636) */}
                    <Stack
                        direction={{ xs: 'row', sm: 'column' }}
                        spacing={1.5}
                        sx={{
                            flexShrink: 0,
                            overflowX: { xs: 'auto', sm: 'visible' },
                        }}
                    >
                        {galleryThumbnails.map((thumb, idx) => {
                            const isSelected = activeThumbIndex === idx;
                            return (
                                <Box
                                    key={idx}
                                    onClick={() => setActiveThumbIndex(idx)}
                                    sx={{
                                        width: 76,
                                        height: 76,
                                        borderRadius: '8px',
                                        border: isSelected
                                            ? '2px solid #FD9636'
                                            : '1px solid #D5DFE4',
                                        backgroundColor: '#FFFFFF',
                                        p: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        transition: 'border-color 0.15s ease',
                                        '&:hover': {
                                            borderColor: '#FD9636',
                                        },
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={thumb.url}
                                        alt={`${product.name} vista ${idx + 1}`}
                                        sx={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            filter: thumb.filter,
                                            transform: `scale(${thumb.scale})`,
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Stack>

                    {/* Large Main Image Container (border 1px solid #D5DFE4, radius 10px, badge -17%) */}
                    <Box
                        sx={{
                            position: 'relative',
                            flex: 1,
                            minHeight: { xs: 340, sm: 460 },
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D5DFE4',
                            borderRadius: '10px',
                            p: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                zIndex: 1,
                                backgroundColor: '#FD9636',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                px: 1.5,
                                py: 0.45,
                                borderRadius: '9999px',
                            }}
                        >
                            -17%
                        </Box>

                        <Box
                            component="img"
                            src={activeThumb.url}
                            alt={product.name}
                            sx={{
                                maxWidth: '92%',
                                maxHeight: '400px',
                                objectFit: 'contain',
                                filter: activeThumb.filter,
                                transform: `scale(${activeThumb.scale})`,
                                transition: 'transform 0.25s ease, filter 0.25s ease',
                            }}
                        />
                    </Box>
                </Box>

                {/* Right Column: Product Information & Dynamic Variant Selectors */}
                <Box>
                    {/* Large Product Title (#425A8B) */}
                    <Typography
                        component="h1"
                        sx={{
                            fontSize: { xs: '24px', sm: '28px', md: '31px' },
                            fontWeight: 700,
                            color: '#425A8B',
                            lineHeight: 1.26,
                            mb: 1.75,
                        }}
                    >
                        {product.name}
                    </Typography>

                    {/* Metadata Row: by Brand/Category + 5 Orange Stars | Wishlist & Compare Buttons */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            mb: 2,
                        }}
                    >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '13px', color: '#8C9EC5' }}>
                                by{' '}
                                <Box
                                    component="span"
                                    sx={{ color: '#425A8B', fontWeight: 600 }}
                                >
                                    {product.categoryName || 'Ecom Tech'}
                                </Box>
                            </Typography>

                            <Stack direction="row" spacing={0.2} sx={{ alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <StarRounded key={s} sx={{ fontSize: 16, color: '#FD9636' }} />
                                ))}
                                <Typography
                                    sx={{
                                        fontSize: '12.5px',
                                        color: '#8C9EC5',
                                        fontWeight: 500,
                                        ml: 0.75,
                                    }}
                                >
                                    ({activeVariants.length} variantes / 65 reviews)
                                </Typography>
                            </Stack>
                        </Stack>

                        {/* Wishlist & Compare Buttons */}
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Button
                                size="small"
                                onClick={() => setWishlisted((w) => !w)}
                                startIcon={
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '6px',
                                            border: '1px solid #D5DFE4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: wishlisted ? '#FD9636' : '#425A8B',
                                        }}
                                    >
                                        {wishlisted ? (
                                            <FavoriteRounded sx={{ fontSize: 16 }} />
                                        ) : (
                                            <FavoriteBorderRounded sx={{ fontSize: 16 }} />
                                        )}
                                    </Box>
                                }
                                sx={{
                                    color: '#425A8B',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    p: 0.5,
                                    '&:hover': { backgroundColor: 'transparent', color: '#FD9636' },
                                }}
                            >
                                Add to Wish list
                            </Button>

                            <Button
                                size="small"
                                onClick={() =>
                                    setSnackbar({
                                        open: true,
                                        message: `"${product.name}" añadido a la lista de comparación`,
                                        severity: 'info',
                                    })
                                }
                                startIcon={
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '6px',
                                            border: '1px solid #D5DFE4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#425A8B',
                                        }}
                                    >
                                        <CompareArrowsRounded sx={{ fontSize: 16 }} />
                                    </Box>
                                }
                                sx={{
                                    color: '#425A8B',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    p: 0.5,
                                    '&:hover': { backgroundColor: 'transparent', color: '#FD9636' },
                                }}
                            >
                                Add to Compare
                            </Button>
                        </Stack>
                    </Stack>

                    <Divider sx={{ borderColor: '#E5E9F2', mb: 2.5 }} />

                    {/* Dynamic Price of Selected Variant + Stock Status */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{
                            alignItems: { xs: 'flex-start', sm: 'baseline' },
                            justifyContent: 'space-between',
                            mb: 2.5,
                        }}
                    >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
                            <Typography
                                sx={{
                                    fontSize: '32px',
                                    fontWeight: 800,
                                    color: '#425A8B',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.1,
                                }}
                            >
                                {formatMoney(currentPrice)}
                            </Typography>
                            {oldPrice > 0 && (
                                <Typography
                                    sx={{
                                        fontSize: '20px',
                                        fontWeight: 500,
                                        color: '#8C9EC5',
                                        textDecoration: 'line-through',
                                    }}
                                >
                                    {formatMoney(oldPrice)}
                                </Typography>
                            )}
                        </Stack>

                        {selectedVariant && (
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                <Chip
                                    icon={<LocalOfferOutlined sx={{ fontSize: '14px !important' }} />}
                                    label={`SKU: ${selectedVariant.sku}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#F0F3F8',
                                        color: '#425A8B',
                                        fontWeight: 700,
                                        fontSize: '11.5px',
                                        border: '1px solid #D5DFE4',
                                    }}
                                />
                                <Chip
                                    icon={<Inventory2Outlined sx={{ fontSize: '14px !important' }} />}
                                    label={
                                        selectedVariant.stockAvailable > 0
                                            ? `Stock disponible: ${selectedVariant.stockAvailable} uds.`
                                            : 'Agotado'
                                    }
                                    size="small"
                                    sx={{
                                        backgroundColor:
                                            selectedVariant.stockAvailable > 0
                                                ? '#D1FAE5'
                                                : '#FEE2E2',
                                        color:
                                            selectedVariant.stockAvailable > 0
                                                ? '#047857'
                                                : '#B91C1C',
                                        fontWeight: 700,
                                        fontSize: '11.5px',
                                        border: 'none',
                                    }}
                                />
                            </Stack>
                        )}
                    </Stack>

                    {/* 2-Column Specification Bullets (Capture 3 Style) */}
                    <Box
                        component="ul"
                        sx={{
                            m: 0,
                            pl: 2.25,
                            mb: 3,
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                            columnGap: 3,
                            rowGap: 0.75,
                        }}
                    >
                        {specList.map((spec, index) => (
                            <Box
                                component="li"
                                key={index}
                                sx={{
                                    fontSize: '13px',
                                    color: '#425A8B',
                                    lineHeight: 1.55,
                                    '&::marker': {
                                        color: '#425A8B',
                                    },
                                }}
                            >
                                {spec}
                            </Box>
                        ))}
                    </Box>

                    {/* Dynamic Attribute Selectors (Color, Style, Size, etc.) - Capture 3 Style */}
                    {attributeKeysMap.size > 0 && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    md: attributeKeysMap.size > 1 ? 'repeat(2, 1fr)' : '1fr',
                                },
                                gap: 2.5,
                                mb: 3,
                            }}
                        >
                            {Array.from(attributeKeysMap.entries()).map(([attrKey, values]) => {
                                const currentVal =
                                    selectedVariant?.attributes?.[attrKey] ||
                                    selectedAttributes[attrKey] ||
                                    values[0];
                                const isColorAttr =
                                    attrKey.toLowerCase().includes('color') ||
                                    attrKey.toLowerCase().includes('acabado');

                                return (
                                    <Box
                                        key={attrKey}
                                        sx={{
                                            gridColumn: isColorAttr ? '1 / -1' : 'auto',
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: '13.5px',
                                                fontWeight: 700,
                                                color: '#425A8B',
                                                mb: 1,
                                            }}
                                        >
                                            {attrKey}:{' '}
                                            <Box
                                                component="span"
                                                sx={{ color: '#FD9636', fontWeight: 700 }}
                                            >
                                                {currentVal}
                                            </Box>
                                        </Typography>

                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                            {values.map((val) => {
                                                const isSelected = currentVal === val;
                                                return (
                                                    <Button
                                                        key={val}
                                                        onClick={() =>
                                                            handleSelectAttributeValue(attrKey, val)
                                                        }
                                                        sx={{
                                                            minWidth: 0,
                                                            px: 1.75,
                                                            py: 0.75,
                                                            borderRadius: '6px',
                                                            backgroundColor: '#FFFFFF',
                                                            border: isSelected
                                                                ? '2px solid #FD9636'
                                                                : '1px solid #D5DFE4',
                                                            color: isSelected
                                                                ? '#FD9636'
                                                                : '#425A8B',
                                                            fontSize: '12.5px',
                                                            fontWeight: isSelected ? 700 : 600,
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                borderColor: '#FD9636',
                                                                backgroundColor: '#FFF3E6',
                                                            },
                                                        }}
                                                    >
                                                        {val}
                                                    </Button>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}

                    {/* Direct Variant Selector Pills (Always accessible when product has variants) */}
                    {activeVariants.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                sx={{
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    color: '#66789C',
                                    mb: 1,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                Seleccionar Variante ({activeVariants.length} disponibles):
                            </Typography>
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                {activeVariants.map((variant) => {
                                    const isSelected = selectedVariant?.id === variant.id;
                                    const attrSummary = Object.entries(variant.attributes || {})
                                        .map(([, v]) => v)
                                        .filter(Boolean)
                                        .join(' · ');

                                    return (
                                        <Box
                                            key={variant.id}
                                            onClick={() => handleSelectVariantDirect(variant)}
                                            sx={{
                                                px: 1.5,
                                                py: 0.85,
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#FFF3E6' : '#FFFFFF',
                                                border: isSelected
                                                    ? '2px solid #FD9636'
                                                    : '1px solid #D5DFE4',
                                                transition: 'all 0.15s ease',
                                                '&:hover': {
                                                    borderColor: '#FD9636',
                                                },
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '12.5px',
                                                    fontWeight: 700,
                                                    color: isSelected ? '#FD9636' : '#425A8B',
                                                }}
                                            >
                                                {attrSummary || variant.sku}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: '11px',
                                                    color: '#66789C',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {formatMoney(variant.price)} · {variant.stockAvailable} disp.
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {/* Quantity & Purchase CTA Row (Capture 3 Bottom Section) */}
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            sx={{
                                fontSize: '13.5px',
                                fontWeight: 700,
                                color: '#425A8B',
                                mb: 1,
                            }}
                        >
                            Quantity
                        </Typography>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                        >
                            {/* Numeric Quantity Stepper (- 1 +) */}
                            <Stack
                                direction="row"
                                sx={{
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid #D5DFE4',
                                    borderRadius: '6px',
                                    backgroundColor: '#FFFFFF',
                                    px: 1,
                                    height: 46,
                                    minWidth: 125,
                                }}
                            >
                                <IconButton
                                    size="small"
                                    disabled={quantity <= 1}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    sx={{ color: '#425A8B' }}
                                >
                                    <RemoveRounded sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Typography
                                    sx={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: '#425A8B',
                                        px: 1.5,
                                    }}
                                >
                                    {quantity}
                                </Typography>
                                <IconButton
                                    size="small"
                                    disabled={quantity >= maxQty}
                                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                    sx={{ color: '#425A8B' }}
                                >
                                    <AddRounded sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Stack>

                            {/* Add to Cart Outlined Button */}
                            <Button
                                onClick={() => handleAddToCart(false)}
                                startIcon={<ShoppingCartOutlined sx={{ fontSize: 18 }} />}
                                sx={{
                                    height: 46,
                                    px: 3.5,
                                    borderRadius: '6px',
                                    border: '1.5px solid #425A8B',
                                    backgroundColor: '#FFFFFF',
                                    color: '#425A8B',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        backgroundColor: '#425A8B',
                                        color: '#FFFFFF',
                                    },
                                }}
                            >
                                Add to Cart
                            </Button>

                            {/* Buy Now Solid Button */}
                            <Button
                                onClick={() => handleAddToCart(true)}
                                startIcon={<BoltRounded sx={{ fontSize: 18 }} />}
                                sx={{
                                    height: 46,
                                    px: 4,
                                    borderRadius: '6px',
                                    backgroundColor: '#425A8B',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        backgroundColor: '#2B3E66',
                                    },
                                }}
                            >
                                Buy Now
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Box>

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

export default ShopProductDetailPage;

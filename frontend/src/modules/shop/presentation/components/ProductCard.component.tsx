import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, Divider } from '@mui/material';
import { StarRounded } from '@mui/icons-material';
import type { ShopProduct } from '../../domain/dto/shop.dto';
import { formatMoney } from '../../../../core/utils/formatMoney';

interface ProductCardProps {
    product: ShopProduct;
    viewMode?: 'grid' | 'list';
    onAddToCart?: (product: ShopProduct) => void;
}

const DEFAULT_PRODUCT_IMAGES = [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
];

const extractSpecBullets = (product: ShopProduct): string[] => {
    const bullets: string[] = [];

    if (product.description) {
        const rawLines = product.description
            .split(/\r?\n|•|;|\|/)
            .map((line) => line.trim())
            .filter((line) => line.length > 3);

        for (const line of rawLines) {
            if (bullets.length < 3) {
                bullets.push(line.length > 62 ? `${line.slice(0, 59)}...` : line);
            }
        }
    }

    if (bullets.length < 3 && product.variants && product.variants.length > 0) {
        const attrMap = new Map<string, Set<string>>();
        product.variants.forEach((v) => {
            Object.entries(v.attributes || {}).forEach(([k, val]) => {
                if (!attrMap.has(k)) attrMap.set(k, new Set());
                if (val) attrMap.get(k)!.add(val);
            });
        });

        attrMap.forEach((vals, key) => {
            if (bullets.length < 3) {
                bullets.push(`${key}: ${Array.from(vals).slice(0, 3).join(', ')}`);
            }
        });
    }

    const fallbackSpecs = [
        `${product.variantsCount || 1} configuraciones de variante disponibles`,
        `Disponibilidad inmediata (${product.totalStockAvailable} en stock)`,
        'Garantía oficial ShopCart Guatemala',
    ];

    for (const item of fallbackSpecs) {
        if (bullets.length < 3) {
            bullets.push(item);
        }
    }

    return bullets.slice(0, 3);
};

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    viewMode = 'grid',
    onAddToCart,
}) => {
    const navigate = useNavigate();
    const [imgError, setImgError] = useState(false);

    const fallbackIndex =
        product.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
        DEFAULT_PRODUCT_IMAGES.length;

    const imageSrc =
        !imgError && product.mainImageUrl
            ? product.mainImageUrl
            : DEFAULT_PRODUCT_IMAGES[fallbackIndex];

    const displayPrice =
        product.minPrice > 0
            ? product.minPrice
            : product.variants?.[0]?.price ?? 0;

    const oldReferencePrice = displayPrice > 0 ? displayPrice * 1.18 : 0;
    const isOutOfStock = product.totalStockAvailable <= 0;
    const specBullets = extractSpecBullets(product);

    const handleGoToDetail = () => {
        navigate(`/shop/product/${product.id}`);
    };

    const handleActionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddToCart) {
            onAddToCart(product);
        } else {
            navigate(`/shop/product/${product.id}`);
        }
    };

    if (viewMode === 'list') {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 3,
                    p: 2.5,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '8px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                        borderColor: '#425A8B',
                        boxShadow: '0 10px 25px rgba(66, 90, 139, 0.08)',
                    },
                }}
            >
                {/* Left Image */}
                <Box
                    onClick={handleGoToDetail}
                    sx={{
                        position: 'relative',
                        width: { xs: '100%', sm: 220 },
                        height: 200,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        p: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: isOutOfStock ? '#EF4444' : '#FD9636',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '9999px',
                            lineHeight: 1.2,
                        }}
                    >
                        {isOutOfStock ? 'Agotado' : '-17%'}
                    </Box>
                    <Box
                        component="img"
                        src={imageSrc}
                        alt={product.name}
                        onError={() => setImgError(true)}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '170px',
                            objectFit: 'contain',
                        }}
                    />
                </Box>

                {/* Middle Info */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography
                        sx={{
                            fontSize: '12px',
                            color: '#8C9EC5',
                            fontWeight: 500,
                            mb: 0.5,
                        }}
                    >
                        {product.categoryName || 'Tecnología'}
                    </Typography>

                    <Typography
                        onClick={handleGoToDetail}
                        sx={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#425A8B',
                            lineHeight: 1.35,
                            mb: 1,
                            cursor: 'pointer',
                            transition: 'color 0.15s ease',
                            '&:hover': {
                                color: '#FD9636',
                            },
                        }}
                    >
                        {product.name}
                    </Typography>

                    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', mb: 1.5 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarRounded key={star} sx={{ fontSize: 16, color: '#FD9636' }} />
                        ))}
                        <Typography sx={{ fontSize: '12px', color: '#8C9EC5', ml: 0.75 }}>
                            ({product.variantsCount || 1} variantes / 65)
                        </Typography>
                    </Stack>

                    <Box component="ul" sx={{ m: 0, pl: 2, color: '#425A8B' }}>
                        {specBullets.map((spec, idx) => (
                            <Box
                                component="li"
                                key={idx}
                                sx={{
                                    fontSize: '12.5px',
                                    color: '#425A8B',
                                    lineHeight: 1.65,
                                }}
                            >
                                {spec}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Right Price & CTA */}
                <Box
                    sx={{
                        width: { xs: '100%', sm: 210 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        borderLeft: { xs: 'none', sm: '1px solid #E5E9F2' },
                        pl: { xs: 0, sm: 2.5 },
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 2 }}>
                        <Typography
                            sx={{
                                fontSize: '22px',
                                fontWeight: 800,
                                color: '#425A8B',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {formatMoney(displayPrice)}
                        </Typography>
                        {oldReferencePrice > 0 && (
                            <Typography
                                sx={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#8C9EC5',
                                    textDecoration: 'line-through',
                                }}
                            >
                                {formatMoney(oldReferencePrice)}
                            </Typography>
                        )}
                    </Stack>

                    <Button
                        fullWidth
                        onClick={handleActionClick}
                        sx={{
                            borderRadius: '6px',
                            border: '1px solid #425A8B',
                            backgroundColor: '#FFFFFF',
                            color: '#425A8B',
                            fontWeight: 600,
                            fontSize: '13.5px',
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#425A8B',
                                color: '#FFFFFF',
                                borderColor: '#425A8B',
                            },
                        }}
                    >
                        Add To Cart
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 2.25,
                backgroundColor: '#FFFFFF',
                border: '1px solid #D5DFE4',
                borderRadius: '8px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                    borderColor: '#425A8B',
                    boxShadow: '0 10px 25px rgba(66, 90, 139, 0.08)',
                },
            }}
        >
            <Box>
                {/* Image Wrapper + Top-Left Orange Badge (-17%) */}
                <Box
                    onClick={handleGoToDetail}
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: 190,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                        mb: 1.5,
                        cursor: 'pointer',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            zIndex: 1,
                            backgroundColor: isOutOfStock ? '#EF4444' : '#FD9636',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '9999px',
                            lineHeight: 1.2,
                        }}
                    >
                        {isOutOfStock ? 'Agotado' : '-17%'}
                    </Box>

                    <Box
                        component="img"
                        src={imageSrc}
                        alt={product.name}
                        onError={() => setImgError(true)}
                        sx={{
                            maxWidth: '90%',
                            maxHeight: '165px',
                            objectFit: 'contain',
                            transition: 'transform 0.25s ease',
                            '&:hover': {
                                transform: 'scale(1.04)',
                            },
                        }}
                    />
                </Box>

                {/* Category Label */}
                <Typography
                    sx={{
                        fontSize: '12px',
                        color: '#8C9EC5',
                        fontWeight: 500,
                        mb: 0.5,
                        lineHeight: 1.3,
                    }}
                >
                    {product.categoryName || 'Tecnología'}
                </Typography>

                {/* Product Title (2-line clamp, clickable, #425A8B -> hover #FD9636) */}
                <Typography
                    onClick={handleGoToDetail}
                    sx={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#425A8B',
                        lineHeight: 1.4,
                        minHeight: '42px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        mb: 0.75,
                        transition: 'color 0.15s ease',
                        '&:hover': {
                            color: '#FD9636',
                        },
                    }}
                >
                    {product.name}
                </Typography>

                {/* 5 Orange Stars + Variant/Review Counter */}
                <Stack direction="row" spacing={0.15} sx={{ alignItems: 'center', mb: 1 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <StarRounded key={star} sx={{ fontSize: 15, color: '#FD9636' }} />
                    ))}
                    <Typography
                        sx={{
                            fontSize: '12px',
                            color: '#8C9EC5',
                            fontWeight: 500,
                            ml: 0.5,
                        }}
                    >
                        ({product.variantsCount || 1} variantes / 65)
                    </Typography>
                </Stack>

                {/* Price Block: Main Price in #425A8B + Strikethrough Reference in #8C9EC5 */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'baseline', mb: 1.75, flexWrap: 'wrap' }}
                >
                    <Typography
                        sx={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: '#425A8B',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {formatMoney(displayPrice)}
                    </Typography>

                    {oldReferencePrice > 0 && (
                        <Typography
                            sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#8C9EC5',
                                textDecoration: 'line-through',
                            }}
                        >
                            {formatMoney(oldReferencePrice)}
                        </Typography>
                    )}
                </Stack>

                {/* Full-Width Outlined Add To Cart Button */}
                <Button
                    fullWidth
                    onClick={handleActionClick}
                    sx={{
                        borderRadius: '6px',
                        border: '1px solid #425A8B',
                        backgroundColor: '#FFFFFF',
                        color: '#425A8B',
                        fontWeight: 600,
                        fontSize: '13.5px',
                        py: 0.9,
                        textTransform: 'none',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            borderColor: '#425A8B',
                        },
                    }}
                >
                    Add To Cart
                </Button>
            </Box>

            {/* Bottom Divider + 3 Bullet Points of Specs */}
            <Box sx={{ mt: 2 }}>
                <Divider sx={{ borderColor: '#E5E9F2', mb: 1.5 }} />
                <Box
                    component="ul"
                    sx={{
                        m: 0,
                        pl: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.4,
                    }}
                >
                    {specBullets.map((spec, index) => (
                        <Box
                            component="li"
                            key={index}
                            sx={{
                                fontSize: '12px',
                                color: '#425A8B',
                                lineHeight: 1.45,
                                '&::marker': {
                                    color: '#425A8B',
                                },
                            }}
                        >
                            {spec}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default ProductCard;

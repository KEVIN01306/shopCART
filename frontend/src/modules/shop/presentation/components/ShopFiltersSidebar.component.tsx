import React, { useState } from 'react';
import {
    Box,
    Typography,
    Slider,
    Checkbox,
    Stack,
    Divider,
    Button,
} from '@mui/material';
import { KeyboardArrowDownRounded, KeyboardArrowUpRounded, PlayArrowRounded } from '@mui/icons-material';
import type { ShopCategory } from '../../domain/dto/shop.dto';
import { formatMoney } from '../../../../core/utils/formatMoney';

export interface PriceBracket {
    id: string;
    label: string;
    min: number;
    max?: number;
    count: number;
}

export const PRICE_BRACKETS: PriceBracket[] = [
    { id: 'b-0-500', label: 'Free - Q500', min: 0, max: 500, count: 14 },
    { id: 'b-500-1500', label: 'Q500 - Q1,500', min: 500, max: 1500, count: 28 },
    { id: 'b-1500-3500', label: 'Q1,500 - Q3,500', min: 1500, max: 3500, count: 42 },
    { id: 'b-3500-7500', label: 'Q3,500 - Q7,500', min: 3500, max: 7500, count: 19 },
    { id: 'b-7500-plus', label: 'Más de Q7,500', min: 7500, max: undefined, count: 11 },
];

interface ShopFiltersSidebarProps {
    categories: ShopCategory[];
    selectedCategoryId: string;
    onSelectCategory: (categoryId: string) => void;
    priceRange: [number, number];
    maxAllowedPrice?: number;
    onPriceRangeChange: (newRange: [number, number]) => void;
    onPriceRangeCommit: (committedRange: [number, number]) => void;
    selectedBracketId: string | null;
    onSelectBracket: (bracket: PriceBracket | null) => void;
    inStockOnly?: boolean;
    onToggleInStockOnly?: (checked: boolean) => void;
    totalCatalogCount: number;
    onResetFilters: () => void;
}

export const ShopFiltersSidebar: React.FC<ShopFiltersSidebarProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    priceRange,
    maxAllowedPrice = 15000,
    onPriceRangeChange,
    onPriceRangeCommit,
    selectedBracketId,
    onSelectBracket,
    inStockOnly = false,
    onToggleInStockOnly,
    totalCatalogCount,
    onResetFilters,
}) => {
    const [showAllCategories, setShowAllCategories] = useState(false);

    const visibleCategories = showAllCategories ? categories : categories.slice(0, 8);
    const totalCountFromCategories =
        categories.reduce((acc, c) => acc + (c.productCount || 0), 0) || totalCatalogCount;

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue) && newValue.length === 2) {
            onPriceRangeChange([newValue[0], newValue[1]]);
        }
    };

    const handleSliderCommitted = (
        _: React.SyntheticEvent | Event,
        newValue: number | number[],
    ) => {
        if (Array.isArray(newValue) && newValue.length === 2) {
            onPriceRangeCommit([newValue[0], newValue[1]]);
        }
    };

    return (
        <Stack spacing={3} sx={{ width: '100%' }}>
            {/* Box 1: Product Categories */}
            <Box
                sx={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E5E9F2' }}>
                    <Typography
                        sx={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#425A8B',
                        }}
                    >
                        Product Categories
                    </Typography>
                </Box>

                <Box sx={{ px: 2, py: 1.5 }}>
                    {/* All Categories Option */}
                    <Box
                        onClick={() => onSelectCategory('')}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 1,
                            px: 1,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedCategoryId === '' ? '#FFF3E6' : 'transparent',
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                                backgroundColor: selectedCategoryId === '' ? '#FFF3E6' : '#F8FAFC',
                            },
                        }}
                    >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <PlayArrowRounded
                                sx={{
                                    fontSize: 13,
                                    color: selectedCategoryId === '' ? '#FD9636' : '#8C9EC5',
                                }}
                            />
                            <Typography
                                sx={{
                                    fontSize: '13.5px',
                                    fontWeight: selectedCategoryId === '' ? 700 : 500,
                                    color: selectedCategoryId === '' ? '#FD9636' : '#425A8B',
                                }}
                            >
                                Todas las categorías
                            </Typography>
                        </Stack>

                        <Box
                            sx={{
                                minWidth: 28,
                                height: 22,
                                px: 1,
                                borderRadius: '9999px',
                                backgroundColor: selectedCategoryId === '' ? '#FD9636' : '#F0F3F8',
                                color: selectedCategoryId === '' ? '#FFFFFF' : '#425A8B',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {String(totalCountFromCategories).padStart(2, '0')}
                        </Box>
                    </Box>

                    {/* Backend Categories */}
                    {visibleCategories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <Box
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    py: 1,
                                    px: 1,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#FFF3E6' : 'transparent',
                                    transition: 'background-color 0.15s ease',
                                    '&:hover': {
                                        backgroundColor: isSelected ? '#FFF3E6' : '#F8FAFC',
                                    },
                                }}
                            >
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                                    <PlayArrowRounded
                                        sx={{
                                            fontSize: 13,
                                            color: isSelected ? '#FD9636' : '#8C9EC5',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography
                                        noWrap
                                        sx={{
                                            fontSize: '13.5px',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#FD9636' : '#425A8B',
                                            transition: 'color 0.15s ease',
                                            '&:hover': {
                                                color: '#FD9636',
                                            },
                                        }}
                                    >
                                        {cat.name}
                                    </Typography>
                                </Stack>

                                <Box
                                    sx={{
                                        minWidth: 28,
                                        height: 22,
                                        px: 1,
                                        borderRadius: '9999px',
                                        backgroundColor: isSelected ? '#FD9636' : '#F0F3F8',
                                        color: isSelected ? '#FFFFFF' : '#425A8B',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {String(cat.productCount || 0).padStart(2, '0')}
                                </Box>
                            </Box>
                        );
                    })}

                    {/* See More Toggle */}
                    <Box sx={{ mt: 1, px: 1 }}>
                        <Button
                            size="small"
                            onClick={() => setShowAllCategories((prev) => !prev)}
                            endIcon={
                                showAllCategories ? (
                                    <KeyboardArrowUpRounded sx={{ fontSize: 16 }} />
                                ) : (
                                    <KeyboardArrowDownRounded sx={{ fontSize: 16 }} />
                                )
                            }
                            sx={{
                                p: 0,
                                minWidth: 0,
                                color: '#FD9636',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            {showAllCategories ? 'See Less' : 'See More'}
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Box 2: Products Filter (Price Slider + Checkboxes) */}
            <Box
                sx={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DFE4',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E5E9F2' }}>
                    <Typography
                        sx={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#425A8B',
                        }}
                    >
                        Products Filter
                    </Typography>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Typography
                        sx={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#425A8B',
                            mb: 1.5,
                        }}
                    >
                        Price
                    </Typography>

                    {/* Orange Price Slider */}
                    <Box sx={{ px: 0.5, mb: 1.5 }}>
                        <Slider
                            value={priceRange}
                            min={0}
                            max={maxAllowedPrice}
                            step={50}
                            onChange={handleSliderChange}
                            onChangeCommitted={handleSliderCommitted}
                            valueLabelDisplay="auto"
                            sx={{
                                color: '#FD9636',
                                '& .MuiSlider-thumb': {
                                    backgroundColor: '#FD9636',
                                    border: '2px solid #FFFFFF',
                                },
                                '& .MuiSlider-track': {
                                    backgroundColor: '#FD9636',
                                },
                                '& .MuiSlider-rail': {
                                    backgroundColor: '#D5DFE4',
                                },
                            }}
                        />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: '12.5px',
                            color: '#66789C',
                            mb: 2,
                        }}
                    >
                        Price Range:{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: '#425A8B' }}>
                            {formatMoney(priceRange[0])} - {formatMoney(priceRange[1])}
                        </Box>
                    </Typography>

                    {/* Predefined Price Checkboxes */}
                    <Stack spacing={0.5}>
                        {PRICE_BRACKETS.map((bracket) => {
                            const isChecked = selectedBracketId === bracket.id;
                            return (
                                <Box
                                    key={bracket.id}
                                    onClick={() =>
                                        onSelectBracket(isChecked ? null : bracket)
                                    }
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        py: 0.4,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={isChecked}
                                            sx={{
                                                p: 0.5,
                                                color: '#D5DFE4',
                                                '&.Mui-checked': {
                                                    color: '#FD9636',
                                                },
                                            }}
                                        />
                                        <Typography
                                            sx={{
                                                fontSize: '13px',
                                                fontWeight: isChecked ? 700 : 500,
                                                color: isChecked ? '#425A8B' : '#66789C',
                                            }}
                                        >
                                            {bracket.label}
                                        </Typography>
                                    </Stack>

                                    <Box
                                        sx={{
                                            minWidth: 28,
                                            height: 20,
                                            px: 0.85,
                                            borderRadius: '9999px',
                                            backgroundColor: '#F0F3F8',
                                            color: '#425A8B',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {bracket.count}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>

                    <Divider sx={{ my: 2, borderColor: '#E5E9F2' }} />

                    {/* Availability Filter */}
                    <Typography
                        sx={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#425A8B',
                            mb: 1,
                        }}
                    >
                        Availability
                    </Typography>

                    <Box
                        onClick={() => onToggleInStockOnly?.(!inStockOnly)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 0.5,
                            px: 0.75,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: inStockOnly ? '#FFF3E6' : 'transparent',
                            transition: 'background-color 0.15s ease',
                        }}
                    >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Checkbox
                                size="small"
                                checked={inStockOnly}
                                sx={{
                                    p: 0.5,
                                    color: '#D5DFE4',
                                    '&.Mui-checked': {
                                        color: '#FD9636',
                                    },
                                }}
                            />
                            <Typography
                                sx={{
                                    fontSize: '13px',
                                    fontWeight: inStockOnly ? 700 : 500,
                                    color: inStockOnly ? '#425A8B' : '#66789C',
                                }}
                            >
                                Solo disponibles en stock
                            </Typography>
                        </Stack>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: '#E5E9F2' }} />

                    <Button
                        fullWidth
                        size="small"
                        onClick={onResetFilters}
                        sx={{
                            borderRadius: '6px',
                            border: '1px solid #D5DFE4',
                            color: '#425A8B',
                            fontWeight: 600,
                            fontSize: '12.5px',
                            py: 0.75,
                            textTransform: 'none',
                            '&:hover': {
                                borderColor: '#425A8B',
                                backgroundColor: '#F0F3F8',
                            },
                        }}
                    >
                        Limpiar Filtros
                    </Button>
                </Box>
            </Box>
        </Stack>
    );
};

export default ShopFiltersSidebar;

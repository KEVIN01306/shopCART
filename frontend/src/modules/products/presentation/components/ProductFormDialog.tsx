import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack,
    Typography,
    Box,
    IconButton,
    Divider,
    Alert,
    Collapse,
} from '@mui/material';
import {
    AddRounded,
    DeleteOutlineRounded,
    ImageOutlined,
    AutoAwesomeOutlined,
} from '@mui/icons-material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    productFormSchema,
    type ProductFormValues,
} from '../../domain/schemas/product-admin.schema';
import type {
    AdminCategoryDto,
    AdminProductDto,
} from '../../domain/dto/product-admin.dto';
import {
    createAdminProduct,
    updateAdminProduct,
    createAdminCategory,
} from '../../infrastructure/services/products-admin.service';
import { ImageUploadOrUrl } from '../../../../shared/components/ImageUploadOrUrl';
import { GalleryImageAdder } from '../../../../shared/components/GalleryImageAdder';

interface ProductFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: AdminCategoryDto[];
    onCategoryCreated: (newCategory: AdminCategoryDto) => void;
    initialData: AdminProductDto | null;
}

const SUGGESTED_ATTRIBUTE_KEYS = ['Color', 'Style', 'Size', 'Talla', 'Capacidad'];

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
    open,
    onClose,
    onSuccess,
    categories,
    onCategoryCreated,
    initialData,
}) => {
    const isEditMode = Boolean(initialData);

    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    // Inline Quick Category Creator
    const [showNewCategoryBox, setShowNewCategoryBox] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDesc, setNewCategoryDesc] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Additional Gallery Image URLs
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            categoryId: '',
            name: '',
            mainImageUrl: '',
            description: '',
            isActive: true,
            variants: [
                {
                    sku: '',
                    price: 999,
                    stockPhysical: 10,
                    isActive: true,
                    attributePairs: [
                        { key: 'Color', value: 'Negro Espacial' },
                        { key: 'Size', value: '256GB' },
                    ],
                },
            ],
        },
    });

    const {
        fields: variantFields,
        append: appendVariant,
        remove: removeVariant,
    } = useFieldArray({
        control,
        name: 'variants',
    });

    const watchedImageUrl = watch('mainImageUrl');
    const watchedVariants = watch('variants');

    useEffect(() => {
        if (!open) return;
        setServerError(null);
        setShowNewCategoryBox(false);

        if (initialData) {
            const mappedVariants =
                initialData.variants && initialData.variants.length > 0
                    ? initialData.variants.map((v) => ({
                          id: v.id,
                          sku: v.sku,
                          price: v.price,
                          stockPhysical: v.stockPhysical,
                          isActive: v.isActive,
                          attributePairs: Object.entries(v.attributes || {}).map(
                              ([key, value]) => ({
                                  key,
                                  value: String(value),
                              }),
                          ),
                      }))
                    : [
                          {
                              sku: '',
                              price: initialData.minPrice || 100,
                              stockPhysical: 10,
                              isActive: true,
                              attributePairs: [{ key: 'Color', value: 'Estándar' }],
                          },
                      ];

            reset({
                categoryId: initialData.categoryId || categories[0]?.id || '',
                name: initialData.name,
                mainImageUrl: initialData.mainImageUrl || '',
                description: initialData.description || '',
                isActive: initialData.isActive,
                variants: mappedVariants,
            });
            const extraImages = (initialData.imageUrls || []).filter(
                (u) => u && u !== initialData.mainImageUrl,
            );
            setGalleryUrls(extraImages);
        } else {
            reset({
                categoryId: categories[0]?.id || '',
                name: '',
                mainImageUrl: '',
                description: '',
                isActive: true,
                variants: [
                    {
                        sku: '',
                        price: 1250,
                        stockPhysical: 15,
                        isActive: true,
                        attributePairs: [
                            { key: 'Color', value: 'Pink Gold' },
                            { key: 'Style', value: 'S22' },
                            { key: 'Size', value: '512GB' },
                        ],
                    },
                ],
            });
            setGalleryUrls([]);
        }
    }, [open, initialData, categories, reset]);

    const handleRemoveGalleryUrl = (urlToRemove: string) => {
        setGalleryUrls((prev) => prev.filter((u) => u !== urlToRemove));
    };

    const handleCreateQuickCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const created = await createAdminCategory({
                name: newCategoryName.trim(),
                description: newCategoryDesc.trim() || null,
            });
            onCategoryCreated(created);
            setValue('categoryId', created.id, { shouldValidate: true });
            setNewCategoryName('');
            setNewCategoryDesc('');
            setShowNewCategoryBox(false);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setServerError(
                axiosErr.response?.data?.message || 'Error al crear la categoría.',
            );
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleAddAttributeToVariant = (variantIdx: number, suggestedKey = '') => {
        const currentPairs =
            getValues(`variants.${variantIdx}.attributePairs`) || [];
        setValue(
            `variants.${variantIdx}.attributePairs`,
            [
                ...currentPairs,
                {
                    key: suggestedKey || 'Atributo',
                    value: suggestedKey === 'Color' ? 'Silver' : suggestedKey === 'Size' ? '256GB' : 'Estándar',
                },
            ],
            { shouldValidate: true },
        );
    };

    const handleRemoveAttributeFromVariant = (variantIdx: number, pairIdx: number) => {
        const currentPairs =
            getValues(`variants.${variantIdx}.attributePairs`) || [];
        setValue(
            `variants.${variantIdx}.attributePairs`,
            currentPairs.filter((_, i) => i !== pairIdx),
            { shouldValidate: true },
        );
    };

    const onSubmit = async (values: ProductFormValues) => {
        setSubmitting(true);
        setServerError(null);

        try {
            const formattedVariants = values.variants.map((v) => {
                const attributes: Record<string, string> = {};
                (v.attributePairs || []).forEach((pair) => {
                    if (pair.key.trim() && pair.value.trim()) {
                        attributes[pair.key.trim()] = pair.value.trim();
                    }
                });

                return {
                    id: v.id,
                    sku: v.sku.trim(),
                    price: Number(v.price),
                    stockPhysical: Number(v.stockPhysical),
                    isActive: v.isActive ?? true,
                    attributes,
                };
            });

            const coverUrl = values.mainImageUrl?.trim() || null;
            const allImageUrls = [
                ...(coverUrl ? [coverUrl] : []),
                ...galleryUrls.map((u) => u.trim()).filter(Boolean),
            ].filter((u, idx, arr) => arr.indexOf(u) === idx);

            if (isEditMode && initialData) {
                await updateAdminProduct(initialData.id, {
                    categoryId: values.categoryId,
                    name: values.name.trim(),
                    description: values.description?.trim() || null,
                    mainImageUrl: coverUrl,
                    imageUrls: allImageUrls,
                    isActive: values.isActive,
                    variants: formattedVariants,
                });
            } else {
                await createAdminProduct({
                    categoryId: values.categoryId,
                    name: values.name.trim(),
                    description: values.description?.trim() || null,
                    mainImageUrl: coverUrl,
                    imageUrls: allImageUrls,
                    variants: formattedVariants,
                });
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setServerError(
                axiosErr.response?.data?.message ||
                    'Ocurrió un error al guardar el producto y sus variantes. Verifica que los códigos SKU sean únicos.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
        >
            <DialogTitle
                sx={{
                    borderBottom: '1px solid #D5DFE4',
                    backgroundColor: '#F0F3F8',
                    py: 2,
                    px: 3,
                }}
            >
                <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#425A8B' }}>
                    {isEditMode
                        ? 'Editar Producto y Variantes'
                        : 'Subir Nuevo Producto con Variantes'}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#66789C', mt: 0.25 }}>
                    Configura la información del catálogo público y define sus variantes (SKU, precio en GTQ, stock y atributos como Color, Style, Size).
                </Typography>
            </DialogTitle>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3.5}>
                        {serverError && (
                            <Alert severity="error" sx={{ borderRadius: '8px' }}>
                                {serverError}
                            </Alert>
                        )}

                        {/* SECTION 1: General Product Information */}
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#425A8B',
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                1. Información General del Producto
                            </Typography>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: '1fr 220px' },
                                    gap: 2.5,
                                    alignItems: 'start',
                                }}
                            >
                                <Stack spacing={2}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Nombre del Producto *"
                                                placeholder="Ej. Samsung Galaxy S22 Ultra, 8K Camera & Video, Brightest Display Screen"
                                                fullWidth
                                                size="small"
                                                error={Boolean(errors.name)}
                                                helperText={errors.name?.message}
                                            />
                                        )}
                                    />

                                    {/* Category Select + Quick Create Button */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                        <Box sx={{ flex: 1 }}>
                                            <Controller
                                                name="categoryId"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        select
                                                        label="Categoría *"
                                                        fullWidth
                                                        size="small"
                                                        error={Boolean(errors.categoryId)}
                                                        helperText={errors.categoryId?.message}
                                                    >
                                                        {categories.map((cat) => (
                                                            <MenuItem key={cat.id} value={cat.id}>
                                                                {cat.name}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                )}
                                            />
                                        </Box>

                                        <Button
                                            type="button"
                                            size="small"
                                            onClick={() => setShowNewCategoryBox((prev) => !prev)}
                                            startIcon={<AddRounded />}
                                            sx={{
                                                height: 40,
                                                px: 2,
                                                borderRadius: '6px',
                                                border: '1px solid #425A8B',
                                                color: '#425A8B',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                flexShrink: 0,
                                                '&:hover': {
                                                    backgroundColor: '#F0F3F8',
                                                },
                                            }}
                                        >
                                            Nueva Categoría
                                        </Button>
                                    </Stack>

                                    {/* Collapsible Inline Category Creator */}
                                    <Collapse in={showNewCategoryBox}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: '8px',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px dashed #425A8B',
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '12.5px',
                                                    fontWeight: 700,
                                                    color: '#425A8B',
                                                    mb: 1.5,
                                                }}
                                            >
                                                Crear Categoría Rápida
                                            </Typography>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                                <TextField
                                                    size="small"
                                                    label="Nombre de Categoría"
                                                    placeholder="Ej. Smart Watches"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    sx={{ flex: 1 }}
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Descripción (opcional)"
                                                    value={newCategoryDesc}
                                                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    type="button"
                                                    disabled={creatingCategory || !newCategoryName.trim()}
                                                    onClick={handleCreateQuickCategory}
                                                    sx={{
                                                        backgroundColor: '#FD9636',
                                                        color: '#FFFFFF',
                                                        fontWeight: 700,
                                                        textTransform: 'none',
                                                        px: 2,
                                                        '&:hover': { backgroundColor: '#E07B1B' },
                                                    }}
                                                >
                                                    {creatingCategory ? 'Creando...' : 'Guardar'}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Collapse>

                                    <Controller
                                        name="mainImageUrl"
                                        control={control}
                                        render={({ field }) => (
                                            <ImageUploadOrUrl
                                                value={field.value}
                                                onChange={field.onChange}
                                                label="Imagen Principal (Portada)"
                                                helperText={
                                                    errors.mainImageUrl?.message ||
                                                    'Se mostrará en las cards del catálogo y como portada principal.'
                                                }
                                            />
                                        )}
                                    />

                                    {/* Galería de Múltiples Imágenes Adicionales */}
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '8px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E5E9F2',
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: '12.5px',
                                                fontWeight: 700,
                                                color: '#425A8B',
                                                mb: 1,
                                            }}
                                        >
                                            Galería de Imágenes Adicionales ({galleryUrls.length})
                                        </Typography>
                                        <GalleryImageAdder
                                            onAddImage={(url) => {
                                                if (!galleryUrls.includes(url)) {
                                                    setGalleryUrls([...galleryUrls, url]);
                                                }
                                            }}
                                        />
                                        {galleryUrls.length > 0 && (
                                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                                {galleryUrls.map((gUrl, idx) => (
                                                    <Stack
                                                        key={idx}
                                                        direction="row"
                                                        spacing={0.5}
                                                        sx={{
                                                            alignItems: 'center',
                                                            p: 0.5,
                                                            pr: 1,
                                                            borderRadius: '6px',
                                                            backgroundColor: '#FFFFFF',
                                                            border: '1px solid #D5DFE4',
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={gUrl}
                                                            alt={`Extra ${idx + 1}`}
                                                            sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '4px' }}
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveGalleryUrl(gUrl)}
                                                        >
                                                            <DeleteOutlineRounded fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                ))}
                                            </Stack>
                                        )}
                                    </Box>

                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Descripción y Especificaciones (1 característica por línea para viñetas •)"
                                                placeholder={
                                                    '8k super steady video\nNightography plus portrait mode\n50mp photo resolution plus bright display\nAdaptive color contrast'
                                                }
                                                multiline
                                                rows={4}
                                                fullWidth
                                                size="small"
                                                error={Boolean(errors.description)}
                                                helperText={
                                                    errors.description?.message ||
                                                    'Tip: Cada línea se mostrará automáticamente como viñeta (•) en las cards de la tienda y en la página de detalle.'
                                                }
                                            />
                                        )}
                                    />
                                </Stack>

                                {/* Live Image Preview Box */}
                                <Box
                                    sx={{
                                        height: 220,
                                        borderRadius: '8px',
                                        border: '1px solid #D5DFE4',
                                        backgroundColor: '#FFFFFF',
                                        p: 1.5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                    }}
                                >
                                    {watchedImageUrl && watchedImageUrl.trim().startsWith('http') ? (
                                        <Box
                                            component="img"
                                            src={watchedImageUrl.trim()}
                                            alt="Vista previa"
                                            sx={{
                                                maxWidth: '100%',
                                                maxHeight: '175px',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    ) : (
                                        <Stack spacing={1} sx={{ alignItems: 'center', color: '#8C9EC5' }}>
                                            <ImageOutlined sx={{ fontSize: 40 }} />
                                            <Typography sx={{ fontSize: '12px', color: '#8C9EC5' }}>
                                                Vista previa de imagen del producto
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Divider sx={{ borderColor: '#D5DFE4' }} />

                        {/* SECTION 2: Product Variants & Dynamic Attributes */}
                        <Box>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                sx={{
                                    justifyContent: 'space-between',
                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                    mb: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        sx={{
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: '#425A8B',
                                        }}
                                    >
                                        2. Variantes del Producto ({variantFields.length})
                                    </Typography>
                                    <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                        Define cada combinación de SKU, Precio en Quetzales (Q), Stock Físico y sus atributos seleccionables (Color, Style, Size, etc.).
                                    </Typography>
                                </Box>

                                <Button
                                    type="button"
                                    startIcon={<AddRounded />}
                                    onClick={() =>
                                        appendVariant({
                                            sku: '',
                                            price: 1250,
                                            stockPhysical: 10,
                                            isActive: true,
                                            attributePairs: [
                                                { key: 'Color', value: 'Phantom Black' },
                                                { key: 'Size', value: '256GB' },
                                            ],
                                        })
                                    }
                                    sx={{
                                        backgroundColor: '#FD9636',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        px: 2,
                                        py: 0.85,
                                        borderRadius: '6px',
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: '#E07B1B',
                                        },
                                    }}
                                >
                                    + Agregar Variante
                                </Button>
                            </Stack>

                            <Stack spacing={2.5}>
                                {variantFields.map((variantField, vIdx) => {
                                    const currentPairs =
                                        watchedVariants?.[vIdx]?.attributePairs || [];

                                    return (
                                        <Box
                                            key={variantField.id}
                                            sx={{
                                                p: 2.5,
                                                borderRadius: '8px',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #D5DFE4',
                                            }}
                                        >
                                            <Stack
                                                direction="row"
                                                sx={{
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    mb: 2,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontSize: '13.5px',
                                                        fontWeight: 800,
                                                        color: '#425A8B',
                                                    }}
                                                >
                                                    Variante #{vIdx + 1}
                                                </Typography>

                                                {variantFields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        size="small"
                                                        color="error"
                                                        startIcon={<DeleteOutlineRounded />}
                                                        onClick={() => removeVariant(vIdx)}
                                                        sx={{ textTransform: 'none', fontSize: '12px' }}
                                                    >
                                                        Quitar variante
                                                    </Button>
                                                )}
                                            </Stack>

                                            {/* SKU, Price, Stock Row */}
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: {
                                                        xs: '1fr',
                                                        sm: 'repeat(3, 1fr)',
                                                    },
                                                    gap: 2,
                                                    mb: 2,
                                                }}
                                            >
                                                <Controller
                                                    name={`variants.${vIdx}.sku`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            label="Código SKU *"
                                                            placeholder="Ej. SAM-S22U-512-PK"
                                                            size="small"
                                                            fullWidth
                                                            error={Boolean(
                                                                errors.variants?.[vIdx]?.sku,
                                                            )}
                                                            helperText={
                                                                errors.variants?.[vIdx]?.sku
                                                                    ?.message
                                                            }
                                                        />
                                                    )}
                                                />

                                                <Controller
                                                    name={`variants.${vIdx}.price`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            type="number"
                                                            label="Precio Unitario (GTQ Q) *"
                                                            size="small"
                                                            fullWidth
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            error={Boolean(
                                                                errors.variants?.[vIdx]?.price,
                                                            )}
                                                            helperText={
                                                                errors.variants?.[vIdx]?.price
                                                                    ?.message
                                                            }
                                                        />
                                                    )}
                                                />

                                                <Controller
                                                    name={`variants.${vIdx}.stockPhysical`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            type="number"
                                                            label="Stock Físico *"
                                                            size="small"
                                                            fullWidth
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            error={Boolean(
                                                                errors.variants?.[vIdx]
                                                                    ?.stockPhysical,
                                                            )}
                                                            helperText={
                                                                errors.variants?.[vIdx]
                                                                    ?.stockPhysical?.message
                                                            }
                                                        />
                                                    )}
                                                />
                                            </Box>

                                            {/* Dynamic Attributes Editor (Color, Style, Size, etc.) */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: '6px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E5E9F2',
                                                }}
                                            >
                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    spacing={1}
                                                    sx={{
                                                        justifyContent: 'space-between',
                                                        alignItems: {
                                                            xs: 'flex-start',
                                                            sm: 'center',
                                                        },
                                                        mb: 1.5,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.75}
                                                        sx={{ alignItems: 'center' }}
                                                    >
                                                        <AutoAwesomeOutlined
                                                            sx={{
                                                                fontSize: 16,
                                                                color: '#FD9636',
                                                            }}
                                                        />
                                                        <Typography
                                                            sx={{
                                                                fontSize: '12.5px',
                                                                fontWeight: 700,
                                                                color: '#425A8B',
                                                            }}
                                                        >
                                                            Atributos de la Variante (se muestran como selectores en la tienda):
                                                        </Typography>
                                                    </Stack>

                                                    {/* Quick Preset Attribute Buttons */}
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.75}
                                                        sx={{ flexWrap: 'wrap', gap: 0.5 }}
                                                    >
                                                        {SUGGESTED_ATTRIBUTE_KEYS.map((sKey) => (
                                                            <Button
                                                                key={sKey}
                                                                type="button"
                                                                size="small"
                                                                onClick={() =>
                                                                    handleAddAttributeToVariant(
                                                                        vIdx,
                                                                        sKey,
                                                                    )
                                                                }
                                                                sx={{
                                                                    minWidth: 0,
                                                                    px: 1,
                                                                    py: 0.25,
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #D5DFE4',
                                                                    color: '#425A8B',
                                                                    textTransform: 'none',
                                                                    '&:hover': {
                                                                        borderColor: '#FD9636',
                                                                        color: '#FD9636',
                                                                        backgroundColor: '#FFF3E6',
                                                                    },
                                                                }}
                                                            >
                                                                + {sKey}
                                                            </Button>
                                                        ))}
                                                    </Stack>
                                                </Stack>

                                                <Stack spacing={1.25}>
                                                    {currentPairs.map((_, pairIdx) => (
                                                        <Stack
                                                            key={pairIdx}
                                                            direction="row"
                                                            spacing={1.5}
                                                            sx={{ alignItems: 'center' }}
                                                        >
                                                            <Controller
                                                                name={`variants.${vIdx}.attributePairs.${pairIdx}.key`}
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <TextField
                                                                        {...field}
                                                                        label="Atributo (ej. Color, Style, Size)"
                                                                        size="small"
                                                                        sx={{ flex: 1 }}
                                                                    />
                                                                )}
                                                            />
                                                            <Controller
                                                                name={`variants.${vIdx}.attributePairs.${pairIdx}.value`}
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <TextField
                                                                        {...field}
                                                                        label="Valor (ej. Pink Gold, S22, 512GB)"
                                                                        size="small"
                                                                        sx={{ flex: 1.4 }}
                                                                    />
                                                                )}
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() =>
                                                                    handleRemoveAttributeFromVariant(
                                                                        vIdx,
                                                                        pairIdx,
                                                                    )
                                                                }
                                                            >
                                                                <DeleteOutlineRounded fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid #D5DFE4',
                        backgroundColor: '#F8FAFC',
                    }}
                >
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        sx={{ color: '#66789C', fontWeight: 600, textTransform: 'none' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitting}
                        sx={{
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            px: 3,
                            py: 1,
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#2B3E66',
                            },
                        }}
                    >
                        {submitting
                            ? 'Guardando Producto...'
                            : isEditMode
                            ? 'Guardar Cambios'
                            : 'Publicar Producto con Variantes'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default ProductFormDialog;

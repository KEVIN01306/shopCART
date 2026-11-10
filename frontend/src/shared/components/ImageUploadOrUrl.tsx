import React, { useState, useRef } from 'react';
import {
    Box, Stack, TextField, Typography, CircularProgress,
    ToggleButtonGroup, ToggleButton, Alert
} from '@mui/material';
import { CloudUploadOutlined, LinkRounded, CheckCircleRounded } from '@mui/icons-material';
import { uploadImageToR2 } from '../../core/api/upload.service';

interface ImageUploadOrUrlProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    helperText?: string;
}

export const ImageUploadOrUrl: React.FC<ImageUploadOrUrlProps> = ({
    value = '',
    onChange,
    label = 'Imagen',
    helperText,
}) => {
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState(value);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setError('El archivo supera los 10 MB permitidos.');
            return;
        }

        setError(null);
        setUploading(true);
        try {
            const { url } = await uploadImageToR2(file);
            onChange(url);
            setUrlInput(url);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Error al subir la imagen a Cloudflare R2.';
            setError(msg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUrlBlur = () => {
        if (urlInput.trim()) {
            onChange(urlInput.trim());
        }
    };

    return (
        <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>
                    {label}
                </Typography>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, next) => next && setMode(next)}
                    size="small"
                    sx={{ height: 28 }}
                >
                    <ToggleButton value="upload" sx={{ fontSize: '11.5px', textTransform: 'none', px: 1, py: 0 }}>
                        <CloudUploadOutlined sx={{ fontSize: 14, mr: 0.5 }} /> Subir Imagen
                    </ToggleButton>
                    <ToggleButton value="url" sx={{ fontSize: '11.5px', textTransform: 'none', px: 1, py: 0 }}>
                        <LinkRounded sx={{ fontSize: 14, mr: 0.5 }} /> Ingresar URL
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1, py: 0, fontSize: '12px' }}>{error}</Alert>}

            {mode === 'upload' ? (
                <Box
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    sx={{
                        border: '1.5px dashed #D5DFE4',
                        borderRadius: '8px',
                        p: 1.5,
                        textAlign: 'center',
                        bgcolor: '#F8FAFC',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#425A8B', bgcolor: '#F1F5F9' },
                    }}
                >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    {uploading ? (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                            <CircularProgress size={18} sx={{ color: '#425A8B' }} />
                            <Typography sx={{ fontSize: '12px', color: '#425A8B', fontWeight: 600 }}>Subiendo a Cloudflare R2...</Typography>
                        </Stack>
                    ) : value ? (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Box component="img" src={value} alt="Preview" sx={{ width: 42, height: 42, objectFit: 'cover', borderRadius: '6px', border: '1px solid #D5DFE4' }} />
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CheckCircleRounded sx={{ fontSize: 14 }} /> Imagen lista en R2
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#66789C' }}>Clic para reemplazar imagen</Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                            <CloudUploadOutlined sx={{ fontSize: 24, color: '#8C9EC5' }} />
                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#425A8B' }}>Haz clic para seleccionar o arrastra una imagen</Typography>
                            <Typography sx={{ fontSize: '11px', color: '#8C9EC5' }}>PNG, JPG, WEBP, GIF hasta 10MB</Typography>
                        </Stack>
                    )}
                </Box>
            ) : (
                <TextField
                    size="small"
                    fullWidth
                    placeholder="https://images.unsplash.com/photo-..."
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); onChange(e.target.value); }}
                    onBlur={handleUrlBlur}
                    helperText={helperText || 'Ingresa la URL pública de la imagen (HTTPS)'}
                />
            )}
        </Box>
    );
};

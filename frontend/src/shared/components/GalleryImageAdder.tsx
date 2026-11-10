import React, { useState, useRef } from 'react';
import {
    Box, Stack, TextField, Button, Typography, CircularProgress,
    ToggleButtonGroup, ToggleButton, Alert
} from '@mui/material';
import { CloudUploadOutlined, LinkRounded, AddPhotoAlternateOutlined } from '@mui/icons-material';
import { uploadImageToR2 } from '../../core/api/upload.service';

interface GalleryImageAdderProps {
    onAddImage: (url: string) => void;
}

export const GalleryImageAdder: React.FC<GalleryImageAdderProps> = ({ onAddImage }) => {
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
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
            onAddImage(url);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Error al subir la imagen a Cloudflare R2.';
            setError(msg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddUrl = () => {
        if (urlInput.trim().startsWith('http')) {
            onAddImage(urlInput.trim());
            setUrlInput('');
        }
    };

    return (
        <Box sx={{ mb: 1 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#425A8B' }}>
                    Agregar imagen adicional:
                </Typography>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, next) => next && setMode(next)}
                    size="small"
                    sx={{ height: 26 }}
                >
                    <ToggleButton value="upload" sx={{ fontSize: '11px', textTransform: 'none', px: 1, py: 0 }}>
                        <CloudUploadOutlined sx={{ fontSize: 13, mr: 0.5 }} /> Subir a R2
                    </ToggleButton>
                    <ToggleButton value="url" sx={{ fontSize: '11px', textTransform: 'none', px: 1, py: 0 }}>
                        <LinkRounded sx={{ fontSize: 13, mr: 0.5 }} /> Ingresar URL
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1, py: 0, fontSize: '11.5px' }}>{error}</Alert>}

            {mode === 'upload' ? (
                <Box
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    sx={{
                        border: '1.5px dashed #D5DFE4',
                        borderRadius: '6px',
                        py: 1,
                        px: 2,
                        textAlign: 'center',
                        bgcolor: '#FFFFFF',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        '&:hover': { borderColor: '#425A8B', bgcolor: '#F1F5F9' },
                    }}
                >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    {uploading ? (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                            <CircularProgress size={16} sx={{ color: '#425A8B' }} />
                            <Typography sx={{ fontSize: '11.5px', color: '#425A8B', fontWeight: 600 }}>Subiendo imagen a R2...</Typography>
                        </Stack>
                    ) : (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                            <AddPhotoAlternateOutlined sx={{ fontSize: 18, color: '#425A8B' }} />
                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#425A8B' }}>
                                Clic para subir una imagen a la galería
                            </Typography>
                        </Stack>
                    )}
                </Box>
            ) : (
                <Stack direction="row" spacing={1}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="https://images.unsplash.com/..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                    />
                    <Button
                        type="button"
                        size="small"
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim().startsWith('http')}
                        sx={{
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 2,
                            flexShrink: 0,
                            '&:hover': { backgroundColor: '#2B3E66' },
                        }}
                    >
                        + Añadir
                    </Button>
                </Stack>
            )}
        </Box>
    );
};

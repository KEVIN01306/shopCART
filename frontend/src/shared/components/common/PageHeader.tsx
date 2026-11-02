import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    actionIcon?: ReactNode;
    onAction?: () => void;
    children?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    actionLabel,
    actionIcon,
    onAction,
    children,
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                mb: 3,
                p: 3,
                bgcolor: '#ffffff',
                border: '1px solid #e8e6e5',
                borderRadius: '10px',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 16px 0px',
            }}
        >
            <Box>
                <Typography
                    component="h1"
                    sx={{
                        fontFamily: 'var(--font-roobert), Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: { xs: '24px', sm: '30px' },
                        letterSpacing: '-0.75px',
                        color: '#0c0a09',
                        lineHeight: 1.25,
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#78716c',
                            mt: 0.5,
                            fontSize: '14px',
                            lineHeight: 1.64,
                            maxWidth: 680,
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: { xs: 'stretch', sm: 'auto' } }}>
                {children}
                {actionLabel && onAction && (
                    <Button
                        startIcon={actionIcon}
                        onClick={onAction}
                        sx={{
                            borderRadius: '9999px',
                            bgcolor: '#3ba6f1',
                            border: '1px solid #3398e1',
                            color: '#ffffff',
                            fontWeight: 500,
                            fontSize: '14px',
                            textTransform: 'none',
                            px: 2.5,
                            py: 0.9,
                            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                            '&:hover': {
                                bgcolor: '#3398e1',
                            },
                        }}
                    >
                        {actionLabel}
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default PageHeader;

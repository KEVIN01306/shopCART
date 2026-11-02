import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Stack, Tabs, Tab } from '@mui/material';
import { LoginOutlined, PersonAddOutlined } from '@mui/icons-material';
import { LoginForm } from '../components/LoginForm.component';
import { RegisterForm } from '../components/RegisterForm.component';

interface LoginPageProps {
    initialTab?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialTab }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isRegisterRoute = initialTab === 'register' || location.pathname.includes('register');
    const [tab, setTab] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTab(newValue === 1 ? 'register' : 'login');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 3 },
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 480 }}>
                <Stack sx={{ alignItems: 'center', mb: 3, gap: 1 }}>
                    <Box
                        onClick={() => navigate('/')}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1.25,
                            cursor: 'pointer',
                            mb: 0.5,
                        }}
                    >
                        <Box
                            component="img"
                            src="/logo.png"
                            alt="shopCART"
                            sx={{ width: 52, height: 52, objectFit: 'contain' }}
                        />
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 800,
                                fontSize: '28px',
                                letterSpacing: '-0.5px',
                                color: '#425A8B',
                            }}
                        >
                            shop<Box component="span" sx={{ color: '#FD9636' }}>CART</Box>
                        </Typography>
                    </Box>
                    <Typography
                        sx={{
                            fontSize: '14px',
                            color: '#66789C',
                            textAlign: 'center',
                            fontWeight: 500,
                        }}
                    >
                        {tab === 'login'
                            ? 'Accede a tu cuenta de compras o continúa como invitado'
                            : 'Únete a shopCART y comienza a comprar de inmediato'}
                    </Typography>
                </Stack>

                <Card
                    elevation={0}
                    sx={{
                        borderRadius: '10px',
                        border: '1px solid #D5DFE4',
                        boxShadow: '0 10px 30px rgba(66, 90, 139, 0.08)',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                    }}
                >
                    <Tabs
                        value={tab === 'login' ? 0 : 1}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            borderBottom: '1px solid #D5DFE4',
                            backgroundColor: '#F8FAFC',
                            minHeight: 52,
                            '& .MuiTab-root': {
                                fontWeight: 700,
                                fontSize: '14px',
                                textTransform: 'none',
                                color: '#66789C',
                                minHeight: 52,
                                transition: 'all 0.2s ease',
                                '&.Mui-selected': {
                                    color: '#425A8B',
                                    backgroundColor: '#FFFFFF',
                                },
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#425A8B',
                                height: 3,
                            },
                        }}
                    >
                        <Tab
                            id="tab-login"
                            icon={<LoginOutlined sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label="Iniciar Sesión"
                        />
                        <Tab
                            id="tab-register"
                            icon={<PersonAddOutlined sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label="Crear Cuenta"
                        />
                    </Tabs>

                    <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
                        {tab === 'login' ? (
                            <LoginForm onSwitchToRegister={() => setTab('register')} />
                        ) : (
                            <RegisterForm onSwitchToLogin={() => setTab('login')} />
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default LoginPage;

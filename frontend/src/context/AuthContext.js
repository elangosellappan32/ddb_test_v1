import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                // Ensure role is properly set
                return {
                    ...parsed,
                    role: parsed.role?.toUpperCase() || 'VIEWER' // Default to VIEWER if no role
                };
            } catch (e) {
                console.error('Failed to parse saved user:', e);
                return null;
            }
        }
        return null;
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const initAuth = useCallback(async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            authService.logout();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initAuth();
    }, [initAuth]);

    const login = async (username, password) => {
        try {
            const response = await authService.login(username, password);
            setUser(response.user);
            
            enqueueSnackbar(`Welcome ${response.user.username}!`, { 
                variant: 'success',
                autoHideDuration: 3000
            });

            navigate('/dashboard');
            return response;
        } catch (error) {
            enqueueSnackbar(error.message || 'Login failed', { 
                variant: 'error' 
            });
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        enqueueSnackbar('Logged out successfully', { 
            variant: 'info' 
        });
        navigate('/login');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
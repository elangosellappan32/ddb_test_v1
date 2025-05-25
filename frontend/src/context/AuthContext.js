import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import authService from '../services/authService';
import { API_MESSAGES } from '../config/api.config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(authService.getCurrentUser());
    const [isInitialized, setIsInitialized] = useState(false);
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        // Check if there's a stored user session
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
            setUser(storedUser);
        }
        setIsInitialized(true);
    }, []);

    const login = async (username, password) => {
        try {
            const data = await authService.login(username, password);
            
            if (data.success && data.user) {
                setUser(data.user);
                enqueueSnackbar(API_MESSAGES.AUTH.LOGIN_SUCCESS, { 
                    variant: 'success',
                    autoHideDuration: 2000
                });
                return true;
            }
            return false;
        } catch (error) {
            enqueueSnackbar(error.message || API_MESSAGES.AUTH.LOGIN_FAILED, {
                variant: 'error',
                autoHideDuration: 3000
            });
            throw error;
        }
    };    const logout = () => {
        authService.logout();
        setUser(null);
        enqueueSnackbar(API_MESSAGES.AUTH.LOGOUT_SUCCESS, { 
            variant: 'info',
            autoHideDuration: 2000
        });
        navigate('/login', { replace: true });
    };

    const checkPermission = (resource, action) => {
        return authService.hasPermission(resource, action);
    };

    const checkAnyPermission = (resource, actions) => {
        return authService.hasAnyPermission(resource, actions);
    };

    if (!isInitialized) {
        return null; // or a loading spinner
    }    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            checkPermission,
            checkAnyPermission,
            isAdmin: () => authService.isAdmin(user),
            hasRole: (role) => user?.role === role,
            hasPermission: authService.hasPermission,
            canCreate: authService.canCreate,
            canRead: authService.canRead,
            canUpdate: authService.canUpdate,
            canDelete: authService.canDelete,
            hasAnyPermission: authService.hasAnyPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
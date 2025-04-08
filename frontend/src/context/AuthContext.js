import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const login = async (username, password) => {
        const data = await authService.login(username, password);
        
        if (data.success && data.user) {
            setUser(data.user);
            enqueueSnackbar(`Welcome ${data.user.username}!`, { 
                variant: 'success',
                autoHideDuration: 2000
            });
            return true;
        }
        return false;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        enqueueSnackbar('Logged out successfully', { 
            variant: 'info',
            autoHideDuration: 2000
        });
        navigate('/login', { replace: true });
    };

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
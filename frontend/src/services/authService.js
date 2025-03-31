import api from './apiUtils';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Role permissions mapping
const ROLE_PERMISSIONS = {
    admin: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    user: ['CREATE', 'READ', 'UPDATE'],
    viewer: ['READ']
};

const authService = {
    login: async (username, password) => {
        try {
            const response = await api.post('/auth/login', { 
                username, 
                password 
            });

            if (response.data?.success) {
                const userData = {
                    ...response.data.user,
                    permissions: response.data.user.permissions || {}
                };

                localStorage.setItem(TOKEN_KEY, response.data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                
                return {
                    success: true,
                    user: userData
                };
            }

            throw new Error(response.data?.message || 'Login failed');
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.response?.data?.message || 'Invalid credentials');
        }
    },

    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem(USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    getToken: () => localStorage.getItem(TOKEN_KEY),

    isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),

    hasPermission: (permission) => {
        const user = authService.getCurrentUser();
        return user?.permissions?.includes(permission) || false;
    }
};

export default authService;
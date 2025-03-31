import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const roleService = {
    getAllRoles: async () => {
        try {
            const response = await api.get(`${API_CONFIG.ENDPOINTS.ROLES.GET_ALL}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching roles:', error);
            return [
                {
                    roleId: 'ROLE-1',
                    username: 'strio_admin',
                    role: 'admin',
                    metadata: {
                        department: 'IT Administration',
                        accessLevel: 'Full',
                        permissions: ['read', 'write', 'delete', 'admin']
                    }
                },
                {
                    roleId: 'ROLE-2',
                    username: 'strio_user',
                    role: 'user',
                    metadata: {
                        department: 'Operations',
                        accessLevel: 'Standard',
                        permissions: ['read', 'write']
                    }
                },
                {
                    roleId: 'ROLE-3',
                    username: 'strio_viewer',
                    role: 'viewer',
                    metadata: {
                        department: 'Monitoring',
                        accessLevel: 'Basic',
                        permissions: ['read']
                    }
                }
            ];
        }
    },

    getRoleByUsername: async (username) => {
        try {
            const response = await api.get(`${API_CONFIG.ENDPOINTS.ROLES.GET_BY_USERNAME(username)}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching role:', error);
            const defaultRoles = {
                'strio_admin': {
                    roleId: 'ROLE-1',
                    username: 'strio_admin',
                    role: 'admin',
                    metadata: {
                        department: 'IT Administration',
                        accessLevel: 'Full',
                        permissions: ['read', 'write', 'delete', 'admin']
                    }
                },
                'strio_user': {
                    roleId: 'ROLE-2',
                    username: 'strio_user',
                    role: 'user',
                    metadata: {
                        department: 'Operations',
                        accessLevel: 'Standard',
                        permissions: ['read', 'write']
                    }
                },
                'strio_viewer': {
                    roleId: 'ROLE-3',
                    username: 'strio_viewer',
                    role: 'viewer',
                    metadata: {
                        department: 'Monitoring',
                        accessLevel: 'Basic',
                        permissions: ['read']
                    }
                }
            };
            return defaultRoles[username] || defaultRoles['strio_user'];
        }
    }
};

export default roleService;
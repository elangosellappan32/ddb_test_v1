const express = require('express');
const router = express.Router();
const AuthDAL = require('../auth/authDal');
const authDal = new AuthDAL();

router.get('/all', async (req, res) => {
    try {
        const roles = [
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
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
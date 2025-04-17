const validateLoginInput = (req, res, next) => {
    const { username, password } = req.body;

    const errors = [];
    if (!username) errors.push('Username is required');
    if (!password) errors.push('Password is required');
    
    if (username && typeof username !== 'string') errors.push('Username must be a string');
    if (password && typeof password !== 'string') errors.push('Password must be a string');
    
    if (username && username.length < 3) errors.push('Username must be at least 3 characters');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

module.exports = {
    validateLoginInput
};
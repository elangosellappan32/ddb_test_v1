const validateSite = (req, res, next) => {
    const { name, location, type, annualConsumption } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
        return res.status(400).json({
            success: false,
            message: 'Name is required and must be at least 3 characters'
        });
    }

    if (!location || typeof location !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Location is required'
        });
    }

    if (!type || typeof type !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Type is required'
        });
    }

    if (annualConsumption !== undefined) {
        const consumption = Number(annualConsumption);
        if (isNaN(consumption) || consumption < 0) {
            return res.status(400).json({
                success: false,
                message: 'Annual consumption must be a positive number'
            });
        }
    }

    next();
};

module.exports = validateSite;
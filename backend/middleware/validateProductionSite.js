const validateProductionSite = (req, res, next) => {
    const item = req.body;
    const errors = [];

    if (!item.name || typeof item.name !== 'string' || item.name.trim().length < 3) {
        errors.push('Name is required and must be at least 3 characters');
    }

    if (!item.location || typeof item.location !== 'string') {
        errors.push('Location is required');
    }

    if (!item.type || typeof item.type !== 'string') {
        errors.push('Type is required');
    }

    // Handle both annualProduction and annualProduction_L
    const annualProduction = item.annualProduction_L || item.annualProduction;
    if (annualProduction === undefined || annualProduction === null) {
        errors.push('Annual Production (L) is required');
    } else {
        const value = Number(annualProduction);
        if (isNaN(value) || value < 0) {
            errors.push('Annual Production (L) must be a non-negative number');
        }
    }

    // Validate other numeric fields
    const numericFields = {
        'Banking': item.banking,
        'Capacity (MW)': item.capacity_MW,
        'HTSC Number': item.htscNo,
        'Injection Voltage (KV)': item.injectionVoltage_KV
    };

    for (const [field, value] of Object.entries(numericFields)) {
        if (value !== undefined && value !== null) {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 0) {
                errors.push(`${field} must be a non-negative number`);
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors.join(', ')
        });
    }

    next();
};

module.exports = validateProductionSite;
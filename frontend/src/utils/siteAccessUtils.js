/**
 * Utility functions for site access management
 */

/**
 * Checks if a user has access to a specific site
 * @param {Object} user - The user object
 * @param {string} siteId - The site ID in format 'companyId_siteId'
 * @param {string} siteType - The type of site ('production' or 'consumption')
 * @returns {boolean} Whether the user has access to the site
 */
export const hasAccessToSite = (user, siteId, siteType) => {
    if (!user || !siteId || !siteType) return false;

    // Admin users have access to all sites
    if (user.role === 'admin' || user.roleName === 'ADMIN') {
        return true;
    }

    // Check if user has accessible sites configuration
    if (!user.accessibleSites) return false;

    const sitesList = siteType === 'production' 
        ? user.accessibleSites.productionSites?.L 
        : user.accessibleSites.consumptionSites?.L;

    // Validate sites list structure
    if (!Array.isArray(sitesList)) return false;

    // Check if site exists in user's accessible sites
    return sitesList.some(site => site.S === siteId);
};

/**
 * Get all site IDs that a user has access to
 * @param {Object} user - The user object
 * @param {string} siteType - The type of site ('production' or 'consumption')
 * @returns {string[]} Array of site IDs
 */
export const getAccessibleSiteIds = (user, siteType) => {
    if (!user || !siteType) return [];

    // Admin users have access to all sites, but we still need to return the ones they can see
    // This will be populated by API calls later
    if (user.role === 'admin' || user.roleName === 'ADMIN') {
        return [];
    }

    // Check if user has accessible sites configuration
    if (!user.accessibleSites) return [];

    const sitesList = siteType === 'production' 
        ? user.accessibleSites.productionSites?.L 
        : user.accessibleSites.consumptionSites?.L;

    // Validate sites list structure and return site IDs
    if (!Array.isArray(sitesList)) return [];

    return sitesList.map(site => site.S).filter(Boolean);
};

/**
 * Format a site ID from its components
 * @param {string|number} companyId - The company ID
 * @param {string|number} siteId - The site ID
 * @returns {string} The formatted site ID
 */
export const formatSiteId = (companyId, siteId) => {
    return `${companyId}_${siteId}`;
};

/**
 * Parse a site ID into its components
 * @param {string} combinedId - The combined site ID (format: 'companyId_siteId')
 * @returns {Object} Object containing companyId and siteId
 */
export const parseSiteId = (combinedId) => {
    if (!combinedId || typeof combinedId !== 'string') return { companyId: null, siteId: null };
    
    const [companyId, siteId] = combinedId.split('_');
    return {
        companyId: companyId ? Number(companyId) : null,
        siteId: siteId ? Number(siteId) : null
    };
};

/**
 * Updates a user's accessible sites
 * @param {Object} user - The user object
 * @param {string} siteId - The site ID to add
 * @param {string} siteType - The type of site ('production' or 'consumption')
 * @returns {Object} Updated user object
 */
export const addSiteToUserAccess = (user, siteId, siteType) => {
    if (!user || !siteId || !siteType) return user;

    // Create a deep copy of the user object
    const updatedUser = JSON.parse(JSON.stringify(user));

    // Initialize accessibleSites if it doesn't exist
    if (!updatedUser.accessibleSites) {
        updatedUser.accessibleSites = {
            productionSites: { L: [] },
            consumptionSites: { L: [] }
        };
    }

    // Get the correct sites array
    const sitesArray = siteType === 'production' 
        ? updatedUser.accessibleSites.productionSites.L 
        : updatedUser.accessibleSites.consumptionSites.L;

    // Check if site already exists
    if (!sitesArray.some(site => site.S === siteId)) {
        sitesArray.push({ S: siteId });
    }

    return updatedUser;
};

/**
 * Updates user's site access in the backend
 * @param {Object} user - The user object
 * @param {string} siteId - The site ID
 * @param {string} siteType - The type of site ('production' or 'consumption')
 * @returns {Promise<Object>} Updated user object from the backend
 * @throws {Error} If the update fails
 */
export const updateUserSiteAccess = async (user, siteId, siteType) => {
    try {
        const updatedUser = addSiteToUserAccess(user, siteId, siteType);
        
        // Make API call to update user's accessible sites
        const response = await fetch('/api/users/access', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                accessibleSites: updatedUser.accessibleSites
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update user site access: ${response.statusText}`);
        }

        const result = await response.json();
        return result.user;
    } catch (error) {
        console.error('Error updating user site access:', error);
        throw error;
    }
};

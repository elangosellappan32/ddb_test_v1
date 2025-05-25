const TableNames = {
    PRODUCTION_SITES: 'ProductionSiteTable',
    PRODUCTION_UNIT: 'ProductionUnitTable',
    PRODUCTION_CHARGE: 'ProductionChargeTable',
    CONSUMPTION_SITES: 'ConsumptionSiteTable',
    CONSUMPTION_UNIT:'ConsumptionUnitTable',
    USERS: 'UserTable', // changed from 'RoleTable' to 'UserTable'
    ROLES: 'RoleTable', // added for clarity
    BANKING: 'BankingTable',
    ALLOCATION: 'AllocationTable',
    LAPSE: 'LapseTable',
    COMPANY: 'CompanyTable',
    CAPTIVE: 'CaptiveTable'
};

module.exports = TableNames;
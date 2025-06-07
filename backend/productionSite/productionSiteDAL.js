const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const Decimal = require('decimal.js');
const logger = require('../utils/logger');
const TableNames = require('../constants/tableNames');

const docClient = require('../utils/db');
const TableName = TableNames.PRODUCTION_SITES;

const getLastProductionSiteId = async (companyId) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'companyId = :companyId',
            ExpressionAttributeValues: {
                ':companyId': companyId
            }
        }));

        if (!Items || Items.length === 0) {
            return 0;
        }

        const lastId = Math.max(...Items.map(item => Number(item.productionSiteId)));
        return lastId;
    } catch (error) {
        logger.error('[ProductionSiteDAL] Get Last ProductionSiteId Error:', error);
        throw error;
    }
};

const create = async (item) => {
    try {
        const now = new Date().toISOString();
        const lastId = await getLastProductionSiteId(item.companyId);
        const newId = lastId + 1;

        // Normalize the annualProduction field
        const annualProduction = item.annualProduction_L || item.annualProduction || 0;

        const newItem = {
            companyId: item.companyId,
            productionSiteId: newId,
            name: item.name,
            location: item.location,
            type: item.type,
            banking: new Decimal(item.banking || 0).toString(),
            capacity_MW: new Decimal(item.capacity_MW || 0).toString(),
            annualProduction_L: new Decimal(annualProduction).toString(), // Store as annualProduction_L
            htscNo: item.htscNo ? String(item.htscNo).trim() : '', // Keep as string
            injectionVoltage_KV: new Decimal(item.injectionVoltage_KV || 0).toString(),
            status: item.status,
            version: 1,
            createdat: now,
            updatedat: now,
            timetolive: 0
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: newItem,
            ConditionExpression: 'attribute_not_exists(companyId) AND attribute_not_exists(productionSiteId)'
        }));

        return newItem;
    } catch (error) {
        logger.error('[ProductionSiteDAL] Create Error:', error);
        throw error;
    }
};

const getItem = async (companyId, productionSiteId) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName,
            Key: { 
                companyId: parseInt(companyId), 
                productionSiteId: parseInt(productionSiteId) 
            }
        }));
        
        return Item;
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetItem Error:', error);
        throw error;
    }
};

const updateItem = async (companyId, productionSiteId, updates) => {
    try {
        const existing = await getItem(companyId, productionSiteId);
        
        if (!existing) {
            throw new Error('Item not found');
        }

        if (existing.version !== updates.version) {
            throw new Error('Version mismatch');
        }

        // Handle annualProduction field consistently
        let annualProduction;
        if (updates.annualProduction_L !== undefined) {
            annualProduction = updates.annualProduction_L;
        } else if (updates.annualProduction !== undefined) {
            annualProduction = updates.annualProduction;
        } else {
            annualProduction = existing.annualProduction_L;
        }

        // Force banking to 0 if status is Inactive or Maintenance
        const banking = (updates.status === 'Inactive' || updates.status === 'Maintenance') ? 0 : 
                       (updates.banking !== undefined ? updates.banking : existing.banking);

        const updatedItem = {
            ...existing,
            name: updates.name || existing.name,
            location: updates.location || existing.location,
            type: updates.type || existing.type,
            banking: new Decimal(banking).toString(),
            capacity_MW: updates.capacity_MW ? new Decimal(updates.capacity_MW).toString() : existing.capacity_MW,
            annualProduction_L: new Decimal(annualProduction).toString(),
            htscNo: updates.htscNo ? new Decimal(updates.htscNo).toString() : existing.htscNo,
            injectionVoltage_KV: updates.injectionVoltage_KV ? 
                new Decimal(updates.injectionVoltage_KV).toString() : 
                existing.injectionVoltage_KV,
            status: updates.status || existing.status,
            version: existing.version + 1,
            updatedat: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: updatedItem,
            ConditionExpression: 'version = :expectedVersion',
            ExpressionAttributeValues: {
                ':expectedVersion': updates.version
            }
        }));

        return updatedItem;
    } catch (error) {
        logger.error('[ProductionSiteDAL] Update Error:', error);
        throw error;
    }
};

const cleanupRelatedData = async (companyId, productionSiteId) => {
    const siteId = `${companyId}_${productionSiteId}`;
    let cleanupStats = { deletedUnits: 0, deletedCharges: 0 };
    
    try {
        // First check for associated data
        const [unitItems, chargeItems] = await Promise.all([
            docClient.send(new QueryCommand({
                TableName: TableNames.PRODUCTION_UNIT,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: { ':pk': siteId }
            })),
            docClient.send(new QueryCommand({
                TableName: TableNames.PRODUCTION_CHARGE,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: { ':pk': siteId }
            }))
        ]);

        // Batch the deletions in chunks to avoid overwhelming DynamoDB
        for (let i = 0; i < unitItems.Items?.length || 0; i += 25) {
            const batch = unitItems.Items.slice(i, i + 25);
            await Promise.all(batch.map(item => 
                docClient.send(new DeleteCommand({
                    TableName: TableNames.PRODUCTION_UNIT,
                    Key: { pk: item.pk, sk: item.sk }
                }))
            ));
        }
        cleanupStats.deletedUnits = unitItems.Items?.length || 0;

        for (let i = 0; i < chargeItems.Items?.length || 0; i += 25) {
            const batch = chargeItems.Items.slice(i, i + 25);
            await Promise.all(batch.map(item => 
                docClient.send(new DeleteCommand({
                    TableName: TableNames.PRODUCTION_CHARGE,
                    Key: { pk: item.pk, sk: item.sk }
                }))
            ));
        }
        cleanupStats.deletedCharges = chargeItems.Items?.length || 0;

        logger.info(`[ProductionSiteDAL] Cleanup completed for site ${siteId}:`, cleanupStats);
        return cleanupStats;
    } catch (error) {
        logger.error(`[ProductionSiteDAL] Failed to cleanup site ${siteId}:`, error);
        throw error;
    }
};

const deleteItem = async (companyId, productionSiteId) => {
    const timer = logger.startTimer();
    let cleanupResult = null;
    
    try {
        // 1. Check if site exists
        const existingSite = await getItem(companyId, productionSiteId);
        if (!existingSite) {
            throw new Error('Production site not found');
        }

        // 2. Clean up related data
        cleanupResult = await cleanupRelatedData(companyId, productionSiteId);
        
        // 3. Delete the site itself
        const { Attributes } = await docClient.send(new DeleteCommand({
            TableName,
            Key: { 
                companyId: parseInt(companyId), 
                productionSiteId: parseInt(productionSiteId) 
            },
            ReturnValues: 'ALL_OLD'
        }));

        timer.end('Production site deletion completed');
        return {
            ...Attributes,
            relatedDataCleanup: cleanupResult
        };
    } catch (error) {
        logger.error('[ProductionSiteDAL] Delete Error:', {
            error,
            companyId,
            productionSiteId,
            cleanupResult
        });
        throw error;
    }
};

const getAllItems = async () => {
    try {
        const { Items } = await docClient.send(new ScanCommand({
            TableName
        }));
        return Items || [];
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetAll Error:', error);
        throw error;
    }
};

const getAllProductionSites = async () => {
    try {
        logger.info('[ProductionSiteDAL] Fetching all production sites...');
        
        const { Items } = await docClient.send(new ScanCommand({
            TableName
        }));

        // Return empty array if no items found
        if (!Items) {
            logger.info('[ProductionSiteDAL] No items found in table');
            return [];
        }

        logger.info(`[ProductionSiteDAL] Found ${Items.length} production sites`);

        // Transform and validate each item
        return Items.map(item => ({
            companyId: String(item.companyId || '1'),
            productionSiteId: String(item.productionSiteId),
            name: item.name || 'Unnamed Site',
            type: (item.type || 'unknown').toLowerCase(),
            location: item.location || 'Unknown Location',
            status: (item.status || 'active').toLowerCase(),
            version: Number(item.version || 1),
            capacity_MW: item.capacity_MW || '0',
            annualProduction_L: item.annualProduction_L || '0',
            htscNo: item.htscNo || '0',
            injectionVoltage_KV: item.injectionVoltage_KV || '0',
            banking: String(item.banking || '0'),
            createdat: item.createdat || new Date().toISOString(),
            updatedat: item.updatedat || new Date().toISOString()
        }));
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetAll Error:', error);
        throw error;
    }
};

module.exports = {
    create,
    getItem,
    updateItem,
    deleteItem,
    getAllProductionSites,
    getLastProductionSiteId
};

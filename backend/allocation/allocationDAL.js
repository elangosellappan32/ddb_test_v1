const { 
    DynamoDBDocumentClient, 
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const docClient = require('../utils/db');
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');

const formatMonthYearKey = (monthStr) => {
    try {
        if (!monthStr) {
            throw new Error('Month is required');
        }

        // Handle YYYY-MM format
        if (monthStr.includes('-')) {
            const [year, month] = monthStr.split('-');
            return `${month.padStart(2, '0')}${year}`;
        }
        
        // Handle month name format (e.g., "January 2025")
        if (monthStr.includes(' ')) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const [monthName, year] = monthStr.split(' ');
            const monthNum = months.indexOf(monthName) + 1;
            if (monthNum === 0) {
                throw new Error('Invalid month name');
            }
            return `${monthNum.toString().padStart(2, '0')}${year}`;
        }
        
        // If it's already in MMYYYY format, validate and return
        if (monthStr.length === 6) {
            const month = parseInt(monthStr.substring(0, 2));
            if (month < 1 || month > 12) {
                throw new Error('Invalid month in MMYYYY format');
            }
            return monthStr;
        }
        
        throw new Error('Invalid month format. Expected YYYY-MM, "Month YYYY", or MMYYYY');
    } catch (error) {
        logger.error('[AllocationDAL] Month format error:', error);
        throw error;
    }
};

const generateCompositeKey = (item) => {
    try {
        const monthYearKey = formatMonthYearKey(item.month);
        return `${monthYearKey}#${item.productionSiteId}_${item.consumptionSiteId}`;
    } catch (error) {
        logger.error('[AllocationDAL] Key generation error:', error);
        throw error;
    }
};

const getAvailableUnits = async (productionSiteId, period, month) => {
    try {
        // Get all allocations for this site and period
        const allocations = await getAllocationsByPeriod(productionSiteId, period, month);
        
        // Calculate total allocated units
        const allocated = allocations.reduce((sum, alloc) => {
            if (alloc.fromPeriod === period) {
                return sum + Math.abs(alloc.periodAllocations?.[0]?.amount || 0);
            }
            return sum;
        }, 0);

        // Get total available units for this period
        const { Item } = await docClient.send(new GetCommand({
            TableName: TableNames.PRODUCTION_UNIT,
            Key: {
                productionSiteId,
                month: formatMonthYearKey(month)
            }
        }));

        const total = Number(Item?.[period] || 0);
        return total - allocated;
    } catch (error) {
        logger.error('[AllocationDAL] GetAvailableUnits Error:', error);
        throw error;
    }
};

const createAllocation = async (item) => {
    try {
        // Composite PK and MMYYYY SK
        const pk = `${item.productionSiteId}_${item.consumptionSiteId}`;
        const sk = formatMonthYearKey(item.month);

        const now = new Date();
        const ttl = Math.floor(now.setFullYear(now.getFullYear() + 1) / 1000);

        const allocationItem = { ...item, pk, sk, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), version: item.version || 1, ttl };

        await docClient.send(new PutCommand({
            TableName: TableNames.ALLOCATION,
            Item: allocationItem
            // removed ConditionExpression to allow upsert
        }));
        return allocationItem;
    } catch (error) {
        logger.error('[AllocationDAL] Create Error:', error);
        throw error;
    }
};

const getAllocations = async (month, filterBy = {}) => {
    try {
        const monthKey = month ? formatMonthYearKey(month) : null;
        
        // Start with a Query operation using a partition key if possible
        const params = {
            TableName: TableNames.ALLOCATION,
            ConsistentRead: true // Ensure we get latest data
        };

        // Build filter expressions for additional conditions
        const filterConditions = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        // Add month filter
        if (monthKey) {
            filterConditions.push('begins_with(sk, :monthKey)');
            expressionAttributeValues[':monthKey'] = monthKey;
        }

        // Add type filter if specified
        if (filterBy.type) {
            filterConditions.push('#type = :type');
            expressionAttributeValues[':type'] = filterBy.type;
            expressionAttributeNames['#type'] = 'type';
        }

        // Add banking filter if specified
        if (filterBy.isBanking !== undefined) {
            filterConditions.push('isBanking = :isBanking');
            expressionAttributeValues[':isBanking'] = filterBy.isBanking;
        }

        // Add filter expression if we have conditions
        if (filterConditions.length > 0) {
            params.FilterExpression = filterConditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;

            if (Object.keys(expressionAttributeNames).length > 0) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
        }

        // Use scan since we're filtering across all partition keys
        const { Items = [] } = await docClient.send(new ScanCommand(params));
        
        // Sort results by sk (which contains the month) for consistency
        return Items.sort((a, b) => a.sk.localeCompare(b.sk));
    } catch (error) {
        logger.error('[AllocationDAL] GetAll Error:', error);
        throw error;
    }
};

const getAllocationsByPeriod = async (productionSiteId, period, month) => {
    try {
        let params = {
            TableName: TableNames.ALLOCATION,
            FilterExpression: '(fromPeriod = :period OR toPeriod = :period) and availableForAllocation = :available',
            ExpressionAttributeValues: {
                ':period': period,
                ':available': true
            }
        };

        if (productionSiteId) {
            params.KeyConditionExpression = 'pk = :pk';
            params.ExpressionAttributeValues[':pk'] = productionSiteId;
        }

        if (month) {
            const monthKey = formatMonthYearKey(month);
            params.FilterExpression += ' and begins_with(sk, :month)';
            params.ExpressionAttributeValues[':month'] = monthKey;
        }

        const { Items } = await docClient.send(new ScanCommand(params));
        return Items || [];
    } catch (error) {
        logger.error('[AllocationDAL] GetByPeriod Error:', error);
        throw error;
    }
};

const updateAllocation = async (pk, sk, updates) => {
    try {
        // Check if the allocation exists
        const { Item: existing } = await docClient.send(new GetCommand({
            TableName: TableNames.ALLOCATION,
            Key: { pk, sk }
        }));

        if (!existing) {
            throw new Error('Allocation not found');
        }

        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString(),
            version: (existing.version || 0) + 1
        };

        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.entries(updateData).forEach(([key, value]) => {
            if (key !== 'pk' && key !== 'sk') {
                updateExpressionParts.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value;
            }
        });

        const params = {
            TableName: TableNames.ALLOCATION,
            Key: { pk, sk },
            UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));
        return Attributes;
    } catch (error) {
        logger.error('[AllocationDAL] Update Error:', error);
        throw error;
    }
};

const deleteAllocation = async (pk, sk) => {
    try {
        const result = await docClient.send(new DeleteCommand({
            TableName: TableNames.ALLOCATION,
            Key: { pk, sk },
            ReturnValues: 'ALL_OLD'
        }));
        return result.Attributes;
    } catch (error) {
        logger.error('[AllocationDAL] Delete Error:', error);
        throw error;
    }
};

module.exports = {
    createAllocation,
    getAllocations,
    getAllocationsByPeriod,
    updateAllocation,
    deleteAllocation
};
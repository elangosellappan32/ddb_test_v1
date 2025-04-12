const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const logger = require('../utils/logger');
const TableNames = require('../constants/tableNames');

const dynamoDB = new DynamoDB({
    region: process.env.AWS_REGION || 'local',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

const docClient = DynamoDBDocument.from(dynamoDB);

const formatMonthYearKey = (monthStr) => {
    try {
        if (!monthStr) {
            throw new Error('Month string is required');
        }

        // Handle YYYY-MM format
        if (monthStr.includes('-')) {
            const [year, month] = monthStr.split('-');
            if (!year || !month || year.length !== 4) {
                throw new Error('Invalid YYYY-MM format');
            }
            return `${month.padStart(2, '0')}${year}`;
        }
        
        // Handle MMYYYY format
        if (monthStr.length === 6 && !isNaN(monthStr)) {
            const month = monthStr.substring(0, 2);
            const year = monthStr.substring(2);
            if (parseInt(month) < 1 || parseInt(month) > 12) {
                throw new Error('Invalid month in MMYYYY format');
            }
            return monthStr;
        }
        
        throw new Error('Invalid month format. Expected YYYY-MM or MMYYYY');
    } catch (error) {
        logger.error('[AllocationDAL] Month format error:', error);
        throw error;
    }
};

const generateCompositeKey = (item) => {
    const monthYearKey = formatMonthYearKey(item.month);
    const uniqueKey = `${item.productionSiteId}_${item.consumptionSiteId}_${item.period}`;
    return `${monthYearKey}#${uniqueKey}`;
};

const createAllocation = async (item) => {
    try {
        if (!item.productionSiteName || !item.consumptionSiteName) {
            throw new Error('Production site name and consumption site name are required');
        }

        const pk = `${item.productionSiteId || item.productionSiteName.replace(/\s+/g, '_')}`;
        const now = new Date();
        // Set TTL to 1 year from creation date
        const ttl = Math.floor(now.setFullYear(now.getFullYear() + 1) / 1000);

        const allocationItem = {
            ...item,
            pk,
            sk: generateCompositeKey(item),
            createdat: item.createdat || new Date().toISOString(),
            updatedat: new Date().toISOString(),
            version: item.version || 1,
            status: item.status || 'ALLOCATED',
            isBanking: !!item.isBanking,
            c1: Number(item.c1 || 0),
            c2: Number(item.c2 || 0),
            c3: Number(item.c3 || 0),
            c4: Number(item.c4 || 0),
            c5: Number(item.c5 || 0),
            productionSiteName: item.productionSiteName,
            consumptionSiteName: item.consumptionSiteName,
            ttl
        };

        await docClient.put({
            TableName: TableNames.ALLOCATION,
            Item: allocationItem,
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        });

        return allocationItem;
    } catch (error) {
        logger.error('[AllocationDAL] Create Error:', error);
        throw error;
    }
};

const getAllocations = async (pk, month) => {
    try {
        const monthKey = month ? formatMonthYearKey(month) : null;
        
        let params = {
            TableName: TableNames.ALLOCATION,
            FilterExpression: 'begins_with(sk, :month)',
            ExpressionAttributeValues: {
                ':month': monthKey
            }
        };

        if (pk) {
            params.KeyConditionExpression = 'pk = :pk';
            params.ExpressionAttributeValues[':pk'] = pk;
        }

        const { Items } = await docClient.scan(params);
        return Items || [];
    } catch (error) {
        logger.error('[AllocationDAL] GetAll Error:', error);
        throw error;
    }
};

const getAllocationsByPeriod = async (pk, period, month) => {
    try {
        let params = {
            TableName: TableNames.ALLOCATION,
            FilterExpression: 'period = :period',
            ExpressionAttributeValues: {
                ':period': period
            }
        };

        if (pk) {
            params.KeyConditionExpression = 'pk = :pk';
            params.ExpressionAttributeValues[':pk'] = pk;
        }

        if (month) {
            const monthKey = formatMonthYearKey(month);
            params.FilterExpression += ' and begins_with(sk, :month)';
            params.ExpressionAttributeValues[':month'] = monthKey;
        }

        const { Items } = await docClient.scan(params);
        return Items || [];
    } catch (error) {
        logger.error('[AllocationDAL] GetByPeriod Error:', error);
        throw error;
    }
};

const updateAllocation = async (pk, sk, updates) => {
    try {
        const updateData = {
            ...updates,
            updatedat: new Date().toISOString()
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

        const { Attributes } = await docClient.update(params);
        return Attributes;
    } catch (error) {
        logger.error('[AllocationDAL] Update Error:', error);
        throw error;
    }
};

const deleteAllocation = async (pk, sk) => {
    try {
        const result = await docClient.delete({
            TableName: TableNames.ALLOCATION,
            Key: { pk, sk },
            ReturnValues: 'ALL_OLD'
        });
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
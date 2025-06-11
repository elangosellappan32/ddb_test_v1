const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

class IdGenerator {
  /**
   * Generate a new sequential ID for a site
   * @param {string} companyId - The company ID
   * @param {string} siteType - Either 'production' or 'consumption'
   * @returns {Promise<number>} The next available ID
   */
  static async getNextSiteId(siteType) {
    const tableName = process.env.SITES_TABLE;
    const idField = siteType === 'production' ? 'productionSiteId' : 'consumptionSiteId';
    
    try {
      // Scan to get all site IDs across all companies
      const params = {
        TableName: tableName,
        ProjectionExpression: idField,
        Select: 'SPECIFIC_ATTRIBUTES'
      };

      const result = await dynamodb.scan(params).promise();
      
      if (result.Items && result.Items.length > 0) {
        // Find highest ID across all sites and add 1
        const maxId = Math.max(...result.Items
          .map(item => parseInt(item[idField]) || 0));
        return maxId + 1;
      }
      
      // No sites found at all, start with 1
      return 1;
    } catch (error) {
      console.error(`Error getting next ${siteType} site ID for company ${companyId}:`, error);
      throw new Error(`Failed to generate site ID: ${error.message}`);
    }
  }
}

module.exports = IdGenerator;

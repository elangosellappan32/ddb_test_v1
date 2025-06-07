import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { FileDownload as ExcelIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { fetchFormVAData, fetchFormVBData } from '../../services/reportService';

// Format number with commas and optional decimal places
const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

// Format number as percentage with 2 decimal places
const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0.00%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (num * 100).toFixed(2) + '%';
};

// Helper function to safely convert to number with default
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : num;
};

const FormVExcelReport = ({ 
  downloading,
  setDownloading,
  isForm5B,
  financialYear,
  showSnackbar,
  handleOpenDialog
}) => {
  const formatValue = (value, isPercentage = false) => {
    if (value === null || value === undefined) return isPercentage ? '0.00%' : '0.00';
    const num = Number(value);
    return isPercentage ? `${num.toFixed(2)}%` : num.toFixed(2);
  };

  const getCellStyle = (isHeader = false, isSummary = false, isTitle = false, customAlign = 'center') => ({
    border: {
      top: { 
        style: isTitle ? 'thick' : (isHeader || isSummary ? 'medium' : 'thin'),
        color: { rgb: '000000' }
      },
      bottom: { 
        style: isTitle ? 'thick' : (isHeader || isSummary ? 'medium' : 'thin'),
        color: { rgb: '000000' }
      },
      left: { 
        style: isTitle || isHeader ? 'medium' : 'thin',
        color: { rgb: '000000' }
      },
      right: { 
        style: isTitle || isHeader ? 'medium' : 'thin',
        color: { rgb: '000000' }
      }
    },
    alignment: { 
      wrapText: true, 
      vertical: 'center',
      horizontal: customAlign
    },
    font: {
      name: 'Arial',
      bold: isHeader || isSummary || isTitle,
      sz: isTitle ? 14 : (isHeader ? 12 : 11),
      color: { rgb: isTitle ? '000000' : (isHeader ? '000000' : '000000') }
    },
    fill: {
      fgColor: { 
        rgb: isTitle ? 'E0E0E0' : (
          isHeader ? 'F0F0F0' : (
            isSummary ? 'F8F8F8' : 'FFFFFF'
          )
        )
      },
      patternType: 'solid'
    },
    numFmt: isHeader ? '@' : '0.00' // Text format for headers, number format for data
  });      const createFormVA = async (workbook, data) => {
    console.log('=== Starting createFormVA ===');
    console.log('Input data structure:', Object.keys(data));
    
    try {
      console.log('Creating Form V-A worksheet with data:', data);

      // Helper function to safely convert to number with default
      const toNumber = (value, defaultValue = 0) => {
        if (value === null || value === undefined || value === '') return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
      };

      if (!data) {
        console.error('No data available for Form V-A');
        return false;
      }

      console.log('=== Starting Form V-A Report Generation ===');
      console.log('Raw data received:', JSON.stringify(data, null, 2));

      // Process numeric values with proper validation
      const totalGenerated = toNumber(data.totalGeneratedUnits, 0);
      const auxiliaryConsumption = toNumber(data.auxiliaryConsumption, 0);
      const aggregateGeneration = toNumber(data.aggregateGeneration, 0);
      const fiftyOnePercent = toNumber(data.fiftyOnePercentGeneration, 0);
      const actualConsumed = toNumber(data.actualConsumedUnits, 0);
      
      // Calculate consumption percentage safely
      const consumptionPercentage = aggregateGeneration > 0 
        ? (actualConsumed / aggregateGeneration) * 100 
        : 0;

      // Format value for display (without decimals)
      const formatValue = (value, isPercentage = false) => {
        if (isPercentage) {
          return Math.round(value) + '%'; // Remove decimal points
        }
        return value.toLocaleString('en-IN', {
          maximumFractionDigits: 0 // No decimal places
        });
      };

      // Define headers
      const headers = [
        ['FORM V-A'],
        ['Statement showing compliance to the requirement of minimum 51% consumption for Captive Status'],
        [`Financial Year: ${financialYear}`],
        [], // Empty row for spacing
        ['Sl.No.', 'Particulars', 'Energy in Units (kWh)']
      ];

      // Define rows with validated data
      const rows = [
        [1, 'Total Generated units of a generating plant / Station identified for captive use', totalGenerated],
        [2, 'Less : Auxiliary Consumption in the above in units', auxiliaryConsumption],
        [3, 'Net units available for captive consumption (Aggregate generation for captive use)', aggregateGeneration],
        [4, '51% of aggregate generation available for captive consumption in units', fiftyOnePercent],
        [5, 'Actual Adjusted / Consumed units by the captive users', actualConsumed],
        [6, 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 
          consumptionPercentage / 100] // Store as decimal for Excel formatting
      ];

      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows], { cellStyles: true });

      // Set optimized column widths
      ws['!cols'] = [
        { wch: 8 },    // Sl.No
        { wch: 80 },   // Particulars
        { wch: 20 }    // Energy in Units
      ];

      // Define merged ranges
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },  // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },  // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }   // Financial Year
      ];

      // Set optimized row heights
      ws['!rows'] = [
        { hpt: 30 },  // Title
        { hpt: 35 },  // Subtitle
        { hpt: 25 },  // Financial year
        { hpt: 15 },  // Empty row
        { hpt: 40 },  // Header row
        { hpt: 25 },  // Data rows (will apply to all remaining rows)
        { hpt: 25 },
        { hpt: 25 },
        { hpt: 25 },
        { hpt: 25 },
        { hpt: 25 }
      ];

      // Apply styles to all cells
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell]) {
            ws[cell] = { v: '', t: 's' };
          }

          const isTitle = R === 0;
          const isSubtitle = R === 1;
          const isFinancialYear = R === 2;
          const isHeader = R === 4;
          const isData = R > 4;
          const isLastRow = R === range.e.r;
          const isLeftAlign = C === 1;
          const isRightAlign = C === 2 && isData;

          // Apply basic style
          ws[cell].s = getCellStyle(
            isHeader || isTitle || isSubtitle || isFinancialYear,
            isLastRow,
            isTitle || isSubtitle,
            isLeftAlign ? 'left' : (isRightAlign ? 'right' : 'center')
          );

          // Apply number formats based on column type
          if (isData) {
            // For Form V-A, the last row is a percentage, others are numbers
            if (R === rows.length + 4) { // Last data row (percentage)
              ws[cell].z = '0%'; // No decimal places for percentage
              if (ws[cell].v !== undefined && ws[cell].v !== null) {
                // Round to nearest whole number for percentage
                ws[cell].v = Math.round(toNumber(ws[cell].v, 0)) / 100;
              }
            } else if (C === 2) { // Values column
              ws[cell].z = '#,##0'; // No decimal places
              if (ws[cell].v !== undefined && ws[cell].v !== null) {
                // Round to nearest whole number
                ws[cell].v = Math.round(toNumber(ws[cell].v, 0));
              }
            }
          }
        }
      }

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, ws, 'Form V-A');
      
      return true;
    } catch (error) {
      console.error('Error creating Form V-A worksheet:', error);
      return false;
    }
  };

  const getSiteName = async (site, index) => {
    // Format the site name with proper hierarchy and formatting
    const formatParts = (parts) => {
      return parts
        .filter(part => part && typeof part === 'string' && part.trim())
        .map(part => part.trim())
        .filter(Boolean) // Remove any empty strings
        .join(' - ');
    };

    try {
      // Try to get from nested consumptionSite object first
      if (site.consumptionSite) {
        const { name, companyName, consumerNumber, state, location } = site.consumptionSite;
        const parts = [];

        // Add company name if available
        if (companyName) parts.push(companyName);
        // Add site name
        if (name) parts.push(name);
        // Add location/state
        if (location && state) {
          parts.push(`${location}, ${state}`);
        } else if (location) {
          parts.push(location);
        } else if (state) {
          parts.push(state);
        }
        // Add consumer number if available
        if (consumerNumber) {
          parts.push(`(HT No: ${consumerNumber})`);
        }

        const formattedName = formatParts(parts);
        if (formattedName) return formattedName;
      }

      // If we have a consumptionSiteId but no consumptionSite object, try to fetch it
      if (site.consumptionSiteId) {
        try {
          console.log(`Fetching consumption site details for ID: ${site.consumptionSiteId}`);
          const response = await fetch(`/api/consumption-sites/${site.consumptionSiteId}`);
          
          if (response.ok) {
            const data = await response.json();
            const consumptionSite = data.data || data; // Handle both { data: {...} } and direct object responses
            
            if (consumptionSite) {
              const parts = [];
              
              // Handle different possible field names for company name
              const companyName = consumptionSite.companyName || consumptionSite.company_name;
              const siteName = consumptionSite.name || consumptionSite.siteName;
              const consumerNumber = consumptionSite.consumerNumber || consumptionSite.htscNo;
              const location = consumptionSite.location || consumptionSite.address;
              const state = consumptionSite.state;
              
              if (companyName) parts.push(companyName);
              if (siteName) parts.push(siteName);
              if (location) parts.push(location);
              if (state) parts.push(state);
              if (consumerNumber) parts.push(`(HT No: ${consumerNumber})`);
              
              const formattedName = formatParts(parts);
              if (formattedName) {
                // Cache the consumption site data to avoid refetching
                site.consumptionSite = consumptionSite;
                return formattedName;
              }
            }
          } else {
            console.warn(`Failed to fetch consumption site ${site.consumptionSiteId}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error fetching consumption site:', error);
        }
      }

      // Fallback to direct site properties if consumptionSite is not available
      const parts = [];
      
      // Try different possible field names
      const companyName = site.companyName || site.company_name;
      const siteName = site.siteName || site.name;
      const consumerNumber = site.consumerNumber || site.htscNo;
      const location = site.location || site.address;
      
      if (companyName) parts.push(companyName);
      if (siteName) parts.push(siteName);
      if (location) parts.push(location);
      if (site.state) parts.push(site.state);
      if (consumerNumber) {
        parts.push(`(HT No: ${consumerNumber})`);
      } else if (site.consumptionSiteId) {
        parts.push(`(ID: ${site.consumptionSiteId})`);
      }

      const formattedName = formatParts(parts);
      if (formattedName) return formattedName;

      // Final fallback
      return `Consumption Site ${index + 1}`;
    } catch (error) {
      console.error('Error in getSiteName:', error);
      return `Site ${index + 1} (Error: ${error.message})`;
    }
  };

  const createFormVB = async (workbook, data) => {
    try {
      if (!data?.siteMetrics?.length) {
        console.error('No site metrics data available for Form V-B');
        return false;
      }

      // Create worksheet first before trying to access it
      const headers = [
        ['FORMAT V-B'],
        ['Statement showing compliance to the requirement of proportionality of consumption for Captive Status'],
        [],
        [],
        [],
        [`Financial Year: ${financialYear}`],
        [],
        [
          'Sl. No.',
          'Name of Share Holder',
          'No. of equity shares of value Rs. /-',
          '% of ownership through shares in Company/unit of CGP',
          '100% annual generation in MUs (x)',
          'Annual Auxiliary consumption in MUs (y)',
          'Generation considered to verify consumption criteria in MUs (x-y)*51%',
          'Permitted consumption as per norms in MUs', // Modified header
          '',
          '',
          'Actual\nConsumption\n(MUs)',
          'Consumption\nNorms Met'
        ],
        [
          '',
          '',
          'No. of equity shares',
          '% of ownership',
          '',
          '',
          '',
          '', // Empty cell as it's merged
          '', // Empty cell as it's merged
          '', // Empty cell as it's merged
          '',
          ''
        ]
      ];

      // Define merged ranges for auxiliary consumption column (modify in createFormVB function)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },  // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },  // Subtitle
        { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },  // Financial Year
        { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },   // No. of equity shares header
        { s: { r: 7, c: 7 }, e: { r: 8, c: 9 } },   // Permitted consumption header
        // Merge auxiliary consumption for site rows only (excluding total row)
        { s: { r: 9, c: 5 }, e: { r: 9 + data.siteMetrics.length - 1, c: 5 } }
      ];

      // Process data rows
      const dataRows = data.siteMetrics.map((site, index) => [
        index + 1,
        site.siteName || `Site ${index + 1}`,
        site.equityShares || 0,
        (site.ownershipPercentage || 0) / 100,
        site.annualGeneration || 0,
        index === 0 ? site.auxiliaryConsumption || 0 : '', // Show auxiliary consumption only in first row
        site.generationForConsumption || 0,
        index === 0 ? (site.permittedConsumption || 0) : '',
        index === 0 ? (site.permittedMinus10 || 0) : '',
        index === 0 ? (site.permittedPlus10 || 0) : '',
        site.actualConsumption || 0,
        site.consumptionNormsMet ? 'Yes' : 'No'
      ]);

      // Calculate totals for the merged cells
      const totals = data.siteMetrics.reduce((acc, site) => ({
        equityShares: acc.equityShares + (site.equityShares || 0),
        annualGeneration: acc.annualGeneration + (site.annualGeneration || 0),
        auxiliaryConsumption: data.siteMetrics[0].auxiliaryConsumption || 0, // Use first row only
        generationForConsumption: acc.generationForConsumption + (site.generationForConsumption || 0),
        permittedConsumption: data.siteMetrics[0].permittedConsumption || 0, // Use first row only
        permittedMinus10: data.siteMetrics[0].permittedMinus10 || 0, // Use first row only
        permittedPlus10: data.siteMetrics[0].permittedPlus10 || 0, // Use first row only
        actualConsumption: acc.actualConsumption + (site.actualConsumption || 0)
      }), {
        equityShares: 0,
        annualGeneration: 0,
        auxiliaryConsumption: 0,
        generationForConsumption: 0,
        permittedConsumption: 0,
        permittedMinus10: 0,
        permittedPlus10: 0,
        actualConsumption: 0
      });

      // Add total row to dataRows
      const totalRow = [
        'Total',
        '',
        totals.equityShares,
        '', // Leave ownership % empty
        totals.annualGeneration,
        totals.auxiliaryConsumption, // Show auxiliary consumption in total row
        totals.generationForConsumption,
        totals.permittedConsumption,
        totals.permittedMinus10,
        totals.permittedPlus10,
        totals.actualConsumption,
        '' // Leave norms met empty
      ];
      dataRows.push(totalRow);

      // Create worksheet with headers and data
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...dataRows]);

      // Add merge range for total row cells
      const totalRowIndex = headers.length + dataRows.length - 1;
      ws['!merges'].push(
        // Merge "Total" across first two columns
        { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 1 } },
        // Merge permitted consumption columns in total row
        { s: { r: totalRowIndex, c: 7 }, e: { r: totalRowIndex, c: 9 } }
      );

      // Apply total row styling
      const totalRowStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F2F2F2' }, patternType: 'solid' },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Apply total row formatting
      for (let C = 0; C <= 11; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
        ws[cellRef].s = totalRowStyle;
        
        // Apply number format for numeric cells
        if ([2, 4, 5, 6, 7, 8, 9, 10].includes(C)) {
          ws[cellRef].z = '#,##0.00';
        }
      }

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },     // Sl. No.
        { wch: 40 },    // Name
        { wch: 20 },    // Equity shares
        { wch: 25 },    // Ownership %
        { wch: 25 },    // Annual generation
        { wch: 25 },    // Auxiliary consumption
        { wch: 30 },    // Generation considered
        { wch: 20 },    // Permitted consumption
        { wch: 15 },    // -10%
        { wch: 15 },    // +10%
        { wch: 20 },    // Actual consumption
        { wch: 15 }     // Norms met
      ];

      // Define merged ranges
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },  // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },  // Subtitle
        { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },  // Financial Year
        { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },   // No. of equity shares header
        { s: { r: 7, c: 7 }, e: { r: 8, c: 9 } },   // Permitted consumption header
        // Merge auxiliary consumption for site rows only (excluding total row)
        { s: { r: 9, c: 5 }, e: { r: 9 + dataRows.length - 1, c: 5 } }
      ];

      // Apply styles and number formats
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;

          const isHeader = R <= 8;
          const isData = R > 8;
          
          ws[cellRef].s = getCellStyle(
            isHeader,
            false,
            R === 0 || R === 1,
            C === 1 ? 'left' : 'center'
          );

          // Apply number formats for data rows
          if (isData) {
            if (C === 3) { // Ownership percentage
              ws[cellRef].z = '0.00%';
            } else if ([4, 5, 6, 7, 8, 9, 10].includes(C)) { // Numeric columns
              ws[cellRef].z = '#,##0.00';
            }
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, 'Form V-B');
      return true;

    } catch (error) {
      console.error('Error creating Form V-B worksheet:', error);
      return false;
    }
  };

  const applyFormVBCellFormats = (ws, cell, R, C, isData) => {
    if (!isData) return;

    const cellRef = ws[cell];
    if (!cellRef) return;

    // Define column types
    const percentageColumns = [3, 4, 7];  // Ownership, Allocation, Auxiliary Consumption
    const numberColumns = [2, 5, 6, 8, 9, 10, 11, 12];  // Numbers and amounts
    const textColumns = [1, 13];  // Name and Norms Met columns

    if (percentageColumns.includes(C)) {
      cellRef.z = '0.00%';
      // Ensure percentage values are in decimal form (e.g., 0.25 for 25%)
      if (cellRef.v && typeof cellRef.v === 'number') {
        if (cellRef.v > 1) {
          cellRef.v = cellRef.v / 100;
        }
      }
    } else if (numberColumns.includes(C)) {
      cellRef.z = '#,##0.00';
      // Ensure numeric values are properly formatted
      if (cellRef.v && typeof cellRef.v === 'string') {
        cellRef.v = parseFloat(cellRef.v) || 0;
      }
    } else if (textColumns.includes(C)) {
      cellRef.t = 's';  // Set type as string
    }
  };

  const downloadExcel = async () => {
    try {
      if (!financialYear) {
        throw new Error('Please select a financial year');
      }

      setDownloading(prev => ({ ...prev, excel: true }));
      showSnackbar(`Fetching data for ${financialYear}...`, 'info');

      const workbook = XLSX.utils.book_new();

      // Fetch Form V-A data
      const formVAResponse = await fetchFormVAData(financialYear);
      console.log('Form V-A API Response:', formVAResponse);

      if (!formVAResponse) {
        throw new Error('No response received from Form V-A API');
      }

      // Map the API response to match createFormVA's expected format
      const formVAData = {
        totalGeneratedUnits: formVAResponse.totalGeneratedUnits,
        auxiliaryConsumption: formVAResponse.auxiliaryConsumption,
        aggregateGeneration: formVAResponse.aggregateGeneration,
        fiftyOnePercentGeneration: formVAResponse.percentage51,
        actualConsumedUnits: formVAResponse.totalAllocatedUnits,
        consumptionPercentage: formVAResponse.percentageConsumed
      };

      // Create Form V-A worksheet
      const formVACreated = createFormVA(workbook, formVAData);
      if (!formVACreated) {
        throw new Error('Failed to create Form V-A worksheet');
      }

      // Fetch Form V-B data
      const formVBResponse = await fetchFormVBData(financialYear);
      console.log('Form V-B API Response:', formVBResponse);

      if (!formVBResponse) {
        throw new Error('No response received from Form V-B API');
      }

      // Validate and normalize Form V-B data
      console.log('Raw Form V-B response:', formVBResponse);
      
      if (!formVBResponse.success || !formVBResponse.data) {
        console.error('Invalid Form V-B response format - missing success or data');
        throw new Error('Invalid Form V-B response format');
      }

      console.log('Processing Form V-B data:', formVBResponse.data);

      // Ensure site metrics is an array
      if (!Array.isArray(formVBResponse.data.siteMetrics)) {
        console.error('Site metrics is not an array. Type:', typeof formVBResponse.data.siteMetrics);
        console.error('Available keys in data:', Object.keys(formVBResponse.data));
        throw new Error('Invalid site metrics data structure');
      }
      
      console.log(`Found ${formVBResponse.data.siteMetrics.length} site metrics`);
      if (formVBResponse.data.siteMetrics.length > 0) {
        console.log('First site metric:', formVBResponse.data.siteMetrics[0]);
      }

      // Map Form V-B data properly
      const formVBData = {
        aggregateGeneration: parseFloat(formVBResponse.data.aggregateGeneration || 0),
        auxiliaryConsumption: parseFloat(formVBResponse.data.auxiliaryConsumption || 0),
        totalGeneratedUnits: parseFloat(formVBResponse.data.totalGeneratedUnits || 0),
        siteMetrics: formVBResponse.data.siteMetrics.map(site => {
          // Calculate actual consumption proportions
          const basePermitted = parseFloat(site.permittedConsumption || 0);
          const minus10 = basePermitted * 0.9;
          const plus10 = basePermitted * 1.1;
          const actualConsumption = parseFloat(site.actualConsumption || 0);

          return {
            consumptionSite: site.consumptionSite,
            equityShares: parseFloat(site.equityShares || 0),
            ownershipPercentage: parseFloat(site.ownershipPercentage || 0),
            allocationPercentage: parseFloat(site.allocationPercentage || 0),
            unitsConsumed: parseFloat(site.unitsConsumed || 0),
            annualGeneration: parseFloat(site.annualGeneration || 0),
            auxiliaryConsumption: parseFloat(site.auxiliaryConsumption || 0),
            generationForConsumption: parseFloat(site.generationForConsumption || 0),
            permittedConsumption: basePermitted,
            permittedMinus10: minus10,
            permittedPlus10: plus10,
            actualConsumption: actualConsumption,
            consumptionNormsMet: actualConsumption >= minus10 && actualConsumption <= plus10
          };
        })
      };

      // Create Form V-B worksheet with mapped data (async)
      const formVBCreated = await createFormVB(workbook, formVBData);
      if (!formVBCreated) {
        throw new Error('Failed to create Form V-B worksheet');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);

      // Download the Excel file
      const a = document.createElement('a');
      a.href = url;
      a.download = `FormV_Report_${financialYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSnackbar(`Excel report for ${financialYear} downloaded successfully`, 'success');
    } catch (error) {
      console.error('Error downloading Excel report:', error);
      showSnackbar(`Failed to download Excel report: ${error.message}`, 'error');
    } finally {
      setDownloading(prev => ({ ...prev, excel: false }));
    }
  };

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        onClick={downloadExcel}
        disabled={downloading.excel}
        startIcon={downloading.excel ? <CircularProgress size={20} /> : <ExcelIcon />}
      >
        {downloading.excel ? 'Downloading...' : 'Download Excel Report'}
      </Button>
    </div>
  );
};

export default FormVExcelReport;

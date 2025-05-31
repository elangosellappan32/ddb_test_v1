import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { FileDownload as ExcelIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { fetchFormVAData, fetchFormVBData } from '../../services/reportService';

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
  });      const createFormVA = (workbook, data) => {
    try {
      console.log('Creating Form V-A worksheet with data:', data);

      // Validate data
      if (!data || typeof data !== 'object') {
        console.error('Invalid Form V-A data:', data);
        return false;
      }

      // Pre-process and validate values
      const processedData = {
        totalGeneratedUnits: Number(data.totalGeneratedUnits || 0),
        auxiliaryConsumption: Number(data.auxiliaryConsumption || 0),
        aggregateGeneration: Number(data.aggregateGeneration || 0),
        fiftyOnePercentGeneration: Number(data.fiftyOnePercentGeneration || 0),
        actualConsumedUnits: Number(data.actualConsumedUnits || 0),
        consumptionPercentage: Number(data.consumptionPercentage || 0)
      };

      // Define headers
      const headers = [
        ['FORMAT V-A'],
        ['Statement showing compliance to the requirement of minimum 51% consumption for Captive Status'],
        [`Financial Year: ${financialYear}`],
        [], // Empty row for spacing
        ['Sl.No.', 'Particulars', 'Energy in Units (kWh)']
      ];

      // Define rows with validated data
      const rows = [
        [1, 'Total Generated units of a generating plant / Station identified for captive use', formatValue(processedData.totalGeneratedUnits)],
        [2, 'Less : Auxiliary Consumption in the above in units', formatValue(processedData.auxiliaryConsumption)],
        [3, 'Net units available for captive consumption (Aggregate generation for captive use)', formatValue(processedData.aggregateGeneration)],
        [4, '51% of aggregate generation available for captive consumption in units', formatValue(processedData.fiftyOnePercentGeneration)],
        [5, 'Actual Adjusted / Consumed units by the captive users', formatValue(processedData.actualConsumedUnits)],
        [6, 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', formatValue(processedData.consumptionPercentage, true)]
      ];

      // Create worksheet with validated data
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
            // Define column types
            const percentageCols = [3, 4, 7]; // Ownership, Allocation, Auxiliary Consumption
            const numberCols = [2, 5, 6, 8, 9, 10, 11, 12]; // Numbers and amounts
            
            if (percentageCols.includes(C)) {
              ws[cell].z = '0.00%';
              if (ws[cell].v && typeof ws[cell].v === 'string') {
                ws[cell].v = Number(ws[cell].v.replace('%', '')) / 100;
              }
            } else if (numberCols.includes(C)) {
              ws[cell].z = '#,##0.00';
              if (ws[cell].v) {
                ws[cell].v = Number(ws[cell].v);
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

  const getSiteName = (site, index) => {
    // Format the site name with proper hierarchy and formatting
    const formatParts = (parts) => {
      return parts
        .filter(part => part && typeof part === 'string' && part.trim())
        .map(part => part.trim())
        .join(' - ');
    };

    // Try to get name from consumptionSite first (primary source)
    if (site.consumptionSite) {
      const { name, companyName, consumerNumber, state, location } = site.consumptionSite;
      const parts = [];

      // Add company name if available
      if (companyName) {
        parts.push(companyName);
      }

      // Add site name
      if (name) {
        parts.push(name);
      }

      // Add location/state if available
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
      if (formattedName) {
        return formattedName;
      }
    }

    // Fallback to direct site properties if consumptionSite is not available
    const parts = [];
    
    if (site.companyName) {
      parts.push(site.companyName);
    }
    
    if (site.siteName) {
      parts.push(site.siteName);
    } else if (site.name) {
      parts.push(site.name);
    }
    
    if (site.location) {
      parts.push(site.location);
    }
    
    if (site.consumerNumber) {
      parts.push(`(HT No: ${site.consumerNumber})`);
    } else if (site.consumptionSiteId) {
      parts.push(`(ID: ${site.consumptionSiteId})`);
    }

    const formattedName = formatParts(parts);
    if (formattedName) {
      return formattedName;
    }

    // Final fallback
    return `Consumption Site ${index + 1}`;
};

  const createFormVB = (workbook, data) => {
    if (!data?.siteMetrics?.length) {
      console.error('No site metrics data available for Form V-B');
      return false;
    }

    try {
      console.log('Creating Form V-B worksheet with data:', data);
      
      // Define headers with proper structure matching UI exactly
      const headers = [
        ['FORMAT V-B'],
        ['Statement showing compliance to the requirement of proportionality of consumption for Captive Status'],
        [`Financial Year: ${financialYear}`],
        [], // Empty row for spacing
        [
          'Sl.\nNo.',
          'Name of\nShare Holder',
          'Number of\nEquity Shares',
          'Ownership\n(%)',
          'Pro-rata\nConsumption\n(%)',
          'Units\nConsumption\n(kWh)',
          'Annual\nGeneration\n(MUs)',
          'Auxiliary\nConsumption\n(%)',
          'Generation for\nConsumption\n(MUs)',
          'Permitted Consumption (MUs)',
          '',
          '',
          'Actual\nConsumption\n(MUs)',
          'Consumption\nNorms Met'
        ],
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '0%',
          '-10%',
          '+10%',
          '',
          ''
        ]
      ];

      // Process site metrics with proper data handling
      const rows = data.siteMetrics.map((site, index) => {
        // Get properly formatted site name with all available information
        const siteName = getSiteName(site, index);

        // Process numeric values with proper validation and defaults
        const values = {
          equityShares: parseFloat(site.equityShares || '0'),
          ownershipPercentage: parseFloat(site.ownershipPercentage || '0'),
          allocationPercentage: parseFloat(site.allocationPercentage || '0'),
          unitsConsumed: parseFloat(site.unitsConsumed || '0'),
          annualGeneration: parseFloat(site.annualGeneration || '0'),
          auxiliaryConsumption: parseFloat(site.auxiliaryConsumption || '0'),
          generationForConsumption: parseFloat(site.generationForConsumption || '0'),
          permittedConsumption: parseFloat(site.permittedConsumption || '0'),
          actualConsumption: parseFloat(site.actualConsumption || '0')
        };

        // Calculate permitted consumption ranges
        const basePermitted = values.permittedConsumption;
        const minus10Percent = basePermitted * 0.9;
        const plus10Percent = basePermitted * 1.1;

        return [
          index + 1,
          siteName,
          values.equityShares,
          values.ownershipPercentage / 100, // Convert to decimal for percentage formatting
          values.allocationPercentage / 100,
          values.unitsConsumed,
          values.annualGeneration,
          values.auxiliaryConsumption / 100,
          values.generationForConsumption,
          basePermitted,
          minus10Percent,
          plus10Percent,
          values.actualConsumption,
          values.actualConsumption >= minus10Percent && 
          values.actualConsumption <= plus10Percent ? 'Yes' : 'No'
        ];
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);

      // Set column widths to match UI
      ws['!cols'] = [
        { wch: 6 },     // Sl. No.
        { wch: 45 },    // Name of Share Holder
        { wch: 15 },    // Number of Equity Shares
        { wch: 12 },    // Ownership (%)
        { wch: 15 },    // Pro-rata Consumption (%)
        { wch: 20 },    // Units Consumption (kWh)
        { wch: 15 },    // Annual Generation (MUs)
        { wch: 15 },    // Auxiliary Consumption (%)
        { wch: 18 },    // Generation for Consumption (MUs)
        { wch: 15 },    // Permitted Consumption (0%)
        { wch: 12 },    // Permitted Consumption (-10%)
        { wch: 12 },    // Permitted Consumption (+10%)
        { wch: 15 },    // Actual Consumption (MUs)
        { wch: 15 }     // Consumption Norms Met
      ];

      // Set row heights
      ws['!rows'] = [
        { hpt: 30 },   // Title
        { hpt: 35 },   // Subtitle
        { hpt: 25 },   // Financial year
        { hpt: 15 },   // Empty row
        { hpt: 60 },   // Header row (increased for wrapped text)
        { hpt: 25 },   // Subheader row
        ...Array(data.siteMetrics.length).fill({ hpt: 25 }) // Data rows
      ];

      // Set merged ranges
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },  // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },  // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },  // Financial Year
        { s: { r: 4, c: 9 }, e: { r: 4, c: 11 } }   // Permitted Consumption header
      ];

      // Apply cell styles and formats
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };

          const isTitle = R === 0;
          const isSubtitle = R === 1;
          const isFinancialYear = R === 2;
          const isHeader = R === 4;
          const isSubheader = R === 5;
          const isDataRow = R >= 6;

          // Apply cell style with proper borders
          ws[cellRef].s = {
            font: {
              name: 'Arial',
              sz: isTitle ? 14 : (isHeader ? 12 : 11),
              bold: isTitle || isHeader || isSubheader,
              color: { rgb: '000000' }
            },
            fill: {
              fgColor: { rgb: isHeader || isSubheader ? 'F2F2F2' : 'FFFFFF' },
              patternType: 'solid'
            },
            alignment: {
              vertical: 'center',
              horizontal: (C === 1 || (isHeader && [1,2,3,4,5].includes(C))) ? 'left' : 'center',
              wrapText: true
            },
            border: {
              top: { style: isTitle || isHeader ? 'medium' : 'thin', color: { rgb: '000000' } },
              bottom: { style: isTitle || R === range.e.r ? 'medium' : 'thin', color: { rgb: '000000' } },
              left: { style: C === 0 ? 'medium' : 'thin', color: { rgb: '000000' } },
              right: { style: C === range.e.c ? 'medium' : 'thin', color: { rgb: '000000' } }
            }
          };

          // Apply number formats
          if (isDataRow) {
            if ([3, 4, 7].includes(C)) {  // Percentage columns
              ws[cellRef].z = '0.00%';
            } else if ([2, 5, 6, 8, 9, 10, 11, 12].includes(C)) {  // Number columns
              ws[cellRef].z = '#,##0.00';
            }
          }
        }
      }

      // Add the worksheet to workbook
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
      if (!formVBResponse.success || !formVBResponse.data) {
        throw new Error('Invalid Form V-B response format');
      }

      console.log('Processing Form V-B data:', formVBResponse.data);

      // Ensure site metrics is an array
      if (!Array.isArray(formVBResponse.data.siteMetrics)) {
        console.error('Site metrics is not an array:', formVBResponse.data.siteMetrics);
        throw new Error('Invalid site metrics data structure');
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

      // Create Form V-B worksheet with mapped data
      const formVBCreated = createFormVB(workbook, formVBData);
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

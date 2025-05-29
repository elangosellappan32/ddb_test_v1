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
  const downloadExcel = async () => {
    try {
      setDownloading(prev => ({ ...prev, excel: true }));
      const wb = XLSX.utils.book_new();

      // Fetch data for both FormVA and FormVB
      const formVAResponse = await fetchFormVAData(financialYear);
      const formVBResponse = await fetchFormVBData(financialYear);

      if (!formVAResponse || !formVBResponse || !formVBResponse.data) {
        throw new Error('No data available for the selected financial year');
      }

      // Helper function for safer number formatting
      const formatValue = (value, isPercentage = false) => {
        const num = Number(value || 0);
        return isPercentage ? `${num.toFixed(2)}%` : num.toFixed(2);
      };

      // Log the full FormVA response for debugging
      console.log('Full FormVA Response:', JSON.stringify(formVAResponse, null, 2));

      // Determine FormVA data structure
      let formVAData;
      if (formVAResponse.data) {
        formVAData = formVAResponse.data;
      } else if (Array.isArray(formVAResponse)) {
        formVAData = formVAResponse;
      } else {
        formVAData = [formVAResponse];
      }

      // Prepare Form V-A data to match UI structure
      const prepareFormVAData = () => {
        if (!formVAData || formVAData.length === 0) {
          return [
            { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'B': '', 'C': '', 'Energy in Units': 0 },
            { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': 0 },
            { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': 0 },
            { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': 0 },
            { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': 0 },
            { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': '0%' }
          ];
        }

        // Assuming first item in formVAData contains the summary
        const firstItem = formVAData[0];

        return [
          { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': firstItem.totalGeneratedUnits || 0 },
          { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': firstItem.auxiliaryConsumption || 0 },
          { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': firstItem.aggregateGeneration || 0 },
          { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': firstItem.percentage51 || 0 },
          { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': firstItem.totalAllocatedUnits || 0 },
          { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': `${(Number(firstItem.percentageAdjusted || 0)).toFixed(2)}%` }
        ];
      };

      // Prepare Form V-A data rows
      const formVADataRows = prepareFormVAData();

      // Create worksheet with headers first
      const formVAHeaders = [
        ['FORMAT V-A'],
        [`Financial Year: ${financialYear}`],
        [],  // Empty row for spacing
        ['Sl.No.', 'Particulars', 'Energy in Units']  // Column headers
      ];

      // Create worksheet
      const formVAWorksheet = XLSX.utils.aoa_to_sheet([
        ...formVAHeaders,
        ...formVADataRows.map(row => [row['Sl.No.'], row['Particulars'], row['Energy in Units']])
      ]);

      // Merge cells for title and financial year
      formVAWorksheet['!merges'] = [
        // Title merge
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        // Financial Year merge
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }
      ];
      
      // Set column widths
      formVAWorksheet['!cols'] = [
        { width: 8 },   // Sl.No.
        { width: 90 },  // Particulars
        { width: 25 }   // Energy in Units
      ];

      // Add borders and text wrap to all cells
      const formVARange = XLSX.utils.decode_range(formVAWorksheet['!ref']);
      for (let R = formVARange.s.r; R <= formVARange.e.r; ++R) {
        for (let C = formVARange.s.c; C <= formVARange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!formVAWorksheet[cellAddress]) continue;
          if (!formVAWorksheet[cellAddress].s) formVAWorksheet[cellAddress].s = {};
          
          // Base styles for all cells
          formVAWorksheet[cellAddress].s = {
            ...formVAWorksheet[cellAddress].s,
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: { 
              wrapText: true, 
              vertical: 'center',
              horizontal: R <= 3 ? 'center' : (C === 2 ? 'right' : (C === 0 ? 'center' : 'left'))
            }
          };

          // Header styles (title, financial year, and column headers)
          if (R <= 3) {
            formVAWorksheet[cellAddress].s.font = { 
              bold: true,
              sz: R === 0 ? 14 : 11
            };
            formVAWorksheet[cellAddress].s.fill = {
              fgColor: { rgb: 'F2F2F2' },
              patternType: 'solid'
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, formVAWorksheet, 'FormVA');

      // FormVB Sheet
      const formVBData = formVBResponse.data;
      // Prepare Form V-B headers to match complex UI structure
      const mainHeaders1 = [
        { label: 'Sl. No.', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Name of share holder', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'No. of equity shares', colSpan: 2, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '% to be consumed on pro rata basis by each captive user', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '100% annual generation in MUs (x)', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Annual Auxiliary consumption in MUs (y)', colSpan: 2, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Generation considered to verify consumption criteria in MUs (x-y)*51%', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Permitted consumption as per norms in MUs', colSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Actual consumption in MUs', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: 'Whether consumption norms met', rowSpan: 3, style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } }
      ];

      const mainHeaders2 = [
        '',
        '',
        { label: 'As per share certificates as on 31st March', style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '% of ownership through shares in Company/unit of CGP', style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        '',
        '',
        '',
        '',
        { label: 'with 0% variation', style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '-10%', style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        { label: '+10%', style: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'F5F5F5' }, patternType: 'solid' } } },
        '',
        ''
      ];

      const dataRows = formVBData.siteMetrics.map((site, index) => [
        index + 1,
        (site.siteName || site.name || 'Unnamed Site').trim(), // Ensure clean site name
        site.equityShares || '',
        '',
        formatValue(site.allocationPercentage, true),
        formatValue(site.annualGeneration),
        formatValue(formVBData.totalGeneratedUnits),
        index === 0 ? formatValue(site.auxiliaryConsumption) : '',
        formatValue(site.verificationCriteria),
        index === 0 ? formatValue(site.permittedConsumption?.withZero) : '',
        index === 0 ? formatValue(site.permittedConsumption?.minus10) : '',
        index === 0 ? formatValue(site.permittedConsumption?.plus10) : '',
        formatValue(site.actualConsumption),
        site.normsCompliance ? 'Yes' : 'No'
      ]);

      // Update summary row with better formatting
      const summaryRow = [
        'Total',
        '',
        '',
        '',
        formatValue(formVBData.siteMetrics.reduce((sum, site) => sum + (site.allocationPercentage || 0), 0), true),
        formatValue(formVBData.totalGeneratedUnits),
        formatValue(formVBData.totalGeneratedUnits),
        formatValue(formVBData.auxiliaryConsumption),
        formatValue(formVBData.percentage51 || 0),
        formatValue(formVBData.totalPermittedConsumption?.withZero || 0),
        formatValue(formVBData.totalPermittedConsumption?.minus10 || 0),
        formatValue(formVBData.totalPermittedConsumption?.plus10 || 0),
        formatValue(formVBData.totalActualConsumption || 0),
        ''
      ];

      // Prepare the full worksheet data with all headers and rows
      const formVBWorksheetData = [
        [`FORMAT V-B`, `Financial Year: ${financialYear}`],
        [],
        mainHeaders1.map(header => header.label || header),
        mainHeaders2.map(header => header.label || header),
        ...dataRows,
        summaryRow
      ];

      // Create the worksheet
      const formVBWorksheet = XLSX.utils.aoa_to_sheet(formVBWorksheetData);
      
      // Set merge cells configuration for proper header structure
      formVBWorksheet['!merges'] = [
        // Title and year merges across all columns
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
        
        // Row-span merges for main headers
        { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },    // Sl. No.
        { s: { r: 2, c: 1 }, e: { r: 4, c: 1 } },    // Name of share holder
        { s: { r: 2, c: 4 }, e: { r: 4, c: 4 } },    // % to be consumed
        { s: { r: 2, c: 5 }, e: { r: 4, c: 5 } },    // 100% annual generation
        { s: { r: 2, c: 8 }, e: { r: 4, c: 8 } },    // Generation considered
        { s: { r: 2, c: 12 }, e: { r: 4, c: 12 } },  // Actual consumption
        { s: { r: 2, c: 13 }, e: { r: 4, c: 13 } },  // Whether norms met
        
        // Column-span merges for multi-column headers
        { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },    // No. of equity shares
        { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },    // Annual Auxiliary consumption
        { s: { r: 2, c: 9 }, e: { r: 2, c: 11 } }    // Permitted consumption
      ];

      // Adjust column widths and row heights for better readability
      formVBWorksheet['!cols'] = [
        { width: 6 },    // Sl. No.
        { width: 35 },   // Name of share holder
        { width: 18 },   // Equity Shares 1
        { width: 18 },   // Equity Shares 2
        { width: 20 },   // % Consumed
        { width: 20 },   // Annual Generation
        { width: 20 },   // Total Generated Units
        { width: 20 },   // Auxiliary Consumption
        { width: 30 },   // Verification Criteria
        { width: 20 },   // Permitted Consumption 0%
        { width: 15 },   // Permitted Consumption -10%
        { width: 15 },   // Permitted Consumption +10%
        { width: 20 },   // Actual Consumption
        { width: 15 }    // Norms Met
      ];
      
      // Set row heights for better readability
      formVBWorksheet['!rows'] = [];
      for (let i = 0; i <= formVBWorksheetData.length; i++) {
        formVBWorksheet['!rows'][i] = { 
          hpt: i <= 4 ? 40 : (i === formVBWorksheetData.length - 1 ? 25 : 20) 
        };
      }

      // Add borders, alignment, and formatting to all cells
      const range = XLSX.utils.decode_range(formVBWorksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!formVBWorksheet[cellAddress]) continue;
          if (!formVBWorksheet[cellAddress].s) formVBWorksheet[cellAddress].s = {};
          
          const isHeader = R <= 4;
          const isSummaryRow = R === formVBWorksheetData.length - 1;
          
          // Base style for all cells
          formVBWorksheet[cellAddress].s = {
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: { 
              wrapText: true, 
              vertical: 'center',
              horizontal: isHeader ? 'center' : 
                         (C === 0 ? 'center' : 
                         (C === 1 ? 'left' : 'right'))
            },
            font: {
              name: 'Arial',
              sz: R === 0 ? 14 : (R === 1 ? 12 : (isHeader ? 11 : 10)),
              bold: isHeader || isSummaryRow
            }
          };

          // Header styles
          if (isHeader) {
            formVBWorksheet[cellAddress].s.fill = {
              fgColor: { rgb: 'F5F5F5' },
              patternType: 'solid'
            };
            // Add thicker bottom border for the last header row
            if (R === 4) {
              formVBWorksheet[cellAddress].s.border.bottom = {
                style: 'medium',
                color: { rgb: '000000' }
              };
            }
          }

          // Summary row styles
          if (isSummaryRow) {
            formVBWorksheet[cellAddress].s.border.top = {
              style: 'medium',
              color: { rgb: '000000' }
            };
            formVBWorksheet[cellAddress].s.fill = {
              fgColor: { rgb: 'F5F5F5' },
              patternType: 'solid'
            };
          }

          // Add number formatting for numeric columns
          if (C >= 4 && !isHeader) {
            formVBWorksheet[cellAddress].s.numFmt = '#,##0.00';
          }
        }
      }

      // Enhance title and year cells
      const titleCell = formVBWorksheet['A1'];
      if (titleCell) {
        titleCell.s = {
          ...titleCell.s,
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { 
            bold: true, 
            sz: 16, 
            name: 'Arial',
            color: { rgb: '000000' }
          },
          fill: {
            fgColor: { rgb: 'D0D0D0' },
            patternType: 'solid'
          }
        };
      }

      const yearCell = formVBWorksheet['A2'];
      if (yearCell) {
        yearCell.s = {
          ...yearCell.s,
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { 
            bold: true, 
            sz: 12, 
            name: 'Arial',
            color: { rgb: '000000' }
          }
        };
      }
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, formVBWorksheet, 'FormVB');

      // Write and download the workbook
      XLSX.writeFile(wb, `FormV_Report_${financialYear}.xlsx`);
      showSnackbar('Excel report downloaded successfully', 'success');
    } catch (error) {
      console.error('Excel download error:', error);
      showSnackbar(error.message || 'Failed to download Excel report', 'error');
      handleOpenDialog(error.message || 'Download failed');
    } finally {
      setDownloading(prev => ({ ...prev, excel: false }));
    }
  }
  return (
    <Button
      variant="contained"
      onClick={downloadExcel}
      startIcon={downloading.excel ? 
        <CircularProgress size={20} sx={{ color: '#fff' }} /> : 
        <ExcelIcon />
      }
      disabled={downloading.excel}
      sx={{
        background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, #1b5e20 0%, #388e3c 100%)'
        }
      }}
    >
      {downloading.excel ? 'Downloading...' : 'Export to Excel'}
    </Button>
  );
};

export default FormVExcelReport;

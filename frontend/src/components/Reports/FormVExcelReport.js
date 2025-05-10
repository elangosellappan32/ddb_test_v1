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

      // Fetch data directly from API based on form type
      const apiData = isForm5B 
        ? await fetchFormVBData(financialYear)
        : await fetchFormVAData(financialYear);

      if (!apiData || (isForm5B && !apiData.data) || (!isForm5B && !apiData)) {
        throw new Error('No data available for the selected financial year');
      }

      const data = isForm5B ? apiData.data : apiData;

      // Helper function for safer number formatting
      const formatValue = (value, isPercentage = false) => {
        const num = Number(value || 0);
        return isPercentage ? `${num.toFixed(2)}%` : num.toFixed(2);
      };
      
      if (isForm5B) {
        // Title and financial year headers
        const headersRow1 = [{ v: 'FORMAT V-B', t: 's' }];
        const headersRow2 = [{ v: `Financial Year: ${financialYear}`, t: 's' }];
        const emptyRow = [''];

        // Ensure we have consumptionSites array
        if (!data.siteMetrics || !Array.isArray(data.siteMetrics)) {
          throw new Error('Invalid data format: Missing consumption sites');
        }
        
        // Main column headers
        const mainHeaders1 = [
          'Sl. No.',
          'Name of share holder',
          'No. of equity shares of value Rs. /-',
          '',
          '% to be consumed on pro rata basis by each captive user',
          '100% annual generation in MUs (x)',
          'Annual Auxiliary consumption in MUs (y)',
          'Generation considered to verify consumption criteria in MUs (x-y)*51%',
          'Permitted consumption as per norms in MUs',
          '',
          '',
          'Actual consumption in MUs',
          'Whether consumption norms met'
        ];
  
        const mainHeaders2 = [
          '',
          '',
          'As per share certificates as on 31st March',
          '% of ownership through shares in Company/unit of CGP',
          '',
          '',
          '',
          '',
          'with 0% variation',
          '-10%',
          '+10%',
          '',
          ''
        ];

        // Format data rows
        const dataRows = data.siteMetrics.map((site, index) => [          index + 1,
          site.siteName || site.name || 'Unnamed Site',
          site.equityShares || '',
          formatValue(site.allocationPercentage, true),
          'Minimum 51%',
          formatValue(site.annualGeneration),
          index === 0 ? formatValue(site.auxiliaryConsumption) : '',
          formatValue(site.verificationCriteria),
          index === 0 ? formatValue(site.permittedConsumption?.withZero) : '',
          index === 0 ? formatValue(site.permittedConsumption?.minus10) : '',
          index === 0 ? formatValue(site.permittedConsumption?.plus10) : '',
          formatValue(site.actualConsumption),
          site.normsCompliance ? 'Yes' : 'No'
        ]);
  
        // Summary row
        const summaryRow = [
          'Total', '', '', '', '',
          formatValue(data.totalGeneratedUnits),
          formatValue(data.auxiliaryConsumption),
          formatValue(data.percentage51),
          formatValue(data.aggregateGeneration),
          formatValue(data.aggregateGeneration * 0.9),
          formatValue(data.aggregateGeneration * 1.1),
          formatValue(data.totalAllocatedUnits),
          ''
        ];
  
        // Combine all rows
        const allRows = [
          headersRow1,
          headersRow2,
          emptyRow,
          mainHeaders1,
          mainHeaders2,
          ...dataRows,
          emptyRow,
          summaryRow
        ];
  
        const ws = XLSX.utils.aoa_to_sheet(allRows);
  
        // Format cells and apply styles
        const merges = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Title
          { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }, // Financial Year
          { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, // No. of equity shares header
          { s: { r: 3, c: 8 }, e: { r: 3, c: 10 } }  // Permitted consumption header
        ];
  
        ws['!merges'] = merges;
  
        // Set column widths
        ws['!cols'] = [
          { wch: 8 },   // Sl. No.
          { wch: 30 },  // Name
          { wch: 15 },  // Shares
          { wch: 15 },  // Ownership %
          { wch: 15 },  // Pro rata
          { wch: 15 },  // Generation
          { wch: 15 },  // Auxiliary
          { wch: 15 },  // Verification
          { wch: 15 },  // Permitted 0%
          { wch: 15 },  // Permitted -10%
          { wch: 15 },  // Permitted +10%
          { wch: 15 },  // Actual
          { wch: 15 }   // Norms met
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Form V-B');
      } else {
        // Form V-A handling
        const headersRow1 = [{ v: 'FORMAT V-A', t: 's' }];
        const headersRow2 = [{ v: `Financial Year: ${financialYear}`, t: 's' }];
        const mainHeaders = ['Sl.No.', 'Particulars', 'Energy in Units'];
        
        const formattedRows = [
          { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': formatValue(data.totalGeneratedUnits) },
          { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': formatValue(data.auxiliaryConsumption) },
          { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': formatValue(data.aggregateGeneration) },
          { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': formatValue(data.percentage51) },
          { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': formatValue(data.totalAllocatedUnits) },
          { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': formatValue(data.percentageAdjusted, true) }
        ];

        const rows = formattedRows.map(row => [
          row['Sl.No.'],
          row['Particulars'],
          row['Energy in Units']
        ]);

        const allRows = [
          headersRow1,
          headersRow2,
          [],
          mainHeaders,
          ...rows
        ];
  
        const ws = XLSX.utils.aoa_to_sheet(allRows);
  
        // Format cells and apply styles
        const merges = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },  // Title
          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }   // Financial Year
        ];
  
        ws['!merges'] = merges;
  
        // Set column widths
        ws['!cols'] = [
          { wch: 8 },    // Sl.No.
          { wch: 100 },  // Particulars
          { wch: 20 }    // Energy in Units
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Form V-A');
      }
  
      const filename = `Form_V_${isForm5B ? 'B' : 'A'}_${financialYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      showSnackbar('Excel file downloaded successfully');
    } catch (err) {
      console.error('Error downloading Excel:', err);
      handleOpenDialog({
        title: 'Download Failed',
        content: `Failed to download Excel file: ${err.message}`,
        type: 'error'
      });
      showSnackbar('Failed to download Excel file', { variant: 'error' });
    } finally {
      setDownloading(prev => ({ ...prev, excel: false }));
    }
  };

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

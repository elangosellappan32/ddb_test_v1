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

      if (isForm5B) {
        // Form V-B handling remains unchanged
        const headersRow1 = [{ v: 'FORMAT V-B', t: 's' }];
        const headersRow2 = [{ v: `Financial Year: ${financialYear}`, t: 's' }];
        const emptyRow = [''];
        
        // Rest of Form V-B formatting...
      } else {
        // Form V-A handling with fixed number formatting
        const headersRow1 = [{ v: 'FORMAT V-A', t: 's' }];
        const headersRow2 = [{ v: `Financial Year: ${financialYear}`, t: 's' }];
        const mainHeaders = ['Sl.No.', 'Particulars', 'Energy in Units'];
        const formattedRows = [];

        // Helper function to safely format numbers
        const formatValue = (value, isPercentage = false) => {
          const num = Number(value || 0);
          return isPercentage ? `${num.toFixed(2)}%` : num.toFixed(2);
        };

        // Add rows with safe number formatting
        formattedRows.push(
          { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': formatValue(data.totalGeneratedUnits) },
          { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': formatValue(data.auxiliaryConsumption) },
          { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': formatValue(data.aggregateGeneration) },
          { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': formatValue(data.percentage51) },
          { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': formatValue(data.totalAllocatedUnits) },
          { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': formatValue(data.percentageAdjusted, true) }
        );

        // Convert to Excel rows
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

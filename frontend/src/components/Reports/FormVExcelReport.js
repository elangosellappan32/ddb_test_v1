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
            { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': 0 },
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

      // Create worksheet
      const formVAWorksheet = XLSX.utils.json_to_sheet(formVADataRows, { header: ['Sl.No.', 'Particulars', 'Energy in Units'] });

      // Add title to worksheet
      formVAWorksheet['!ref'] = XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: 2, r: formVADataRows.length + 1 }
      });
      formVAWorksheet['A1'] = { v: `FORMAT V-A`, t: 's' };
      formVAWorksheet['A2'] = { v: `Financial Year: ${financialYear}`, t: 's' };
      XLSX.utils.book_append_sheet(wb, formVAWorksheet, 'FormVA');

      // FormVB Sheet
      const formVBData = formVBResponse.data;
      // Prepare Form V-B headers to match complex UI structure
      const mainHeaders1 = [
        { label: 'Sl. No.', rowSpan: 3 },
        { label: 'Name of share holder', rowSpan: 3 },
        { label: 'No. of equity shares of value Rs. /-', colSpan: 2 },
        { label: '', rowSpan: 3 },
        { label: '% to be consumed on pro rata basis by each captive user', rowSpan: 3 },
        { label: '100% annual generation in MUs (x)', rowSpan: 3 },
        { label: 'Annual Auxiliary consumption in MUs (y)', colSpan: 2 },
        { label: 'Generation considered to verify consumption criteria in MUs (x-y)*51%', rowSpan: 3 },
        { label: 'Permitted consumption as per norms in MUs', colSpan: 3 },
        { label: 'Actual consumption in MUs', rowSpan: 3 },
        { label: 'Whether consumption norms met', rowSpan: 3 }
      ];

      const mainHeaders2 = [
        '',
        '',
        { label: 'As per share certificates as on 31st March' },
        { label: '% of ownership through shares in Company/unit of CGP' },
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

      const dataRows = formVBData.siteMetrics.map((site, index) => [
        index + 1,
        site.siteName || site.name || 'Unnamed Site',
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

      // Modify summary row to be more comprehensive
      const summaryRow = [
        'Total', '', '', '', '', '',
        formatValue(formVBData.totalGeneratedUnits),
        formatValue(formVBData.auxiliaryConsumption),
        formatValue(formVBData.totalPermittedConsumption?.withZero || 0),
        formatValue(formVBData.totalPermittedConsumption?.minus10 || 0),
        formatValue(formVBData.totalPermittedConsumption?.plus10 || 0),
        formatValue(formVBData.totalActualConsumption || 0),
        'N/A'
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
      
      // Adjust column widths to match UI
      formVBWorksheet['!cols'] = [
        { width: 8 },   // Sl. No.
        { width: 25 },  // Name of share holder
        { width: 15 },  // Equity Shares 1
        { width: 15 },  // Equity Shares 2
        { width: 20 },  // % Consumed
        { width: 20 },  // Annual Generation
        { width: 15 },  // Total Generated Units
        { width: 15 },  // Auxiliary Consumption
        { width: 25 },  // Verification Criteria
        { width: 15 },  // Permitted Consumption 0%
        { width: 15 },  // Permitted Consumption -10%
        { width: 15 },  // Permitted Consumption +10%
        { width: 20 },  // Actual Consumption
        { width: 20 }   // Norms Met
      ];
      
      // Merge cells for multi-level headers
      formVBWorksheet['!merges'] = [
        // No. of equity shares
        { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
        // Annual Auxiliary consumption
        { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },
        // Permitted consumption
        { s: { r: 1, c: 7 }, e: { r: 1, c: 9 } }
      ];
      
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

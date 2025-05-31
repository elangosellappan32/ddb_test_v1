import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Description as CsvIcon } from '@mui/icons-material';
import { fetchFormVAData, fetchFormVBData } from '../../services/reportService';

const FormVCsvReport = ({ 
  downloading, 
  setDownloading, 
  isForm5B, 
  financialYear,
  showSnackbar,
  handleOpenDialog 
}) => {
  const downloadCSV = async () => {
    try {
      setDownloading(prev => ({ ...prev, csv: true }));
      
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
      
      let csvContent = '';
      if (isForm5B) {
        // Add title and financial year
        csvContent = 'FORMAT V-B\n';
        csvContent += `Financial Year: ${financialYear}\n\n`;
  
        // Main headers with exact column structure as UI and Excel
        const headers = [
          ['Sl. No.', 'Name of share holder', 'No. of equity shares of value Rs. /-', '', 
          '% to be consumed on pro rata basis by each captive user', '100% annual generation in MUs (x)',
          'Annual Auxiliary consumption in MUs (y)', 'Generation considered to verify consumption criteria in MUs (x-y)*51%',
          'Permitted consumption as per norms in MUs', '', '', 'Actual consumption in MUs',
          'Whether consumption norms met'].join(','),
  
          ['', '', 'As per share certificates as on 31st March', '% of ownership through shares in Company/unit of CGP',
          '', '', '', '', 'with 0% variation', '-10%', '+10%', '', ''].join(',')
        ].join('\n');
  
        csvContent += headers + '\n';
  
        // Group sites by their auxiliary consumption and permitted consumption values
        const siteGroups = [];
        let currentGroup = null;
        
        // Ensure consumptionSites is an array before forEach
        const consumptionSites = Array.isArray(data.consumptionSites) ? data.consumptionSites : [];
        
        consumptionSites.forEach((site, index) => {
          const auxKey = `${site.auxiliaryConsumption}_${JSON.stringify(site.permittedConsumption)}`;
          
          if (!currentGroup || currentGroup.auxKey !== auxKey) {
            currentGroup = {
              auxKey,
              auxiliaryConsumption: site.auxiliaryConsumption,
              permittedConsumption: site.permittedConsumption,
              sites: []
            };
            siteGroups.push(currentGroup);
          }
          
          currentGroup.sites.push({
            ...site,
            index: index + 1
          });
        });
        
        // Generate CSV rows for each group
        siteGroups.forEach((group, groupIndex) => {
          group.sites.forEach((site, siteIndex) => {
            const isFirstInGroup = siteIndex === 0;
            
            csvContent += [
              site.index,
              `"${site.siteName || site.name || 'Unnamed Site'}"`,
              `"${site.equityShares || ''}"`,
              site.allocationPercentage ? formatValue(site.allocationPercentage, true) : '0.00%',
              'Minimum 51%',
              formatValue(site.annualGeneration),
              isFirstInGroup ? formatValue(group.auxiliaryConsumption) : '',
              formatValue(site.verificationCriteria),
              isFirstInGroup ? formatValue(group.permittedConsumption?.withZero) : '',
              isFirstInGroup ? formatValue(group.permittedConsumption?.minus10) : '',
              isFirstInGroup ? formatValue(group.permittedConsumption?.plus10) : '',
              formatValue(site.actualConsumption),
              `"${site.normsCompliance ? 'Yes' : 'No'}"`
            ].join(',') + '\n';
          });
        });
  
        // Add empty row before summary
        csvContent += '\n';
  
        // Add summary row with safe number formatting
        csvContent += [
          'Total', '', '', '', '',
          formatValue(data.totalGeneratedUnits),
          formatValue(data.auxiliaryConsumption),
          formatValue(data.percentage51),
          formatValue(data.aggregateGeneration),
          formatValue(data.aggregateGeneration * 0.9),
          formatValue(data.aggregateGeneration * 1.1),
          formatValue(data.totalAllocatedUnits),
          ''
        ].join(',') + '\n';
  
      } else {
        // Form V-A CSV structure
        csvContent = 'FORMAT V-A\n';
        csvContent += `Financial Year: ${financialYear}\n\n`;
        
        const headers = ['Sl.No.', 'Particulars', 'Energy in Units'];
        csvContent += headers.join(',') + '\n';
        
        const formattedRows = [
          { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': formatValue(data.totalGeneratedUnits) },
          { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': formatValue(data.auxiliaryConsumption) },
          { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': formatValue(data.aggregateGeneration) },
          { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': formatValue(data.percentage51) },
          { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': formatValue(data.totalAllocatedUnits) },
          { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': formatValue(data.percentageAdjusted, true) }
        ];
        
        formattedRows.forEach(row => {
          csvContent += [
            row['Sl.No.'],
            `"${row['Particulars']}"`,
            row['Energy in Units']
          ].join(',') + '\n';
        });
      }
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Form_V_${isForm5B ? 'B' : 'A'}_${financialYear}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSnackbar('CSV file downloaded successfully');
    } catch (err) {
      console.error('Error downloading CSV:', err);
      handleOpenDialog({
        title: 'Download Failed',
        content: `Failed to download CSV file: ${err.message}`,
        type: 'error'
      });
      showSnackbar('Failed to download CSV file', { variant: 'error' });
    } finally {
      setDownloading(prev => ({ ...prev, csv: false }));
    }
  };

  return (
    <Button
      variant="contained"
      onClick={downloadCSV}
      startIcon={downloading.csv ? 
        <CircularProgress size={20} sx={{ color: '#fff' }} /> : 
        <CsvIcon />
      }
      disabled={downloading.csv}
      sx={{
        background: 'linear-gradient(135deg, #0288d1 0%, #03a9f4 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)'
        }
      }}
    >
      {downloading.csv ? 'Downloading...' : 'Export to CSV'}
    </Button>
  );
};

export default FormVCsvReport;

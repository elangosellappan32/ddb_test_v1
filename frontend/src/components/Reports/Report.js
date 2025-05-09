import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  Stack, 
  Switch, 
  FormControlLabel,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Slide,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  FileDownload as ExcelIcon,
  Description as CsvIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { fetchReportDataByFinancialYear } from '../../services/reportService';

const REFRESH_INTERVAL = 60000; // Refresh every minute

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AllocationReport = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [isForm5B, setIsForm5B] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState({ excel: false, csv: false });
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    content: '',
    type: 'download',
    action: null
  });
  const [financialYear, setFinancialYear] = useState('');
  const [financialYears, setFinancialYears] = useState([]);

  // Initialize financial years
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => {
      const year = currentYear - i;
      return `${year}-${year + 1}`;
    });
    setFinancialYears(years);
    setFinancialYear(years[0]);
  }, []);

  // Fetch data when financial year or form type changes
  const fetchData = useCallback(async () => {
    if (!financialYear) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchReportDataByFinancialYear(financialYear, isForm5B);
      
      if (!data) {
        throw new Error('No data available for the selected financial year');
      }

      if (isForm5B && (!data.siteMetrics || data.siteMetrics.length === 0)) {
        throw new Error('No consumption site data available for Form V-B');
      }

      setReportData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message || 'Failed to fetch report data');
      setReportData(null);
      enqueueSnackbar(err.message || 'Failed to fetch report data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [financialYear, isForm5B, enqueueSnackbar]);

  // Auto-refresh data
  useEffect(() => {
    let mounted = true;
    
    const refreshData = async () => {
      if (!mounted) return;
      await fetchData();
    };

    refreshData();
    const intervalId = setInterval(refreshData, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchData]);

  // Handle form type switching
  const handleFormTypeChange = useCallback(() => {
    setIsForm5B(prev => !prev);
    setReportData(null);
    setError(null);
  }, []);

  const handleOpenDialog = (config) => {
    setDialogConfig(config);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDownload = async (downloadType) => {
    handleCloseDialog();
    try {
      if (downloadType === 'excel') {
        await downloadExcel();
      } else if (downloadType === 'csv') {
        await downloadCSV();
      }
    } catch (err) {
      console.error(`Error downloading ${downloadType}:`, err);
      enqueueSnackbar(`Failed to download ${downloadType.toUpperCase()} file`, { variant: 'error' });
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    enqueueSnackbar(message, { variant: severity });
  };

  const initiateDownload = (type) => {
    const fileType = type.toUpperCase();
    const formType = isForm5B ? 'Form V-B' : 'Form V-A';
    handleOpenDialog({
      title: `Download ${fileType}`,
      content: `Are you sure you want to download ${formType} as ${fileType} file?`,
      type: 'download',
      action: () => handleConfirmDownload(type)
    });
  };

  const prepareForm5AData = () => {
    if (!reportData) {
      return [
        { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': 0 },
        { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': 0 },
        { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': 0 },
        { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': 0 },
        { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': 0 },
        { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': '0%' }
      ];
    }
  
    return [
      { 'Sl.No.': 1, 'Particulars': 'Total Generated units of a generating plant / Station identified for captive use', 'Energy in Units': reportData.totalGeneratedUnits || 0 },
      { 'Sl.No.': 2, 'Particulars': 'Less : Auxiliary Consumption in the above in units', 'Energy in Units': reportData.auxiliaryConsumption || 0 },
      { 'Sl.No.': 3, 'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)', 'Energy in Units': reportData.aggregateGeneration || 0 },
      { 'Sl.No.': 4, 'Particulars': '51% of aggregate generation available for captive consumption in units', 'Energy in Units': reportData.percentage51 || 0 },
      { 'Sl.No.': 5, 'Particulars': 'Actual Adjusted / Consumed units by the captive users', 'Energy in Units': reportData.totalAllocatedUnits || 0 },
      { 'Sl.No.': 6, 'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use', 'Energy in Units': `${reportData.percentageAdjusted || 0}%` }
    ];
  };

  const defaultFormVBData = {
    title: 'FORMAT V-B',
    financialYear: '',
    mainColumns: [
      { 
        id: 'slNo', 
        label: 'Sl.\nNo.', 
        width: 60, 
        align: 'center',
        rowSpan: 2 
      },
      { 
        id: 'shareholder', 
        label: 'Name of share\nholder', 
        width: 200, 
        align: 'left',
        rowSpan: 2 
      },
      { 
        id: 'sharesGroup', 
        label: 'No. of equity shares of value Rs. /-', 
        align: 'center',
        colSpan: 2,
        children: [
          { id: 'certificates', label: 'As per share\ncertificates\nas on 31st\nMarch', align: 'right', width: 120 },
          { id: 'ownership', label: '% of ownership\nthrough shares in\nCompany/\nunit of CGP', align: 'center', width: 120 }
        ]
      },
      { 
        id: 'proRata', 
        label: '% to be\nconsumed on\npro rata basis\nby each\ncaptive\nuser', 
        align: 'center',
        width: 100,
        rowSpan: 2
      },
      { 
        id: 'generation', 
        label: '100%\nannual\ngeneration in\nMUs\n(x)', 
        width: 100, 
        align: 'right',
        rowSpan: 2
      },
      { 
        id: 'auxiliary', 
        label: 'Annual\nAuxiliary\nconsumption\nin MUs\n(y)', 
        width: 100, 
        align: 'right',
        rowSpan: 2
      },
      { 
        id: 'criteria', 
        label: 'Generation\nconsidered to\nverify\nconsumption\ncriteria in MUs\n(x-y)*51%', 
        width: 120, 
        align: 'right',
        rowSpan: 2
      },
      {
        id: 'permittedGroup',
        label: 'Permitted consumption as per\nnorms in MUs',
        align: 'center',
        colSpan: 3,
        children: [
          { id: 'withZero', label: 'with 0%\nvariation', align: 'right', width: 100 },
          { id: 'minus10', label: '-10\n%', align: 'right', width: 80 },
          { id: 'plus10', label: '+10\n%', align: 'right', width: 80 }
        ]
      },
      { 
        id: 'actual', 
        label: 'Actual\nconsumption\nin MUs', 
        width: 100, 
        align: 'right',
        rowSpan: 2
      },
      { 
        id: 'norms', 
        label: 'Whether\nconsumption\nnorms met', 
        width: 100, 
        align: 'center',
        rowSpan: 2
      }
    ]
  };

const prepareForm5BData = () => {
  if (!reportData?.siteMetrics?.length) {
    return {
      ...defaultFormVBData,
      rows: [],
      summary: {
        totalGeneration: 0,
        auxiliaryConsumption: 0,
        totalCriteria: 0,
        totalPermitted: 0,
        totalPermittedMinus10: 0,
        totalPermittedPlus10: 0,
        totalConsumption: 0
      }
    };
  }

  const rows = reportData.siteMetrics.map((site, index) => ({
    slNo: index + 1,
    name: site.siteName || '',
    shares: {
      certificates: site.equityShares || '',
      ownership: site.allocationPercentage ? `${site.allocationPercentage.toFixed(2)}%` : '0%'
    },
    proRata: 'Minimum 51%',
    generation: site.annualGeneration?.toFixed(2) || '0',
    auxiliary: site.auxiliaryConsumption?.toFixed(2) || '0',
    criteria: site.verificationCriteria?.toFixed(2) || '0',
    permittedConsumption: {
      withZero: site.netGeneration?.toFixed(2) || '0',
      minus10: (site.netGeneration * 0.9)?.toFixed(2) || '0',
      plus10: (site.netGeneration * 1.1)?.toFixed(2) || '0'
    },
    actual: site.totalConsumptionUnits?.toFixed(2) || '0',
    norms: site.norms || 'No'
  }));

  // Calculate totals for summary
  const summary = {
    totalGeneration: Number(reportData.totalGeneratedUnits || 0).toFixed(2),
    auxiliaryConsumption: Number(reportData.auxiliaryConsumption || 0).toFixed(2),
    totalCriteria: Number(reportData.percentage51 || 0).toFixed(2),
    totalPermitted: Number(reportData.aggregateGeneration || 0).toFixed(2),
    totalPermittedMinus10: (Number(reportData.aggregateGeneration || 0) * 0.9).toFixed(2),
    totalPermittedPlus10: (Number(reportData.aggregateGeneration || 0) * 1.1).toFixed(2),
    totalConsumption: Number(reportData.totalAllocatedUnits || 0).toFixed(2)
  };

  return {
    ...defaultFormVBData,
    financialYear: reportData.financialYear || '',
    rows,
    summary
  };
};

const renderFormVBTable = () => {
  const data = prepareForm5BData();
  
  const tableHeaderStyle = {
    bgcolor: '#f5f5f5',
    border: '1px solid #e0e4ec',
    fontWeight: 'bold',
    fontSize: '0.75rem',
    whiteSpace: 'pre-line',
    verticalAlign: 'middle',
    textAlign: 'center'
  };

  const cellStyle = {
    borderRight: '1px solid #e0e4ec',
    padding: '8px',
    fontSize: '0.875rem'
  };

  const renderMainHeader = () => (
    <TableHead>
      <TableRow>
        <TableCell colSpan={13} align="center" sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>
          FORMAT V-B
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={13} align="left" sx={{ py: 1 }}>
          Financial Year: {data.financialYear}
        </TableCell>
      </TableRow>
      
      {/* Main Column Headers */}
      <TableRow>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>Sl. No.</TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>Name of share holder</TableCell>
        <TableCell colSpan={2} align="center" sx={tableHeaderStyle}>
          No. of equity shares of value Rs. /-
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          % to be consumed on pro rata basis by each captive user
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          100% annual generation in MUs (x)
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          Annual Auxiliary consumption in MUs (y)
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          Generation considered to verify consumption criteria in MUs (x-y)*51%
        </TableCell>
        <TableCell colSpan={3} align="center" sx={tableHeaderStyle}>
          Permitted consumption as per norms in MUs
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          Actual consumption in MUs
        </TableCell>
        <TableCell rowSpan={2} align="center" sx={tableHeaderStyle}>
          Whether consumption norms met
        </TableCell>
      </TableRow>

      {/* Sub Headers */}
      <TableRow>
        <TableCell align="center" sx={tableHeaderStyle}>
          As per share certificates as on 31st March
        </TableCell>
        <TableCell align="center" sx={tableHeaderStyle}>
          % of ownership through shares in Company/unit of CGP
        </TableCell>
        <TableCell align="center" sx={tableHeaderStyle}>with 0% variation</TableCell>
        <TableCell align="center" sx={tableHeaderStyle}>-10%</TableCell>
        <TableCell align="center" sx={tableHeaderStyle}>+10%</TableCell>
      </TableRow>
    </TableHead>
  );

  const renderRows = () => {
    if (!data?.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={13} align="center">
            <Alert severity="info">No consumption sites data available</Alert>
          </TableCell>
        </TableRow>
      );
    }

    return data.rows.map((row, index) => (
      <TableRow key={row?.slNo || index} hover>
        <TableCell align="center" sx={cellStyle}>{row?.slNo || ''}</TableCell>
        <TableCell sx={cellStyle}>{row?.name || ''}</TableCell>
        <TableCell align="right" sx={cellStyle}>{row?.shares?.certificates || ''}</TableCell>
        <TableCell align="center" sx={cellStyle}>{row?.shares?.ownership || ''}</TableCell>
        <TableCell align="center" sx={cellStyle}>{row?.proRata || ''}</TableCell>
        <TableCell align="right" sx={cellStyle}>{row?.generation || ''}</TableCell>
        {index === 0 ? (
          <TableCell 
            align="right" 
            sx={cellStyle} 
            rowSpan={data.rows.length}
          >
            {data.summary.auxiliaryConsumption}
          </TableCell>
        ) : null}
        <TableCell align="right" sx={cellStyle}>{row?.criteria || ''}</TableCell>
        {index === 0 ? (
          <>
            <TableCell 
              align="right" 
              sx={cellStyle} 
              rowSpan={data.rows.length}
            >
              {Number(data.summary.totalPermitted || 0).toFixed(2)}
            </TableCell>
            <TableCell 
              align="right" 
              sx={cellStyle} 
              rowSpan={data.rows.length}
            >
              {Number(data.summary.totalPermittedMinus10 || 0).toFixed(2)}
            </TableCell>
            <TableCell 
              align="right" 
              sx={cellStyle} 
              rowSpan={data.rows.length}
            >
              {Number(data.summary.totalPermittedPlus10 || 0).toFixed(2)}
            </TableCell>
          </>
        ) : null}
        <TableCell align="right" sx={cellStyle}>{row?.actual || ''}</TableCell>
        <TableCell align="center" sx={cellStyle}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            color: row?.norms === 'Yes' ? 'success.main' : 'error.main'
          }}>
            {row?.norms === 'Yes' ? 
              <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> : 
              <ErrorIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
            }
            {row?.norms || ''}
          </Box>
        </TableCell>
      </TableRow>
    ));
  };

  const renderSummaryRow = () => {
    if (!data.rows || data.rows.length === 0) return null;

    const totalStyle = {
      ...cellStyle,
      fontWeight: 'bold',
      backgroundColor: '#f8f9fa'
    };

    return (
      <TableRow>
        <TableCell colSpan={5} sx={totalStyle}>Total</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalGeneration}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.auxiliaryConsumption}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalCriteria}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalPermitted}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalPermittedMinus10}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalPermittedPlus10}</TableCell>
        <TableCell align="right" sx={totalStyle}>{data.summary.totalConsumption}</TableCell>
        <TableCell sx={totalStyle}></TableCell>
      </TableRow>
    );
  };

  return (
    <>
      {renderMainHeader()}
      <TableBody>
        {renderRows()}
        {renderSummaryRow()}
      </TableBody>
    </>
  );
};

const downloadExcel = async () => {
  try {
    setDownloading(prev => ({ ...prev, excel: true }));
    const wb = XLSX.utils.book_new();

    if (isForm5B) {
      const data = prepareForm5BData();
      
      // Title and financial year headers
      const headersRow1 = [{ v: 'FORMAT V-B', t: 's' }];
      const headersRow2 = [{ v: `Financial Year: ${data.financialYear}`, t: 's' }];
      const emptyRow = [''];
      
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
      const dataRows = data.rows.map((row, index) => [
        row.slNo,
        row.name,
        row.shares.certificates,
        row.shares.ownership?.replace('%', ''),
        'Minimum 51%',
        row.generation,
        index === 0 ? data.summary.auxiliaryConsumption : '',
        row.criteria,
        index === 0 ? data.summary.totalPermitted : '',
        index === 0 ? data.summary.totalPermittedMinus10 : '',
        index === 0 ? data.summary.totalPermittedPlus10 : '',
        row.actual,
        row.norms
      ]);

      // Summary row
      const summaryRow = [
        'Total', '', '', '', '',
        data.summary.totalGeneration,
        data.summary.auxiliaryConsumption,
        data.summary.totalCriteria,
        data.summary.totalPermitted,
        data.summary.totalPermittedMinus10,
        data.summary.totalPermittedPlus10,
        data.summary.totalConsumption,
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

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Sl.No
        { wch: 30 },  // Name of share holder
        { wch: 20 },  // Share certificates
        { wch: 20 },  // Ownership percentage
        { wch: 20 },  // Pro rata
        { wch: 15 },  // Annual generation
        { wch: 15 },  // Auxiliary consumption
        { wch: 20 },  // Verification criteria
        { wch: 15 },  // Permitted with 0%
        { wch: 15 },  // Permitted -10%
        { wch: 15 },  // Permitted +10%
        { wch: 15 },  // Actual consumption
        { wch: 15 }   // Norms met
      ];

      // Add merged cells for headers
      ws['!merges'] = [
        // Title
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
        // Financial Year
        { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
        // Main header merges for row spans
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },  // Sl.No
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },  // Name of share holder
        { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },  // Equity shares header
        { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } },  // Pro rata
        { s: { r: 3, c: 5 }, e: { r: 4, c: 5 } },  // Annual generation
        { s: { r: 3, c: 6 }, e: { r: 4, c: 6 } },  // Auxiliary consumption
        { s: { r: 3, c: 7 }, e: { r: 4, c: 7 } },  // Verification criteria
        { s: { r: 3, c: 8 }, e: { r: 3, c: 10 } }, // Permitted consumption header
        { s: { r: 3, c: 11 }, e: { r: 4, c: 11 } }, // Actual consumption
        { s: { r: 3, c: 12 }, e: { r: 4, c: 12 } }  // Norms met
      ];

      // Apply styles
      Object.keys(ws).forEach(cell => {
        if (cell[0] !== '!') {
          ws[cell].s = {
            alignment: {
              vertical: 'center',
              horizontal: cell[0] === 'A' ? 'center' :
                         ['B', 'C', 'D'].includes(cell[0]) ? 'left' : 'right'
            },
            font: { 
              sz: cell.includes('1') || cell.includes('2') ? 12 : 11,
              bold: cell.includes('1') || cell.includes('2') || 
                    (parseInt(cell.match(/\d+/)?.[0] || '0') <= 5)
            }
          };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Form V-B');
    } else {
      // Form V-A handling
      const headersRow1 = [
        { v: 'FORMAT V-A', t: 's' }
      ];
      const headersRow2 = [
        { v: `Financial Year: ${financialYear}`, t: 's' }
      ];
      const mainHeaders = [
        'Sl.No.',
        'Particulars',
        'Energy in Units'
      ];

      const formData = prepareForm5AData();
      const formattedRows = formData.map(row => [
        row['Sl.No.'],
        row['Particulars'],
        row['Energy in Units']
      ]);

      const allRows = [
        headersRow1,
        headersRow2,
        [],
        mainHeaders,
        ...formattedRows
      ];

      const ws = XLSX.utils.aoa_to_sheet(allRows);

      // Set column widths to match UI
      ws['!cols'] = [
        { wch: 8 },  // Sl.No
        { wch: 80 }, // Particulars
        { wch: 20 }  // Energy in Units
      ];

      // Add merged cells and styling for title and financial year
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }  // Financial Year
      ];

      // Apply styles
      Object.keys(ws).forEach(cell => {
        if (cell[0] !== '!') {
          ws[cell].s = {
            alignment: { vertical: 'center', horizontal: cell[0] === 'A' ? 'center' : 
                        cell[0] === 'C' ? 'right' : 'left' },
            font: { sz: 11 }
          };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Form V-A');
    }

    const filename = `Form_V_${isForm5B ? 'B' : 'A'}_${financialYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    showSnackbar('Excel file downloaded successfully');
  } catch (err) {
    console.error('Error downloading Excel:', err);
    handleOpenDialog({
      title: 'Download Failed',
      content: 'Failed to download Excel file. Please try again.',
      type: 'error'
    });
    showSnackbar('Failed to download Excel file', { variant: 'error' });
  } finally {
    setDownloading(prev => ({ ...prev, excel: false }));
  }
};

const downloadCSV = async () => {
  try {
    setDownloading(prev => ({ ...prev, csv: true }));
    const data = isForm5B ? prepareForm5BData() : prepareForm5AData();
    
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

      // Add data rows
      data.rows.forEach((row, index) => {
        csvContent += [
          row.slNo,
          `"${row.name}"`,
          `"${row.shares.certificates}"`,
          row.shares.ownership?.replace('%', ''),
          'Minimum 51%',
          row.generation,
          index === 0 ? data.summary.auxiliaryConsumption : '',
          row.criteria,
          index === 0 ? data.summary.totalPermitted : '',
          index === 0 ? data.summary.totalPermittedMinus10 : '',
          index === 0 ? data.summary.totalPermittedPlus10 : '',
          row.actual,
          `"${row.norms}"`
        ].join(',') + '\n';
      });

      // Add empty row before summary
      csvContent += '\n';

      // Add summary row
      csvContent += [
        'Total', '', '', '', '',
        data.summary.totalGeneration,
        data.summary.auxiliaryConsumption,
        data.summary.totalCriteria,
        data.summary.totalPermitted,
        data.summary.totalPermittedMinus10,
        data.summary.totalPermittedPlus10,
        data.summary.totalConsumption,
        ''
      ].join(',') + '\n';

    } else {
      // Form V-A CSV structure
      csvContent = 'FORMAT V-A\n';
      csvContent += `Financial Year: ${financialYear}\n\n`;
      
      const headers = ['Sl.No.', 'Particulars', 'Energy in Units'];
      csvContent += headers.join(',') + '\n';
      
      data.forEach(row => {
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
      content: 'Failed to download CSV file. Please try again.',
      type: 'error'
    });
    showSnackbar('Failed to download CSV file', { variant: 'error' });
  } finally {
    setDownloading(prev => ({ ...prev, csv: false }));
  }
};

  return (
    <Box 
      sx={{ 
        p: { xs: 2, md: 4 }, 
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)'
      }}
    >
      <Paper 
        elevation={2}
        sx={{ 
          p: { xs: 2, md: 4 }, 
          mb: 4, 
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(230, 235, 240, 0.5)'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 3,
          mb: 4 
        }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 800,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                letterSpacing: '-0.02em'
              }}
            >
              {isForm5B ? 'FORMAT V - B' : 'FORMAT V - A'}
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.9rem', md: '1rem' },
                fontWeight: 500,
                opacity: 0.85
              }}
            >
              {isForm5B ? 'Captive Consumption Details' : 'Alternate Details'}
            </Typography>
          </Box>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
            sx={{
              '& .MuiButton-root': {
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }
              }
            }}
          >
            <FormControlLabel
              control={
                <Switch 
                  checked={isForm5B}
                  onChange={handleFormTypeChange}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#1976d2'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#1976d2'
                    }
                  }}
                />
              }
              label={
                <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {isForm5B ? 'Form V-B' : 'Form V-A'}
                </Typography>
              }
            />
            <Button
              variant="contained"
              onClick={() => initiateDownload('excel')}
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
            <Button
              variant="contained"
              onClick={() => initiateDownload('csv')}
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
            <Button
              variant="outlined"
              onClick={fetchData}
              startIcon={loading ? 
                <CircularProgress size={20} sx={{ color: 'primary.main' }} /> : 
                <RefreshIcon />
              }
              disabled={loading}
              sx={{
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px'
                }
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </Stack>
        </Box>

        <FormControl 
          sx={{ 
            mb: 4,
            minWidth: 240,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '2px'
              }
            }
          }}
        >
          <InputLabel sx={{ fontWeight: 500 }}>Financial Year</InputLabel>
          <Select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            sx={{
              '& .MuiSelect-select': {
                py: 1.5
              }
            }}
          >
            {financialYears.map((year) => (
              <MenuItem 
                key={year} 
                value={year}
                sx={{
                  py: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'primary.lighter',
                    '&:hover': {
                      backgroundColor: 'primary.light'
                    }
                  }
                }}
              >
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: '8px',
              '& .MuiAlert-icon': {
                fontSize: '1.5rem'
              }
            }}
          >
            {error}
          </Alert>
        )}

        <TableContainer 
          component={Paper}
          sx={{
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(230, 235, 240, 0.8)',
            overflow: 'hidden',
            '& .MuiTable-root': {
              borderCollapse: 'separate',
              borderSpacing: 0
            }
          }}
        >
          <Table 
            size="small"
            sx={{
              '& .MuiTableCell-root': {
                borderColor: 'rgba(230, 235, 240, 0.8)',
                py: 2,
                px: 2,
                fontSize: '0.875rem',
                '&.MuiTableCell-head': {
                  fontWeight: 600,
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid rgba(230, 235, 240, 0.8)'
                }
              },
              '& .MuiTableRow-root': {
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.01)'
                }
              }
            }}
          >
            {isForm5B ? renderFormVBTable() : (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell>Sl.No.</TableCell>
                    <TableCell>Particulars</TableCell>
                    <TableCell align="right">Energy in Units</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prepareForm5AData().map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row['Sl.No.']}</TableCell>
                      <TableCell>{row['Particulars']}</TableCell>
                      <TableCell align="right">{row['Energy in Units']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          py: 2,
          px: 3,
          fontSize: '1.25rem',
          fontWeight: 600
        }}>
          {dialogConfig.title}
        </DialogTitle>
        <DialogContent sx={{ py: 2, px: 3 }}>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            {dialogConfig.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              fontWeight: 500,
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          {dialogConfig.type === 'download' && (
            <Button 
              onClick={() => dialogConfig.action()} 
              variant="contained"
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                borderRadius: '8px'
              }}
            >
              Download
            </Button>
          )}
          {dialogConfig.type === 'error' && (
            <Button 
              onClick={handleCloseDialog} 
              variant="contained"
              color="error"
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                borderRadius: '8px'
              }}
            >
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllocationReport;

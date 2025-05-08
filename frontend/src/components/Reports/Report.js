import React, { useState, useEffect, useCallback } from 'react';
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
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  FileDownload as ExcelIcon,
  Description as CsvIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { fetchReportDataByFinancialYear } from '../../services/reportService';

const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AllocationReport = () => {
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [financialYear, setFinancialYear] = useState('');
  const [financialYears, setFinancialYears] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    // Generate financial years (current year and previous 10 years)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 10; i++) {
      const startYear = currentYear - i;
      years.push(`${startYear}-${startYear + 1}`);
    }
    setFinancialYears(years);
    setFinancialYear(years[0]); // Set current year as default
  }, []);

  const fetchData = useCallback(async () => {
    if (!financialYear) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportDataByFinancialYear(financialYear);
      if (!data) {
        setReportData(null);
        setError('No data available for the selected financial year.');
        return;
      }

      if (isForm5B && (!data.siteMetrics || data.siteMetrics.length === 0)) {
        setReportData(null);
        setError('No consumption site data available for Form V-B.');
        return;
      }

      setReportData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message || 'Failed to fetch data for the selected financial year.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [financialYear, isForm5B]);

  useEffect(() => {
    let mounted = true;

    const fetchDataSafely = async () => {
      if (!mounted) return;
      await fetchData();
    };

    fetchDataSafely();
    const intervalId = setInterval(fetchDataSafely, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const validateData = useCallback((data) => {
    if (!data) return false;
    if (Array.isArray(data)) {
      return data.length > 0 && data.some(item => item !== null && typeof item === 'object');
    }
    return Object.keys(data).filter(key => data[key] !== undefined && data[key] !== null).length > 0;
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
      showSnackbar(`Failed to download ${downloadType.toUpperCase()} file`, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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
    if (!reportData?.siteMetrics || !Array.isArray(reportData.siteMetrics)) {
        return defaultFormVBData;
    }

    const rows = reportData.siteMetrics.map((site, index) => ({
        slNo: index + 1,
        name: site.siteName,
        shares: {
            certificates: site.equityShares,
            ownership: `${site.allocationPercentage}%`
        },
        proRata: 'Minimum 51%',
        generation: site.annualGeneration.toFixed(2),
        auxiliary: site.auxiliaryConsumption.toFixed(2),
        criteria: site.verificationCriteria.toFixed(2),
        permitted: {
            withZero: site.permittedConsumption.base.toFixed(2),
            minus10: site.permittedConsumption.minus10.toFixed(2),
            plus10: site.permittedConsumption.plus10.toFixed(2)
        },
        actual: site.actualConsumption.toFixed(2),
        norms: site.normsCompliance ? 'Yes' : 'No'
    }));

    return {
        ...defaultFormVBData,
        financialYear,
        rows
    };
};

  const renderFormVBHeader = (data) => {
    return (
      <TableHead>
        <TableRow>
          <TableCell 
            colSpan={12} 
            align="center" 
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderBottom: '2px solid #e0e4ec'
            }}
          >
            {data.title}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell 
            colSpan={12} 
            align="left" 
            sx={{ 
              py: 1,
              borderBottom: '2px solid #e0e4ec'
            }}
          >
            Financial Year: {data.financialYear}
          </TableCell>
        </TableRow>
        <TableRow>
          {data.mainColumns.map((column) => (
            <TableCell
              key={column.id}
              align={column.align}
              rowSpan={column.rowSpan}
              colSpan={column.colSpan || 1}
              sx={{
                whiteSpace: 'pre-line',
                minWidth: column.width,
                p: 1,
                fontWeight: 'bold',
                fontSize: '0.75rem',
                bgcolor: '#f5f5f5',
                border: '1px solid #e0e4ec',
                verticalAlign: 'top'
              }}
            >
              {column.label}
            </TableCell>
          ))}
        </TableRow>
        <TableRow>
          {data.mainColumns
            .filter(column => column.children)
            .map(column => 
              column.children.map(subCol => (
                <TableCell
                  key={`${column.id}-${subCol.id}`}
                  align={subCol.align}
                  sx={{
                    whiteSpace: 'pre-line',
                    minWidth: subCol.width,
                    p: 1,
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    bgcolor: '#f5f5f5',
                    border: '1px solid #e0e4ec',
                    verticalAlign: 'top'
                  }}
                >
                  {subCol.label}
                </TableCell>
              ))
            )}
        </TableRow>
      </TableHead>
    );
  };

  const renderFormVBTable = () => {
    const data = prepareForm5BData();
    
    if (!data || !data.mainColumns) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={9} align="center">
              <Alert severity="info">No data available for Form V-B</Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <>
        {renderFormVBHeader(data)}
        <TableBody>
          {data.rows && data.rows.length > 0 ? (
            data.rows.map((row) => renderFormVBRow(row))
          ) : (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Alert severity="info">No consumption sites data available</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </>
    );
  };

  const downloadExcel = async () => {
    try {
      setDownloading(prev => ({ ...prev, excel: true }));
      const data = isForm5B ? prepareForm5BData() : prepareForm5AData();
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        isForm5B ? data.rows.map(row => ({
          'Sl.No.': row.slNo,
          'Particulars': row.particulars,
          'As per share certificates': row.shares.certificates,
          '% of ownership': row.shares.ownership,
          'Annual Generation': row.generation,
          'Auxiliary Consumption': row.auxiliary,
          'Verification Criteria': row.criteria,
          'Permitted Consumption': row.permitted.base,
          'Actual Consumption': row.actual,
          'Compliance': row.compliance
        })) : data,
        { header: isForm5B ? data.headers : ['Sl.No.', 'Particulars', 'Energy in Units'] }
      );

      ws['!cols'] = isForm5B ? 
        [
          { wch: 8 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, 
          { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, 
          { wch: 15 }, { wch: 15 }
        ] : 
        [{ wch: 8 }, { wch: 80 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, ws, isForm5B ? 'Form V-B' : 'Form V-A');
      XLSX.writeFile(wb, `Form_V_${isForm5B ? 'B' : 'A'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showSnackbar('Excel file downloaded successfully');
    } catch (err) {
      handleOpenDialog({
        title: 'Download Failed',
        content: 'Failed to download Excel file. Please try again.',
        type: 'error'
      });
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
        csvContent = data.headers.map(header => header.label).join(',') + '\n';
        csvContent += data.rows.map(row => [
          row.slNo,
          `"${row.name}"`,
          `"${row.shares.certificates}"`,
          `"${row.shares.ownership}"`,
          row.generation,
          row.auxiliary,
          row.criteria,
          row.permitted.base,
          row.actual,
          row.compliance
        ].join(',')).join('\n');
        csvContent += `\n\nFor ${data.financialYear}\n`;
      } else {
        const headers = ['Sl.No.', 'Particulars', 'Energy in Units'];
        csvContent = headers.join(',') + '\n';
        csvContent += data.map(row => [
          row['Sl.No.'],
          `"${row['Particulars']}"`,
          row['Energy in Units']
        ].join(',')).join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Form_V_${isForm5B ? 'B' : 'A'}_${new Date().toISOString().split('T')[0]}.csv`);
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
    } finally {
      setDownloading(prev => ({ ...prev, csv: false }));
    }
  };

  const renderFormVBRow = (row) => (
    <TableRow key={row.slNo} hover>
      <TableCell align="center">{row.slNo}</TableCell>
      <TableCell>{row.name}</TableCell>
      <TableCell align="right">{row.shares.certificates}</TableCell>
      <TableCell align="center">{row.shares.ownership}</TableCell>
      <TableCell align="center">{row.proRata}</TableCell>
      <TableCell align="right">{row.generation}</TableCell>
      <TableCell align="right">{row.auxiliary}</TableCell>
      <TableCell align="right">{row.criteria}</TableCell>
      <TableCell align="right">{row.permitted.withZero}</TableCell>
      <TableCell align="right">{row.permitted.minus10}</TableCell>
      <TableCell align="right">{row.permitted.plus10}</TableCell>
      <TableCell align="right">{row.actual}</TableCell>
      <TableCell align="center">
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          color: row.norms === 'Yes' ? 'success.main' : 'error.main'
        }}>
          {row.norms === 'Yes' ? 
            <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> : 
            <ErrorIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          }
          {row.norms}
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)',
          border: '1px solid #e0e4ec'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3 
        }}>
          <Box>
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                color: 'primary.main',
                fontSize: { xs: '1.5rem', md: '2rem' },
                mb: 1
              }}
            >
              {isForm5B ? 'FORMAT V - B' : 'FORMAT V - A'}
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {isForm5B ? 'Form 5B - Captive Consumption Details' : 'Form 5A - Alternate Details'}
            </Typography>
          </Box>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
          >
            <FormControlLabel
              control={
                <Switch 
                  checked={isForm5B} 
                  onChange={() => setIsForm5B(!isForm5B)}
                />
              }
              label={isForm5B ? 'Form V-B' : 'Form V-A'}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => initiateDownload('excel')}
              startIcon={downloading.excel ? <CircularProgress size={20} /> : <ExcelIcon />}
              disabled={downloading.excel}
            >
              {downloading.excel ? 'Downloading...' : 'Excel Export'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => initiateDownload('csv')}
              startIcon={downloading.csv ? <CircularProgress size={20} /> : <CsvIcon />}
              disabled={downloading.csv}
            >
              {downloading.csv ? 'Downloading...' : 'CSV Export'}
            </Button>
            <Button
              variant="outlined"
              onClick={fetchData}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </Box>

        <FormControl sx={{ mb: 3, minWidth: 200 }}>
          <InputLabel>Financial Year</InputLabel>
          <Select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
          >
            {financialYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table size="small">
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
      >
        <DialogTitle>
          {dialogConfig.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogConfig.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          {dialogConfig.type === 'download' && (
            <Button 
              onClick={() => dialogConfig.action()} 
              color="primary" 
              variant="contained"
            >
              Download
            </Button>
          )}
          {dialogConfig.type === 'error' && (
            <Button 
              onClick={handleCloseDialog} 
              color="primary" 
              variant="contained"
            >
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default AllocationReport;

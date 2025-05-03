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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Slide,
  Snackbar
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FileDownload as ExcelIcon,
  Description as CsvIcon
} from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import * as XLSX from 'xlsx';

const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds

const Transition = React.forwardRef(function Transition(
  props, ref
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AllocationReport = () => {
  const [isForm5B, setIsForm5B] = useState(false); // Changed to false to show Form VA by default
  const [reportData, setReportData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState({ excel: false, csv: false });
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    content: '',
    type: 'download', // 'download' | 'error' | 'success'
    action: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3333/api/health/formva');
      setReportData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchData]);

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
    return [
      { 
        'Sl.No.': 1,
        'Particulars': 'Total Generated units of a generating plant / Station identified for captive use',
        'Energy in Units': reportData.totalGeneratedUnits || 0
      },
      {
        'Sl.No.': 2,
        'Particulars': 'Less : Auxiliary Consumption in the above in units',
        'Energy in Units': reportData.auxiliaryConsumption || 0
      },
      {
        'Sl.No.': 3,
        'Particulars': 'Net units available for captive consumption (Aggregate generation for captive use)',
        'Energy in Units': reportData.aggregateGeneration || 0
      },
      {
        'Sl.No.': 4,
        'Particulars': '51% of aggregate generation available for captive consumption in units',
        'Energy in Units': reportData.percentage51 || 0
      },
      {
        'Sl.No.': 5,
        'Particulars': 'Actual Adjusted / Consumed units by the captive users',
        'Energy in Units': reportData.totalAllocatedUnits || 0
      },
      {
        'Sl.No.': 6,
        'Particulars': 'Percentage of actual adjusted / consumed units by the captive users with respect to aggregate generation for captive use',
        'Energy in Units': `${reportData.percentageAdjusted || 0}%`
      }
    ];
  };

  const prepareForm5BData = () => ({
    headers: [
      'Sl.No.',
      'Particulars',
      'As per share certificates',
      '% of ownership',
      'With 0% variation',
      '-10%',
      '+10%',
      'Actual Adjusted',
      'Total',
      'Compliance'
    ],
    rows: [
      {
        slNo: 1,
        particulars: 'M/s. POLYSPIN EXPORTS LTD',
        sharesCertificates: '',
        ownership: '20.00%',
        variation0: '384283',
        minus10: '',
        plus10: '',
        actualAdjusted: '194692',
        total: '384283',
        compliance: 'Yes'
      },
      {
        slNo: 2,
        particulars: 'M/s. PEL TEXTILES',
        sharesCertificates: '',
        ownership: '6.00%',
        variation0: '305228',
        minus10: '2534',
        plus10: '155666',
        actualAdjusted: '757343',
        total: '305228',
        compliance: 'Yes'
      },
      {
        slNo: 3,
        particulars: 'M/s. A RAMAR AND SONS',
        sharesCertificates: '',
        ownership: 'Minimum 51%',
        variation0: '22117',
        minus10: '',
        plus10: '',
        actualAdjusted: '11280',
        total: '22117',
        compliance: 'Yes'
      }
    ],
    summary: {
      companyName: 'JEYAM BLUE METALS',
      percentageOne: '76.9230769',
      percentageTwo: '23.0769231'
    }
  });

  const downloadExcel = async () => {
    try {
      setDownloading(prev => ({ ...prev, excel: true }));
      const data = isForm5B ? prepareForm5BData() : prepareForm5AData();
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        isForm5B ? data.rows.map(row => ({
          'Sl.No.': row.slNo,
          'Particulars': row.particulars,
          'As per share certificates': row.sharesCertificates,
          '% of ownership': row.ownership,
          'With 0% variation': row.variation0,
          '-10%': row.minus10,
          '+10%': row.plus10,
          'Actual Adjusted': row.actualAdjusted,
          'Total': row.total,
          'Compliance': row.compliance
        })) : data,
        { header: isForm5B ? data.headers : ['Sl.No.', 'Particulars', 'Energy in Units'] }
      );

      // Set column widths
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
        // Headers for Form 5B
        csvContent = data.headers.join(',') + '\n';
        // Data rows for Form 5B
        csvContent += data.rows.map(row => [
          row.slNo,
          `"${row.particulars}"`,
          `"${row.sharesCertificates}"`,
          `"${row.ownership}"`,
          row.variation0,
          row.minus10,
          row.plus10,
          row.actualAdjusted,
          row.total,
          row.compliance
        ].join(',')).join('\n');
        // Add summary
        csvContent += `\n\nFor ${data.summary.companyName}\n`;
        csvContent += `${data.summary.percentageOne}\n`;
        csvContent += data.summary.percentageTwo;
      } else {
        // Form 5A
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

  const renderFormVBTable = () => {
    const data = prepareForm5BData();
    return (
      <>
        <TableHead>
          <TableRow>
            {data.headers.map((header, index) => (
              <TableCell 
                key={header}
                sx={{ 
                  fontWeight: 'bold', 
                  background: '#f5f5f5',
                  width: index === 1 ? '20%' : 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.slNo}>
              <TableCell>{row.slNo}</TableCell>
              <TableCell>{row.particulars}</TableCell>
              <TableCell>{row.sharesCertificates}</TableCell>
              <TableCell>{row.ownership}</TableCell>
              <TableCell align="right">{row.variation0}</TableCell>
              <TableCell align="right">{row.minus10}</TableCell>
              <TableCell align="right">{row.plus10}</TableCell>
              <TableCell align="right">{row.actualAdjusted}</TableCell>
              <TableCell align="right">{row.total}</TableCell>
              <TableCell>{row.compliance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>
    );
  };

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
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            <FormControlLabel
              control={
                <Switch 
                  checked={isForm5B} 
                  onChange={() => setIsForm5B(!isForm5B)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' } }}
                />
              }
              label={isForm5B ? 'Form V-B' : 'Form V-A'}
            />
            <Tooltip title="Download Excel">
              <Button
                variant="contained"
                color="success"
                startIcon={downloading.excel ? <CircularProgress size={20} /> : <ExcelIcon />}
                onClick={() => initiateDownload('excel')}
                disabled={downloading.excel}
                sx={{
                  minWidth: '160px',
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: 2
                }}
              >
                {downloading.excel ? 'Downloading...' : 'Excel Export'}
              </Button>
            </Tooltip>
            <Tooltip title="Download CSV">
              <Button
                variant="contained"
                color="primary"
                startIcon={downloading.csv ? <CircularProgress size={20} /> : <CsvIcon />}
                onClick={() => initiateDownload('csv')}
                disabled={downloading.csv}
                sx={{
                  minWidth: '160px',
                  '&:hover': { bgcolor: 'primary.dark' },
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: 2
                }}
              >
                {downloading.csv ? 'Downloading...' : 'CSV Export'}
              </Button>
            </Tooltip>
            <Button
              variant="outlined"
              sx={{
                minWidth: '140px',
                borderColor: 'secondary.main',
                color: 'secondary.main',
                '&:hover': { 
                  bgcolor: 'secondary.light',
                  borderColor: 'secondary.main' 
                },
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={fetchData}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{
          borderRadius: 2,
          boxShadow: 'none',
          border: '1px solid #e0e4ec',
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            color: 'primary.main',
            borderBottom: '2px solid #e2e8f0',
            whiteSpace: 'nowrap'
          },
          '& .MuiTableCell-body': {
            fontSize: '0.875rem',
            py: 2
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: '#f8fafc'
          }
        }}>
          <Table stickyHeader size="small">
            {isForm5B ? renderFormVBTable() : (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5', width: '10%' }}>Sl.No.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5', width: '60%' }}>Particulars</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5', width: '30%' }}>Energy in Units</TableCell>
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

          {isForm5B && (
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid #e0e4ec',
              bgcolor: '#f8fafc'
            }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {prepareForm5BData().summary.companyName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {prepareForm5BData().summary.percentageOne}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {prepareForm5BData().summary.percentageTwo}
              </Typography>
            </Box>
          )}

          {!isForm5B && (
            <Box sx={{ 
              p: 2,
              borderTop: '1px solid #e0e4ec',
              bgcolor: reportData.percentageAdjusted >= 51 ? 'success.50' : 'error.50',
              color: reportData.percentageAdjusted >= 51 ? 'success.dark' : 'error.dark',
              transition: 'all 0.3s ease-in-out'
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {reportData.percentageAdjusted >= 51 
                  ? 'If Sl.No.6 is Not Less than 51%, then go to FORMAT V - B.'
                  : 'Percentage is less than required 51% threshold'}
              </Typography>
            </Box>
          )}
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleCloseDialog}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            {dialogConfig.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {dialogConfig.type === 'download' && (
            <Button onClick={dialogConfig.action} color="primary">
              Confirm
            </Button>
          )}
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            backgroundColor: snackbar.severity === 'success' ? 'success.main' : 'error.main',
            color: '#fff'
          }
        }}
      />
    </Box>
  );
};

export default AllocationReport;

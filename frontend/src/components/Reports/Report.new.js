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
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { fetchFormVAData, fetchFormVBData } from '../../services/reportService';
import FormVExcelReport from './FormVExcelReport';
import FormVCsvReport from './FormVCsvReport';

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
      let data;
      if (isForm5B) {
        data = await fetchFormVBData(financialYear);
      } else {
        data = await fetchFormVAData(financialYear);
      }
      
      if (!data) {
        throw new Error('No data available for the selected financial year');
      }

      // For Form V-B, the data is nested under a 'data' property
      const processedData = isForm5B ? data.data : data;
      
      if (isForm5B && (!processedData.siteMetrics || processedData.siteMetrics.length === 0)) {
        throw new Error('No consumption site data available for Form V-B');
      }

      setReportData(processedData);
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

  const showSnackbar = (message, severity = 'success') => {
    enqueueSnackbar(message, { variant: severity });
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
            
            <FormVExcelReport
              downloading={downloading}
              setDownloading={setDownloading}
              isForm5B={isForm5B}
              prepareForm5AData={prepareForm5AData}
              prepareForm5BData={prepareForm5BData}
              financialYear={financialYear}
              showSnackbar={showSnackbar}
              handleOpenDialog={handleOpenDialog}
            />

            <FormVCsvReport
              downloading={downloading}
              setDownloading={setDownloading}
              isForm5B={isForm5B}
              prepareForm5AData={prepareForm5AData}
              prepareForm5BData={prepareForm5BData}
              financialYear={financialYear}
              showSnackbar={showSnackbar}
              handleOpenDialog={handleOpenDialog}
            />

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
            {isForm5B ? (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell>Sl.No.</TableCell>
                    <TableCell>Name of Share Holder</TableCell>
                    <TableCell>Share Certificates</TableCell>
                    <TableCell>Ownership Percentage</TableCell>
                    <TableCell>Pro Rata Consumption</TableCell>
                    <TableCell>Annual Generation</TableCell>
                    <TableCell>Auxiliary Consumption</TableCell>
                    <TableCell>Verification Criteria</TableCell>
                    <TableCell>Permitted (0%)</TableCell>
                    <TableCell>Permitted (-10%)</TableCell>
                    <TableCell>Permitted (+10%)</TableCell>
                    <TableCell>Actual Consumption</TableCell>
                    <TableCell>Norms Met</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prepareForm5BData()?.rows.map((row) => (
                    <TableRow key={row.slNo}>
                      <TableCell>{row.slNo}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.shares.certificates}</TableCell>
                      <TableCell>{row.shares.ownership}</TableCell>
                      <TableCell>{row.proRata}</TableCell>
                      <TableCell>{row.generation}</TableCell>
                      <TableCell>{row.auxiliary}</TableCell>
                      <TableCell>{row.criteria}</TableCell>
                      <TableCell>{row.permittedConsumption.withZero}</TableCell>
                      <TableCell>{row.permittedConsumption.minus10}</TableCell>
                      <TableCell>{row.permittedConsumption.plus10}</TableCell>
                      <TableCell>{row.actual}</TableCell>
                      <TableCell>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: row.norms === 'Yes' ? 'success.main' : 'error.main'
                        }}>
                          {row.norms === 'Yes' ? 
                            <CheckCircleIcon fontSize="small" /> : 
                            <ErrorIcon fontSize="small" />
                          }
                          <Typography sx={{ ml: 0.5 }}>{row.norms}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            ) : (
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

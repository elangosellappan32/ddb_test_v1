import React, { useEffect, useState } from 'react';
import { Button, Box, Typography, CircularProgress, Paper } from '@mui/material';
import * as XLSX from 'xlsx';
import allocationApi from '../../services/allocationApi';

const AllocationReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all allocation data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        const allData = await allocationApi.fetchAllAllocations();
        setData(allData);
      } catch (err) {
        setError('Failed to load allocation data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Flatten allocated fields for table and Excel
  const flattenData = data.map(row => ({
    ...row,
    ...(row.allocated || {})
  }));

  const handleDownloadExcel = () => {
    if (!flattenData.length) return;
    const worksheet = XLSX.utils.json_to_sheet(flattenData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');
    XLSX.writeFile(workbook, 'allocation_report.xlsx');
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Allocation Report</Typography>
      <Button variant="contained" color="primary" onClick={handleDownloadExcel} sx={{ mb: 2 }}>
        Download Excel
      </Button>
      <Paper sx={{ overflow: 'auto', maxHeight: 600 }}>
        <table border="1" width="100%" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
            <tr>
              {flattenData[0] && Object.keys(flattenData[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flattenData.map((row, idx) => (
              <tr key={idx}>
                {Object.values(row).map((val, i) => (
                  <td key={i}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Paper>
    </Box>
  );
};

export default AllocationReport;

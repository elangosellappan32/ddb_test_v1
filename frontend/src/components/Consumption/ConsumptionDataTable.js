import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const ConsumptionDataTable = ({ 
  data, 
  onEdit, 
  onDelete, 
  permissions,
  loading 
}) => {
  const [deleteDialog, setDeleteDialog] = React.useState({
    open: false,
    selectedItem: null
  });

  const formatNumber = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => {
      const dateA = new Date(a.date || a.createdat);
      const dateB = new Date(b.date || b.createdat);
      return dateB - dateA;
    });
  }, [data]);

  const calculateRowTotal = (row) => {
    const total = ['c1', 'c2', 'c3', 'c4', 'c5']
      .reduce((sum, key) => sum + Number(row[key] || 0), 0);
    return total.toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    });
  };

  const handleEditClick = (row) => {
    if (onEdit) {
      onEdit(row);
    }
  };

  const handleDeleteClick = (row) => {
    setDeleteDialog({
      open: true,
      selectedItem: row
    });
  };

  const handleDeleteConfirm = () => {
    if (onDelete && deleteDialog.selectedItem) {
      onDelete(deleteDialog.selectedItem);
    }
    setDeleteDialog({ open: false, selectedItem: null });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, selectedItem: null });
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell>
                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Period
                </Typography>
              </TableCell>
              {[1, 2, 3, 4, 5].map(num => (
                <TableCell key={num} align="right">
                  <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                    C{num}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Total
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow 
                key={row.sk} 
                hover 
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>{formatDate(row.date || row.createdat)}</TableCell>
                <TableCell align="right">{formatNumber(row.c1)}</TableCell>
                <TableCell align="right">{formatNumber(row.c2)}</TableCell>
                <TableCell align="right">{formatNumber(row.c3)}</TableCell>
                <TableCell align="right">{formatNumber(row.c4)}</TableCell>
                <TableCell align="right">{formatNumber(row.c5)}</TableCell>
                <TableCell align="right">
                  <Typography color="primary.main" fontWeight="bold">
                    {calculateRowTotal(row)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    {permissions?.update && (
                      <Tooltip title="Edit Consumption Data">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditClick(row)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'primary.lighter',
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {permissions?.delete && (
                      <Tooltip title="Delete Consumption Data">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(row)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.lighter',
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle sx={{ color: 'error.main' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the consumption data for{' '}
            {deleteDialog.selectedItem && formatDate(deleteDialog.selectedItem.date)}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConsumptionDataTable;
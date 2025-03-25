import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDisplayDate } from '../../utils/dateUtils';

const ProductionDataTable = ({ 
  data = [], 
  type = 'unit', 
  onEdit, 
  onDelete 
}) => {
  const formatValue = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const calculateTotal = (row) => {
    if (type === 'unit') {
      return ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((sum, key) => 
        sum + (parseFloat(row[key]) || 0), 0
      );
    }
    return Array.from({length: 10}, (_, i) => 
      `c${String(i + 1).padStart(3, '0')}`
    ).reduce((sum, key) => sum + (parseFloat(row[key]) || 0), 0);
  };

  const columns = type === 'unit' 
    ? ['Period', 'C1', 'C2', 'C3', 'C4', 'C5', 'Total', 'Actions']
    : ['Period', 'C001', 'C002', 'C003', 'C004', 'C005', 'C006', 'C007', 'C008', 'C009', 'C010', 'Total', 'Actions'];

  const renderCells = (row) => {
    if (type === 'unit') {
      return ['c1', 'c2', 'c3', 'c4', 'c5'].map(key => (
        <TableCell key={key}>{formatValue(row[key])}</TableCell>
      ));
    }

    return Array.from({length: 10}, (_, i) => {
      const key = `c${String(i + 1).padStart(3, '0')}`;
      return <TableCell key={key}>{formatValue(row[key])}</TableCell>;
    });
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <TableCell key={column}>{column}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.sk || row.id}>
              <TableCell>{formatDisplayDate(row.sk)}</TableCell>
              {renderCells(row)}
              <TableCell>{formatValue(calculateTotal(row))}</TableCell>
              <TableCell>
                <Tooltip title="Edit">
                  <IconButton onClick={() => onEdit?.(row)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={() => onDelete?.(row)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductionDataTable;
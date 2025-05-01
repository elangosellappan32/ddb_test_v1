import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const AllocationReport = lazy(() => import('./Reports/AllocationReport'));

const Loading = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

const Reports = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="allocation-report" element={<AllocationReport />} />
        <Route path="*" element={<Navigate to="allocation-report" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Reports;

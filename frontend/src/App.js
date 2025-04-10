import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider, CircularProgress, Box, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enUS } from 'date-fns/locale';
import { StyledEngineProvider } from '@mui/material/styles';

import { AuthProvider } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Layout from "./Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import theme from './theme';

// Lazy load components
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const Production = lazy(() => import("./components/Production/Production")); 
const ProductionSiteDetails = lazy(() => import("./components/Production/ProductionSiteDetails"));
const Consumption = lazy(() => import("./components/Consumption/Consumption"));
const ConsumptionSiteDetails = lazy(() => import("./components/Consumption/ConsumptionSiteDetails"));
const Reports = lazy(() => import("./components/Reports"));
const Allocation = lazy(() => import("./components/Allocation/Allocation"));

// Loading component for suspense fallback
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Main Routes component 
const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/production" element={<Production />} />
          <Route path="/production/:companyId/:productionSiteId" element={<ProductionSiteDetails />} />
          <Route path="/consumption" element={<Consumption />} />
          <Route path="/consumption/:companyId/:consumptionSiteId" element={<ConsumptionSiteDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
            <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
              <NavigationProvider>
                <AuthProvider>
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                </AuthProvider>
              </NavigationProvider>
            </SnackbarProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
}

export default App;
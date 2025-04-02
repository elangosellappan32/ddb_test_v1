import React, { Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter as Router
} from "react-router-dom";
import { 
  ThemeProvider,
  CircularProgress,
  Box
} from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Layout from "./Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import theme from './theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enUS } from 'date-fns/locale';
import CssBaseline from '@mui/material/CssBaseline';
import { NavigationProvider } from './context/NavigationContext';

// Lazy load components
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const Production = lazy(() => import("./components/Production/Production"));
const ProductionSiteDetails = lazy(() => import("./components/Production/ProductionSiteDetails"));
const Consumption = lazy(() => import("./components/Consumption/Consumption"));
const Reports = lazy(() => import("./components/Reports"));

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <NavigationProvider>
              <AuthProvider>
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="100vh"
                      >
                        <CircularProgress />
                      </Box>
                    }
                  >
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<Login />} />

                      {/* Protected routes */}
                      <Route element={
                        <PrivateRoute>
                          <Layout />
                        </PrivateRoute>
                      }>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/production" element={<Production />} />
                        <Route 
                          path="/production/:companyId/:productionSiteId"
                          element={<ProductionSiteDetails />} 
                        />
                        <Route path="/consumption" element={<Consumption />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </AuthProvider>
            </NavigationProvider>
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
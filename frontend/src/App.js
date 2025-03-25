import React, { Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter
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
const Consumption = lazy(() => import("./components/Consumption"));
const Reports = lazy(() => import("./components/Reports"));

function App() {
  return (
    <BrowserRouter>
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
                      <Route path="/login" element={<Login />} />
                      <Route
                        path="/"
                        element={
                          <PrivateRoute>
                            <Layout>
                              <Dashboard />
                            </Layout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/production"
                        element={
                          <PrivateRoute>
                            <Layout>
                              <Production />
                            </Layout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/consumption"
                        element={
                          <PrivateRoute>
                            <Layout>
                              <Consumption />
                            </Layout>
                          </PrivateRoute>
                        }
                      />
                      <Route 
                        path="/dashboard" 
                        element={
                          <PrivateRoute>
                            <Layout>
                              <ErrorBoundary>
                                <Dashboard />
                              </ErrorBoundary>
                            </Layout>
                          </PrivateRoute>
                        } 
                      />
                      <Route
                        path="/production/:companyId/:productionSiteId"
                        element={
                          <PrivateRoute>
                            <Layout>
                              <ProductionSiteDetails />
                            </Layout>
                          </PrivateRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </AuthProvider>
            </NavigationProvider>
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
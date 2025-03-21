// src/components/ErrorBoundary.js
import React from 'react';
import { Alert } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Alert severity="error">Something went wrong. Please try refreshing the page.</Alert>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
import React from 'react';

// MUI imports
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// React Router imports
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Page imports
import Login from './auth/login';
import ForgotPassword from './auth/forgotpassword';
import AdminDashboard from './Admin/AdminDashboard';
import EmployeeDashboard from './user/UserDashboard';
// Define a basic theme (you can customize this later)
const customTheme = createTheme({
  palette: {
    primary: {
      main: '#f97316',
    },
    secondary: {
      main: '#22c55e',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});
export default function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login onLoginSuccess={() => {}} />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/Admindashboard" element={<AdminDashboard />} />
         <Route path="/Attendancecard" element={<EmployeeDashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

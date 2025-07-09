
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Stack,
  Link,
  Alert,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from "@mui/material";
import {
  LockOutlined as LockOutlinedIcon,
  MailOutline as MailOutlineIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from "@mui/icons-material";
import logo from '../assets/logo.png'; // adjust the path based on your folder structure
 
import {
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import illustration from "../assets/login-illustration.png"; // your left side image
 
const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
 
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
    loginMode: "employee",
  });
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
 
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === "rememberMe" ? checked : value,
    });
  };
 
  const handleLoginModeChange = (event, newMode) => {
    if (newMode !== null) {
      setFormData({ ...formData, loginMode: newMode });
      setErrorMsg("");
      setErrors({});
    }
  };
 
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password cannot be empty";
    }
    return newErrors;
  }, [formData.email, formData.password]);
 
  useEffect(() => {
    if (formData.email || formData.password) {
      const timer = setTimeout(() => {
        setErrors(validateForm());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.email, formData.password, validateForm]);
 
  const loginWithApi = async (email, password, loginMode, rememberMe) => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Determine the correct API endpoint based on login mode
      const endpoint = loginMode === 'admin' 
        ? 'http://localhost:8000/api/auth/login/admin/'
        : 'http://localhost:8000/api/auth/login/user/';

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          email, 
          password,
          // Include username as email if needed by the API
          username: email
        }),
        credentials: 'include' // Important for cookies/session if using them
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(
          data.detail || 
          data.message || 
          (data.email ? data.email[0] : '') || 
          (data.password ? data.password[0] : '') || 
          'Login failed. Please check your credentials.'
        );
      }

      if (data.access && data.refresh) {
        // Store tokens and user data
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        localStorage.setItem("user_email", email);
        
        // Store user data if available
        if (data.user) {
          localStorage.setItem("user_id", data.user.id);
          localStorage.setItem("user_name", `${data.user.first_name} ${data.user.last_name}`);
          localStorage.setItem("is_staff", data.user.is_staff);
          localStorage.setItem("is_superuser", data.user.is_superuser);
        }

        return { 
          success: true, 
          role: loginMode,
          user: data.user || null
        };
      } else {
        throw new Error("Authentication data not received from server.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };
 
  const handleLogin = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrorMsg("Please correct the errors above.");
      return;
    }
    
    if (!formData.password) {
      setErrorMsg("Password is required");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      
      // Use the auth context login function
      await authLogin(
        formData.email,
        formData.password,
        formData.rememberMe
      );

      // Store remember me preference
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedEmail');
      }

      // Show success message and redirect
      setErrorMsg("Login successful! Redirecting...");
      
      // Redirect based on login mode
      const redirectPath = formData.loginMode === 'admin' 
        ? '/AdminDashboard' 
        : '/AttendanceCard';
        
      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(
        err.message.includes('401') 
          ? 'Invalid email or password. Please try again.'
          : err.message || 'An error occurred during login. Please try again.'
      );
    }
  };
 
  return (
    <Box
      component="form"
      onSubmit={handleLogin}
      sx={{
        display: "flex",
        minHeight: "100vh",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        background:
          "linear-gradient(-45deg, #2193b0, #6dd5ed, #b92b27, #1565C0)",
        backgroundSize: "400% 400%",
        animation: "gradientAnimation 15s ease infinite",
        "@keyframes gradientAnimation": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      }}
    >
      <Paper
        elevation={6}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          borderRadius: 4,
          overflow: "hidden",
          maxWidth: 960,
          width: "100%",
        }}
      >
        {/* LEFT SIDE */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#f4f9fc",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            py: 4,
            px: 3,
          }}
        >
         
<Typography variant="h6" fontWeight="bold" mb={2}>
          Your gateway to On-Duty: A portal that opens the door to{' '}
            <Box component="span" sx={{ color: '#f97316', fontWeight: 'bold' }}>Active Work.</Box>
          </Typography>
          <Box sx={{ mt: 6 }}>
            <img
              src={illustration}
              alt="Illustration"
              style={{ maxWidth: "100%", width: "300px" }}
            />
          </Box>
 
          <Typography
            mt={3}
            textAlign="center"
            fontSize="16px"
            color="black"
          >
            <Box component="span" variant="h6" fontWeight="bold">Every Head Count</Box>{' '}
            <Box component="span" variant="h6" fontWeight="bold">
              - Tracking attendance in <Box component="span" sx={{ color: '#f97316' }}>Real-Time.</Box>
            </Box>
          </Typography>
 
         
        </Box>
 
        {/* RIGHT SIDE - LOGIN FORM */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#fff",
            px: 5,
            py: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", my: 2 }}>
  <img
    src={logo}
    alt="Logo"
    style={{ height:60 ,position:"relative",bottom:40}}
  />
</Box>
 
 
   
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <ToggleButtonGroup
              value={formData.loginMode}
              exclusive
              onChange={handleLoginModeChange}
              aria-label="login mode"
              sx={{
                backgroundColor: '#f0f0f0',
                borderRadius: '30px',
                padding: '4px',
                '& .MuiToggleButtonGroup-grouped': {
                  border: 'none',
                  borderRadius: '26px',
                  textTransform: 'none',
                  padding: '6px 20px',
                  color: '#666',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: '#f97316',
                    color: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    '&:hover': {
                      backgroundColor: '#ea580c',
                    },
                  },
                  '&:not(:first-of-type)': {
                    marginLeft: '4px',
                    borderLeft: '1px solid transparent',
                  },
                  '&:first-of-type': {
                    marginRight: '4px',
                  },
                },
              }}
            >
              <ToggleButton value="employee" aria-label="employee login">
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon fontSize="small" />
                  <span>Employee</span>
                </Box>
              </ToggleButton>
              <ToggleButton value="admin" aria-label="admin login">
                <Box display="flex" alignItems="center" gap={1}>
                  <AdminIcon fontSize="small" />
                  <span>Admin</span>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
 
          <Typography variant="subtitle1" mb={3}>
            A quick identity check: Pop in your{" "}
            <Box component="span" sx={{ color: '#f97316', fontWeight: 500 ,fontWeight:"bold" }}>
              "Credentials"
            </Box>
          </Typography>
 
 
          <Stack spacing={2} component="form" onSubmit={handleLogin}>
            <TextField
              name="email"
              label="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlineIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              error={!!errors.password}
              helperText={errors.password}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
 
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    name="rememberMe"
                  />
                }
                label="Remember me"
              />
 
              <Link
                component="button"
                onClick={() => navigate("/ForgotPassword")}
                underline="hover"
              >
                Forgotten Password?
              </Link>
            </Box>
 
            {errorMsg && (
              <Alert
                severity={errorMsg.includes("success") ? "success" : "error"}
              >
                {errorMsg}
              </Alert>
            )}
 
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  height: 48,
                  width: '300px',
                  borderRadius: '24px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  backgroundColor: '#f97316',
                  '&:hover': {
                    backgroundColor: '#ea580c',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  },
                  '&:active': {
                    transform: 'translateY(1px)',
                  },
                }}
                endIcon={
                  <KeyboardArrowRightIcon sx={{ fontSize: '1.5rem' }} />
                }
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
 
export default Login;
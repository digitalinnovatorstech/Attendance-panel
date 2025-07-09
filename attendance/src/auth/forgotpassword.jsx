import {
    Box,
    Button,
    Paper,
    TextField,
    Typography,
    Stack,
    Alert,
    CircularProgress,
    InputAdornment,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MailOutline as MailOutlineIcon } from "@mui/icons-material";
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api'; // Update with your backend URL

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!email) {
            setError("Email is required");
            return;
        }
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }
        try {
            setLoading(true);
            setError("");
            // Call the password reset API
            const response = await axios.post(`${API_BASE_URL}/auth/password-reset/`, {
                email: email
            });
            localStorage.setItem('resetEmail', email);
            setSuccessMsg(response.data.message || "Password reset link has been sent to your email.");
            setEmail("");
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error("Password reset error:", err);
            const errorMessage = err.response?.data?.error || "Failed to send reset link. Please try again later.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const animatedBackground = {
        background: "linear-gradient(-45deg, #2193b0, #6dd5ed, #b92b27, #1565C0)",
        backgroundSize: "400% 400%",
        animation: "gradientAnimation 15s ease infinite",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        '&': {
            '@keyframes gradientAnimation': {
                '0%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
                '100%': { backgroundPosition: '0% 50%' },
            },
        },
    };

    const handleBackToLogin = () => {
        navigate(-1); 
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 2,
                background: "#f5f5f5",
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    width: "100%",
                    maxWidth: 450,
                    padding: 4,
                    borderRadius: 2,
                }}
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Typography
                    variant="h4"
                    component="h1"
                    align="center"
                    gutterBottom
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                >
                    Forgot Password
                </Typography>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ mb: 3 }}
                >
                    Enter your email address and we'll send you a link to reset your password.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {successMsg && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {successMsg}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Email Address"
                            variant="outlined"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setEmailFocused(true)}
                            onBlur={() => setEmailFocused(false)}
                            disabled={loading}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MailOutlineIcon
                                            color={
                                                emailFocused
                                                    ? "primary"
                                                    : "action"
                                            }
                                        />
                                    </InputAdornment>
                                ),
                            }}
                            required
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={loading}
                            sx={{
                                mt: 2,
                                py: 1.5,
                                borderRadius: 1,
                                textTransform: "none",
                                fontWeight: "bold",
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>

                        <Button
                            variant="text"
                            fullWidth
                            size="small"
                            onClick={handleBackToLogin}
                            sx={{
                                mt: 1,
                                borderRadius: "28px",
                                textTransform: "none",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#1976d2",
                            }}
                        >
                            Back to Login
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Box>
    );
}

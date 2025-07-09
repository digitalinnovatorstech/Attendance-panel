import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  CssBaseline,
  Box,
  useMediaQuery,
  useTheme,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import EmployeeDashboard from './userpage';
import EmployeeChat from '../Admin/EmployeeChat';
import logo from '../assets/logo.png';

// Color constants
const primaryColor = '#1b5e20'; // Dark green
const secondaryColor = '#4caf50'; // Medium green
const lightBackground = '#e6f4ea'; // Light green background
const whiteColor = '#ffffff';
const textPrimary = '#212121';
const textSecondary = '#757575';
const dividerColor = '#e0e0e0';
const successColor = '#2e7d32';
const errorColor = '#c62828';
const warningColor = '#ff8f00';
const infoColor = '#0277bd';

const drawerWidth = 220;

function UserDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('dashboard');
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuItemClick = (view) => {
    setSelectedView(view);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://localhost:8000/api/employees/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_email');
      navigate('/');
    }
  };

  const drawerContent = (
    <Box sx={{
      backgroundImage: `linear-gradient(to bottom, ${lightBackground}, ${whiteColor})`,
      height: '100%',
      color: primaryColor,
      paddingTop: 4,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, mt: -3 }}>
        <img
          src={logo}
          alt="Logo"
          style={{
            height: 45,
            width: 'auto',
            objectFit: 'contain',
            maxWidth: '100%'
          }}
        />
      </Box>
      <Box sx={{
        width: '100%',
        marginTop: "-20px",
        borderBottom: `1px solid ${dividerColor}`,
        opacity: 0.5,
        mb: 2
      }} />

      <List sx={{
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
        <ListItem
          button
          onClick={() => handleMenuItemClick('dashboard')}
          sx={{
            color: textPrimary,
            '&.Mui-selected': {
              backgroundColor: '#ede7f6',
              borderRadius: '8px',
              margin: '4px',
              color: whiteColor
            },
            '&:hover': {
              backgroundColor: '#f3e5f5',
              borderRadius: '8px',
              margin: '4px'
            },
            padding: '8px 16px'
          }}
        >
          <DashboardIcon sx={{
            color: textPrimary,
            fontSize: '1.2rem',
            minWidth: '24px',
            minHeight: '24px'
          }} />
          <ListItemText 
            primary="Employee Attendance" 
            primaryTypographyProps={{ 
              fontFamily: "'Roboto', sans-serif",
              fontSize: '0.9rem',
              fontWeight: 500 
            }} 
          />
        </ListItem>
 
        <ListItem
          button
          onClick={() => handleMenuItemClick('chat')}
          sx={{
            color: textPrimary,
            '&.Mui-selected': {
              backgroundColor: '#ede7f6',
              borderRadius: '8px',
              margin: '4px',
              color: whiteColor
            },
            '&:hover': {
              backgroundColor: '#f3e5f5',
              borderRadius: '8px',
              margin: '4px'
            },
            padding: '8px 16px'
          }}
        >
          <ChatIcon sx={{
            color: textPrimary,
            fontSize: '1.2rem',
            minWidth: '24px',
            minHeight: '24px'
          }} />
          <ListItemText 
            primary="Employee Chat" 
            primaryTypographyProps={{ 
              fontFamily: "'Roboto', sans-serif",
              fontSize: '0.9rem',
              fontWeight: 500 
            }} 
          />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundImage: `linear-gradient(to bottom, ${lightBackground}, ${whiteColor})`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <AppBar
          position="sticky"
          sx={{
            top: 0,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundImage: `linear-gradient(to right, ${lightBackground}, ${whiteColor})`,
            color: primaryColor,
            boxShadow: 'none',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
          }}
        >
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ display: { sm: 'none' }, mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography 
                variant="h6" 
                noWrap 
                component="div"
                sx={{
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  letterSpacing: '0.02em'
                }}
              >
                Employee Panel
              </Typography>
            </Box>
            <Button
              onClick={handleLogout}
              color="inherit"
              startIcon={<LogoutIcon />}
              sx={{ 
                color: primaryColor, 
                fontWeight: 600,
                fontFamily: "'Roboto', sans-serif",
                fontSize: '0.875rem',
                letterSpacing: '0.02em'
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 4 }}>
          {selectedView === 'dashboard' && <EmployeeDashboard />}
          {selectedView === 'chat' && <EmployeeChat />}
        </Box>
      </Box>
    </Box>
  );
}

export default UserDashboard;
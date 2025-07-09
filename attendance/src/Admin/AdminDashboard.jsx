


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
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
 import logo from '../assets/logo.png';
import EmployeeDashboard from './EmployeeDashboard';
import EmployeeChat from './EmployeeChat';
 
const drawerWidth = 200;
 
function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
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
 
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
 
  const handleClose = () => {
    setAnchorEl(null);
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
        handleClose(); 
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
    <Box sx={{ overflow: 'auto' }}>
      <Toolbar />
      <List>
        <ListItem button onClick={() => handleMenuItemClick('dashboard')} selected={selectedView === 'dashboard'}>
          <DashboardIcon sx={{ mr: 2 }} />
          <ListItemText primary="Employee Updates" />
        </ListItem>
        <ListItem button onClick={() => handleMenuItemClick('chat')} selected={selectedView === 'chat'}>
          <ChatIcon sx={{ mr: 2 }} />
          <ListItemText primary="Employee Chat" />
        </ListItem>
      </List>
    </Box>
  );
 
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <img
                src={logo}
                alt="Logo"
                style={{ height: 40, marginRight: 2 }}
              />
            </Box>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 500
              }}
            >
              Admin Panel
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={open}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} /> Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
 
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            [`& .MuiDrawer-paper`]: { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
 
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
        }}
      >
        {selectedView === 'dashboard' && <EmployeeDashboard />}
        {selectedView === 'chat' && <EmployeeChat />}
      </Box>
    </Box>
  );
}
 
export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress,
  TextField, MenuItem, FormControl, InputLabel, Select,
  Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, RadioGroup, FormControlLabel, Radio,
  IconButton, InputAdornment, ClickAwayListener, Fade, Menu, Collapse
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { useNavigate } from 'react-router-dom';
import GroupIcon from '@mui/icons-material/Group';
import FilterListIcon from '@mui/icons-material/FilterList';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import EventBusyIcon from '@mui/icons-material/EventBusy';
 
function EmployeeDashboard() {
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedReportContent, setSelectedReportContent] = useState('');
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [lateLoginReasons, setLateLoginReasons] = useState([]);
  const [selectedReasonId, setSelectedReasonId] = useState(null);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [error, setError] = useState(null);
  const currentUserEmail = localStorage.getItem('user_email');
  
  // Define columns for the DataGrid
  const columns = [
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1, 
      minWidth: 200,
      headerAlign: 'center',
      align: 'center'
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1, 
      minWidth: 250,
      headerAlign: 'center',
      align: 'center'
    },
    {
      field: 'lastLogin',
      headerName: 'Login',
      width: 170,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (params) => {
        if (!params || !params.value || params.value === '-') return '-';
        try {
          const date = new Date(params.value);
          return isNaN(date.getTime()) ? '-' : date.toLocaleTimeString();
        } catch (e) {
          console.error('Error formatting lastLogin:', e);
          return '-';
        }
      }
    },
    {
      field: 'lastLogout',
      headerName: 'Logout',
      width: 170,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (params) => {
        if (!params || !params.value || params.value === '-') return '-';
        try {
          const date = new Date(params.value);
          return isNaN(date.getTime()) ? '-' : date.toLocaleTimeString();
        } catch (e) {
          console.error('Error formatting lastLogout:', e);
          return '-';
        }
      }
    },
    {
      field: 'hours',
      headerName: 'Hours',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      valueGetter: (params) => {
        if (!params?.row) return '0h 0m';
        try {
          return params.row.hours || calculateHours(params.row.lastLogin, params.row.lastLogout) || '0h 0m';
        } catch (e) {
          console.error('Error calculating hours:', e);
          return '0h 0m';
        }
      },
      renderCell: (params) => {
        try {
          const hours = calculateHours(params.row.lastLogin, params.row.lastLogout);
          return <Typography>{hours || '0h 0m'}</Typography>;
        } catch (e) {
          console.error('Error rendering hours:', e);
          return <Typography>0h 0m</Typography>;
        }
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Offline'} 
          color={getStatusColor(params.value || 'Offline')} 
          size="small" 
        />
      )
    },
    {
      field: 'dailyReportSent',
      headerName: 'Daily Report',
      width: 160,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Button
          variant="text"
          onClick={() => {
            if (params.value) handleReportClick(params.row);
          }}
          sx={{ textTransform: 'none', p: 0, minWidth: 0, justifyContent: 'flex-start' }}
          disabled={!params.value}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {params.value ? (
              <>
                <CheckCircleOutlineIcon sx={{ color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                  Sent
                </Typography>
              </>
            ) : (
              <>
                <CancelOutlinedIcon sx={{ color: 'text.disabled', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Pending
                </Typography>
              </>
            )}
          </Box>
        </Button>
      )
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const found = lateLoginReasons.find(r => r.employee === params.row.id);
        return found ? (
          <Button
            variant="text"
            color="primary"
            size="small"
            sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
            onClick={() => {
              setSelectedReason(found.reason);
              setSelectedName(params.row.name);
              setSelectedReasonId(found.id);
              setReasonDialogOpen(true);
            }}
          >
            View
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">-</Typography>
        );
      }
    },
  ];
  
  // Filter data based on search term and status
  const filteredData = React.useMemo(() => {
    if (!employeeData || !Array.isArray(employeeData)) return [];
    
    return employeeData.filter(emp => {
      // Skip if employee data is invalid
      if (!emp || typeof emp !== 'object') return false;
      
      // Filter by search term (name or email)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (emp.name?.toLowerCase().includes(searchLower) ||
         emp.email?.toLowerCase().includes(searchLower));
      
      // Filter by status (case-insensitive)
      const empStatus = emp.status?.toLowerCase() || '';
      const matchesStatus = filterStatus === 'All' || 
        empStatus === filterStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [employeeData, searchTerm, filterStatus]);

  // Add the missing handleApproveReject function
  // const handleApproveReject = async (approve) => {
  //   try {
  //     const token = localStorage.getItem("access_token");
  //     const response = await fetch(`http://localhost:8000/api/late-login-reasons/${selectedReasonId}/`, {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify({
  //         is_approved: approve
  //       })
  //     });

  //     if (response.ok) {
  //       // Refresh the data
  //       fetchLateLoginReasons();
  //       setReasonDialogOpen(false);
  //     } else {
  //       console.error('Failed to update late login reason status');
  //     }
  //   } catch (error) {
  //     console.error('Error updating late login reason status:', error);
  //   }
  // };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Fetch employees and attendance data in parallel
      const [employeesRes, attendanceRes] = await Promise.all([
        fetch("http://localhost:8000/api/employees/", {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch("http://localhost:8000/api/employees/today/", {
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!employeesRes.ok) {
        const errorData = await employeesRes.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${employeesRes.status}`);
      }

      const employees = await employeesRes.json();
      const employeeList = employees.results || [];
      
      // Process attendance data if available
      let attendanceMap = {};
      if (attendanceRes.ok) {
        try {
          const attendanceData = await attendanceRes.json();
          if (Array.isArray(attendanceData)) {
            attendanceData.forEach(att => {
              attendanceMap[att.employee_id] = att;
            });
          }
        } catch (e) {
          console.error('Error processing attendance data:', e);
        }
      }

      // Process and merge employee data with attendance
      const processedEmployees = employeeList.map(emp => {
        const attendance = attendanceMap[emp.id] || {};
        const fullName = emp.full_name || emp.user?.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
        
        return {
          id: emp.id,
          name: fullName || emp.email,
          email: emp.email || emp.user?.email || 'No email',
          department: emp.department || emp.user?.department || 'N/A',
          position: emp.position || emp.user?.position || 'N/A',
          status: attendance.status || (emp.is_active || emp.user?.is_active ? 'Active' : 'Inactive'),
          lastLogin: attendance.login_time || emp.last_login || emp.user?.last_login || '-',
          lastLogout: attendance.logout_time || '-',
          hours: attendance.hours_worked || '0h 0m',
          dailyReportSent: !!attendance.daily_report_sent,
          dailyReportContent: attendance.daily_report_content || '',
          isStaff: emp.is_staff || emp.user?.is_staff,
          isSuperuser: emp.is_superuser || emp.user?.is_superuser
        };
      });

      setEmployeeData(processedEmployees);
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      setError(error.message || 'Failed to load employee data. Please try again.');
      setEmployeeData([]);
    } finally {
      setLoading(false);
    }
  };
 
  // Fetch late login reasons
  const fetchLateLoginReasons = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:8000/api/late-login-reasons/", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      console.log('Late login reasons:', data);
      setLateLoginReasons(Array.isArray(data) ? data : []);
    } catch (error) {
      setLateLoginReasons([]);
    }
  };
 
  useEffect(() => {
    fetchEmployees();
    fetchLateLoginReasons();
  }, []);
 
  useEffect(() => {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (!access || !refresh) {
      navigate('/');
    }
  });
 
  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('active') || statusLower.includes('online')) {
      return 'success';
    } else if (statusLower.includes('inactive') || statusLower.includes('offline')) {
      return 'error';
    } else if (statusLower.includes('leave') || statusLower.includes('away')) {
      return 'warning';
    } else if (statusLower.includes('break') || statusLower.includes('lunch')) {
      return 'info';
    }
    return 'default';
  };
 
  const calculateHours = (login, logout) => {
    // Handle invalid or missing inputs
    if (!login || !logout || login === '-' || logout === '-') return '-';
    
    try {
      // Parse dates
      const loginTime = new Date(login);
      const logoutTime = new Date(logout);
      
      // Validate dates
      if (isNaN(loginTime.getTime()) || isNaN(logoutTime.getTime())) {
        console.warn('Invalid date format in calculateHours');
        return '-';
      }
      
      // Calculate difference in milliseconds
      const diffMs = logoutTime - loginTime;
      
      // Handle invalid time difference (negative or invalid)
      if (isNaN(diffMs) || diffMs < 0) return '-';
      
      // Calculate hours and minutes
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      // Format the output
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
      
    } catch (error) {
      console.error('Error in calculateHours:', error);
      return '-';
    }
  };
 
  const handleReportClick = (employee) => {
    setSelectedEmail(employee.email);
    setSelectedReportContent(employee.dailyReportContent);
    setReplyMode(false);
    setReplyText('');
    setOpenDialog(true);
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
  
  const handleShareClick = (event) => {
    setShareAnchorEl(event.currentTarget);
  };
  
  const handleShareClose = () => {
    setShareAnchorEl(null);
  };
 
  const handleExport = (format) => {
    handleShareClose();
    
    // Prepare data for export
    const data = filteredData.map(emp => {
      const hasLateReason = lateLoginReasons.some(r => r.employee === emp.id);
      
      return {
        'Name': emp.name || '-',
        'Email': emp.email || '-',
        'Department': emp.department || 'N/A',
        'Position': emp.position || 'N/A',
        'Status': emp.status || 'Unknown',
        'Last Login': emp.lastLogin && emp.lastLogin !== '-' ? 
          new Date(emp.lastLogin).toLocaleString() : '-',
        'Last Logout': emp.lastLogout && emp.lastLogout !== '-' ? 
          new Date(emp.lastLogout).toLocaleString() : '-',
        'Hours Worked': calculateHours(emp.lastLogin, emp.lastLogout),
        'Daily Report': emp.dailyReportSent ? 'Submitted' : 'Not Submitted',
        'Has Late Reason': hasLateReason ? 'Yes' : 'No',
        'Is Staff': emp.isStaff ? 'Yes' : 'No',
        'Is Superuser': emp.isSuperuser ? 'Yes' : 'No',
        'Last Updated': new Date().toLocaleString()
      };
    });

    if (format === 'excel' || format === 'csv') {
      try {
        // Check if XLSX is available
        if (typeof XLSX === 'undefined') {
          console.error('XLSX library is not available');
          return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        
        if (format === 'excel') {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Employee Data');
          XLSX.writeFile(wb, `Employee_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else { // CSV
          const csv = XLSX.utils.sheet_to_csv(ws);
          // Add UTF-8 BOM for Excel compatibility
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          saveAs(blob, `Employee_Data_${new Date().toISOString().split('T')[0]}.csv`);
        }
      } catch (error) {
        console.error(`Error exporting to ${format.toUpperCase()}:`, error);
        alert(`Failed to export data to ${format.toUpperCase()}. Please try again.`);
      }
    } else if (format === 'word') {
      try {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: 'Employee Attendance Report',
                heading: 'Heading1',
                spacing: { after: 200 }
              }),
              new Paragraph({
                text: `Generated on: ${new Date().toLocaleString()}`,
                spacing: { after: 400 }
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Header row
                  new TableRow({
                    children: Object.keys(data[0] || {}).map(header => 
                      new TableCell({
                        children: [new Paragraph({
                          text: header,
                          bold: true
                        })]
                      })
                    )
                  }),
                  // Data rows
                  ...data.map(emp => 
                    new TableRow({
                      children: Object.values(emp).map(value => 
                        new TableCell({
                          children: [new Paragraph({
                            text: String(value),
                            spacing: { line: 300 }
                          })]
                        })
                      )
                    })
                  )
                ]
              })
            ]
          }]
        });

        // Generate and download the Word document
        Packer.toBlob(doc).then(blob => {
          saveAs(blob, `Employee_Report_${new Date().toISOString().split('T')[0]}.docx`);
        });
      } catch (error) {
        console.error('Error exporting to Word:', error);
        alert('Failed to export data to Word. Please try again.');
      }
    }
  };
 
  const handleApproveReject = async (approved) => {
    if (!selectedReasonId) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://localhost:8000/api/late-login/${selectedReasonId}/approve/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ approved }),
      });
      setReasonDialogOpen(false);
      fetchLateLoginReasons();
    } catch (e) {
      alert('Failed to update reason approval.');
    }
  };
 
  const handleApproveRejectRow = async (reasonId, approved) => {
    if (!reasonId) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://localhost:8000/api/late-login/${reasonId}/approve/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ approved }),
      });
      fetchLateLoginReasons();
    } catch (e) {
      alert('Failed to update reason approval.');
    }
  };
 
  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };
 
  const handleCloseSearch = () => {
    setSearchTerm('');
    setIsSearchOpen(false);
  };
 
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="60vh"><CircularProgress /></Box>;
 
  return (
    <Box sx={{ p: 0 }}>
      <Box display="flex" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Typography variant="h4" fontWeight="bold" flexGrow={1}>Employee Status</Typography>
       
        <ClickAwayListener onClickAway={() => {
          if (!searchTerm) setIsSearchOpen(false);
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {!isSearchOpen ? (
              <IconButton onClick={handleSearchClick}>
                <SearchIcon />
              </IconButton>
            ) : (
              <Fade in={isSearchOpen}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    variant="standard"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by name"
                    autoFocus
                    InputProps={{
                      disableUnderline: true,
                      startAdornment: null,
                    }}
                    sx={{
                      width: 200,
                      '& .MuiInputBase-root': {
                        padding: '6px 0',
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 0',
                      },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #FFA500, #FF8C00)',
                      borderRadius: '2px',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleCloseSearch}
                    sx={{
                      ml: 1,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main',
                        backgroundColor: 'rgba(244, 67, 54, 0.08)'
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Fade>
            )}
          </Box>
        </ClickAwayListener>
       
        {/* Status Dropdown */}
        <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ml: 1 }}>
          <FilterListIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 20 }} />
          <Button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            endIcon={showStatusDropdown ? <ExpandLess /> : <ExpandMore />}
            startIcon={<GroupIcon fontSize="small" />}
            sx={{
              minWidth: 60,
              justifyContent: 'space-between',
              textTransform: 'none',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              '&:hover': {
                borderColor: 'text.primary',
                backgroundColor: 'action.hover',
              },
              pl: 1,
              pr: 0.5,
            }}
          >
            Status
          </Button>
         
          {showStatusDropdown && (
            <ClickAwayListener onClickAway={() => setShowStatusDropdown(false)}>
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 1,
                  mt: 0.5,
                  minWidth: 150,
                  borderRadius: 1,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease-out',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0, transform: 'translateY(-10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                {[
                  { value: 'All', label: 'All Employees', icon: <GroupIcon fontSize="small" /> },
                  { value: 'Online', label: 'Online', icon: <FiberManualRecordIcon fontSize="small" color="success" /> },
                  { value: 'Leave', label: 'On Leave', icon: <EventBusyIcon fontSize="small" color="action" /> },
                  { value: 'Offline', label: 'Offline', icon: <FiberManualRecordIcon fontSize="small" color="disabled" /> },
                ].map(({ value, label, icon }) => (
                  <MenuItem
                    key={value}
                    selected={filterStatus === value}
                    onClick={() => {
                      setFilterStatus(value);
                      setShowStatusDropdown(false);
                    }}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {icon}
                      {label}
                    </Box>
                  </MenuItem>
                ))}
              </Paper>
            </ClickAwayListener>
          )}
        </Box>
       
        <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ml: 1 }}>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShareOpen(!shareOpen);
            }}
            startIcon={<ShareIcon />}
            sx={{
              color: 'primary.main',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            aria-label="export options"
          >
            Export
          </Button>
         
          {shareOpen && (
            <ClickAwayListener onClickAway={() => setShareOpen(false)}>
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 1,
                  mt: 0.5,
                  borderRadius: 1,
                  overflow: 'hidden',
                  minWidth: 150,
                  animation: 'fadeIn 0.2s ease-out',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0, transform: 'translateY(-10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <MenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('word');
                    setShareOpen(false);
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  Export to Word
                </MenuItem>
                <MenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('csv');
                    setShareOpen(false);
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  Export to CSV
                </MenuItem>
              </Paper>
            </ClickAwayListener>
          )}
        </Box>
       
        <ClickAwayListener onClickAway={() => setShareOpen(false)}>
          <Box sx={{ display: 'none' }} />
        </ClickAwayListener>
 
      </Box>
 
      <Paper elevation={3} sx={{ 
        width: '100%', 
        mb: 4, 
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          padding: 1
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'text.primary',
            fontSize: '1.1rem'
          }}>
            Employee Status
          </Typography>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="500px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px" color="error.main">
            {error}
          </Box>
        ) : (
          <DataGrid
            rows={filteredData}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            disableColumnMenu
            autoHeight
            disableColumnSelector
            loading={loading}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.default',
                borderBottom: '2px solid',
                borderColor: 'divider',
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 'bold',
                  color: 'text.primary',
                },
              },
              '& .MuiDataGrid-cell': {
                padding: '12px 16px',
                borderColor: 'divider',
                '&:focus, &:focus-within': {
                  outline: 'none',
                },
              },
              '& .MuiDataGrid-row': {
                '&:nth-of-type(odd)': {
                  backgroundColor: 'background.default',
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid',
                borderColor: 'divider',
                mt: 1,
              },
              '& .MuiDataGrid-virtualScroller': {
                minHeight: '400px',
              },
              '& .MuiDataGrid-overlay': {
                height: '400px',
                backgroundColor: 'background.default',
              },
              '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
                '&:not(:last-child)': {
                  borderRight: '1px solid',
                  borderColor: 'divider',
                },
              },
              '& .MuiDataGrid-columnSeparator': {
                display: 'none',
              },
            }}
            components={{
              NoRowsOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography color="textSecondary">No data available</Typography>
                </Box>
              ),
              LoadingOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <CircularProgress />
                </Box>
              ),
              NoResultsOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography>No results found</Typography>
                </Box>
              )
            }}
          />
        )}
      </Paper>
 
      {/* Late Login Reasons Table */}
      <Typography variant="h6" sx={{ 
        fontWeight: 'bold', 
        mt: 6, 
        mb: 2,
        color: 'text.primary',
        fontSize: '1.1rem',
        paddingLeft: 1
      }}>
        Late Login Reasons
      </Typography>
      <Paper elevation={3} sx={{ 
        width: '100%', 
        mb: 4, 
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {(loading && lateLoginReasons.length === 0) ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="400px">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            autoHeight
            rows={lateLoginReasons.map((r) => {
              const emp = employeeData.find(e => e.id === r.employee);
              return {
                id: r.id,
                employee: emp ? `${emp.name} (ID: ${r.employee})` : `ID: ${r.employee}`,
                reason: r.reason,
                login_time: r.login_time ? new Date(r.login_time).toLocaleString() : '-',
                is_approved: r.is_approved,
              };
            })}
            components={{
              NoRowsOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography color="textSecondary">No late login reasons found</Typography>
                </Box>
              ),
              LoadingOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <CircularProgress />
                </Box>
              ),
              NoResultsOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography>No matching records found</Typography>
                </Box>
              )
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.default',
                borderBottom: '2px solid',
                borderColor: 'divider',
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 'bold',
                  color: 'text.primary',
                },
              },
              '& .MuiDataGrid-cell': {
                padding: '12px 16px',
                borderColor: 'divider',
                '&:focus, &:focus-within': {
                  outline: 'none',
                },
              },
              '& .MuiDataGrid-row': {
                '&:nth-of-type(odd)': {
                  backgroundColor: 'background.default',
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid',
                borderColor: 'divider',
                mt: 1,
              },
              '& .MuiDataGrid-virtualScroller': {
                minHeight: '300px',
              },
              '& .MuiDataGrid-overlay': {
                height: '300px',
                backgroundColor: 'background.default',
              },
              '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
                '&:not(:last-child)': {
                  borderRight: '1px solid',
                  borderColor: 'divider',
                },
              },
              '& .MuiDataGrid-columnSeparator': {
                display: 'none',
              },
            }}
            columns={[
              { 
                field: 'employee', 
                headerName: 'Employee', 
                width: 220,
                headerAlign: 'left',
                align: 'left'
              },
              { 
                field: 'reason', 
                headerName: 'Reason', 
                width: 300,
                headerAlign: 'left',
                align: 'left'
              },
              { 
                field: 'login_time', 
                headerName: 'Login Time', 
                width: 200,
                headerAlign: 'center',
                align: 'center'
              },
              { 
                field: 'is_approved', 
                headerName: 'Status', 
                width: 150, 
                headerAlign: 'center',
                align: 'center',
                renderCell: (params) => (
                  params.value === true ? <Chip label="Approved" color="success" size="small" /> :
                  params.value === false ? <Chip label="Rejected" color="error" size="small" /> :
                  <Chip label="Pending" color="warning" size="small" />
                ) 
              },
              {
                field: 'actions',
                headerName: 'Actions',
                width: 200,
                headerAlign: 'center',
                align: 'center',
              renderCell: (params) => (
                params.row.is_approved === null ? (
                  <Box display="flex" gap={1}>
                    <Button color="success" variant="contained" size="small" onClick={() => handleApproveRejectRow(params.row.id, true)}>Approve</Button>
                    <Button color="error" variant="contained" size="small" onClick={() => handleApproveRejectRow(params.row.id, false)}>Reject</Button>
                  </Box>
                ) : null
              )
            }
          ]}
          pageSize={5}
          rowsPerPageOptions={[5, 10]}
          disableSelectionOnClick
        />
        )}
      </Paper>
 
      {/* Daily Report Dialog with Reply */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email Report</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            <b>To:</b> {selectedEmail}
            {"\n"}<b>Subject:</b> Daily Report
            {"\n\n"}Hello,
            {"\n"}Please find attached your daily attendance and task summary.
            {"\n\n"}Report Content:
            {"\n"}{selectedReportContent || '-'}
            {"\n\n"}Regards,
            {"\n"}Admin Team
          </DialogContentText>
 
          {!replyMode ? (
            <Box mt={2}>
              <Button variant="outlined" onClick={() => setReplyMode(true)}>Reply</Button>
            </Box>
          ) : (
            <Box mt={2}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Type your reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Box mt={2} display="flex" gap={2}>
                <Button variant="contained" color="primary" onClick={() => {
                  // Here you can integrate reply API if needed
                  setReplyMode(false);
                  setReplyText('');
                  setOpenDialog(false);
                }}>
                  Send
                </Button>
                <Button variant="outlined" onClick={() => {
                  setReplyMode(false);
                  setReplyText('');
                }}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
 
        <DialogActions>
          {!replyMode && (
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
 
      {/* Reason Dialog */}
      <Dialog open={reasonDialogOpen} onClose={() => setReasonDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reason Message</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            <b>From:</b> {selectedName}
            {"\n"}<b>Reason:</b> {selectedReason}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="success" variant="contained" onClick={() => handleApproveReject(true)}>Approve</Button>
          <Button color="error" variant="contained" onClick={() => handleApproveReject(false)}>Reject</Button>
          <Button onClick={() => setReasonDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
 
export default EmployeeDashboard;
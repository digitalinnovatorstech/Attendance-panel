import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FaFingerprint } from 'react-icons/fa';
import { Search, Close, DescriptionOutlined, ChatBubbleOutline } from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';

const AttendanceCard = () => {
  const theme = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState(null);
  const [totalHours, setTotalHours] = useState('00:00:00');
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const [openReasonDialog, setOpenReasonDialog] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonType, setReasonType] = useState(''); // 'in' or 'out'

  const [openDailyReportDialog, setOpenDailyReportDialog] = useState(false);
  const [dailyReportMessage, setDailyReportMessage] = useState('');

  const [openReplyDialog, setOpenReplyDialog] = useState(false);
  const [latestReply, setLatestReply] = useState("Thank you for submitting your daily report. Please ensure to punch in before 9:30 AM regularly.");

  const [userProfile, setUserProfile] = useState(null);
  const [userName, setUserName] = useState('');
  const [employeeId, setEmployeeId] = useState(null);

  // Helper function to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/auth/me/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          setUserName(
            (data.first_name && data.last_name)
              ? `${data.first_name} ${data.last_name}`
              : data.first_name || data.email.split('@')[0]
          );
          setEmployeeId(data.employee_id || data.id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Load saved punch-in state from localStorage on component mount
  useEffect(() => {
    if (!employeeId) return; // Wait until we have the employee ID
    
    const getPunchInState = () => {
      const savedPunchIn = localStorage.getItem(`punchInState_${employeeId}`);
      if (savedPunchIn) {
        try {
          const { punchInTime: savedPunchInTime, isPunchedIn } = JSON.parse(savedPunchIn);
          if (savedPunchInTime && isPunchedIn) {
            const punchInDate = new Date(savedPunchInTime);
            // Only restore if it's from today
            if (isSameDay(punchInDate, new Date())) {
              setPunchInTime(punchInDate);
              setIsPunchedIn(true);
              return true;
            } else {
              // Clear old data if it's from a different day
              localStorage.removeItem(`punchInState_${employeeId}`);
            }
          }
        } catch (e) {
          console.error('Error parsing saved punch-in state:', e);
          localStorage.removeItem(`punchInState_${employeeId}`);
        }
      }
      return false;
    };

    // Clear any old format storage that wasn't user-specific
    const oldPunchInState = localStorage.getItem('punchInState');
    if (oldPunchInState) {
      localStorage.removeItem('punchInState');
    }

    getPunchInState();
  }, [employeeId]);

  // Save punch-in state to localStorage whenever it changes
  useEffect(() => {
    if (!employeeId) return; // Don't save if we don't have an employee ID yet
    
    if (punchInTime && isPunchedIn) {
      localStorage.setItem(`punchInState_${employeeId}`, JSON.stringify({
        punchInTime: punchInTime.toISOString(),
        isPunchedIn: true
      }));
    }
  }, [punchInTime, isPunchedIn, employeeId]);

  const [attendanceData, setAttendanceData] = useState([]);

  // State for Calendar Notes
  const [calendarNotes, setCalendarNotes] = useState({
    // Example notes: Format 'YYYY-MM-DD': 'Your note here'
    '2025-07-08': 'Team Sync Up',
    '2025-07-15': 'Project Deadline',
    '2025-07-22': 'Client Meeting',
  });
  const [selectedDateForNote, setSelectedDateForNote] = useState(null);
  const [noteDialogText, setNoteDialogText] = useState('');
  const [openNoteDialog, setOpenNoteDialog] = useState(false);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Function to get the greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };

  // Fetch late login reasons from API
  useEffect(() => {
    fetchLateLoginReasons();
  }, []);

  // Fetch function
  const fetchLateLoginReasons = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/late-login-reasons/', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      const mapped = Array.isArray(data)
        ? data.map(item => ({
            id: item.id,
            date: item.login_time ? new Date(item.login_time).toLocaleDateString('en-GB') : '-',
            punchIn: item.login_time ? new Date(item.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
            punchOut: '-',
            hours: '-',
            status: item.is_approved === true ? 'Present' : 'Leave',
            reason: item.reason
              ? `${item.reason} (${item.is_approved === true ? 'Approved' : item.is_approved === false ? 'Not Approved' : 'Pending'})`
              : '-',
          }))
        : [];
      setAttendanceData(mapped);
    } catch (e) {
      console.error("Failed to fetch late login reasons:", e);
      setAttendanceData([]);
    }
  };

  // Post late login reason
  const postLateLoginReason = async (reasonText) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/late-login-reasons/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: reasonText })
      });
      if (response.ok) {
        await fetchLateLoginReasons();
        alert('Reason submitted successfully!');
        setOpenReasonDialog(false);
        setReasonText('');
      } else {
        alert('Failed to submit reason');
      }
    } catch (e) {
      console.error("Error submitting reason:", e);
      alert('Error submitting reason');
    }
  };

  // Send daily report
  const sendDailyReport = async (reportText) => {
    try {
      const token = localStorage.getItem('access_token');
      const today = new Date();
      const formattedDate = today.toISOString().slice(0, 10);
      const payload = {
        work_details: reportText,
        date: formattedDate,
      };
      const response = await fetch('http://localhost:8000/api/daily-work-reports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert('Daily report sent successfully!');
        setDailyReportMessage('');
        setOpenDailyReportDialog(false);
      } else {
        alert('Failed to send daily report');
      }
    } catch (e) {
      console.error("Error sending daily report:", e);
      alert('Error sending daily report');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isPunchedIn && punchInTime) {
        const now = new Date();
        const duration = now.getTime() - punchInTime.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        setTotalHours(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setElapsedSeconds(Math.floor(duration / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPunchedIn, punchInTime]);

  const formatDateTime = (date) => `${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}, ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString('en-GB');
  const isAfterTime = (hour, minute, date) => date.getHours() > hour || (date.getHours() === hour && date.getMinutes() > minute);

  const punchIn = async (reason = '') => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get employee profile
      const profileResponse = await fetch('http://localhost:8000/api/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to fetch user profile');
      }

      const profileData = await profileResponse.json();
      const employeeId = profileData.employee_id || profileData.id;

      if (!employeeId) {
        throw new Error('No employee ID found in user profile');
      }

      const now = new Date();
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 30);

      // If late and no reason provided, show reason dialog
      if (isLate && !reason) {
        setReasonType('in');
        setOpenReasonDialog(true);
        return;
      }

      // Prepare request
      const requestBody = {
        employee: employeeId,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        reason: reason || '',
        is_late: isLate,
        status: isLate ? 'Late' : 'On Time'
      };

      const response = await fetch(`http://localhost:8000/api/attendance/punch-in/${employeeId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to punch in');
      }

      const data = await response.json();
      const punchInTime = new Date();

      // Update state
      setPunchInTime(punchInTime);
      setPunchOutTime(null);
      setTotalHours('00:00:00');
      setElapsedSeconds(0);
      setIsPunchedIn(true);

      // Update attendance data
      const newRecord = {
        id: data.id || Date.now(),
        date: punchInTime.toLocaleDateString('en-GB'),
        punchIn: punchInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        punchOut: '-',
        hours: '00:00:00',
        status: isLate ? 'Late' : 'On Time',
        reason: reason || (isLate ? 'Late arrival' : 'Regular check-in'),
        employee_name: profileData.name || 'Current User',
        punchInTime: punchInTime, // Store actual date object for calculations
      };

      setAttendanceData(prev => [newRecord, ...prev]);

      // Save to localStorage with user-specific key
      if (employeeId) {
        localStorage.setItem(`punchInState_${employeeId}`, JSON.stringify({
          punchInTime: punchInTime.toISOString(),
          isPunchedIn: true
        }));
      }

      // Show success message
      setSuccess(`Successfully punched in at ${newRecord.punchIn}`);

      return data;
    } catch (error) {
      console.error('Punch in error:', error);
      setError(error.message || 'Failed to punch in');
      alert(error.message || 'Error punching in');
    }
  };

  const punchOut = async (reason = '') => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get employee profile
      const profileResponse = await fetch('http://localhost:8000/api/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to fetch user profile');
      }

      const profileData = await profileResponse.json();
      const employeeId = profileData.employee_id || profileData.id;

      if (!employeeId) {
        throw new Error('No employee ID found in user profile');
      }

      const now = new Date();
      const isEarlyDeparture = now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() < 30); // Before 6:30 PM

      // If early departure and no reason provided, show reason dialog
      if (isEarlyDeparture && !reason) {
        setReasonType('out');
        setOpenReasonDialog(true);
        return;
      }

      // Find the current attendance record to update
      setAttendanceData(prev => {
        if (prev.length === 0) return prev;

        const updated = [...prev];
        const currentRecord = updated[0];

        if (currentRecord.punchOut !== '-') return prev; // Already punched out

        // Calculate hours worked
        const punchInTime = currentRecord.punchInTime || punchInTime;
        const punchOutTime = now;
        const hoursWorked = calculateHoursWorked(punchInTime, punchOutTime);

        // Update the record
        updated[0] = {
          ...currentRecord,
          punchOut: punchOutTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          hours: hoursWorked,
          status: isEarlyDeparture ? 'Left Early' : 'Full Day',
          reason: reason || currentRecord.reason || (isEarlyDeparture ? 'Early departure' : 'Regular check-out'),
          punchOutTime: punchOutTime,
        };

        return updated;
      });

      // Prepare request
      const requestBody = {
        employee: employeeId,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        reason: reason || (isEarlyDeparture ? 'Early departure' : ''),
        is_early_departure: isEarlyDeparture,
        status: isEarlyDeparture ? 'Left Early' : 'Full Day'
      };

      const response = await fetch(`http://localhost:8000/api/attendance/punch-out/${employeeId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to punch out');
      }

      const data = await response.json();

      // Update UI state
      setPunchOutTime(now);
      setIsPunchedIn(false);

      // Clear saved state for this user
      if (employeeId) {
        localStorage.removeItem(`punchInState_${employeeId}`);
      }

      // Clear any old format storage
      localStorage.removeItem('punchInState');

      // Show success message
      setSuccess(`Successfully punched out at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`);

      return data;
    } catch (error) {
      console.error('Punch out error:', error);
      setError(error.message || 'Failed to punch out');
      alert(error.message || 'Error punching out');
    }
  };

  const handlePunch = () => {
    const now = new Date();
    if (!isPunchedIn) {
      if (isAfterTime(9, 30, now)) {
        setOpenReasonDialog(true);
        setReasonType('in');
      } else {
        punchIn('');
        setOpenReasonDialog(false);
        setReasonType('');
      }
    } else {
      const confirmPunchOut = window.confirm('Are you sure you want to punch out?');
      if (!confirmPunchOut) return;
      setPunchOutTime(now);
      setIsPunchedIn(false);
      // Show dialog only if after 6:30 PM
      if (!isAfterTime(18, 30, now)) {
        setOpenReasonDialog(false);
        setReasonType('');
        punchOut(''); // Punch out directly before 6:30 PM
      } else {
        setOpenReasonDialog(true);
        setReasonType('out');
      }
    }
  };

  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const maxSeconds = 8 * 60 * 60; // 8 hours for a full circle
  const progress = Math.min(elapsedSeconds / maxSeconds, 1);
  const strokeDashoffset = circumference - progress * circumference;

  const StyledPaper = styled(Paper)(({ theme }) => ({
    width: 320,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.grey[200]}`,
    boxShadow: theme.shadows[2],
    textAlign: 'center',
  }));

  const filteredAttendance = attendanceData.filter(row => {
    const matchesStatus = filter === 'All' || row.status === filter;
    const matchesSearch = row.date.includes(searchTerm) ||
      row.punchIn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.punchOut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const lightOrange = '#FFDAB9';
  const mediumOrange = '#FFA07A';

  // --- Calendar Note Functions ---
  const handleDayClick = (date) => {
    const dateKey = date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    setSelectedDateForNote(date);
    setNoteDialogText(calendarNotes[dateKey] || ''); // Load existing note or empty string
    setOpenNoteDialog(true);
  };

  const handleSaveNote = () => {
    if (selectedDateForNote) {
      const dateKey = selectedDateForNote.toISOString().slice(0, 10);
      setCalendarNotes(prev => {
        const newNotes = { ...prev };
        if (noteDialogText.trim()) {
          newNotes[dateKey] = noteDialogText.trim();
        } else {
          delete newNotes[dateKey]; // Remove note if text is empty
        }
        return newNotes;
      });
    }
    setOpenNoteDialog(false);
    setNoteDialogText('');
    setSelectedDateForNote(null);
  };

  const handleCloseNoteDialog = () => {
    setOpenNoteDialog(false);
    setNoteDialogText('');
    setSelectedDateForNote(null);
  };
  // --- End Calendar Note Functions ---

  // Utility function to calculate hours worked between two Date objects
  const calculateHoursWorked = (start, end) => {
    if (!start || !end) return '00:00:00';
    const duration = end.getTime() - start.getTime();
    if (duration <= 0) return '00:00:00';
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box height="100%" p={3} sx={{ backgroundColor: theme.palette.grey[50] }}>

      {/* Main Header with Employee Attendance Title and Search/Filter */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}
        sx={{
          backgroundColor: theme.palette.background.paper,
          p: 2,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1],
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: '#1b5e20', fontSize: '1.1rem', letterSpacing: '0.02em' }}>Employee Attendance Overview</Typography>
        <Box display="flex" gap={1}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><Search sx={{ color: theme.palette.grey[500] }} /></InputAdornment>),
              sx: { borderRadius: theme.shape.borderRadius * 1.5, '& fieldset': { borderColor: theme.palette.grey[300] } }
            }}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: theme.palette.common.white } }}
          />
          <TextField
            variant="outlined"
            size="small"
            select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ borderRadius: theme.shape.borderRadius * 1.5, '& fieldset': { borderColor: theme.palette.grey[300] }, '& .MuiOutlinedInput-root': { backgroundColor: theme.palette.common.white } }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Present">Present</MenuItem>
            <MenuItem value="Leave">Leave</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Attendance Card, Greeting, and Calendar */}
      <Box display="flex" justifyContent="space-between" alignItems="stretch" mt={2} gap={2}>
        <StyledPaper>
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ color: theme.palette.grey[600] }}>Attendance Tracker</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>{formatDateTime(currentTime)}</Typography>
          </Box>
          <Box position="relative" width={144} height={144} mx="auto">
            <svg height="100%" width="100%">
              <circle stroke="#e0e0e0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx="72" cy="72" />
              <circle stroke={'#1b5e20'} fill="transparent" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} r={normalizedRadius} cx="72" cy="72" transform="rotate(-90 72 72)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <Box position="absolute" top={0} left={0} right={0} bottom={0} display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <Typography variant="body2" color="textSecondary" sx={{ color: theme.palette.grey[600] }}>Total Hours</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>{totalHours}</Typography>
            </Box>
          </Box>
          <Box my={2} display="flex" justifyContent="center" alignItems="center" gap={1}>
            {isPunchedIn && punchInTime ? (
              <>
                <FaFingerprint color={theme.palette.success.main} />
                <Typography variant="body2" color="textSecondary" sx={{ color: theme.palette.grey[600] }}>Punched In at {formatTime(punchInTime)}</Typography>
              </>
            ) : punchOutTime ? (
              <>
                <FaFingerprint color={theme.palette.error.main} />
                <Typography variant="body2" color="textSecondary" sx={{ color: theme.palette.grey[600] }}>Punched Out at {formatTime(punchOutTime)}</Typography>
              </>
            ) : (
              <Typography variant="body2" color="transparent">Status Placeholder</Typography>
            )}
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={handlePunch}
            sx={{
              backgroundColor: isPunchedIn ? '#1b5e20' : '#1b5e20',
              color: 'white',
              '&:hover': {
                backgroundColor: isPunchedIn ? '#1b5e20' : '#1b5e20',
                color: 'white',
              },
              fontWeight: 600,
              borderRadius: theme.shape.borderRadius * 1.5,
              py: 1.2,
            }}
          >
            {isPunchedIn ? 'Punch Out' : 'Punch In'}
          </Button>
        </StyledPaper>

        {/* "Hi, Good Afternoon [Name]!" with Hand Raise */}
        <Paper
          sx={{
            flexGrow: 1,
            p: 2,
            borderRadius: theme.shape.borderRadius * 2,
            boxShadow: theme.shadows[1],
            backgroundColor: theme.palette.background.paper,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '150px',
            textAlign: 'center',
            gap: 1
          }}
        >
          <Typography variant="h4" sx={{ animation: 'wave 2.5s infinite', display: 'inline-block' }}>👋</Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.text.primary, fontSize: '1.25rem', letterSpacing: '0.02em' }}>
            {getGreeting()}, {userName || 'User'}!
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {userProfile ? `Welcome back! Let's make today productive.` : 'Loading your profile...'}
          </Typography>
        </Paper>

        {/* Calendar with Notes Feature */}
        <Box>
          <Paper sx={{
            p: 1,
            maxWidth: 300,
            borderRadius: theme.shape.borderRadius * 2,
            boxShadow: theme.shadows[1],
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.grey[300]}`,
          }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <StaticDatePicker
                displayStaticWrapperAs="desktop"
                value={currentTime}
                onChange={(newValue) => {
                  if (newValue) {
                    handleDayClick(newValue); // Open note dialog on day click
                  }
                }}
                minDate={new Date(new Date().getFullYear() - 4, 0, 1)}
                // Years up to 2050
                maxDate={new Date(2050, 11, 31)}
                slotProps={{
                  actionBar: { actions: [] },
                  toolbar: {
                    toolbarFormat: 'MMM dd',
                    sx: {
                      '& .MuiPickersCalendarHeader-label': {
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      },
                      minHeight: '40px',
                      padding: '0 8px',
                    },
                  },
                  day: {
                    sx: {
                      width: 32,
                      height: 32,
                      margin: '0 2px',
                      '&.Mui-selected': {
                        backgroundColor: '#1b5e20',
                        color: '#fff',
                        '&:hover': {
                          backgroundColor: '#1b5e20',
                        },
                      },
                    },
                  },
                }}
                sx={{
                  '& .MuiPickersCalendarHeader-root': {
                    margin: '4px 0',
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    margin: '0 4px',
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    width: 32,
                    margin: '0 2px',
                    fontSize: '0.75rem',
                    color: theme.palette.grey[600],
                  },
                  '& .MuiPickersSlideTransition-root': {
                    // Removed minHeight here to allow natural sizing and fix clipping
                  },
                }}
                renderDay={(day, _value, DayComponentProps) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isWeekend = [0, 6].includes(day.getDay());
                  const dateKey = day.toISOString().slice(0, 10);
                  const hasNote = !!calendarNotes[dateKey];

                  return (
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex', // Use flex to center PickersDay
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onClick={() => handleDayClick(day)} // Handle click for note
                    >
                      <PickersDay
                        {...DayComponentProps}
                        disableMargin
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.8rem',
                          fontWeight: isToday ? 700 : 400,
                          '&.Mui-selected': {
                            backgroundColor: isToday ? '#1b5e20' : 'transparent',
                            color: isToday ? '#fff' : 'inherit',
                            '&:hover': {
                              backgroundColor: isToday ? '#1b5e20' : 'rgba(0, 0, 0, 0.04)',
                            },
                          },
                          backgroundColor: 'transparent', // Ensure no default PickersDay background
                        }}
                      />
                      {isToday && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4, // Adjust position as needed
                            right: 4, // Adjust position as needed
                            width: 6, // Larger dot for today
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#1b5e20',
                          }}
                        />
                      )}
                      {hasNote && !isToday && ( // Show note indicator only if not today (today has its own indicator)
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 1,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.info.main, // A distinct color for notes
                          }}
                        />
                      )}
                      {isWeekend && !isToday && !hasNote && ( // Show weekend indicator if no other special marker
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 1,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.grey[400],
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </Box>
                  );
                }}
              />
            </LocalizationProvider>
          </Paper>
        </Box>
      </Box>

      {/* Buttons to trigger pop-ups */}
      <Box mt={1.5} display="flex" gap={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<DescriptionOutlined />}
          onClick={() => setOpenDailyReportDialog(true)}
          sx={{
            py: 1,
            px: 2,
            borderRadius: theme.shape.borderRadius * 1.5,
            fontWeight: 600,
            backgroundColor: '#1b5e20',
            color: 'white',
            border: `1px solid ${theme.palette.grey[300]}`,
            boxShadow: theme.shadows[1],
            '&:hover': {
              backgroundColor: '#1b5e20',
              color: 'white',
              boxShadow: theme.shadows[2],
            },
            fontSize: '0.875rem',
          }}
        >
          Send Daily Report
        </Button>
        <Button
          variant="contained"
          startIcon={<ChatBubbleOutline />}
          onClick={async () => {
            try {
              const token = localStorage.getItem('access_token');
              // Get user id from localStorage or fetch from backend if not present
              let userId = localStorage.getItem('user_id');
              if (!userId) {
                // Fallback: fetch from backend
                const profileRes = await fetch('http://localhost:8000/api/auth/me/', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  userId = profileData.employee_id || profileData.id;
                  if (userId) localStorage.setItem('user_id', userId);
                }
              }
              const response = await fetch(`http://localhost:8000/api/employee/reports/${userId}/replies/`, {
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              if (response.ok) {
                const data = await response.json();
                // Assuming the latest reply is the last item in the array
                const latest = Array.isArray(data) && data.length > 0 ? data[data.length - 1].reply || JSON.stringify(data[data.length - 1]) : 'No reply found.';
                setLatestReply(latest);
              } else {
                setLatestReply('No reply found.');
              }
            } catch (e) {
              setLatestReply('Error fetching reply.');
            }
            setOpenReplyDialog(true);
          }}
          sx={{
            py: 1,
            px: 2,
            borderRadius: theme.shape.borderRadius * 1.5,
            fontWeight: 600,
            backgroundColor: '#1b5e20',
            color: 'white',
            border: `1px solid ${theme.palette.grey[300]}`,
            boxShadow: theme.shadows[1],
            '&:hover': {
              backgroundColor: '#1b5e20',
              color: 'white',
              boxShadow: theme.shadows[2],
            },
            fontSize: '0.875rem',
          }}
        >
          View Latest Reply
        </Button>
      </Box>

      {/* Late Punch-in/Punch-out Reason Dialog (Pop-up) */}
      <Dialog open={openReasonDialog} onClose={() => { setOpenReasonDialog(false); setReasonText(''); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          {reasonType === 'in' ? 'Reason for Late Punch In' : 'Reason for Late Punch Out'}
          <IconButton onClick={() => { setOpenReasonDialog(false); setReasonText(''); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            {reasonType === 'in'
              ? 'Please provide a reason for punching in after 9:30 AM.'
              : 'Please provide a reason for punching out after 6:30 PM.'}
          </Typography>
          <TextField
            multiline
            rows={6}
            placeholder="Enter your reason..."
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { py: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenReasonDialog(false); setReasonText(''); }} color="secondary">Cancel</Button>
          <Button variant="contained" color="primary" onClick={() => {
            if (reasonType === 'in') {
              punchIn(reasonText);
              setOpenReasonDialog(false);
              setReasonText('');
            } else {
              punchOut(reasonText);
              setOpenReasonDialog(false);
              setReasonText('');
            }
          }}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* Daily Report Dialog (Pop-up) - Lighter Orange Scheme */}
      <Dialog open={openDailyReportDialog} onClose={() => { setOpenDailyReportDialog(false); setDailyReportMessage(''); }} fullWidth maxWidth="sm">
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          backgroundColor: '#1b5e20',
          color: 'white',
          py: 2, px: 3,
          borderTopLeftRadius: theme.shape.borderRadius * 2,
          borderTopRightRadius: theme.shape.borderRadius * 2,
        }}>
          Send Daily Report
          <IconButton onClick={() => { setOpenDailyReportDialog(false); setDailyReportMessage(''); }} sx={{ color: theme.palette.common.white }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label="To"
            fullWidth
            value="venkateswararao.garikapati@innovatorstech.com"
            sx={{ mb: 2 }}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={8}
            value={dailyReportMessage}
            onChange={e => setDailyReportMessage(e.target.value)}
            placeholder={`Enter your daily report here...`}
            sx={{ '& .MuiOutlinedInput-root': { py: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenDailyReportDialog(false); setDailyReportMessage(''); }} color="secondary">Cancel</Button>
          <Button variant="contained" onClick={() => sendDailyReport(dailyReportMessage)} sx={{
            backgroundColor: mediumOrange,
            '&:hover': { backgroundColor: '#1b5e20' },
            fontWeight: 600,
            color: 'white',
          }}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* Reply Dialog (Pop-up) - White Scheme */}
      <Dialog open={openReplyDialog} onClose={() => setOpenReplyDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          backgroundColor: '#1b5e20',
          color: 'white',
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 2, px: 3,
          borderTopLeftRadius: theme.shape.borderRadius * 2,
          borderTopRightRadius: theme.shape.borderRadius * 2,
        }}>
          Reply from Manager
          <IconButton onClick={() => setOpenReplyDialog(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: theme.palette.text.secondary }}>
            "{latestReply}"
          </Typography>
          <Box mt={2}>
            <Typography variant="caption" display="block" color="text.disabled">
              Received: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReplyDialog(false)} variant="contained" sx={{
            backgroundColor: '#1b5e20',
            '&:hover': { backgroundColor: '#1b5e20' },
            fontWeight: 600,
          }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Calendar Note Dialog */}
      <Dialog open={openNoteDialog} onClose={handleCloseNoteDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          Note for {selectedDateForNote ? selectedDateForNote.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
          <IconButton onClick={handleCloseNoteDialog}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            multiline
            rows={6}
            placeholder="Add or edit your note here..."
            value={noteDialogText}
            on
            fullWidth
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { py: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseNoteDialog} color="secondary">Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveNote}>Save Note</Button>
        </DialogActions>
      </Dialog>

      {/* Recent Attendance Table */}
      <Box mt={1.5}>
        <Typography variant="h6" mb={1} sx={{ color: theme.palette.text.primary, fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.02em' }}>Recent Attendance History</Typography>
        <Paper sx={{
          borderRadius: '8px',
          boxShadow: theme.shadows[1],
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper,
        }}>
          <Table size="small" sx={{
            borderCollapse: 'separate',
          }}>
            <TableHead>
              <TableRow sx={{
                backgroundColor: '#1b5e20',
                '& th': {
                  color: theme.palette.common.white,
                  fontWeight: 'bold',
                  py: 1.5,
                }
              }}>
                <TableCell>Date</TableCell>
                <TableCell>Punch In</TableCell>
                <TableCell>Punch Out</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAttendance.map((row, index) => (
                <TableRow key={row.id || index} sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: theme.palette.grey[50],
                  },
                  '&:nth-of-type(even)': {
                    backgroundColor: theme.palette.common.white,
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light + '10',
                    cursor: 'pointer',
                  },
                  '& td': {
                    py: 1.5,
                    color: theme.palette.text.secondary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                  '&:last-child td': {
                    borderBottom: 'none',
                  },
                }}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.punchIn}</TableCell>
                  <TableCell>{row.punchOut}</TableCell>
                  <TableCell>{row.hours}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        backgroundColor: row.status === 'Present' ? theme.palette.success.light : theme.palette.error.light,
                        color: row.status === 'Present' ? theme.palette.success.dark : '#1b5e20',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                      }}
                    />
                  </TableCell>
                  <TableCell>{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
};

export default AttendanceCard;
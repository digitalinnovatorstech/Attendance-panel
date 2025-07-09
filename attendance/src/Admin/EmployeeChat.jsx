import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Badge,
  InputBase,
  Menu,
  MenuItem,
  TextField,
  Card,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  Link,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemAvatar,
  Checkbox
} from "@mui/material";
import { 
  MoreVert, 
  Search, 
  Image as ImageIcon,
  Close,
  LocationOn,
  Language,
  InsertLink,
  Edit,
  Delete,
  Send,
  Visibility,
  DoneAll,
  GroupAdd,
  Share,
  FileCopy,
  InsertEmoticon
} from "@mui/icons-material";
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';
import MoreHorizSharpIcon from '@mui/icons-material/MoreHorizSharp';
import PersonOutlineSharpIcon from '@mui/icons-material/PersonOutlineSharp';
import EmojiPicker from 'emoji-picker-react';

const usersData = [
  {
    id: 1,
    name: "Kathryn Murphy",
    role: "Admin",
    about: "It is a long-established fact that a reader will be distracted by the trouble content of a page when looking at his input. The part of using Queen Ignatie is that it has a more-or-less mental distribution of stories.",
    location: "United States",
    memberSince: "30 Jun 2025",
    language: "English",
    status: "Active",
    description: "Available",
    time: "6:30 pm",
    online: true,
    unread: 2,
    messages: [
      { 
        sender: "them", 
        text: "It is a long established fact that a reader will be distracted by the readable content...", 
        time: "6:30 pm",
        seen: true 
      },
      { 
        sender: "me", 
        text: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration...", 
        time: "6:34 pm",
        seen: false 
      },
      { 
        sender: "them", 
        text: "The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters...", 
        time: "6:38 pm",
        seen: true 
      },
    ],
  },
  {
    id: 2,
    name: "Jane Doe",
    role: "User",
    about: "",
    location: "",
    memberSince: "",
    language: "",
    status: "Offline",
    description: "Offline",
    time: "5:00 pm",
    online: false,
    unread: 0,
    messages: [],
  },
  {
    id: 3,
    name: "John Smith",
    role: "User",
    about: "",
    location: "",
    memberSince: "",
    language: "",
    status: "Available",
    description: "Available",
    time: "3:15 pm",
    online: true,
    unread: 1,
    messages: [],
  },
];

const Chat = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedUser, setSelectedUser] = useState(usersData[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [tempProfileData, setTempProfileData] = useState({});
  const [anchorElMessage, setAnchorElMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareRecipient, setShareRecipient] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState(usersData);
  const [leftSideMenuAnchor, setLeftSideMenuAnchor] = useState(null);
  const [rightSideMenuAnchor, setRightSideMenuAnchor] = useState(null);

  const fileInputRef = useRef();
  const profileImageInputRef = useRef();
  const linkInputRef = useRef();
  const searchInputRef = useRef();

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setMessageInput("");
    setImagePreview(null);
    setEditingMessage(null);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleLeftSideMenuClick = (event) => {
    setLeftSideMenuAnchor(event.currentTarget);
  };

  const handleRightSideMenuClick = (event) => {
    setRightSideMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setLeftSideMenuAnchor(null);
    setRightSideMenuAnchor(null);
  };

  const handleProfileOpen = () => {
    setTempProfileData({
      name: selectedUser.name,
      role: selectedUser.role,
      about: selectedUser.about,
      location: selectedUser.location,
      memberSince: selectedUser.memberSince,
      language: selectedUser.language,
      status: selectedUser.status
    });
    setShowProfile(true);
    handleMenuClose();
  };

  const handleProfileClose = () => {
    const updatedUser = {
      ...selectedUser,
      ...tempProfileData,
      description: tempProfileData.status === "Active" ? "Active" : 
                   tempProfileData.status === "Do Not Disturb" ? "Do Not Disturb" :
                   tempProfileData.status === "Away" ? "Away" : "Offline",
      online: tempProfileData.status === "Active"
    };
    
    setSelectedUser(updatedUser);
    
    setUsers(users.map(user => {
      if (user.id === updatedUser.id) {
        return updatedUser;
      }
      return user;
    }));
    
    setShowProfile(false);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setTempProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim() === "" && !imagePreview) return;

    const newMessage = {
      sender: "me",
      text: messageInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: imagePreview,
      seen: false
    };

    const updatedUser = {
      ...selectedUser,
      messages: [...selectedUser.messages, newMessage],
    };

    setSelectedUser(updatedUser);

    setUsers(users.map(user => {
      if (user.id === updatedUser.id) {
        return updatedUser;
      }
      return user;
    }));

    setMessageInput("");
    setImagePreview(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleMessageClick = (event, message, index) => {
    setAnchorElMessage({ el: event.currentTarget, index });
  };

  const handleMessageMenuClose = () => {
    setAnchorElMessage(null);
  };

  const handleEditMessage = () => {
    if (anchorElMessage) {
      const message = selectedUser.messages[anchorElMessage.index];
      if (message.sender === "me") { // Only allow editing for my messages
        setEditingMessage(anchorElMessage.index);
        setEditText(message.text);
        handleMessageMenuClose();
      }
    }
  };

  const handleCopyMessage = () => {
    if (anchorElMessage) {
      const message = selectedUser.messages[anchorElMessage.index];
      navigator.clipboard.writeText(message.text);
      handleMessageMenuClose();
    }
  };

  const handleShareMessage = () => {
    if (anchorElMessage) {
      const message = selectedUser.messages[anchorElMessage.index];
      setShareMessage(message.text);
      setShowShareDialog(true);
      handleMessageMenuClose();
    }
  };

  const handleShareSubmit = () => {
    if (shareRecipient && shareMessage) {
      const recipient = users.find(user => user.name === shareRecipient);
      if (recipient) {
        const newMessage = {
          sender: "me",
          text: `Shared message: ${shareMessage}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          seen: false
        };

        const updatedUser = {
          ...recipient,
          messages: [...recipient.messages, newMessage],
        };

        if (recipient.id === selectedUser.id) {
          setSelectedUser(updatedUser);
        }

        setUsers(users.map(user => {
          if (user.id === updatedUser.id) {
            return updatedUser;
          }
          return user;
        }));
      }
      setShowShareDialog(false);
      setShareMessage("");
      setShareRecipient("");
    }
  };

  const handleSaveEdit = () => {
    if (editingMessage !== null) {
      const updatedMessages = [...selectedUser.messages];
      updatedMessages[editingMessage].text = editText;
      
      const updatedUser = {
        ...selectedUser,
        messages: updatedMessages
      };
      
      setSelectedUser(updatedUser);
      setEditingMessage(null);
      setEditText("");
      
      setUsers(users.map(user => {
        if (user.id === updatedUser.id) {
          return updatedUser;
        }
        return user;
      }));
    }
  };

  const handleDeleteMessage = () => {
    if (anchorElMessage) {
      const updatedMessages = [...selectedUser.messages];
      updatedMessages.splice(anchorElMessage.index, 1);
      
      const updatedUser = {
        ...selectedUser,
        messages: updatedMessages
      };
      
      setSelectedUser(updatedUser);
      handleMessageMenuClose();
      
      setUsers(users.map(user => {
        if (user.id === updatedUser.id) {
          return updatedUser;
        }
        return user;
      }));
    }
  };

  const handleAddLink = () => {
    setShowLinkInput(true);
  };

  const handleLinkSubmit = () => {
    if (linkInput.trim()) {
      setMessageInput(linkInput);
      setShowLinkInput(false);
      setLinkInput("");
    }
  };

  const handleBackToChatList = () => {
    setShowChatList(true);
  };

  const handleCreateGroup = () => {
    if (groupName && selectedUsers.length > 0) {
      const newGroup = {
        id: users.length + 1,
        name: groupName,
        role: "Group",
        about: "",
        location: "",
        memberSince: "",
        language: "",
        status: "Active",
        description: "Group",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        online: true,
        unread: 0,
        members: selectedUsers,
        messages: []
      };
      
      setUsers([...users, newGroup]);
      setGroupName("");
      setSelectedUsers([]);
      setShowGroupDialog(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleDeleteUser = () => {
    const updatedUsers = users.filter(user => user.id !== selectedUser.id);
    setUsers(updatedUsers);
    if (updatedUsers.length > 0) {
      setSelectedUser(updatedUsers[0]);
    }
    handleMenuClose();
  };

  const leftSideName = "Kathryn Murphy";

  return (
    <Box display="flex" height="100%" bgcolor="#Fff" p={0} flexDirection="column" >
     
      
      <Box display="flex" flex={1} gap={0} sx={{
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {/* Left Sidebar - Chat List */}
        {(showChatList || !isMobile) && (
          <Card sx={{
            width: isMobile ? '98%' : '30%',
            height: isMobile ? 'auto' : 'calc(100vh - 130px)',
            mr: isMobile ? 0 : 2,
            p: 1,
            display: "flex",
            flexDirection: "column",
            bgcolor: "#F5F6FA",
            overflow: 'hidden'
          }}>
            {showProfile ? (
              /* Profile View */
              <Card sx={{ p: 2, borderRadius: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <Box display="flex" justifyContent="flex-end" mb={0}>
                  <IconButton onClick={handleProfileClose}>
                    <Close />
                  </IconButton>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="center" mb={0}>
                  <Box position="relative" display="inline-block">
                    <Avatar 
                      sx={{ width: 60, height: 60 }}
                    >
                      {tempProfileData.name ? tempProfileData.name.charAt(0) : ''}
                    </Avatar>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" mt={0.5}>
                    {tempProfileData.name}
                  </Typography>
                  <Typography color="textSecondary" fontSize={12}>
                    {tempProfileData.role}
                  </Typography>
                </Box>

                <Box mb={1}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    About Me
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    name="about"
                    value={tempProfileData.about || ""}
                    onChange={handleProfileChange}
                    placeholder="Write some description"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        height: '60px',
                        alignItems: 'flex-start'
                      }
                    }}
                  />
                </Box>

                <Box mb={1}>
                  <List disablePadding>
                    <ListItem disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box display="flex" alignItems="center">
                        <LocationOn sx={{ 
                          width: 24,
                          height: 24,
                          mr: 1,
                          bgcolor: 'white',
                          borderRadius: '50%',
                          p: 0.5
                        }} />
                        <Typography>Location</Typography>
                      </Box>
                      <Typography>{tempProfileData.location || "Not specified"}</Typography>
                    </ListItem>

                    <ListItem disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box display="flex" alignItems="center">
                        <PermIdentityOutlinedIcon sx={{ 
                          width: 24,
                          height: 24,
                          mr: 1,
                          bgcolor: 'white',
                          borderRadius: '50%',
                          p: 0.5
                        }} />
                        <Typography>Member since</Typography>
                      </Box>
                      <Typography>{tempProfileData.memberSince || "Not specified"}</Typography>
                    </ListItem>

                    <ListItem disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box display="flex" alignItems="center">
                        <Language sx={{ 
                          width: 24,
                          height: 24,
                          mr: 1,
                          bgcolor: 'white',
                          borderRadius: '50%',
                          p: 0.5
                        }} />
                        <Typography>Language</Typography>
                      </Box>
                      <Typography>{tempProfileData.language || "Not specified"}</Typography>
                    </ListItem>
                  </List>
                </Box>

                <Box mb={1}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Status
                  </Typography>
                  <RadioGroup
                    name="status"
                    value={tempProfileData.status || "Active"}
                    onChange={handleProfileChange}
                  >
                    <FormControlLabel 
                      value="Active" 
                      control={<Radio sx={{ color: 'orange', '&.Mui-checked': { color: 'orange' } }} />} 
                      label="Active" 
                    />
                    <FormControlLabel 
                      value="Do Not Disturb" 
                      control={<Radio sx={{ color: 'orange', '&.Mui-checked': { color: 'orange' } }} />} 
                      label="Do Not Disturb" 
                    />
                    <FormControlLabel 
                      value="Away" 
                      control={<Radio sx={{ color: 'orange', '&.Mui-checked': { color: 'orange' } }} />} 
                      label="Away" 
                    />
                    <FormControlLabel 
                      value="Offline" 
                      control={<Radio sx={{ color: 'orange', '&.Mui-checked': { color: 'orange' } }} />} 
                      label="Offline" 
                    />
                  </RadioGroup>
                </Box>
              </Card>
            ) : (
              /* Chat List View */
              <>
               <Card elevation={3} sx={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  bgcolor: "#fff",
                  overflow: 'hidden'
                }}>
                  {/* Top User Info with bottom border */}
                  <Box sx={{ 
                    p: 1, 
                    borderBottom: '1px solid #e0e0e0',
                    bgcolor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>   
                    <Box display="flex" alignItems="center">
                      <Box position="relative">
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {leftSideName ? leftSideName.charAt(0) : ''}
                        </Avatar>
                        <Box
                          position="absolute"
                          bottom={0}
                          right={0}
                          width="10px"
                          height="10px"
                          bgcolor="green"
                          borderRadius="50%"
                          border="2px solid white"
                        />
                      </Box>
                      <Box ml={1}>
                        <Typography fontWeight="bold" fontSize="14px">
                          {leftSideName}
                        </Typography>
                        <Typography fontSize="12px" color="textSecondary">
                          Active
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton onClick={() => setShowSearch(!showSearch)}>
                        <Search />
                      </IconButton>
                      <IconButton onClick={handleLeftSideMenuClick}>
                        <MoreHorizSharpIcon />
                      </IconButton>
                      <Menu 
                        anchorEl={leftSideMenuAnchor} 
                        open={Boolean(leftSideMenuAnchor)} 
                        onClose={handleMenuClose}
                      >
                        <MenuItem onClick={handleProfileOpen}>
                          <PersonOutlineSharpIcon sx={{ mr: 1 }} /> Profile
                        </MenuItem>
                        <MenuItem onClick={() => {
                          setShowGroupDialog(true);
                          handleMenuClose();
                        }}>
                          <GroupAdd sx={{ mr: 1 }} /> Create Group
                        </MenuItem>
                      </Menu>
                    </Box>
                  </Box>

                  {/* Search Bar - Conditionally rendered */}
                  {showSearch && (
                    <Box sx={{ 
                      p: 0.5, 
                      borderBottom: '1px solid #e0e0e0',
                      bgcolor: 'white'
                    }}>
                      <Box display="flex" alignItems="center" bgcolor="#fff" p={1} borderRadius="8px">
                        <Search fontSize="small" />
                        <InputBase
                          placeholder="Search..."
                          fullWidth
                          inputRef={searchInputRef}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          sx={{ ml: 2 }}
                          onBlur={() => {
                            if (searchTerm === '') {
                              setShowSearch(false);
                            }
                          }}
                        />
                        <IconButton onClick={() => {
                          setSearchTerm('');
                          setShowSearch(false);
                        }}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )}

                  {/* Chat List */}
                  <Box sx={{ 
                    flex: 1, 
                    overflowY: "auto",
                    p: 1
                  }}>
                    {filteredUsers.map((user) => (
                      <Box
                        key={user.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={1.5}
                        mb={1}
                        borderRadius="8px"
                        bgcolor={selectedUser.id === user.id ? "#f5f5f5" : "transparent"}
                        sx={{ 
                          cursor: "pointer", 
                          ":hover": { bgcolor: "#f0f0f0" },
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => handleUserClick(user)}
                      >
                        <Box display="flex" alignItems="center">
                          <Box position="relative">
                            <Avatar sx={{ width: 40, height: 40 }}>
                              {user.name ? user.name.charAt(0) : ''}
                            </Avatar>
                            <Box
                              position="absolute"
                              bottom={0}
                              right={0}
                              width="10px"
                              height="10px"
                              bgcolor={user.online ? "green" : "red"}
                              borderRadius="50%"
                              border="2px solid white"
                            />
                          </Box>
                          <Box ml={1.5}>
                            <Typography fontWeight="bold" fontSize="14px">{user.name}</Typography>
                            <Typography 
                              fontSize="12px" 
                              color="textSecondary" 
                              noWrap 
                              sx={{ 
                                maxWidth: isMobile ? '150px' : '180px',
                                display: 'block',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {user.messages.length > 0 ? user.messages[user.messages.length - 1].text : "hey! there i'm..."}
                            </Typography>
                          </Box>
                        </Box>
                        <Box textAlign="right" ml={1}>
                          <Typography fontSize="10px" color="textSecondary">{user.time}</Typography>
                          {user.unread > 0 && (
                            <Badge 
                              badgeContent={user.unread} 
                              color="warning" 
                              sx={{ 
                                mt: 0.5,
                                '& .MuiBadge-badge': {
                                  right: -5,
                                  top: 5
                                } 
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Card>
              </>
            )}
          </Card>
        )}

        {/* Right Chat Window */}
        {(!showChatList || !isMobile) && (
          <Card sx={{ 
            flex: 1, 
            p: 1, 
            display: "flex", 
            flexDirection: "column", 
            bgcolor: "#F5F6FA", 
            height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 130px)',
            maxHeight: isMobile ? 'none' : '800px'
          }}>
            {/* Top Header */}
            <Card elevation={3} sx={{ p: 1, mb: 0.2, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Box position="relative">
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {selectedUser.name ? selectedUser.name.charAt(0) : ''}
                    </Avatar>
                    <Box
                      position="absolute"
                      bottom={0}
                      right={0}
                      width="10px"
                      height="10px"
                      bgcolor={selectedUser.online ? "green" : "red"}
                      borderRadius="50%"
                      border="2px solid white"
                    />
                  </Box>
                  <Box ml={1}>
                    <Typography fontWeight="bold">{selectedUser.name}</Typography>
                    <Typography fontSize="12px" color="textSecondary">{selectedUser.description}</Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton onClick={handleRightSideMenuClick}><MoreVert /></IconButton>
                  <Menu 
                    anchorEl={rightSideMenuAnchor} 
                    open={Boolean(rightSideMenuAnchor)} 
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={handleDeleteUser}>
                      <Delete sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
            </Card>

            {/* Chat Messages */}
            <Card elevation={3} sx={{ 
              p: 2, 
              mb: 0.2, 
              borderRadius: 0, 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Box flex={1} sx={{ overflowY: 'auto' }}>
                {selectedUser.messages.length > 0 ? (
                  selectedUser.messages.map((message, index) => (
                    <Box
                      key={index}
                      display="flex"
                      justifyContent={message.sender === "me" ? "flex-end" : "flex-start"}
                      mb={1}
                    >
                      {message.sender !== "me" && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 1,
                            mt: 0.5
                          }}
                        >
                          {selectedUser.name ? selectedUser.name.charAt(0) : ''}
                        </Avatar>
                      )}

                      <Box
                        onClick={(e) => handleMessageClick(e, message, index)}
                        sx={{
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: message.sender === "me" ? "flex-end" : "flex-start",
                          maxWidth: '80%',
                          position: 'relative'
                        }}
                      >
                        {editingMessage === index ? (
                          <Box display="flex" alignItems="center" sx={{ width: '100%' }}>
                            <TextField
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              fullWidth
                              autoFocus
                              sx={{ mr: 1 }}
                            />
                            <Button onClick={handleSaveEdit} variant="contained" size="small">
                              Save
                            </Button>
                            <Button onClick={() => setEditingMessage(null)} size="small">
                              Cancel
                            </Button>
                          </Box>
                        ) : (
                          <Box
                            bgcolor={message.sender === "me" ? "orange" : "#f5f5f5"}
                            color={message.sender === "me" ? "white" : "black"}
                            p={1.5}
                            borderRadius={message.sender === "me" ? "10px 10px 0 10px" : "10px 10px 10px 0"}
                            sx={{ 
                              wordBreak: 'break-word',
                              maxWidth: '100%'
                            }}
                          >
                            {message.text.startsWith('http') ? (
                              <Link href={message.text} target="_blank" rel="noopener" color="inherit">
                                {message.text}
                              </Link>
                            ) : (
                              <Typography fontSize="14px">{message.text}</Typography>
                            )}
                            {message.image && (
                              <img
                                src={message.image}
                                alt="uploaded"
                                style={{ 
                                  maxWidth: "100%", 
                                  height: "auto", 
                                  marginTop: "5px", 
                                  borderRadius: "8px",
                                  maxHeight: '200px'
                                }}
                              />
                            )}
                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                              <Typography fontSize="10px" mr={0.5}>
                                {message.time}
                              </Typography>
                              {message.sender === "me" && (
                                message.seen ? (
                                  <Visibility fontSize="small" sx={{ fontSize: '14px' }} />
                                ) : (
                                  <DoneAll fontSize="small" sx={{ fontSize: '14px' }} />
                                )
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box textAlign="center" mt={isMobile ? 8 : 14}>
                    <Typography mt={2} fontWeight="bold">Empty, Message...</Typography>
                    <Typography fontSize="12px" color="textSecondary">
                      don't worry, just take a deep breath & say "Hello"
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>

            {/* Message Menu */}
            <Menu
              anchorEl={anchorElMessage?.el}
              open={Boolean(anchorElMessage)}
              onClose={handleMessageMenuClose}
            >
              <MenuItem onClick={handleCopyMessage}>
                <FileCopy fontSize="small" sx={{ mr: 1 }} /> Copy
              </MenuItem>
              {anchorElMessage && selectedUser.messages[anchorElMessage.index]?.sender === "me" && (
                <MenuItem onClick={handleEditMessage}>
                  <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
              )}
              <MenuItem onClick={handleShareMessage}>
                <Share fontSize="small" sx={{ mr: 1 }} /> Share
              </MenuItem>
              {anchorElMessage && selectedUser.messages[anchorElMessage.index]?.sender === "me" && (
                <MenuItem onClick={handleDeleteMessage}>
                  <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
              )}
            </Menu>

            {/* Share Message Dialog */}
            <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)}>
              <DialogTitle>Share Message</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Recipient"
                  fullWidth
                  variant="standard"
                  value={shareRecipient}
                  onChange={(e) => setShareRecipient(e.target.value)}
                />
                <TextField
                  margin="dense"
                  label="Message"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={shareMessage}
                  InputProps={{
                    readOnly: true
                  }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowShareDialog(false)}>Cancel</Button>
                <Button onClick={handleShareSubmit} color="primary">Share</Button>
              </DialogActions>
            </Dialog>

            {/* Create Group Dialog */}
            <Dialog open={showGroupDialog} onClose={() => setShowGroupDialog(false)} fullWidth maxWidth="sm">
              <DialogTitle>Create New Group</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Group Name"
                  fullWidth
                  variant="standard"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <Typography variant="subtitle1" sx={{ mt: 2 }}>Select Members</Typography>
                <List>
                  {users.filter(user => user.role !== "Group").map((user) => (
                    <ListItem key={user.id}>
                      <ListItemAvatar>
                        <Avatar>
                          {user.name ? user.name.charAt(0) : ''}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={user.name} />
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </ListItem>
                  ))}
                </List>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowGroupDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateGroup} color="primary">Create</Button>
              </DialogActions>
            </Dialog>

            {/* Send Message Box */}
            <Box display="flex" alignItems="center" bgcolor="#fff" p={1} borderRadius="8px" position="relative">
              {showEmojiPicker && (
                <Box position="absolute" bottom="60px" right="0" zIndex="1000">
                  <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                </Box>
              )}
              {showLinkInput ? (
                <Box display="flex" width="100%" alignItems="center">
                  <TextField
                    placeholder="Paste link here..."
                    variant="standard"
                    fullWidth
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                  />
                  <Button
                    onClick={handleLinkSubmit}
                    sx={{
                      ml: 1,
                      backgroundColor: 'rgba(255, 140, 0, 1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 120, 0, 1)',
                      },
                    }}
                  >
                    Add
                  </Button>

                  <Button
                    onClick={() => setShowLinkInput(false)}
                    sx={{
                      backgroundColor: 'rgba(255, 140, 0, 1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 120, 0, 1)',
                      },
                      ml: 1,
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <>
                  <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <InsertEmoticon />
                  </IconButton>
                  <TextField
                    placeholder="Write a message..."
                    variant="standard"
                    fullWidth
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{ disableUnderline: true }}
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ 
                        width: "50px", 
                        height: "50px", 
                        marginLeft: "8px", 
                        borderRadius: "4px",
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <IconButton onClick={handleAddLink} sx={{ ml: 1 }}>
                    <InsertLink />
                  </IconButton>

                  <IconButton onClick={() => fileInputRef.current.click()} sx={{ ml: 1, p: 0 }}>
                    <ImageIcon />
                  </IconButton>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    sx={{
                      ml: 1,
                      backgroundColor: 'rgba(255, 140, 0, 1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 120, 0, 1)',
                      },
                    }}
                    endIcon={<Send />}
                  >
                    Send
                  </Button>
                </>
              )}
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default Chat;
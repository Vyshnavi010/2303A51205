import React, { useState, useEffect } from "react";
import {
  Alert,
  Badge,
  Box,
  CircularProgress,
  Divider,
  Pagination,
  Stack,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
  Collapse
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import RefreshIcon from "@mui/icons-material/Refresh";

import { NotificationCard } from "../components/NotificationCard";
import { NotificationFilter } from "../components/NotificationFilter";
import { useNotifications } from "../hooks/useNotifications";
import { Log } from "../../../logging-middleware/logger";

export function NotificationsPage() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [showSettings, setShowSettings] = useState(!token);
  const [tempToken, setTempToken] = useState(token);

  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [priorityCount, setPriorityCount] = useState(10);
  const limit = 10;

  // Local storage tracking for viewed/read notifications
  const [readIds, setReadIds] = useState(() => {
    const saved = localStorage.getItem("read_notification_ids");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Fetch notifications hook
  const { notifications, totalPages, loading, error } = useNotifications({
    page,
    limit,
    notificationType: filter,
    token
  });

  // Calculate unread count for current view
  const unreadCount = notifications.filter((n) => !readIds.has(n.ID)).length;

  // Save readIds to localStorage
  useEffect(() => {
    localStorage.setItem("read_notification_ids", JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  const handleSaveToken = async () => {
    localStorage.setItem("access_token", tempToken.trim());
    setToken(tempToken.trim());
    setShowSettings(false);
    setPage(1);
    await Log("frontend", "info", "page", "Authorization Token updated by user.");
  };

  const handleToggleRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.ID));
      return next;
    });
    await Log("frontend", "info", "page", `Marked all notifications on page ${page} as read.`);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  // Compute Priority Inbox (Combination of Placement > Result > Event weights + Recency)
  const computePriorityInbox = () => {
    const weights = { Placement: 3, Result: 2, Event: 1 };
    
    // Sort all loaded notifications by weight, then timestamp
    return [...notifications]
      .sort((a, b) => {
        const weightA = weights[a.Type] || 0;
        const weightB = weights[b.Type] || 0;
        if (weightB !== weightA) return weightB - weightA;
        return new Date(b.Timestamp) - new Date(a.Timestamp);
      })
      .slice(0, priorityCount);
  };

  const priorityNotifications = computePriorityInbox();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
      {/* Top Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          </Badge>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Campus Alert Hub
          </Typography>
        </Stack>
        <IconButton onClick={() => setShowSettings(!showSettings)} color="primary">
          <SettingsIcon />
        </IconButton>
      </Stack>

      {/* Token Settings Card */}
      <Collapse in={showSettings}>
        <Card variant="outlined" sx={{ mb: 4, bgcolor: "grey.50" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              ⚙️ Authorization & Test Server Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Provide your JWT access token to fetch the notifications from the secure API. 
              The token will be stored in your browser's local storage and used for logging.
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Bearer Access Token"
                variant="outlined"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button variant="contained" onClick={handleSaveToken} sx={{ px: 4 }}>
                Save
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      <Divider sx={{ mb: 4 }} />

      {/* Main Workspace */}
      <Grid container spacing={4}>
        
        {/* Left Column: All Alerts Feed */}
        <Grid item xs={12} md={7}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={700}>
              📢 Stream Feed
            </Typography>
            {notifications.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkAllRead}
                sx={{ textTransform: "none" }}
              >
                Mark Page as Read
              </Button>
            )}
          </Stack>

          {/* Filter Bar */}
          <Box sx={{ mb: 3 }}>
            <NotificationFilter value={filter} onChange={handleFilterChange} />
          </Box>

          {/* Alert List Container */}
          <Paper variant="outlined" sx={{ p: 2, minHeight: 400, bgcolor: "background.default" }}>
            {loading && (
              <Box display="flex" justifyContent="center" alignItems="center" py={12}>
                <CircularProgress />
              </Box>
            )}

            {!loading && error && (
              <Alert 
                severity={token ? "error" : "warning"}
                action={
                  !token && (
                    <Button color="inherit" size="small" onClick={() => setShowSettings(true)}>
                      Set Token
                    </Button>
                  )
                }
              >
                {error}
              </Alert>
            )}

            {!loading && !error && notifications.length === 0 && (
              <Box py={8} textAlign="center">
                <Typography color="text.secondary">
                  No notifications found. Set a valid token or try changing the filter.
                </Typography>
              </Box>
            )}

            {!loading && !error && notifications.length > 0 && (
              <Stack spacing={2}>
                {notifications.map((n) => (
                  <NotificationCard
                    key={n.ID}
                    notification={n}
                    isRead={readIds.has(n.ID)}
                    onToggleRead={handleToggleRead}
                  />
                ))}
              </Stack>
            )}
          </Paper>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                size="large"
              />
            </Box>
          )}
        </Grid>

        {/* Right Column: Priority Inbox */}
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ borderColor: "primary.light", height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  🔥 Priority Inbox
                </Typography>
                
                {/* n limit dropdown */}
                <FormControl size="small" sx={{ width: 110 }}>
                  <InputLabel id="priority-n-select-label">Show Top</InputLabel>
                  <Select
                    labelId="priority-n-select-label"
                    value={priorityCount}
                    label="Show Top"
                    onChange={(e) => setPriorityCount(e.target.value)}
                  >
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={15}>Top 15</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" mb={3}>
                Auto-prioritized based on category importance (Placement &gt; Result &gt; Event) and recency.
              </Typography>

              {loading && (
                <Box display="flex" justifyContent="center" py={8}>
                  <CircularProgress size={30} />
                </Box>
              )}

              {!loading && priorityNotifications.length === 0 && (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}>
                  <Typography color="text.secondary">
                    No priority alerts in feed.
                  </Typography>
                </Paper>
              )}

              {!loading && priorityNotifications.length > 0 && (
                <Stack spacing={1.5}>
                  {priorityNotifications.map((n, idx) => (
                    <NotificationCard
                      key={`priority-${n.ID}`}
                      notification={n}
                      isRead={readIds.has(n.ID)}
                      onToggleRead={handleToggleRead}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

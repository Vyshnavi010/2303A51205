import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Button, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import { Log } from '../../logging-middleware/logger';

const TYPE_CONFIGS = {
  'Placement': { color: 'error', icon: <BusinessCenterIcon fontSize="small" /> },
  'Result': { color: 'warning', icon: <AssignmentIcon fontSize="small" /> },
  'Event': { color: 'info', icon: <EventIcon fontSize="small" /> }
};

export function NotificationCard({ notification, isRead, onToggleRead }) {
  const { ID, Type, Message, Timestamp } = notification;
  const config = TYPE_CONFIGS[Type] || { color: 'default', icon: null };

  const handleToggle = async (e) => {
    e.stopPropagation();
    await Log('frontend', 'info', 'component', `Toggled read state for notification ID: ${ID} to ${!isRead}`);
    onToggleRead(ID);
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        borderLeft: `5px solid`,
        borderColor: isRead ? 'grey.300' : `${config.color}.main`,
        bgcolor: isRead ? 'action.hover' : 'background.paper',
        boxShadow: isRead ? 0 : 1,
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Chip 
                icon={config.icon}
                label={Type} 
                color={config.color} 
                size="small" 
                variant={isRead ? 'outlined' : 'filled'}
              />
              {!isRead && (
                <Chip 
                  label="New" 
                  color="primary" 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold' }}
                />
              )}
            </Stack>
            
            <Typography 
              variant="body1" 
              fontWeight={isRead ? 400 : 600}
              color={isRead ? 'text.secondary' : 'text.primary'}
              mb={1}
            >
              {Message}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {Timestamp}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="text"
            color={isRead ? 'secondary' : 'primary'}
            startIcon={isRead ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            onClick={handleToggle}
            sx={{ textTransform: 'none', alignSelf: 'center' }}
          >
            {isRead ? 'Read' : 'Mark Read'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

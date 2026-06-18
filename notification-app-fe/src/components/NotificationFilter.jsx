import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Log } from "../../../logging-middleware/logger";

const filters = ["All", "Placement", "Result", "Event"];

export function NotificationFilter({ value = "All", onChange }) {
  const handleChange = async (event, newValue) => {
    if (newValue !== null && onChange) {
      await Log("frontend", "info", "component", `Filter changed to: ${newValue}`);
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size="medium"
      color="primary"
      sx={{ 
        flexWrap: "wrap", 
        gap: 0.5,
        border: 'none',
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px !important',
          px: 3,
        }
      }}
    >
      {filters.map((type) => (
        <ToggleButton key={type} value={type} sx={{ textTransform: "none" }}>
          {type === "All" ? "⚡ All Alerts" : `${type}s`}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
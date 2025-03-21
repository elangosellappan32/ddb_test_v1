import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Typography,
  CircularProgress
} from "@mui/material";

const DashboardCard = ({
  icon,
  title,
  color,
  loading,
  items,
  onClick
}) => (
  <Card
    sx={{
      height: '100%',
      borderRadius: 3,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
      }
    }}
  >
    <CardActionArea
      onClick={onClick}
      sx={{
        height: '100%',
        p: 3
      }}
    >
      {loading ? (
        <CircularProgress size={40} sx={{ color }} />
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 3,
              justifyContent: 'space-between',
              width: '100%',
              borderBottom: 1,
              borderColor: 'divider',
              pb: 2
            }}
          >
            {React.cloneElement(icon, {
              sx: {
                fontSize: 40,
                color,
                opacity: 0.9
              }
            })}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              {title}
            </Typography>
          </Box>

          {items?.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                py: 1.5,
                borderBottom: index < items.length - 1 ? 1 : 0,
                borderColor: 'divider'
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.secondary',
                  fontWeight: 'medium'
                }}
              >
                {React.cloneElement(item.icon, {
                  sx: {
                    fontSize: 20,
                    mr: 1,
                    color: item.color || color,
                    opacity: 0.8
                  }
                })}
                {item.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                  color: item.color || color
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </>
      )}
    </CardActionArea>
  </Card>
);

export default DashboardCard;

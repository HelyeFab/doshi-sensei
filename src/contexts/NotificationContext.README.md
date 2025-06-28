# Notification System Usage Guide

## How to use the new notification system

### 1. Import the hook in your component:
```tsx
import { useNotification } from '@/contexts/NotificationContext';
```

### 2. Use the hook in your component:
```tsx
const { showNotification } = useNotification();
```

### 3. Show notifications:
```tsx
// Success notification
showNotification({
  title: "Success!",
  message: "Your changes have been saved.",
  type: "success"
});

// Error notification
showNotification({
  title: "Error",
  message: "Something went wrong. Please try again.",
  type: "error"
});

// Info notification
showNotification({
  title: "Info",
  message: "This is an informational message.",
  type: "info"
});

// Warning notification
showNotification({
  title: "Warning",
  message: "Please review your input.",
  type: "warning"
});

// Custom duration (in milliseconds)
showNotification({
  title: "Quick message",
  type: "info",
  duration: 3000 // 3 seconds
});
```

## Replacing alert() calls

Instead of:
```tsx
alert('Minimum donation amount is $1.00');
```

Use:
```tsx
showNotification({
  title: "Invalid Amount",
  message: "Minimum donation amount is $1.00",
  type: "warning"
});
```

## Features
- Automatic dismiss after 5 seconds (customizable)
- Multiple notification types with different colors
- Stack multiple notifications
- Smooth animations
- Dark mode support
- Accessible (can be closed with click)
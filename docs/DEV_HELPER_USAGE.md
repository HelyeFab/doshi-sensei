# 🛠️ Dev Helper - Component Location Debugger

A simple tool to help identify components and pages while browsing the app, especially useful for reporting translation issues.

## How to Use

### 1. Enable Dev Helper
Press **Ctrl+Shift+D** (or Cmd+Shift+D on Mac) to toggle the Dev Helper on/off.

### 2. What You'll See
A small black box in the bottom-left corner showing:
- **Page**: Current page name (e.g., "Homepage", "drill > practice")
- **Route**: Technical route path (e.g., "/", "/drill/practice")
- **Component**: When you hover over a component that's been marked (shows in green)

### 3. Example Feedback Format
When reporting an i18n issue, you can now say:
```
Location: Homepage > StatsBar
Issue: "Streak" should be translated as "連続日数" not "ストリーク"
```

## For Developers: Marking Components

To make a component show up in the Dev Helper, add the `useComponentName` hook:

```tsx
import { useComponentName } from '@/components/DevHelper';

export function MyComponent() {
  const componentProps = useComponentName('MyComponent');
  
  return (
    <div {...componentProps}>
      {/* Component content */}
    </div>
  );
}
```

## Important Components Already Marked
- StatsBar - The stats display bar on homepage and other pages

## Features
- Only works in development mode
- Persists on/off state in localStorage
- Shows component name on hover
- Minimal performance impact
- Automatically hidden in production

## Quick Reference
- **Toggle**: Ctrl+Shift+D
- **Position**: Bottom-left corner
- **Info Shown**: Page name, route path, hovered component

This tool makes it easy to communicate exactly where translation issues are located without needing to know the codebase structure!
# App UI Components Documentation

This document lists all reusable UI components in the Doshi Sensei application, their purpose, and location.

## Feedback & Notification Components

### Toast
- **Location**: `src/components/Toast.tsx`
- **Purpose**: Brief notification messages that appear temporarily
- **Features**:
  - Four types: success, error, warning, info
  - Auto-dismiss after configurable duration
  - Manual dismiss option
  - Stacking support for multiple toasts
  - Custom hook `useToast()` for easy integration
  - Smooth slide-in/out animations

### AlertBanner
- **Location**: `src/components/AlertBanner.tsx`
- **Purpose**: Persistent notifications displayed at the top of content
- **Features**:
  - Four types: success, error, warning, info
  - Optional dismiss button
  - Icon indicators for each type
  - Full-width responsive design
  - Theme-aware styling

### Spinner
- **Location**: `src/components/Spinner.tsx`
- **Purpose**: Loading indicators using rotating hourglass emoji
- **Features**:
  - Multiple sizes (sm, md, lg, xl)
  - InlineSpinner for buttons/text
  - PageSpinner for full-page loading
  - Optional loading message
  - Smooth rotation animation

## Form Components

### Switch
- **Location**: `src/components/Switch.tsx`
- **Purpose**: Toggle switches for on/off states
- **Features**:
  - Three sizes (sm, md, lg)
  - Controlled and uncontrolled modes
  - Optional label with left/right positioning
  - Disabled state
  - Keyboard accessible
  - Smooth transition animations

### SearchBar
- **Location**: `src/components/SearchBar.tsx`
- **Purpose**: Search input with autocomplete suggestions
- **Features**:
  - Real-time search with debouncing
  - Autocomplete dropdown with suggestions
  - Keyboard navigation (arrows, enter, escape)
  - Clear button
  - Customizable suggestion rendering
  - Click-outside to close
  - Generic type support for any data

## Layout Components

### Accordion
- **Location**: `src/components/Accordion.tsx`
- **Purpose**: Expandable/collapsible content sections
- **Features**:
  - AccordionItem component for multiple sections
  - Optional icons for each item
  - Smooth expand/collapse animations
  - Default open state support
  - Collapsible component for simpler use cases
  - Theme-aware styling

## Dialog Components

### ConfirmDialog
- **Location**: `src/components/ConfirmDialog.tsx`
- **Purpose**: A reusable confirmation dialog for user actions like deleting items, closing windows with unsaved changes, or confirming destructive operations
- **Features**:
  - Fully responsive (mobile-first design)
  - Theme-aware using CSS variables
  - Multiple types: `danger`, `warning`, `info`
  - Smooth animations with scale/fade transitions
  - Keyboard support (ESC to close)
  - Portal rendering (always on top)
  - Custom hook `useConfirmDialog()` for easy integration
- **Usage**:
  ```tsx
  // Direct usage
  <ConfirmDialog
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onConfirm={handleConfirm}
    title="Delete Item"
    message="Are you sure?"
    type="danger"
  />

  // With hook (recommended)
  const { showDialog, DialogComponent } = useConfirmDialog();
  showDialog({
    title: 'Delete Word',
    message: 'Are you sure?',
    type: 'danger',
    onConfirm: () => handleDelete()
  });
  ```

## Navigation Components

### StunningBottomNavbar
- **Location**: `src/components/StunningBottomNavbar.tsx`
- **Purpose**: Mobile bottom navigation bar with smooth animations
- **Features**: Animated active indicator, responsive icons, theme-aware styling

### DesktopNavMenu
- **Location**: `src/components/DesktopNavMenu.tsx`
- **Purpose**: Desktop navigation with floating menu button
- **Features**: Expandable menu, keyboard navigation, theme integration

## Floating Action Components

### CompanionTrigger
- **Location**: `src/components/CompanionTrigger.tsx`
- **Purpose**: Floating button to trigger the Virtual Companion modal
- **Features**: Animated giraffe icon, global availability

### FloatingDonateButton
- **Location**: `src/components/FloatingDonateButton.tsx`
- **Purpose**: Floating donation button for Buy Me a Coffee feature
- **Features**: Coffee cup icon, triggers donation modal

## Modal Components

### VirtualCompanion
- **Location**: `src/components/VirtualCompanion.tsx`
- **Purpose**: Motivational companion modal with animated characters
- **Features**: Random character selection, encouraging quotes, smooth animations

### DonationModal
- **Location**: `src/components/DonationModal.tsx`
- **Purpose**: Modal for processing donations with amount selection
- **Features**: Preset amounts, custom amount input, Stripe integration placeholder

## Card Components

### FeatureCard
- **Location**: `src/components/HomePage.tsx` (embedded)
- **Purpose**: Display feature sections on homepage
- **Features**: Icon display, title, description, navigation

## Context Providers

### ThemeProvider
- **Location**: `src/contexts/ThemeProvider.tsx`
- **Purpose**: Manages app-wide theme and color scheme
- **Features**: 12 color schemes, light/dark mode support, system preference detection

### LanguageProvider
- **Location**: `src/contexts/LanguageContext.tsx`
- **Purpose**: Centralized string management for internationalization
- **Features**: useStrings() hook, SEO content integration, future multi-language support

### VirtualCompanionProvider
- **Location**: `src/contexts/VirtualCompanionContext.tsx`
- **Purpose**: Global state management for Virtual Companion feature
- **Features**: Show/hide companion from anywhere in the app

## Layout Components

### HomePage
- **Location**: `src/components/HomePage.tsx`
- **Purpose**: Main homepage layout with user greeting and feature sections
- **Features**: User stats display, categorized feature cards, responsive grid layout

---

*Last updated: January 2025*
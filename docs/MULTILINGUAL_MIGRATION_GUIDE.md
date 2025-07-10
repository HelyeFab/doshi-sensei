# Multilingual Migration Guide

This guide helps you migrate existing components from hardcoded strings to the new multilingual system.

## Quick Migration Steps

### 1. Update Imports

**Before:**

```typescript
import strings from "@/config/strings";
```

**After:**

```typescript
import { useStrings } from "@/hooks/useLanguage";
// OR for better type safety:
import { useTypedStrings } from "@/contexts/LanguageContext";
```

### 2. Update Component Usage

**Before:**

```typescript
function MyComponent() {
  return (
    <div>
      <h1>{strings.navigation.home}</h1>
      <button>{strings.common.save}</button>
    </div>
  );
}
```

**After:**

```typescript
function MyComponent() {
  const strings = useStrings(); // or useTypedStrings()

  return (
    <div>
      <h1>{strings.navigation.home}</h1>
      <button>{strings.common.save}</button>
    </div>
  );
}
```

### 3. Add Language Provider (Root Level)

Add the `LanguageProvider` to your root layout:

```typescript
// app/layout.tsx
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
```

## Migration Patterns

### Pattern 1: Simple String Replacement

**Component with hardcoded strings:**

```typescript
function Header() {
  return (
    <header>
      <h1>Doshi Sensei</h1>
      <nav>
        <a href="/practice">Practice</a>
        <a href="/drill">Drill</a>
      </nav>
    </header>
  );
}
```

**After migration:**

```typescript
function Header() {
  const strings = useStrings();

  return (
    <header>
      <h1>Doshi Sensei</h1>
      <nav>
        <a href="/practice">{strings.navigation.practice}</a>
        <a href="/drill">{strings.navigation.drill}</a>
      </nav>
    </header>
  );
}
```

### Pattern 2: Conditional Text

**Before:**

```typescript
function StatusMessage({ isComplete }) {
  return <div>{isComplete ? "Practice Complete!" : "Continue Practice"}</div>;
}
```

**After:**

```typescript
function StatusMessage({ isComplete }) {
  const strings = useStrings();

  return (
    <div>
      {isComplete
        ? strings.practice.practiceComplete
        : strings.practice.continuePractice}
    </div>
  );
}
```

### Pattern 3: Form Labels

**Before:**

```typescript
function SettingsForm() {
  return (
    <form>
      <label>Language:</label>
      <select>
        <option>English</option>
        <option>French</option>
      </select>

      <label>Theme:</label>
      <select>
        <option>Light</option>
        <option>Dark</option>
      </select>
    </form>
  );
}
```

**After:**

```typescript
function SettingsForm() {
  const strings = useStrings();

  return (
    <form>
      <label>{strings.settings.language}:</label>
      <select>
        <option>English</option>
        <option>French</option>
      </select>

      <label>{strings.settings.theme}:</label>
      <select>
        <option>Light</option>
        <option>Dark</option>
      </select>
    </form>
  );
}
```

## Adding Language Selector

Add the language selector to your navigation or settings:

```typescript
import { LanguageSelector } from "@/components/LanguageSelector";

function Navigation() {
  return (
    <nav>
      {/* Your existing navigation */}
      <LanguageSelector />
    </nav>
  );
}
```

## Type Safety

For better type safety, use `useTypedStrings()`:

```typescript
import { useTypedStrings } from "@/contexts/LanguageContext";

function MyComponent() {
  const strings = useTypedStrings(); // Provides full type safety

  return (
    <div>
      <h1>{strings.navigation.home}</h1>
    </div>
  );
}
```

## Testing

Update your tests to account for the new hook:

```typescript
// Before
import strings from "@/config/strings";

test("renders correct text", () => {
  render(<MyComponent />);
  expect(screen.getByText(strings.navigation.home)).toBeInTheDocument();
});

// After
import { LanguageProvider } from "@/contexts/LanguageContext";

test("renders correct text", () => {
  render(
    <LanguageProvider>
      <MyComponent />
    </LanguageProvider>
  );
  expect(screen.getByText("Home")).toBeInTheDocument(); // English default
});
```

## Common Issues

### Issue 1: Hook called outside provider

**Error:** `useLanguageContext must be used within a LanguageProvider`

**Solution:** Wrap your component with `LanguageProvider` or use `useStrings()` instead.

### Issue 2: Missing strings

**Error:** `Cannot read property 'navigation' of undefined`

**Solution:** Ensure the string key exists in your language files.

### Issue 3: Type errors

**Error:** `Property 'newKey' does not exist on type...`

**Solution:** Add the missing string to all language files to maintain consistency.

## Best Practices

1. **Always use the hook:** Don't import strings directly, use the hook
2. **Add to all languages:** When adding new strings, add them to all language files
3. **Use meaningful keys:** Use descriptive keys like `navigation.home` instead of `home`
4. **Group related strings:** Organize strings by feature area
5. **Test with different languages:** Verify your components work with all supported languages

## Migration Checklist

- [ ] Update imports to use hooks
- [ ] Replace hardcoded strings with string keys
- [ ] Add LanguageProvider to root layout
- [ ] Add LanguageSelector component
- [ ] Update tests to use LanguageProvider
- [ ] Verify all strings exist in language files
- [ ] Test with different languages
- [ ] Update documentation

## Need Help?

If you encounter issues during migration:

1. Check the console for hook errors
2. Verify all string keys exist in language files
3. Ensure LanguageProvider is wrapping your components
4. Use `useStrings()` for simpler cases, `useTypedStrings()` for better type safety

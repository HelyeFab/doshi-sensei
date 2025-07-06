# Admin Dashboard: Feature Matrix View

**Purpose**: Visual representation of all features and their limits across user types  
**Location**: `/admin/features` or as a tab in the admin dashboard

## UI Design Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│ Feature Access Matrix                                    [Export CSV] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filter: [All Categories ▼] [All Status ▼] Search: [___________] 🔍 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Feature Name          Category    Guest    Free    Monthly  Yearly  │
│ ─────────────────────────────────────────────────────────────────  │
│ 📝 Conjugation Drills Learning    3/day    3/day   ∞        ∞      │
│ 🎮 Kanji Quest       Games       3/day    3/day   ∞        ∞      │
│ 🎮 Kana Drop         Games       3/day    3/day   ∞        ∞      │
│ 📚 Article Reading   Learning    3/day    3/day   ∞        ∞      │
│ 📖 Story Reading     Learning    ❌       3/day   ∞        ∞      │
│ 📋 Word Lists        Storage     ❌       3 max   ∞        ∞      │
│ 🔖 Bookmarks         Storage     ❌       5 max   ∞        ∞      │
│ ☁️ Cloud Sync        System      ❌       ❌      ✅       ✅     │
│ 💾 Progress Saving   System      ❌       ✅      ✅       ✅     │
│ 🎯 Kanji Moods       Learning    ❌       ✅      ✅       ✅     │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│ 🚧 PLANNED FEATURES                                                 │
│ ─────────────────────────────────────────────────────────────────  │
│ 🗣️ Speaking Practice Learning    ❌       1/day   ∞        ∞      │
│ 📊 Analytics Dashboard System    ❌       Basic   Pro      Pro    │
│ 🤖 AI Tutor          Learning    ❌       ❌      10/day   ∞      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Legend: ❌ Not Available | ✅ Available | ∞ Unlimited | Numbers = Limits
```

## Implementation in React

```typescript
// /src/app/admin/features/page.tsx
export default function FeatureMatrixPage() {
  const features = useFeatureRegistry();
  const entitlements = useEntitlementRules();
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Feature Access Matrix</h1>
          <button className="btn-secondary">
            Export CSV
          </button>
        </div>
        
        <FeatureMatrixTable 
          features={features}
          entitlements={entitlements}
        />
      </div>
    </AdminLayout>
  );
}

// /src/components/admin/FeatureMatrixTable.tsx
function FeatureMatrixTable({ features, entitlements }) {
  const userTypes = ['guest', 'free', 'monthly', 'yearly'];
  
  return (
    <div className="bg-card rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-4">Feature Name</th>
            <th className="text-left p-4">Category</th>
            {userTypes.map(type => (
              <th key={type} className="text-center p-4 capitalize">
                {type}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map(feature => (
            <FeatureRow 
              key={feature.id}
              feature={feature}
              entitlements={entitlements}
              userTypes={userTypes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureRow({ feature, entitlements, userTypes }) {
  const getAccessDisplay = (userType: string) => {
    const access = entitlements.getAccess(userType, feature.id);
    
    if (!access.allowed) return '❌';
    if (access.limit === -1) return '∞';
    if (access.limit > 0) {
      return feature.limitType === 'daily' 
        ? `${access.limit}/day`
        : `${access.limit} max`;
    }
    return '✅';
  };
  
  return (
    <tr className="border-t">
      <td className="p-4">
        <div className="flex items-center gap-2">
          <span>{feature.icon}</span>
          <span className="font-medium">{feature.name}</span>
        </div>
      </td>
      <td className="p-4">
        <span className="badge badge-secondary">
          {feature.category}
        </span>
      </td>
      {userTypes.map(type => (
        <td key={type} className="p-4 text-center">
          <span className={getAccessClass(type, feature)}>
            {getAccessDisplay(type)}
          </span>
        </td>
      ))}
    </tr>
  );
}
```

## Features of the Matrix View

### 1. Visual Indicators
- ❌ Red for no access
- ✅ Green for unlimited access
- 🔢 Numbers for specific limits
- 🚧 Different section for planned features

### 2. Filtering & Search
- Filter by category (Learning, Games, Storage, System)
- Filter by status (Active, Planned, Deprecated)
- Search by feature name

### 3. Export Functionality
```typescript
function exportToCSV(features, entitlements) {
  const headers = ['Feature', 'Category', 'Guest', 'Free', 'Monthly', 'Yearly'];
  const rows = features.map(feature => [
    feature.name,
    feature.category,
    ...userTypes.map(type => formatAccess(entitlements.getAccess(type, feature.id)))
  ]);
  
  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
}
```

### 4. Quick Stats Summary
```
┌────────────────────────────────────────────┐
│ Quick Stats                                │
├────────────────────────────────────────────┤
│ Total Features: 12 active, 3 planned       │
│ Guest Access: 4 features                   │
│ Free Access: 9 features                    │
│ Premium Exclusive: 3 features              │
└────────────────────────────────────────────┘
```

### 5. Hover Details
When hovering over a limit, show additional info:
```
┌─────────────────────────┐
│ Word Lists - Free Tier  │
├─────────────────────────┤
│ Limit: 3 lists maximum  │
│ Can create/edit/delete  │
│ Local storage only      │
│ No cloud sync           │
└─────────────────────────┘
```

## Integration with New System

This view would pull directly from the three pillars:

```typescript
// Real-time data from the new system
const featureMatrix = useMemo(() => {
  return features.map(feature => ({
    ...feature,
    access: {
      guest: entitlements.calculateAccess('guest', feature.id),
      free: entitlements.calculateAccess('free', feature.id),
      monthly: entitlements.calculateAccess('monthly', feature.id),
      yearly: entitlements.calculateAccess('yearly', feature.id)
    }
  }));
}, [features, entitlements]);
```

## Additional Admin Tools

### 1. Feature Flag Toggle (Future Enhancement)
```
[ ] Enable Speaking Practice (Beta)
[ ] Enable AI Tutor (Alpha)
[✓] Enable Kanji Moods
```

### 2. A/B Testing Configuration
```
Feature: Speaking Practice
├─ Control Group (0%): No access
├─ Test Group A (50%): 1/day for free users
└─ Test Group B (50%): 3/day for free users
```

### 3. Usage Analytics per Feature
Click any feature to see:
- Daily/monthly usage trends
- User type breakdown
- Conversion impact (free → premium)

This feature matrix would become your central command center for understanding and managing feature access across all user types!
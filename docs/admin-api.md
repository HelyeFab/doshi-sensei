# Admin API Documentation

This document describes the admin API endpoints for managing entitlements and feature limits in Doshi Sensei.

## Authentication

All admin endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

The user must be listed in the `ADMIN_EMAILS` environment variable to access these endpoints.

## Endpoints

### 1. Get Feature Matrix

Retrieves the current feature matrix showing all features and their access levels for different user types.

**Endpoint:** `GET /api/admin/feature-matrix`

**Query Parameters:**
- `refresh` (optional): Set to `true` to force refresh from Firestore, bypassing cache

**Response:** `FeatureMatrixResponse`
```typescript
{
  matrix: Array<{
    feature: Feature;
    access: Record<UserType, {
      allowed: boolean;
      limit: number;
    }>;
  }>;
  stats: {
    totalFeatures: number;
    activeFeatures: number;
    plannedFeatures: number;
    guestAccessible: number;
    freeAccessible: number;
    premiumExclusive: number;
  };
  userTypes: UserType[];
  lastUpdated: string;
}
```

### 2. Update Feature Limit

Updates a specific feature limit for a user type.

**Endpoint:** `POST /api/admin/update-limit`

**Request Body:** `UpdateLimitRequest`
```typescript
{
  userType: "guest" | "free" | "monthly" | "yearly";
  featureId: string;
  limitType: "daily" | "total";
  newValue: number; // Use -1 for unlimited
}
```

**Response:** `UpdateLimitResponse`
```typescript
{
  success: boolean;
  message: string;
  updatedRule?: {
    id: string;
    userTypes: UserType[];
    permissions: string[];
    limits: {
      daily?: Record<string, number>;
      total?: Record<string, number>;
    };
  };
}
```

### 3. Entitlements Management

A consolidated endpoint for debugging and fixing entitlement structures.

#### Debug Entitlements

**Endpoint:** `GET /api/admin/entitlements-management`

**Response:** `EntitlementDebugInfo`
```typescript
{
  currentRules: {
    source: "firestore" | "default";
    lastUpdated: string;
    version: number;
    rulesCount: number;
  };
  youtubeLimits: Array<{
    userType: string;
    limit: number;
  }>;
  structureStatus: {
    isValid: boolean;
    issues: string[];
  };
  cacheInfo: {
    serverCacheAge: number | null;
    clientCacheStatus: string;
  };
}
```

#### Fix Entitlement Structure

**Endpoint:** `POST /api/admin/entitlements-management`

**Request Body:** `EntitlementFixRequest`
```typescript
{
  action: "fix-structure";
}
```

**Response:** `EntitlementFixResult`
```typescript
{
  success: boolean;
  message: string;
  fixed: string[]; // List of fixes applied
  errors: string[]; // Any errors encountered
}
```

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  error: string;
  details?: string;
}
```

Common HTTP status codes:
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (not an admin)
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error

## Usage Examples

### Update YouTube Shadowing Limit

```javascript
const token = await auth.currentUser?.getIdToken();

const response = await fetch('/api/admin/update-limit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userType: 'monthly',
    featureId: 'youtube_shadowing',
    limitType: 'daily',
    newValue: 10
  })
});

const result = await response.json();
```

### Debug Entitlements

```javascript
const token = await auth.currentUser?.getIdToken();

const response = await fetch('/api/admin/entitlements-management', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const debugInfo = await response.json();
console.table(debugInfo.youtubeLimits);
```

## Implementation Notes

1. **Caching**: The server implements a 5-second cache for entitlement rules to reduce Firestore reads
2. **Cache Invalidation**: The cache is automatically cleared when limits are updated
3. **Force Refresh**: Use the `refresh=true` query parameter to bypass the cache
4. **Firestore Document**: Rules are stored in `config/entitlement_rules_v1`
5. **Default Rules**: If Firestore document doesn't exist, the system falls back to hardcoded defaults

## Security Considerations

1. All endpoints verify Firebase ID tokens
2. Admin emails are stored in environment variables, not in code
3. Server-side operations use Firebase Admin SDK
4. No direct Firestore access from client for admin operations
5. All updates are logged for audit purposes
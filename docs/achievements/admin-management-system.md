# 🛠️ Admin Achievement Management System

## Overview

A comprehensive admin interface for managing achievements dynamically, similar to the snake path system. This allows admins to create, modify, and deploy achievements without code changes.

## 1. File-Based Achievement Storage

### Achievement Definition File

```typescript
// /data/achievements/dynamic-achievements.json
{
  "version": "1.0.0",
  "lastUpdated": "2025-07-23T10:30:00Z",
  "updatedBy": "admin@doshisensei.com",
  "achievements": [
    {
      "id": "custom_streak_30",
      "category": "streaks",
      "title": "Dedication Master",
      "description": "Study for 30 consecutive days",
      "conditionType": "simple",
      "conditionField": "currentStreak",
      "conditionOperator": ">=",
      "conditionValue": 30,
      "rewardType": "title",
      "rewardValue": "Dedication Master",
      "rarity": "epic",
      "requiredUserType": null,
      "isActive": true,
      "isCustom": true,
      "createdAt": "2025-07-23T10:30:00Z",
      "updatedAt": "2025-07-23T10:30:00Z",
      "icon": "🔥",
      "color": "#ff6b35"
    },
    {
      "id": "word_hoarder_1000",
      "category": "words",
      "title": "Word Hoarder",
      "description": "Save 1000 words to your lists",
      "conditionType": "simple",
      "conditionField": "wordsSaved",
      "conditionOperator": ">=",
      "conditionValue": 1000,
      "rewardType": "badge",
      "rewardValue": "word_collector_gold",
      "rarity": "legendary",
      "requiredUserType": "premium",
      "isActive": true,
      "isCustom": true,
      "createdAt": "2025-07-23T10:30:00Z",
      "updatedAt": "2025-07-23T10:30:00Z",
      "icon": "📚",
      "color": "#ffd700"
    }
  ]
}
```

### Reward Assets File

```typescript
// /data/achievements/reward-assets.json
{
  "titles": [
    {
      "id": "dedication_master",
      "displayName": "Dedication Master",
      "color": "#ff6b35",
      "icon": "🔥",
      "rarity": "epic"
    }
  ],
  "badges": [
    {
      "id": "word_collector_gold",
      "displayName": "Golden Word Collector",
      "imageUrl": "/achievements/badges/word_collector_gold.svg",
      "rarity": "legendary"
    }
  ],
  "cosmetics": [
    {
      "id": "golden_avatar_frame",
      "displayName": "Golden Frame",
      "type": "avatar_frame",
      "imageUrl": "/achievements/cosmetics/golden_frame.svg",
      "rarity": "epic"
    }
  ]
}
```

## 2. Admin Interface Components

### Achievement Management Dashboard

```typescript
// /src/app/admin/achievements/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAchievementAdmin } from "@/hooks/useAchievementAdmin";
import AchievementEditor from "@/components/achievements/admin/AchievementEditor";
import AchievementPreview from "@/components/achievements/admin/AchievementPreview";

export default function AdminAchievementsPage() {
  const {
    achievements,
    loadAchievements,
    saveAchievements,
    validateAchievement,
    previewAchievement,
  } = useAchievementAdmin();

  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className="admin-achievements-container">
      <div className="header">
        <h1>Achievement Management</h1>
        <div className="actions">
          <button onClick={() => setIsEditing(true)}>
            Add New Achievement
          </button>
          <button onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? "Edit Mode" : "Preview Mode"}
          </button>
        </div>
      </div>

      <div className="content-grid">
        <div className="achievements-list">
          <AchievementsList
            achievements={achievements}
            onSelect={setSelectedAchievement}
            onEdit={(achievement) => {
              setSelectedAchievement(achievement);
              setIsEditing(true);
            }}
          />
        </div>

        <div className="editor-panel">
          {isEditing ? (
            <AchievementEditor
              achievement={selectedAchievement}
              onSave={handleSaveAchievement}
              onCancel={() => setIsEditing(false)}
            />
          ) : previewMode ? (
            <AchievementPreview achievement={selectedAchievement} />
          ) : (
            <AchievementDetails achievement={selectedAchievement} />
          )}
        </div>
      </div>
    </div>
  );
}
```

### Achievement Editor Component

```typescript
// /src/components/achievements/admin/AchievementEditor.tsx
"use client";

import { useState } from "react";
import { Achievement } from "@/lib/achievements/types";

interface AchievementEditorProps {
  achievement?: Achievement;
  onSave: (achievement: Achievement) => void;
  onCancel: () => void;
}

export default function AchievementEditor({
  achievement,
  onSave,
  onCancel,
}: AchievementEditorProps) {
  const [formData, setFormData] = useState({
    id: achievement?.id || "",
    title: achievement?.title || "",
    description: achievement?.description || "",
    category: achievement?.category || "streaks",
    conditionType: "simple",
    conditionField: "currentStreak",
    conditionOperator: ">=",
    conditionValue: 1,
    rewardType: "title",
    rewardValue: "",
    rarity: "common",
    requiredUserType: null,
    isActive: true,
    icon: "🏆",
    color: "#3b82f6",
  });

  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);

    // Validate achievement
    const validation = await validateAchievement(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsValidating(false);
      return;
    }

    // Save achievement
    const newAchievement = {
      ...formData,
      id: formData.id || generateAchievementId(formData),
      isCustom: true,
      createdAt: achievement?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newAchievement);
    setIsValidating(false);
  };

  return (
    <form onSubmit={handleSubmit} className="achievement-editor">
      <div className="form-section">
        <h3>Basic Information</h3>

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Achievement Title"
            required
          />
          {errors.title && <span className="error">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Achievement description"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              <option value="streaks">Streaks</option>
              <option value="drills">Drills</option>
              <option value="words">Words</option>
              <option value="reading">Reading</option>
              <option value="stories">Stories</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="form-group">
            <label>Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) =>
                setFormData({ ...formData, rarity: e.target.value })
              }
            >
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Unlock Condition</h3>

        <ConditionBuilder
          conditionType={formData.conditionType}
          conditionField={formData.conditionField}
          conditionOperator={formData.conditionOperator}
          conditionValue={formData.conditionValue}
          onChange={(condition) => setFormData({ ...formData, ...condition })}
        />
      </div>

      <div className="form-section">
        <h3>Reward</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Reward Type</label>
            <select
              value={formData.rewardType}
              onChange={(e) =>
                setFormData({ ...formData, rewardType: e.target.value })
              }
            >
              <option value="title">Title</option>
              <option value="badge">Badge</option>
              <option value="xp">XP Points</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </div>

          <div className="form-group">
            <label>Reward Value</label>
            {formData.rewardType === "xp" ? (
              <input
                type="number"
                value={formData.rewardValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rewardValue: parseInt(e.target.value),
                  })
                }
                placeholder="XP Amount"
              />
            ) : (
              <RewardSelector
                rewardType={formData.rewardType}
                value={formData.rewardValue}
                onChange={(value) =>
                  setFormData({ ...formData, rewardValue: value })
                }
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Appearance</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Icon</label>
            <EmojiPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Access Control</h3>

        <div className="form-group">
          <label>Required User Type</label>
          <select
            value={formData.requiredUserType || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                requiredUserType: e.target.value || null,
              })
            }
          >
            <option value="">All Users</option>
            <option value="free">Free Users Only</option>
            <option value="premium">Premium Users Only</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
            />
            Active (visible to users)
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={isValidating}>
          {isValidating ? "Validating..." : "Save Achievement"}
        </button>
      </div>
    </form>
  );
}
```

### Condition Builder Component

```typescript
// /src/components/achievements/admin/ConditionBuilder.tsx
export default function ConditionBuilder({
  conditionType,
  conditionField,
  conditionOperator,
  conditionValue,
  onChange,
}) {
  const statFields = [
    { value: "currentStreak", label: "Current Streak" },
    { value: "longestStreak", label: "Longest Streak" },
    { value: "drillsCompleted", label: "Drills Completed" },
    { value: "wordsSaved", label: "Words Saved" },
    { value: "sentencesRead", label: "Sentences Read" },
    { value: "storiesCompleted", label: "Stories Completed" },
    { value: "gamesPlayed", label: "Games Played" },
    { value: "totalXP", label: "Total XP" },
  ];

  const operators = [
    { value: ">=", label: "Greater than or equal to" },
    { value: ">", label: "Greater than" },
    { value: "==", label: "Equal to" },
    { value: "<", label: "Less than" },
    { value: "<=", label: "Less than or equal to" },
  ];

  return (
    <div className="condition-builder">
      <div className="condition-row">
        <span>When user's</span>

        <select
          value={conditionField}
          onChange={(e) => onChange({ conditionField: e.target.value })}
        >
          {statFields.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>

        <span>is</span>

        <select
          value={conditionOperator}
          onChange={(e) => onChange({ conditionOperator: e.target.value })}
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={conditionValue}
          onChange={(e) =>
            onChange({ conditionValue: parseInt(e.target.value) })
          }
          min="0"
          placeholder="Value"
        />
      </div>

      <div className="condition-preview">
        <strong>Preview:</strong>{" "}
        {generateConditionText(
          conditionField,
          conditionOperator,
          conditionValue
        )}
      </div>
    </div>
  );
}
```

## 3. Admin Hook Implementation

```typescript
// /src/hooks/useAchievementAdmin.ts
"use client";

import { useState, useEffect } from "react";
import { Achievement } from "@/lib/achievements/types";

export function useAchievementAdmin() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAchievements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/achievements");
      const data = await response.json();
      setAchievements(data.achievements);
    } catch (err) {
      setError("Failed to load achievements");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAchievements = async (updatedAchievements: Achievement[]) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          achievements: updatedAchievements,
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          updatedBy: "admin@doshisensei.com", // Get from auth context
        }),
      });

      if (response.ok) {
        setAchievements(updatedAchievements);
        // Trigger cache refresh for all users
        await fetch("/api/admin/achievements/refresh-cache", {
          method: "POST",
        });
      } else {
        throw new Error("Failed to save achievements");
      }
    } catch (err) {
      setError("Failed to save achievements");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const validateAchievement = async (achievement: Partial<Achievement>) => {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!achievement.title?.trim()) {
      errors.title = "Title is required";
    }

    if (!achievement.description?.trim()) {
      errors.description = "Description is required";
    }

    // Check for duplicate IDs
    const existingIds = achievements.map((a) => a.id);
    if (achievement.id && existingIds.includes(achievement.id)) {
      errors.id = "Achievement ID already exists";
    }

    // Validate condition
    if (achievement.conditionValue <= 0) {
      errors.conditionValue = "Condition value must be greater than 0";
    }

    // Validate reward
    if (
      achievement.rewardType === "xp" &&
      (!achievement.rewardValue || achievement.rewardValue <= 0)
    ) {
      errors.rewardValue = "XP reward must be greater than 0";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const previewAchievement = (achievement: Achievement, userStats: any) => {
    // Simulate achievement unlock condition
    const condition = createConditionFunction(achievement);
    return condition(userStats);
  };

  const duplicateAchievement = (achievement: Achievement) => {
    const duplicate = {
      ...achievement,
      id: `${achievement.id}_copy`,
      title: `${achievement.title} (Copy)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return duplicate;
  };

  const deleteAchievement = async (achievementId: string) => {
    const updatedAchievements = achievements.filter(
      (a) => a.id !== achievementId
    );
    await saveAchievements(updatedAchievements);
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  return {
    achievements,
    isLoading,
    error,
    loadAchievements,
    saveAchievements,
    validateAchievement,
    previewAchievement,
    duplicateAchievement,
    deleteAchievement,
  };
}
```

## 4. API Endpoints

### Achievement Management API

```typescript
// /src/app/api/admin/achievements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const ACHIEVEMENTS_FILE = path.join(
  process.cwd(),
  "data/achievements/dynamic-achievements.json"
);

export async function GET() {
  try {
    const fileContent = await readFile(ACHIEVEMENTS_FILE, "utf-8");
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    // Return default achievements if file doesn't exist
    return NextResponse.json({
      version: "1.0.0",
      achievements: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate admin permissions
    // const user = await getAuthenticatedUser(request);
    // if (!user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // Save to file
    await writeFile(ACHIEVEMENTS_FILE, JSON.stringify(data, null, 2));

    // Optionally save to Firebase for real-time updates
    // await saveToFirebase('admin/achievements', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save achievements" },
      { status: 500 }
    );
  }
}
```

### Cache Refresh API

```typescript
// /src/app/api/admin/achievements/refresh-cache/route.ts
export async function POST() {
  try {
    // Clear server-side cache
    // Trigger client-side cache refresh
    // Notify all connected clients via WebSocket/SSE if needed

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}
```

## 5. Dynamic Loading System

### Achievement Loader

```typescript
// /src/lib/achievements/loader.ts
export class AchievementLoader {
  private static cache: Achievement[] | null = null;
  private static lastLoaded: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async loadAllAchievements(): Promise<Achievement[]> {
    const now = Date.now();

    // Return cached version if still valid
    if (this.cache && now - this.lastLoaded < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Load dynamic achievements from file/API
      const dynamicResponse = await fetch("/api/admin/achievements");
      const dynamicData = await dynamicResponse.json();

      // Merge with default achievements
      const allAchievements = [
        ...DEFAULT_ACHIEVEMENTS,
        ...dynamicData.achievements.filter((a) => a.isActive),
      ];

      // Update cache
      this.cache = allAchievements;
      this.lastLoaded = now;

      return allAchievements;
    } catch (error) {
      console.error("Failed to load dynamic achievements:", error);
      // Fallback to default achievements
      return DEFAULT_ACHIEVEMENTS;
    }
  }

  static clearCache() {
    this.cache = null;
    this.lastLoaded = 0;
  }
}
```

## 6. Testing & Validation

### Achievement Testing Interface

```typescript
// /src/components/achievements/admin/AchievementTester.tsx
export default function AchievementTester({
  achievement,
}: {
  achievement: Achievement;
}) {
  const [testStats, setTestStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    drillsCompleted: 0,
    wordsSaved: 0,
    sentencesRead: 0,
    storiesCompleted: 0,
    gamesPlayed: 0,
    totalXP: 0,
  });

  const [testResult, setTestResult] = useState(null);

  const runTest = () => {
    const condition = createConditionFunction(achievement);
    const result = condition(testStats);
    setTestResult(result);
  };

  return (
    <div className="achievement-tester">
      <h4>Test Achievement Condition</h4>

      <div className="test-stats">
        {Object.entries(testStats).map(([key, value]) => (
          <div key={key} className="stat-input">
            <label>{key}</label>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                setTestStats({
                  ...testStats,
                  [key]: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
        ))}
      </div>

      <button onClick={runTest}>Test Condition</button>

      {testResult !== null && (
        <div className={`test-result ${testResult ? "success" : "failure"}`}>
          {testResult
            ? "✅ Achievement would unlock"
            : "❌ Achievement would not unlock"}
        </div>
      )}
    </div>
  );
}
```

## 7. Deployment Integration

### Build-Time Validation

```typescript
// /scripts/validate-achievements.js
const fs = require("fs");
const path = require("path");

function validateAchievements() {
  const achievementsFile = path.join(
    __dirname,
    "../data/achievements/dynamic-achievements.json"
  );

  if (!fs.existsSync(achievementsFile)) {
    console.log("No dynamic achievements file found, skipping validation");
    return;
  }

  const data = JSON.parse(fs.readFileSync(achievementsFile, "utf-8"));
  const achievements = data.achievements;

  // Validate each achievement
  achievements.forEach((achievement) => {
    // Check required fields
    if (!achievement.id || !achievement.title || !achievement.description) {
      throw new Error(`Invalid achievement: ${achievement.id || "unknown"}`);
    }

    // Validate condition
    if (
      !achievement.conditionField ||
      !achievement.conditionOperator ||
      achievement.conditionValue === undefined
    ) {
      throw new Error(`Invalid condition for achievement: ${achievement.id}`);
    }

    // Validate reward
    if (!achievement.rewardType || !achievement.rewardValue) {
      throw new Error(`Invalid reward for achievement: ${achievement.id}`);
    }
  });

  console.log(`✅ Validated ${achievements.length} dynamic achievements`);
}

validateAchievements();
```

This admin management system provides:

1. **File-based storage** similar to your snake path approach
2. **Real-time editing** with immediate preview
3. **Validation and testing** tools
4. **Deployment integration** with build-time validation
5. **Cache management** for performance
6. **User-friendly interface** for non-technical admins

The system allows you to add new achievements, modify existing ones, test conditions, and deploy changes without touching the codebase - exactly like your snake path system!

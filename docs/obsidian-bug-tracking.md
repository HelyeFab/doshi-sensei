# Obsidian Bug Tracking Integration

## Overview
This system captures bug reports from your Doshi Sensei app and syncs them with your Obsidian vault for organized tracking and resolution.

## Features
- ✅ Automatic capture of bug reports to Firestore
- ✅ Admin dashboard for managing bug status
- ✅ Export to Obsidian-formatted markdown
- ✅ Priority and status tracking
- ✅ Technical details capture (URL, user agent, etc.)

## Setup Guide

### Step 1: Install Obsidian Plugins

#### Option A: Using Obsidian Local REST API (Recommended)
1. Install "Local REST API" plugin from Obsidian Community Plugins
2. Enable the plugin and configure:
   - Default port: 27123
   - Enable CORS
   - Set authentication token (optional but recommended)

#### Option B: Manual Import
- Simply use the "Export to Obsidian" button in the admin dashboard
- Import the downloaded markdown files to your vault

### Step 2: Configure Your Vault Structure

Create this folder structure in your Obsidian vault:
```
📁 Bug Tracking/
  📁 New/
  📁 In Progress/
  📁 Fixed/
  📁 Archive/
  📄 Bug Dashboard.md
```

### Step 3: Create Bug Dashboard Template

Create `Bug Dashboard.md` with this content:

```markdown
# Bug Tracking Dashboard

## 🆕 New Bugs
```dataview
table status, priority, user, date
from "Bug Tracking/New"
sort date desc
```

## 🔧 In Progress
```dataview
table status, priority, assignee, date
from "Bug Tracking/In Progress"
sort priority desc
```

## ✅ Recently Fixed
```dataview
table fixed-date, priority, user
from "Bug Tracking/Fixed"
where date >= date(today) - dur(7 days)
sort fixed-date desc
```

## 📊 Statistics
- Total Bugs: `$= dv.pages('"Bug Tracking"').length`
- New This Week: `$= dv.pages('"Bug Tracking/New"').where(p => p.date >= dv.date('today') - dv.duration('7 days')).length`
- Critical Priority: `$= dv.pages('"Bug Tracking"').where(p => p.priority == 'critical').length`
```

### Step 4: Set Up Auto-Sync (Advanced)

Create a script to auto-sync with your Firebase:

```javascript
// obsidian-sync.js
const API_URL = 'http://localhost:27123';
const VAULT_PATH = 'Bug Tracking';

async function syncBugs() {
  // Fetch from your app's API endpoint
  const response = await fetch('https://your-app.com/api/admin/bugs/export');
  const bugs = await response.json();
  
  for (const bug of bugs) {
    const path = `${VAULT_PATH}/${bug.status}/${bug.id}.md`;
    
    // Create/update note via REST API
    await fetch(`${API_URL}/vault/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/markdown',
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: bug.markdown
    });
  }
}

// Run every 5 minutes
setInterval(syncBugs, 5 * 60 * 1000);
```

## Using the System

### From User Side
1. Users submit bug reports via `/contact?category=bug`
2. Reports are saved to both Netlify (email) and Firestore

### From Admin Side
1. Visit `/admin/bugs` to see all reports
2. Update status and priority as needed
3. Click "Export to Obsidian" to download markdown files
4. Import to your Obsidian vault

### In Obsidian
1. Review bugs in your vault
2. Add notes, tasks, and links
3. Track resolution progress
4. Archive completed bugs

## Bug Report Format

Each bug is exported as a markdown file with:
- YAML frontmatter for metadata
- Sections for description, reporter info, technical details
- Task checkboxes for action items
- Admin notes section
- Tags for easy filtering

## API Endpoints (Future Enhancement)

We can add these endpoints for direct Obsidian integration:

```typescript
// GET /api/admin/bugs - List all bugs
// GET /api/admin/bugs/:id - Get single bug
// POST /api/admin/bugs/:id/sync - Mark as synced
// GET /api/admin/bugs/export - Export all unsynced
```

## Automation Ideas

### GitHub Issues Integration
```yaml
# .github/workflows/sync-bugs.yml
name: Sync Bugs to GitHub Issues
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Sync Firebase Bugs to Issues
        run: |
          # Script to create GitHub issues from Firebase
```

### Slack Notifications
```javascript
// When new critical bug arrives
if (bug.priority === 'critical') {
  await sendSlackNotification({
    channel: '#bugs',
    text: `🚨 Critical Bug: ${bug.title}`,
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'User', value: bug.userEmail },
        { title: 'URL', value: bug.url }
      ]
    }]
  });
}
```

## Benefits

1. **Never Lose a Bug Report**: Everything is captured in Firestore
2. **Work Offline**: Bugs in your Obsidian vault are available offline
3. **Rich Linking**: Connect bugs to notes, projects, and documentation
4. **Visual Tracking**: Use Obsidian's graph view to see bug relationships
5. **Custom Workflows**: Build your own bug tracking workflow in Obsidian

## Security Notes

- Bug reports may contain sensitive user data
- Keep your Obsidian vault encrypted if it contains user emails
- Use authentication tokens for REST API access
- Consider data retention policies for old bug reports

## Next Steps

1. Deploy the Firestore indexes: `firebase deploy --only firestore:indexes`
2. Test the bug submission flow
3. Set up your Obsidian vault structure
4. Start tracking and fixing bugs efficiently!
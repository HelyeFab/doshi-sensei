#!/bin/bash

# Fix generic title="Navigation" in SmartNavigationLink components

# Fix not-found page
sed -i 's/title="Navigation"/title={common.home || "Home"}/' src/app/not-found.tsx

# Fix resources pages
sed -i 's/title="Navigation"/title={strings.resources.backToResources || "Back to Resources"}/' src/app/resources/\[slug\]/page.tsx
sed -i 's/title="Navigation"/title={post.title}/' src/app/resources/page.tsx

# Fix read page
sed -i 's/title="Navigation"/title={option.title}/' src/app/read/page.tsx

# Fix account page
sed -i 's/title="Navigation"/title={strings.admin.dashboard || "Admin Dashboard"}/' src/app/account/page.tsx

# Fix admin pages
sed -i 's/title="Navigation"/title={strings.admin.newMoodBoard || "New Mood Board"}/' src/app/admin/mood-boards/page.tsx
sed -i 's/title="Navigation"/title={strings.admin.viewDetails || "View Details"}/' src/app/admin/analytics/page.tsx

# Fix components
sed -i 's/title="Navigation"/title={achievement.name}/' src/components/achievements/UserAchievements.tsx
sed -i 's/title="Navigation"/title={`${strings.admin.edit} ${board.title}`}/' src/components/admin/MoodBoardManager.tsx
sed -i 's/title="Navigation"/title={strings.admin.backHome || "Back to Home"}/' src/components/admin/AdminGuard.tsx
sed -i 's/title="Navigation"/title={backLabel || "Back"}/' src/components/PageHeader.tsx
sed -i 's/title="Navigation"/title={preservedTitle || "Previous Page"}/' src/components/navigation/NavigationLink.tsx
sed -i 's/title="Navigation"/title={strings.account.viewProfile || "View Profile"}/' src/components/UserAvatar.tsx
sed -i 's/title="Navigation"/title={preservedTitle || "Previous Page"}/' src/components/StandardPageHeader.tsx

echo "Fixed generic navigation titles"
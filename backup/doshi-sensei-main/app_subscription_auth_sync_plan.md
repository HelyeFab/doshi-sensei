# 🧪 MVP Feature Expansion: Auth, Subscription & Cloud Sync

This document outlines a multi-phase plan to implement **authentication**, **subscription tiers**, and **cloud sync** for a Japanese conjugation learning app.

---

## ⚙️ PHASE 1 — Authentication System

### Goals
- Enable Google and email/password login
- Store login state
- Associate user data to a unique UID

### Tasks
1. **Use Firebase Authentication**
   - Enable Google and Email/Password sign-in
   - Store `uid`, email, and display name

2. **Create Login UI**
   - Google login button
   - Email/password login and registration
   - Secure logout in settings

3. **Session Handling**
   - Check login state on app launch
   - Use `uid` for identifying user data

---

## ⚙️ PHASE 2 — Subscription Tiers

### Goals
- Add Monthly and Yearly paid plans
- Free users are limited in usage
- Paid users unlock sync and full access

### Tasks
1. **Use Stripe + Firebase**
   - Setup Stripe products/plans
   - Use Firebase Extension for subscriptions

2. **Subscription Data Model**
   ```json
   users/{uid}/subscription: {
     status: "active",
     plan: "monthly",
     renewalDate: "..."
   }
   ```

3. **Settings Page**
   - Show current plan
   - Show billing portal link
   - Upgrade prompt for free users

4. **Usage Limits**
   - Free: 3 lists max, 3 drills/day
   - Paid: unlimited, with sync

---

## ⚙️ PHASE 3 — Cloud Sync (Paid Users Only)

### Goals
- Sync vocab lists, settings, and progress
- Only for subscribed users

### Tasks
1. **Use Firestore**
   - Store under `users/{uid}/lists`, `progress`, `settings`

2. **Sync Logic**
   - Sync on login, on app open, and on change
   - No sync for free users

3. **Conflict Handling**
   - Merge or overwrite logic if necessary

---

## ⚙️ PHASE 4 — Enforcing Free Tier Limits

### Tasks
1. **Track Usage Locally**
   - Number of lists
   - Drills completed (reset daily)

2. **Block Further Actions**
   - If limit reached, show upgrade message

3. **UI Messaging**
   - e.g. “You’ve reached your daily drill limit (3/3)”
   - Prompt to upgrade

---

## ⚙️ PHASE 5 — Settings Page Updates

### New Sections
- **Account**: Login info, logout
- **Subscription**: Plan info, billing, renewal date
- **Limits**: Display usage
- **Sync**: Toggle (active only for subscribed)

---

## 🔐 Notes

- Sync logic should be gated by `subscription.status === 'active'`
- Avoid storing critical data without login if syncing is required

---

## ✅ Optional Enhancements

- Background sync retries
- Offline mode fallback
- Show sync status / last synced time

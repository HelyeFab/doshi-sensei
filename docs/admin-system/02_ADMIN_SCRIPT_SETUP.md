# 🛠️ Admin Script Setup Guide

## Premium User Upgrade Script

This guide shows how to set up and use the admin script to grant premium access to any email address.

---

## 🚀 Setup Instructions

### 1. **Firebase Service Account (Recommended)**

**Option A: Service Account Key (Most Secure)**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Settings ⚙️ → Service Accounts
3. Click "Generate new private key"
4. Save the JSON file as `firebase-service-account.json` in the project root
5. **⚠️ Keep this file secret! Add it to .gitignore**

**Option B: Environment Variables (Alternative)**
```bash
export FIREBASE_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### 2. **Make Script Executable**
```bash
chmod +x scripts/upgrade-user-premium.js
```

### 3. **Install Dependencies** ✅
```bash
npm install firebase-admin  # Already installed!
```

---

## 🎯 Usage

### **Run the Script**
```bash
node scripts/upgrade-user-premium.js
```

### **Interactive Prompts**
```
🚀 Doshi Sensei - Premium User Upgrade Script
============================================

📧 Enter email address to upgrade: user@example.com

⚠️  You are about to:
   • Upgrade user@example.com to Premium Yearly
   • Grant unlimited lists and drills
   • Enable cloud sync
   • Set expiration to exactly 1 year from now

❓ Continue? (y/N): y

🔄 Processing upgrade...
🎉 SUCCESS! User upgraded to Premium Yearly!
```

---

## ✨ What This Script Does

### **Grants Premium Access:**
- ✅ **Plan**: Yearly Premium (expires in exactly 1 year)
- ✅ **Status**: Active subscription
- ✅ **Lists**: Unlimited vocabulary lists
- ✅ **Drills**: Unlimited daily drills
- ✅ **Cloud Sync**: Full cross-device synchronization

### **Firebase Document Update:**
```javascript
users/{uid}/subscription: {
  subscription: {
    status: "active",
    plan: "yearly",
    renewalDate: "2026-06-17T...",
    stripeSubscriptionId: "admin_granted_1750177...",
    grantedBy: "admin_script"
  },
  limits: {
    maxLists: -1,        // Unlimited
    maxDrillsPerDay: -1, // Unlimited
    canSync: true        // Cloud sync enabled
  }
}
```

---

## 🔧 Troubleshooting

### **Common Issues:**

**"User not found"**
- Make sure the user has created an account first
- Check email spelling

**"Permission denied"**
- Verify Firebase service account permissions
- Check project ID in script

**"Module not found"**
- Run `npm install firebase-admin`
- Check Node.js version (>= 14)

---

## 🔐 Security Notes

- ⚠️ **Never commit `firebase-service-account.json`** to version control
- 🔒 Only run this script in development/testing environments
- 👥 Limit access to this script to administrators only
- 📝 Consider logging all premium grants for audit purposes

---

## 🧪 Testing Premium Features

After upgrading a user:

1. **Login** with the upgraded email
2. **Create vocabulary lists** → Should be unlimited
3. **Run drills** → Should be unlimited
4. **Check account page** → Should show "Yearly Premium"
5. **Test cloud sync** → Lists should sync across devices

---

## 🚀 Example Usage

```bash
$ node scripts/upgrade-user-premium.js

📧 Enter email address to upgrade: admin@doshisensei.com
❓ Continue? (y/N): y

✅ Found user: Admin User (WawMEtfq0dcoVPMr3nuwpFAzr9F2)
🎉 SUCCESS! User upgraded to Premium Yearly!
📅 Subscription Details:
   📧 Email: admin@doshisensei.com
   🎯 Plan: Yearly Premium
   ⏰ Expires: 6/17/2026
   🔄 Cloud Sync: Enabled
   📝 Lists: Unlimited
   💪 Drills: Unlimited
```

**Ready to test premium features!** 🎯

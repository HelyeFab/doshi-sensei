import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';

export interface BugReport {
  id: string;
  // User submitted data
  category: 'bug' | 'feedback' | 'feature' | 'support';
  title: string;
  description: string;
  userEmail: string;
  userName: string;
  
  // Automatically captured data
  url?: string;
  userAgent?: string;
  viewport?: string;
  timestamp: Timestamp;
  
  // Admin management fields
  status: 'new' | 'investigating' | 'in-progress' | 'fixed' | 'wont-fix' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  tags: string[];
  
  // Notes and updates
  adminNotes: AdminNote[];
  
  // Obsidian sync
  obsidianId?: string;
  obsidianSynced: boolean;
  obsidianLastSync?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminNote {
  id: string;
  note: string;
  author: string;
  timestamp: Timestamp;
}

export class BugTrackingService {
  private static instance: BugTrackingService;
  private readonly collectionName = 'bugReports';

  private constructor() {}

  public static getInstance(): BugTrackingService {
    if (!BugTrackingService.instance) {
      BugTrackingService.instance = new BugTrackingService();
    }
    return BugTrackingService.instance;
  }

  /**
   * Create a new bug report from contact form submission
   */
  async createBugReport(data: {
    category: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    url?: string;
    userAgent?: string;
  }): Promise<string> {
    try {
      // Generate a readable ID
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reportId = `${data.category.toUpperCase()}_${timestamp}_${randomSuffix}`;

      const bugReport: BugReport = {
        id: reportId,
        category: data.category as BugReport['category'],
        title: data.subject || `${data.category} report from ${data.name}`,
        description: data.message,
        userEmail: data.email,
        userName: data.name,
        url: data.url || window.location.href,
        userAgent: data.userAgent || navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: Timestamp.now(),
        status: 'new',
        priority: data.category === 'bug' ? 'medium' : 'low',
        tags: [data.category],
        adminNotes: [],
        obsidianSynced: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, this.collectionName, reportId), bugReport);
      
      console.log('Bug report created:', reportId);
      return reportId;
    } catch (error) {
      console.error('Error creating bug report:', error);
      throw error;
    }
  }

  /**
   * Get all bug reports for admin dashboard
   */
  async getBugReports(filters?: {
    status?: BugReport['status'];
    priority?: BugReport['priority'];
    category?: BugReport['category'];
    limit?: number;
  }): Promise<BugReport[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }
      if (filters?.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as BugReport);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      return [];
    }
  }

  /**
   * Get a single bug report
   */
  async getBugReport(id: string): Promise<BugReport | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as BugReport;
      }
      return null;
    } catch (error) {
      console.error('Error fetching bug report:', error);
      return null;
    }
  }

  /**
   * Update bug report status or priority
   */
  async updateBugReport(
    id: string, 
    updates: Partial<Pick<BugReport, 'status' | 'priority' | 'assignee' | 'tags'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating bug report:', error);
      throw error;
    }
  }

  /**
   * Add an admin note to a bug report
   */
  async addAdminNote(bugId: string, note: string, author: string): Promise<void> {
    try {
      const bugReport = await this.getBugReport(bugId);
      if (!bugReport) throw new Error('Bug report not found');

      const newNote: AdminNote = {
        id: `note_${Date.now()}`,
        note,
        author,
        timestamp: Timestamp.now()
      };

      await updateDoc(doc(db, this.collectionName, bugId), {
        adminNotes: [...bugReport.adminNotes, newNote],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding admin note:', error);
      throw error;
    }
  }

  /**
   * Export bug report as Obsidian-compatible markdown
   */
  exportToObsidianMarkdown(bug: BugReport): string {
    const date = bug.timestamp.toDate().toISOString().split('T')[0];
    const tags = bug.tags.map(tag => `#${tag}`).join(' ');
    
    let markdown = `---
id: ${bug.id}
tags: [bug-report, ${bug.category}, ${bug.priority}-priority, ${bug.status}]
status: ${bug.status}
priority: ${bug.priority}
reported: ${date}
user: ${bug.userEmail}
aliases: ["${bug.title}"]
---

# ${bug.title}

## 📝 Description
${bug.description}

## 👤 Reporter Information
- **Name**: ${bug.userName}
- **Email**: ${bug.userEmail}
- **Date**: ${date}

## 🔍 Technical Details
- **URL**: ${bug.url || 'Not specified'}
- **User Agent**: \`${bug.userAgent || 'Not captured'}\`
- **Viewport**: ${bug.viewport || 'Not captured'}

## 📊 Status
- **Current Status**: ${bug.status}
- **Priority**: ${bug.priority}
- **Assigned To**: ${bug.assignee || 'Unassigned'}

## 📝 Admin Notes
${bug.adminNotes.length > 0 
  ? bug.adminNotes.map(note => `
### ${note.timestamp.toDate().toLocaleDateString()} - ${note.author}
${note.note}
`).join('\n')
  : '_No notes yet_'
}

## ✅ Action Items
- [ ] Reproduce the issue
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Test fix
- [ ] Deploy to production
- [ ] Notify user

## 🏷️ Tags
${tags}

---
*Last updated: ${bug.updatedAt.toDate().toISOString()}*`;

    return markdown;
  }

  /**
   * Mark bug as synced with Obsidian
   */
  async markAsObsidianSynced(bugId: string, obsidianId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, bugId), {
        obsidianId,
        obsidianSynced: true,
        obsidianLastSync: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking as synced:', error);
      throw error;
    }
  }

  /**
   * Get bugs that need Obsidian sync
   */
  async getUnsyncedBugs(): Promise<BugReport[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('obsidianSynced', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as BugReport);
    } catch (error) {
      console.error('Error fetching unsynced bugs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const bugTracker = BugTrackingService.getInstance();
/**
 * Debug helpers for stats loading system
 */

export interface DebugReport {
  timestamp: string;
  localStorageData: any;
  statsManagerState: any;
  loadSequence: string[];
  issues: string[];
  recommendations: string[];
}

export class StatsDebugger {
  private static events: Array<{
    timestamp: string;
    type: string;
    source: string;
    data?: any;
  }> = [];

  static logEvent(type: string, source: string, data?: any) {
    this.events.push({
      timestamp: new Date().toISOString(),
      type,
      source,
      data
    });
  }

  static generateReport(): DebugReport {
    const report: DebugReport = {
      timestamp: new Date().toISOString(),
      localStorageData: this.getLocalStorageData(),
      statsManagerState: this.getStatsManagerState(),
      loadSequence: this.getLoadSequence(),
      issues: this.detectIssues(),
      recommendations: this.getRecommendations()
    };

    return report;
  }

  private static getLocalStorageData() {
    if (typeof window === 'undefined') return null;
    
    const statsKey = 'doshi_sensei_user_stats';
    const sessionsKey = 'doshi_sensei_drill_sessions';
    
    return {
      stats: localStorage.getItem(statsKey) ? JSON.parse(localStorage.getItem(statsKey)!) : null,
      sessions: localStorage.getItem(sessionsKey) ? JSON.parse(localStorage.getItem(sessionsKey)!) : null,
      allKeys: Object.keys(localStorage).filter(key => key.includes('doshi'))
    };
  }

  private static getStatsManagerState() {
    // This would need to be exposed from StatsManager
    return {
      eventsCount: this.events.length,
      lastEvent: this.events[this.events.length - 1] || null
    };
  }

  private static getLoadSequence(): string[] {
    return this.events.map(e => 
      `${e.timestamp} - ${e.source}: ${e.type}`
    );
  }

  private static detectIssues(): string[] {
    const issues: string[] = [];
    
    // Check for rapid consecutive loads
    const loadEvents = this.events.filter(e => e.type === 'load');
    for (let i = 1; i < loadEvents.length; i++) {
      const timeDiff = new Date(loadEvents[i].timestamp).getTime() - 
                       new Date(loadEvents[i-1].timestamp).getTime();
      if (timeDiff < 100) {
        issues.push(`Rapid consecutive loads detected: ${timeDiff}ms apart`);
      }
    }
    
    // Check for cloud sync failures
    const syncErrors = this.events.filter(e => e.type === 'error' && e.source.includes('cloud'));
    if (syncErrors.length > 0) {
      issues.push(`Cloud sync errors: ${syncErrors.length}`);
    }
    
    // Check for data inconsistencies
    const dataEvents = this.events.filter(e => e.data);
    for (let i = 1; i < dataEvents.length; i++) {
      if (dataEvents[i].data?.drillsCompleted < dataEvents[i-1].data?.drillsCompleted) {
        issues.push('Data regression detected: drillsCompleted decreased');
      }
    }
    
    return issues;
  }

  private static getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.detectIssues().some(issue => issue.includes('Rapid consecutive'))) {
      recommendations.push('Consider debouncing stats loading');
    }
    
    if (this.detectIssues().some(issue => issue.includes('Cloud sync errors'))) {
      recommendations.push('Check Firebase permissions and network connectivity');
    }
    
    if (this.events.filter(e => e.source === 'MobileHome').length > 0 &&
        this.events.filter(e => e.source === 'HomePage').length > 0) {
      recommendations.push('Multiple components loading stats simultaneously - consider shared state');
    }
    
    return recommendations;
  }

  static clearEvents() {
    this.events = [];
  }

  static exportDebugData() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-debug-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Console helper for quick debugging
if (typeof window !== 'undefined') {
  (window as any).statsDebugger = StatsDebugger;
  console.log('📊 Stats debugger available. Use window.statsDebugger.generateReport() or window.statsDebugger.exportDebugData()');
}
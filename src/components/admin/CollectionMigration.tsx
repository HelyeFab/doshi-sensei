'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { runMigration, verifyMigration } from '@/scripts/migrateObsoleteCollections';

interface MigrationStatus {
  isRunning: boolean;
  isComplete: boolean;
  results?: {
    success: boolean;
    results: Array<{
      collection: string;
      total: number;
      migrated: number;
      failed: number;
      errors: string[];
    }>;
    summary: string;
  };
  error?: string;
}

interface VerificationResult {
  storyProgress: { old: number; new: number; match: boolean };
}

export default function CollectionMigration() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isRunning: false,
    isComplete: false
  });
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleMigration = async () => {
    if (!confirm('Are you sure you want to run the migration? This will copy data from old collections to new ones.')) {
      return;
    }

    setMigrationStatus({ isRunning: true, isComplete: false });

    try {
      const result = await runMigration();
      setMigrationStatus({
        isRunning: false,
        isComplete: true,
        results: result
      });
    } catch (error) {
      setMigrationStatus({
        isRunning: false,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleVerification = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyMigration();
      setVerificationResult(result);
    } catch (error) {
      alert(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Migration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Collection Migration Tool
            <Badge variant="outline" className="ml-2">One-time Operation</Badge>
          </CardTitle>
          <CardDescription>
            Migrate data from obsolete collections to new optimized collections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">📊</div>
                <h4 className="font-semibold">Analytics Migration</h4>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">From:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">analytics</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">To:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">site-analytics</code>
                </div>
                <Badge variant="secondary" className="mt-2 text-xs">Already handled by new system</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">📖</div>
                <h4 className="font-semibold">Story Progress Migration</h4>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">From:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">storyProgress</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">To:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">reading_progress</code>
                </div>
                <Badge variant="default" className="mt-2 text-xs">Ready to migrate</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">📝</div>
                <h4 className="font-semibold">Scraping Logs</h4>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Collection:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">scraping_logs</code>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">Manual deletion if not needed</Badge>
              </div>
            </div>
          </div>

          {/* Migration Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleMigration}
              disabled={migrationStatus.isRunning || migrationStatus.isComplete}
              className="flex items-center gap-2"
            >
              {migrationStatus.isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Migration...
                </>
              ) : migrationStatus.isComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Migration Complete
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Run Migration
                </>
              )}
            </Button>

            <Button
              onClick={handleVerification}
              variant="outline"
              disabled={isVerifying}
              className="flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify Migration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Results */}
      {migrationStatus.results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Migration Results
              {migrationStatus.results.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {migrationStatus.results.results.map((result, idx) => (
              <div key={idx} className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{result.collection}</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">Total: {result.total}</Badge>
                    <Badge variant="default">Migrated: {result.migrated}</Badge>
                    {result.failed > 0 && (
                      <Badge variant="destructive">Failed: {result.failed}</Badge>
                    )}
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
                    <ul className="text-xs space-y-1">
                      {result.errors.slice(0, 5).map((error, i) => (
                        <li key={i} className="text-muted-foreground">• {error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-muted-foreground">• ... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Summary</h4>
                  <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
                    {migrationStatus.results.summary}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Error */}
      {migrationStatus.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive mb-1">Migration Failed</h4>
              <div className="text-sm text-destructive/90">
                {migrationStatus.error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Results */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-semibold">Story Progress</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Old collection: {verificationResult.storyProgress.old} documents
                  </p>
                  <p className="text-sm text-muted-foreground">
                    New collection: {verificationResult.storyProgress.new} documents
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {verificationResult.storyProgress.match ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">Match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-600">Mismatch</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Post-Migration Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Run the migration using the button above</li>
            <li>Verify the migration completed successfully</li>
            <li>Test the application to ensure all features work correctly</li>
            <li>Once confirmed, the following collections can be deleted from Firebase Console:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">analytics</code> - replaced by site-analytics</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">storyProgress</code> - replaced by reading_progress</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">scraping_logs</code> - if article scraping is no longer needed</li>
              </ul>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
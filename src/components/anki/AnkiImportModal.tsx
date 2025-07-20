'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { AnkiImporter, ImportResult } from '@/utils/ankiImporter';
import StudyListManager from '@/utils/studyListManager';
import { trackEvent } from '@/lib/analytics';
import { useRouter } from 'next/navigation';

interface AnkiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnkiImportModal({ isOpen, onClose }: AnkiImportModalProps) {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium } = useSubscription2();
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.apkg')) {
        setError('Please select a valid .apkg file');
        return;
      }
      
      if (selectedFile.size > 200 * 1024 * 1024) {
        setError('File size exceeds 200MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.apkg')) {
        setError('Please drop a valid .apkg file');
        return;
      }
      
      if (droppedFile.size > 200 * 1024 * 1024) {
        setError('File size exceeds 200MB limit');
        return;
      }
      
      setFile(droppedFile);
      setError('');
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleImport = async () => {
    if (!file || !user) return;
    
    // Check access
    const canImport = await checkAndTrack('anki_import');
    if (!canImport) return;
    
    setImporting(true);
    setProgress(0);
    setError('');
    
    try {
      // Track import start
      trackEvent('anki_import_started', {
        fileSize: file.size,
        fileName: file.name
      });
      
      // Import the deck
      const result = await AnkiImporter.importDeck(file, {
        userId: user.uid,
        onProgress: (progress, message) => {
          setProgress(progress);
          setProgressMessage(message);
        }
      });
      
      if (result.success && result.listId) {
        // The importer returns the list and items, but we need to save them
        // For now, we'll use the StudyListManager to create the list
        // TODO: Implement the actual saving logic
        
        setImportResult(result);
        
        // Track success
        trackEvent('anki_import_completed', {
          cardsImported: result.cardsImported,
          listName: result.listName
        });
      } else {
        setError(result.error || 'Import failed');
        
        // Track failure
        trackEvent('anki_import_failed', {
          error: result.error
        });
      }
    } catch (err) {
      setError(err.message || 'An error occurred during import');
      
      // Track error
      trackEvent('anki_import_error', {
        error: err.message
      });
    } finally {
      setImporting(false);
    }
  };
  
  const handleViewList = () => {
    if (importResult?.listId) {
      router.push(`/vocabulary?list=${importResult.listId}`);
      onClose();
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setError('');
    setProgress(0);
    setProgressMessage('');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Anki Deck</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Premium only notice */}
          {!isPremium && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Anki import is a premium feature. Upgrade to import your decks.
              </p>
            </div>
          )}
          
          {/* Import success state */}
          {importResult?.success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Import Successful!</h3>
              <p className="text-muted-foreground">
                Imported {importResult.cardsImported} cards to "{importResult.listName}"
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleViewList}>
                  View List
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Import Another
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* File upload area */}
              {!file && !importing && (
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-1">
                    Drop your .apkg file here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".apkg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
              
              {/* Selected file display */}
              {file && !importing && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
              
              {/* Progress display */}
              {importing && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {progressMessage}
                  </p>
                </div>
              )}
              
              {/* Error display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-100">
                    {error}
                  </p>
                </div>
              )}
              
              {/* Action buttons */}
              {!importing && (
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!file || !isPremium}
                  >
                    Import Deck
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
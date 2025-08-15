'use client';

import dynamic from 'next/dynamic';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { AnkiImporter, ImportResult } from '@/utils/ankiImporter';
import StudyListManager from '@/utils/studyListManager';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useRouter } from 'next/navigation';

interface AnkiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function AnkiImportModal({ isOpen, onClose, onImportSuccess }: AnkiImportModalProps) {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType, subscription } = useSubscription2();
  const { track } = useAnalytics();
  const router = useRouter();
  
  // Debug logging
  useEffect(() => {
    if (isOpen) {

    }
  }, [isOpen, isPremium, userType, subscription, user]);
  
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
    
    // Check list count for free users
    if (!isPremium) {
      try {
        const currentLists = await StudyListManager.getAllStudyLists();
        if (currentLists.length >= 3) {
          setError('Free users can only have up to 3 study lists. Please upgrade to premium for unlimited lists.');
          return;
        }
      } catch (err) {
        console.error('Failed to check list count:', err);
      }
    }
    
    setImporting(true);
    setProgress(0);
    setError('');
    
    try {
      // Track import start
      track('anki_import_started' as any, {
        fileSize: file.size,
        fileName: file.name
      });
      
      // Import the deck
      let result;
      try {
        result = await AnkiImporter.importDeck(file, {
          userId: user.uid,
          onProgress: (progress, message) => {
            setProgress(progress);
            setProgressMessage(message);
          }
        });
      } catch (importError: any) {
        console.error('Anki import error:', importError);
        // Provide more specific error messages
        if (importError.message?.includes('RootLayout')) {
          throw new Error('Failed to load Anki reader. Please refresh the page and try again.');
        }
        if (importError.message?.includes('storage/unauthorized')) {
          throw new Error('Storage access denied. Please ensure you are logged in and try again.');
        }
        if (importError.message?.includes('storage/unauthenticated')) {
          throw new Error('You must be logged in to import Anki decks.');
        }
        if (importError.message?.includes('Firebase Storage')) {
          throw new Error('Storage service error. Please try again later.');
        }
        if (importError.message?.includes('Failed to parse Anki file')) {
          throw new Error(importError.message);
        }
        if (importError.message?.includes('sql.js')) {
          throw new Error('Failed to initialize Anki reader. This may be due to browser compatibility. Please try using Chrome or Firefox.');
        }
        throw importError;
      }
      
      if (result.success && result.listId) {
        setImportResult(result);
        
        // Track success
        track('anki_import_completed' as any, {
          cardsImported: result.cardsImported,
          listName: result.listName
        });
        
        // Call success callback to refresh lists
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setError(result.error || 'Import failed');
        
        // Track failure
        track('anki_import_failed' as any, {
          error: result.error
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during import';
      setError(errorMessage);
      
      // Track error
      track('anki_import_error' as any, {
        error: errorMessage
      });
    } finally {
      setImporting(false);
    }
  };
  
  const handleViewList = () => {
    if (importResult?.listId) {
      // Close modal and refresh lists
      onClose();
      if (onImportSuccess) {
        onImportSuccess();
      }
      // Navigate to flashcard review with the imported list pre-selected
      // For now, just close the modal - the user can select the list from the dropdown
      // TODO: Add query param to pre-select the list in review mode
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setError('');
    setProgress(0);
    setProgressMessage('');
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">Import Anki Deck</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
          {/* Premium only notice */}
          {!isPremium && (
            <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <p className="text-sm text-foreground">
                Anki import is a premium feature. Upgrade to import your decks.
              </p>
            </div>
          )}
          
          {/* Import success state */}
          {importResult?.success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Import Successful!</h3>
              <p className="text-muted-foreground mb-2">
                Imported {importResult.cardsImported} cards to "{importResult.listName}"
              </p>
              <p className="text-sm text-muted-foreground">
                Your imported deck is now available in the "From Lists" review mode.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    // Call success callback first to ensure lists are refreshed
                    if (onImportSuccess) {
                      onImportSuccess();
                    }
                    // Small delay to ensure the list is saved before navigation
                    setTimeout(() => {
                      router.push('/favourites');
                      onClose();
                    }, 100);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  View in My Favourites
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Import Another
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File upload area */}
              {!file && !importing && (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-card-foreground mb-1">
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
                <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors text-foreground"
                  >
                    Remove
                  </button>
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
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <p className="text-sm text-foreground">
                    {error}
                  </p>
                </div>
              )}
              
              {/* Action buttons */}
              {!importing && (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!file || !isPremium}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Deck
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
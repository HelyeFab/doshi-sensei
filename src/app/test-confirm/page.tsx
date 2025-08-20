'use client';

import { useState } from 'react';
import { ConfirmDialog, useConfirmDialog } from '@/components/ConfirmDialog';

export default function TestConfirmPage() {
  const [directDialogOpen, setDirectDialogOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const { showDialog, DialogComponent } = useConfirmDialog();

  const handleDirectConfirm = () => {
    setLastAction('Direct dialog confirmed');
    setDirectDialogOpen(false);
  };

  const handleDirectCancel = () => {
    setLastAction('Direct dialog cancelled');
    setDirectDialogOpen(false);
  };

  const handleDeleteWord = () => {
    showDialog({
      title: 'Delete Word',
      message: 'Are you sure you want to delete this word from your study list? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Keep it',
      type: 'danger',
      onConfirm: () => {
        setLastAction('Word deleted');
      },
    });
  };

  const handleCloseWindow = () => {
    showDialog({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to close this window?',
      confirmText: 'Close anyway',
      cancelText: 'Continue editing',
      type: 'warning',
      onConfirm: () => {
        setLastAction('Window closed (changes discarded)');
      },
    });
  };

  const handleResetProgress = () => {
    showDialog({
      title: 'Reset Progress',
      message: 'This will reset all your learning progress for this lesson. Are you sure you want to continue?',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        setLastAction('Progress reset');
      },
    });
  };

  const handleSaveChanges = () => {
    showDialog({
      title: 'Save Changes',
      message: 'Do you want to save your changes before continuing?',
      confirmText: 'Save',
      cancelText: 'Discard',
      type: 'info',
      onConfirm: () => {
        setLastAction('Changes saved');
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-[var(--foreground)]">
          Confirm Dialog Test Page
        </h1>

        {/* Test Controls */}
        <div className="mb-8 rounded-lg bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-[var(--card-foreground)]">
            Test Different Scenarios
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Direct Usage Example */}
            <button
              onClick={() => setDirectDialogOpen(true)}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
            >
              Direct Component Usage
            </button>

            {/* Hook Usage Examples */}
            <button
              onClick={handleDeleteWord}
              className="rounded-md bg-[var(--destructive)] px-4 py-2 text-sm font-medium text-[var(--destructive-foreground)] transition-colors hover:opacity-90"
            >
              Delete Word (Danger)
            </button>

            <button
              onClick={handleCloseWindow}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:opacity-90"
            >
              Close Window (Warning)
            </button>

            <button
              onClick={handleResetProgress}
              className="rounded-md bg-[var(--destructive)] px-4 py-2 text-sm font-medium text-[var(--destructive-foreground)] transition-colors hover:opacity-90"
            >
              Reset Progress (Danger)
            </button>

            <button
              onClick={handleSaveChanges}
              className="rounded-md bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-[var(--secondary-foreground)] transition-colors hover:opacity-90"
            >
              Save Changes (Info)
            </button>
          </div>
        </div>

        {/* Last Action Display */}
        {lastAction && (
          <div className="mb-8 rounded-lg bg-[var(--muted)] p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Last action: <span className="font-medium">{lastAction}</span>
            </p>
          </div>
        )}

        {/* Feature List */}
        <div className="rounded-lg bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-[var(--card-foreground)]">
            Component Features
          </h2>
          <ul className="space-y-2 text-[var(--muted-foreground)]">
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Fully responsive (mobile-first design)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Uses app theme system (no hardcoded colors)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Smooth animations and transitions</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Keyboard navigation (ESC to close)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Portal rendering (always on top)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Backdrop click to close</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Custom hook for easy usage</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Configurable types (danger, warning, info)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Customizable button text</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-[var(--primary)]">✓</span>
              <span>Accessibility compliant (ARIA attributes)</span>
            </li>
          </ul>
        </div>

        {/* Usage Examples */}
        <div className="mt-8 rounded-lg bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-[var(--card-foreground)]">
            Usage Examples
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium text-[var(--card-foreground)]">
                Direct Component Usage:
              </h3>
              <pre className="overflow-x-auto rounded bg-[var(--muted)] p-3 text-xs">
                <code className="text-[var(--muted-foreground)]">{`<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirm}
  title="Delete Item"
  message="Are you sure?"
  type="danger"
/>`}</code>
              </pre>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-[var(--card-foreground)]">
                Using the Hook:
              </h3>
              <pre className="overflow-x-auto rounded bg-[var(--muted)] p-3 text-xs">
                <code className="text-[var(--muted-foreground)]">{`const { showDialog, DialogComponent } = useConfirmDialog();

// Show dialog
showDialog({
  title: 'Delete Word',
  message: 'Are you sure?',
  type: 'danger',
  onConfirm: () => console.log('Deleted!')
});

// Render component
<DialogComponent />`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Usage Dialog */}
      <ConfirmDialog
        isOpen={directDialogOpen}
        onClose={handleDirectCancel}
        onConfirm={handleDirectConfirm}
        title="Direct Component Example"
        message="This dialog is rendered using the ConfirmDialog component directly. Do you want to proceed?"
        confirmText="Yes, proceed"
        cancelText="No, go back"
        type="info"
      />

      {/* Hook Usage Dialog */}
      <DialogComponent />
    </div>
  );
}
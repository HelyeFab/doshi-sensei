import React from 'react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export default function ConfirmationDialog({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    isDestructive,
    onConfirm,
    onCancel,
    loading
}: ConfirmationDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90`}
                    >
                        {loading ? '⏳ Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

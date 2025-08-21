'use client';

import { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { AVATAR_OPTIONS } from '@/utils/avatarOptions';

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarSelect?: (avatar: string) => void;
}

export default function AvatarPicker({ isOpen, onClose, onAvatarSelect }: AvatarPickerProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to update avatar in Firestore
  async function handleAvatarSelect(img: string) {
    if (!user) return;
    setUpdatingAvatar(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { avatar: img });
      // The realtime listener in UserProfileContext will automatically update
      onClose();
      onAvatarSelect?.(img);
    } catch (error) {
      setErrorMessage('Failed to update avatar.');
    } finally {
      setUpdatingAvatar(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-2 relative">
        <button
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close avatar picker"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold mb-4 text-center">Choose your profile thumbnail</h3>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
          {AVATAR_OPTIONS.map((img) => (
            <button
              key={img}
              onClick={() => handleAvatarSelect(img)}
              className={`border-2 rounded-lg p-1 transition-all ${profile?.avatar === img ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-muted'} ${updatingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
              aria-label="Choose avatar"
              disabled={updatingAvatar}
            >
              <img src={img} alt="avatar option" className="w-12 h-12 object-contain" />
            </button>
          ))}
        </div>
        {updatingAvatar && <div className="mt-4 text-center text-sm text-muted-foreground">Updating...</div>}
        {errorMessage && (
          <div className="mt-4 text-center text-sm text-red-600">
            {errorMessage}
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
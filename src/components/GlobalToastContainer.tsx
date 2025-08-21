'use client';

import { ToastContainer, useToast } from '@/components/Toast';

export default function GlobalToastContainer() {
  const { toasts, removeToast } = useToast();
  
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}
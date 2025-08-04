'use client';

import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';

export default function NotFound() {
  const { errors, common } = useStrings();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {errors.pageNotFound}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {errors.pageNotFoundDescription}
        </p>
        <Link href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {common.goHome}
        </Link>
      </div>
    </div>
  );
}

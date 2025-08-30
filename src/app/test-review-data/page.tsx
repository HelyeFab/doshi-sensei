'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TestReviewData() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setError('Not logged in');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading data for user:', user.uid);
        
        const vocabRef = collection(db, 'users', user.uid, 'textbookVocabularyProgress');
        const q = query(
          vocabRef,
          where('nextReview', '<=', new Date().toISOString()),
          orderBy('nextReview'),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        console.log('Found items:', snapshot.size);
        
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setData(items);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test Review Hub Data</h1>
      
      <div className="mb-4">
        <p>User: {user?.uid || 'Not logged in'}</p>
        <p>Expected: WawMEtfq0dcoVPMr3nuwpFAzr9F2</p>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      {!loading && !error && (
        <div>
          <p className="mb-2">Found {data.length} items due for review</p>
          
          <div className="space-y-2">
            {data.map(item => (
              <div key={item.id} className="p-2 border rounded">
                <p><strong>{item.japanese}</strong> - {item.english}</p>
                <p className="text-sm text-gray-600">Reading: {item.reading}</p>
                <p className="text-sm text-gray-600">Next review: {item.nextReview}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
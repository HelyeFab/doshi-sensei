'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FileHandlerPage() {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleFile = async () => {
      try {
        // In a PWA file handler, the file is passed via the launchQueue API
        if ('launchQueue' in window) {
          (window as any).launchQueue.setConsumer(async (launchParams: any) => {
            if (launchParams.files && launchParams.files.length > 0) {
              const fileHandle = launchParams.files[0];
              const file = await fileHandle.getFile();
              await processFile(file);
            }
          });
        } else {
          // Fallback: Check if file was uploaded via form
          const params = new URLSearchParams(window.location.search);
          const fileData = params.get('file');
          if (fileData) {
            setFileContent(fileData);
            await processFileContent(fileData, 'uploaded.txt');
          }
        }
      } catch (err) {
        console.error('Error handling file:', err);
        setError('Failed to process file');
      } finally {
        setProcessing(false);
      }
    };

    handleFile();
  }, []);

  const processFile = async (file: File) => {
    setFileName(file.name);
    
    try {
      const text = await file.text();
      setFileContent(text);
      await processFileContent(text, file.name);
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const processFileContent = async (content: string, name: string) => {
    const extension = name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
        await processTxtFile(content);
        break;
      case 'csv':
        await processCsvFile(content);
        break;
      case 'json':
        await processJsonFile(content);
        break;
      default:
        setError('Unsupported file type');
    }
  };

  const processTxtFile = async (content: string) => {
    // Process plain text file - assume it's a vocabulary list
    const lines = content.split('\n').filter(line => line.trim());
    const vocabulary = [];
    
    for (const line of lines) {
      // Try to parse different formats:
      // Format 1: "word - meaning"
      // Format 2: "word\tmeaning"
      // Format 3: "word,meaning"
      let parts = line.split(/[-\t,]/).map(p => p.trim());
      
      if (parts.length >= 2) {
        vocabulary.push({
          japanese: parts[0],
          meaning: parts[1],
          reading: parts[2] || '',
          source: 'imported',
          importedAt: new Date().toISOString()
        });
      }
    }
    
    // Save to localStorage
    const existingVocab = JSON.parse(localStorage.getItem('imported_vocabulary') || '[]');
    const updatedVocab = [...existingVocab, ...vocabulary];
    localStorage.setItem('imported_vocabulary', JSON.stringify(updatedVocab));
    
    // Redirect to vocabulary page
    setTimeout(() => {
      router.push('/vocabulary?source=import&count=' + vocabulary.length);
    }, 2000);
  };

  const processCsvFile = async (content: string) => {
    // Parse CSV format
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase());
    const vocabulary = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: any = {};
      
      headers?.forEach((header, index) => {
        if (header.includes('japan') || header.includes('word')) {
          item.japanese = values[index];
        } else if (header.includes('mean') || header.includes('english')) {
          item.meaning = values[index];
        } else if (header.includes('read') || header.includes('hiragana')) {
          item.reading = values[index];
        }
      });
      
      if (item.japanese) {
        item.source = 'csv_import';
        item.importedAt = new Date().toISOString();
        vocabulary.push(item);
      }
    }
    
    // Save to localStorage
    const existingVocab = JSON.parse(localStorage.getItem('imported_vocabulary') || '[]');
    const updatedVocab = [...existingVocab, ...vocabulary];
    localStorage.setItem('imported_vocabulary', JSON.stringify(updatedVocab));
    
    setTimeout(() => {
      router.push('/vocabulary?source=csv&count=' + vocabulary.length);
    }, 2000);
  };

  const processJsonFile = async (content: string) => {
    try {
      const data = JSON.parse(content);
      let vocabulary = [];
      
      // Handle array of vocabulary items
      if (Array.isArray(data)) {
        vocabulary = data.map(item => ({
          japanese: item.japanese || item.word || item.kanji || '',
          meaning: item.meaning || item.english || item.translation || '',
          reading: item.reading || item.hiragana || item.kana || '',
          source: 'json_import',
          importedAt: new Date().toISOString()
        }));
      } else if (data.vocabulary || data.words) {
        // Handle wrapped vocabulary
        vocabulary = (data.vocabulary || data.words).map((item: any) => ({
          japanese: item.japanese || item.word || '',
          meaning: item.meaning || item.english || '',
          reading: item.reading || item.hiragana || '',
          source: 'json_import',
          importedAt: new Date().toISOString()
        }));
      }
      
      // Save to localStorage
      const existingVocab = JSON.parse(localStorage.getItem('imported_vocabulary') || '[]');
      const updatedVocab = [...existingVocab, ...vocabulary];
      localStorage.setItem('imported_vocabulary', JSON.stringify(updatedVocab));
      
      setTimeout(() => {
        router.push('/vocabulary?source=json&count=' + vocabulary.length);
      }, 2000);
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing file...</h2>
            {fileName && (
              <p className="mt-2 text-sm text-gray-600">Reading: {fileName}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">File Imported!</h2>
          {fileName && (
            <p className="mt-2 text-sm text-gray-600">Successfully processed: {fileName}</p>
          )}
          <p className="mt-4 text-xs text-gray-500">Redirecting to vocabulary...</p>
        </div>
      </div>
    </div>
  );
}
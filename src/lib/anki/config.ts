/**
 * Configuration for anki-reader in browser environment
 * 
 * The anki-reader library uses sql.js to read SQLite databases in the browser.
 * We need to configure the WASM file location for it to work properly.
 */

import initSqlJs from 'sql.js';

let sqlInitialized = false;
let SQL: any = null;

/**
 * Initialize sql.js for anki-reader
 */
export async function initializeAnkiReader() {
  if (sqlInitialized) {
    return SQL;
  }

  try {
    // Initialize sql.js with CDN-hosted WASM file
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        // Use CDN for the WASM file
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
      }
    });

    sqlInitialized = true;
    
    // Set global SQL for anki-reader to use
    if (typeof window !== 'undefined') {
      (window as any).SQL = SQL;
    }

    return SQL;
  } catch (error) {
    console.error('Failed to initialize sql.js for anki-reader:', error);
    throw new Error('Failed to initialize Anki reader. Please try again.');
  }
}

/**
 * Check if anki-reader is initialized
 */
export function isAnkiReaderInitialized(): boolean {
  return sqlInitialized;
}
'use client';

import { useState } from 'react';
import BookmarkSystemTester from '@/utils/testBookmarkSystem';
import { BookmarkDebugger } from '@/utils/debugBookmarks';
import { useAuth } from '@/contexts/AuthContext';

export default function TestBookmarksPage() {
    const [testResults, setTestResults] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const { user } = useAuth();

    const addLog = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const runAllTests = async () => {
        setIsRunning(true);
        setTestResults([]);

        // Override console.log to capture test output
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog(...args);
            addLog(args.join(' '));
        };

        try {
            await BookmarkSystemTester.runAllTests();
        } catch (error) {
            addLog(`❌ Test failed: ${error}`);
        } finally {
            console.log = originalLog;
            setIsRunning(false);
        }
    };

    const runIndividualTest = async (testName: string, testFunction: () => Promise<void>) => {
        setIsRunning(true);
        setTestResults([]);

        const originalLog = console.log;
        console.log = (...args) => {
            originalLog(...args);
            addLog(args.join(' '));
        };

        try {
            await testFunction();
        } catch (error) {
            addLog(`❌ ${testName} failed: ${error}`);
        } finally {
            console.log = originalLog;
            setIsRunning(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">🧪 Bookmark System Test Page</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Test Controls</h2>

                    <div className="space-y-3">
                        <button
                            onClick={runAllTests}
                            disabled={isRunning}
                            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isRunning ? 'Running Tests...' : 'Run All Tests'}
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Article Bookmark Creation', () => BookmarkSystemTester.testArticleBookmarkCreation(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                        >
                            Test Article Bookmarks
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Story Bookmark Creation', () => BookmarkSystemTester.testStoryBookmarkCreation(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                        >
                            Test Story Bookmarks
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Reading Progress', () => BookmarkSystemTester.testReadingProgressUpdates(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                            Test Reading Progress
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Bookmark Retrieval', () => BookmarkSystemTester.testBookmarkRetrieval(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:opacity-50"
                        >
                            Test Bookmark Retrieval
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Bookmark Statistics', () => BookmarkSystemTester.testBookmarkStatistics(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
                        >
                            Test Bookmark Statistics
                        </button>

                        <button
                            onClick={async () => {
                                const userId = await BookmarkSystemTester.ensureAuthenticated();
                                runIndividualTest('Bookmark Removal', () => BookmarkSystemTester.testBookmarkRemoval(userId));
                            }}
                            disabled={isRunning}
                            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                        >
                            Test Bookmark Removal
                        </button>

                        <button
                            onClick={async () => {
                                if (!user) {
                                    addLog('❌ No authenticated user found');
                                    return;
                                }
                                runIndividualTest('Debug Article Bookmark', async () => {
                                    const result = await BookmarkDebugger.testBookmarkCreation(user.uid);
                                    if (result.success) {
                                        addLog(`✅ Debug test passed: ${result.data?.bookmarkId}`);
                                    } else {
                                        addLog(`❌ Debug test failed: ${result.error}`);
                                    }
                                });
                            }}
                            disabled={isRunning}
                            className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                            Debug Article Permissions
                        </button>

                        <button
                            onClick={async () => {
                                if (!user) {
                                    addLog('❌ No authenticated user found');
                                    return;
                                }
                                runIndividualTest('Debug Story Bookmark', async () => {
                                    const result = await BookmarkDebugger.testStoryBookmarkCreation(user.uid);
                                    if (result.success) {
                                        addLog(`✅ Debug test passed: ${result.data?.bookmarkId}`);
                                    } else {
                                        addLog(`❌ Debug test failed: ${result.error}`);
                                    }
                                });
                            }}
                            disabled={isRunning}
                            className="w-full bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
                        >
                            Debug Story Permissions
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Test Information</h2>

                    <div className="space-y-3 text-sm">
                        <div>
                            <strong>Test User ID:</strong> test-user-123
                        </div>
                        <div>
                            <strong>Test Article ID:</strong> test-article-123
                        </div>
                        <div>
                            <strong>Test Story ID:</strong> test-story-123
                        </div>

                        <div className="mt-4 p-3 bg-gray-100 rounded">
                            <strong>What these tests verify:</strong>
                            <ul className="mt-2 space-y-1 text-xs">
                                <li>• Bookmark creation for articles and stories</li>
                                <li>• Reading progress tracking</li>
                                <li>• Bookmark retrieval and checking</li>
                                <li>• Statistics calculation</li>
                                <li>• Bookmark removal</li>
                                <li>• User entitlement validation</li>
                            </ul>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-100 rounded">
                            <strong>Note:</strong> These tests use mock data and may show expected errors if Firebase is not configured or if the user doesn't have proper permissions.
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Test Results</h2>

                {testResults.length === 0 ? (
                    <p className="text-gray-500">No tests have been run yet. Click a test button above to start.</p>
                ) : (
                    <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                        {testResults.map((result, index) => (
                            <div key={index} className="mb-1">
                                {result}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <a
                    href="/"
                    className="text-blue-500 hover:text-blue-600 underline"
                >
                    ← Back to Home
                </a>
            </div>
        </div>
    );
}

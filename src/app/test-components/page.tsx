'use client';

import { useState } from 'react';
import { ToastContainer, useToast } from '@/components/Toast';
import { AlertBanner } from '@/components/AlertBanner';
import { Spinner, InlineSpinner, PageSpinner } from '@/components/Spinner';
import { Switch } from '@/components/Switch';
import { SearchBar } from '@/components/SearchBar';
import { Accordion, AccordionItem, Collapsible } from '@/components/Accordion';

export default function TestComponentsPage() {
  // Toast state
  const { toasts, toast, removeToast } = useToast();
  
  // Alert state
  const [showAlert, setShowAlert] = useState(true);
  
  // Spinner state
  const [showPageSpinner, setShowPageSpinner] = useState(false);
  
  // Switch states
  const [switchValue1, setSwitchValue1] = useState(false);
  const [switchValue2, setSwitchValue2] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  
  // Sample data for search
  const sampleData = [
    'Apple', 'Banana', 'Cherry', 'Date', 'Elderberry',
    'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon',
    'Mango', 'Nectarine', 'Orange', 'Papaya', 'Quince'
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filtered = sampleData.filter(item =>
        item.toLowerCase().includes(query.toLowerCase())
      );
      setSearchSuggestions(filtered);
    } else {
      setSearchSuggestions([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          UI Components Test Page
        </h1>

        {/* Alert Banner */}
        {showAlert && (
          <AlertBanner
            type="info"
            title="Welcome to the components test page!"
            message="This page demonstrates all the reusable UI components."
            onDismiss={() => setShowAlert(false)}
          />
        )}

        {/* Toast Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Toast Notifications
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success('Success!', 'Operation completed successfully.')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Success Toast
            </button>
            <button
              onClick={() => toast.error('Error!', 'Something went wrong.')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Error Toast
            </button>
            <button
              onClick={() => toast.warning('Warning!', 'Please check your input.')}
              className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
            >
              Warning Toast
            </button>
            <button
              onClick={() => toast.info('Info', 'Here is some information.')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Info Toast
            </button>
          </div>
        </section>

        {/* Spinner Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Spinners
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Spinner size="sm" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Small</p>
            </div>
            <div className="text-center">
              <Spinner size="md" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Medium</p>
            </div>
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Large</p>
            </div>
            <div className="text-center">
              <Spinner size="xl" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">XL</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => setShowPageSpinner(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Show Page Spinner (3s)
            </button>
            <span className="text-gray-700 dark:text-gray-300">
              Inline spinner: <InlineSpinner />
            </span>
          </div>
          {showPageSpinner && (
            <>
              <PageSpinner message="Loading page..." />
              {setTimeout(() => setShowPageSpinner(false), 3000) && null}
            </>
          )}
        </section>

        {/* Switch Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Switches / Toggles
          </h2>
          <div className="space-y-4">
            <Switch
              label="Small switch"
              size="sm"
              checked={switchValue1}
              onChange={setSwitchValue1}
            />
            <Switch
              label="Medium switch (default)"
              checked={switchValue2}
              onChange={setSwitchValue2}
            />
            <Switch
              label="Large switch"
              size="lg"
              defaultChecked
            />
            <Switch
              label="Disabled switch"
              disabled
              defaultChecked
            />
            <Switch
              label="Left label position"
              labelPosition="left"
            />
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Switch 1 value: {switchValue1 ? 'ON' : 'OFF'} | Switch 2 value: {switchValue2 ? 'ON' : 'OFF'}
          </p>
        </section>

        {/* Search Bar Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Search Bar with Autocomplete
          </h2>
          <SearchBar
            placeholder="Search fruits..."
            suggestions={searchSuggestions}
            onSearch={handleSearch}
            onSelect={(item) => {
              toast.info('Selected', `You selected: ${item}`);
            }}
          />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Current search: {searchQuery || 'None'}
          </p>
        </section>

        {/* Accordion Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Accordion & Collapsible
          </h2>
          
          <Accordion className="mb-6">
            <AccordionItem 
              title="What is Doshi Sensei?"
              icon="📚"
              defaultOpen
            >
              Doshi Sensei is a comprehensive Japanese language learning platform designed to help you master Japanese through interactive lessons, games, and practice exercises.
            </AccordionItem>
            <AccordionItem 
              title="How do I get started?"
              icon="🚀"
            >
              Simply create an account and choose your learning path. We offer courses for complete beginners all the way to advanced learners.
            </AccordionItem>
            <AccordionItem 
              title="What features are available?"
              icon="✨"
            >
              <ul className="list-disc list-inside space-y-1">
                <li>Interactive lessons</li>
                <li>Vocabulary flashcards</li>
                <li>Kanji practice</li>
                <li>Grammar exercises</li>
                <li>Speaking practice</li>
                <li>Progress tracking</li>
              </ul>
            </AccordionItem>
          </Accordion>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Simple Collapsible</h3>
            <Collapsible title="Click to expand">
              <p className="text-gray-600 dark:text-gray-300">
                This is a simple collapsible component that can be used for showing/hiding content with a minimal UI.
              </p>
            </Collapsible>
            <Collapsible title="Another collapsible section">
              <p className="text-gray-600 dark:text-gray-300">
                You can have multiple collapsible sections on the same page, and they work independently.
              </p>
            </Collapsible>
          </div>
        </section>

        {/* Alert Examples */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Alert Banner Examples
          </h2>
          <div className="space-y-2">
            <AlertBanner
              type="success"
              title="Success!"
              message="Your changes have been saved."
              dismissible={false}
            />
            <AlertBanner
              type="error"
              title="Error"
              message="Failed to save changes. Please try again."
              dismissible={false}
            />
            <AlertBanner
              type="warning"
              title="Warning"
              message="Your session will expire in 5 minutes."
              dismissible={false}
            />
            <AlertBanner
              type="info"
              title="Information"
              message="New features have been added to the platform."
              dismissible={false}
            />
          </div>
        </section>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
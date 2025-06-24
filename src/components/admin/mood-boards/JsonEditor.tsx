'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { MoodBoard } from '@/types/moodBoard';

interface JsonEditorProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const MOOD_BOARD_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "The title of the mood board",
      "minLength": 1
    },
    "emoji": {
      "type": "string",
      "description": "The emoji representing the mood board",
      "minLength": 1,
      "maxLength": 2
    },
    "jlpt": {
      "type": "string",
      "enum": ["N5", "N4", "N3", "N2", "N1"],
      "description": "JLPT level"
    },
    "background": {
      "type": "string",
      "description": "CSS background property (gradient or color)"
    },
    "description": {
      "type": "string",
      "description": "Description of the mood board"
    },
    "kanji": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "char": {
            "type": "string",
            "description": "The kanji character",
            "minLength": 1,
            "maxLength": 1
          },
          "meaning": {
            "type": "string",
            "description": "English meaning of the kanji"
          },
          "readings": {
            "type": "object",
            "properties": {
              "on": {
                "type": "array",
                "items": { "type": "string" },
                "description": "On'yomi readings"
              },
              "kun": {
                "type": "array",
                "items": { "type": "string" },
                "description": "Kun'yomi readings"
              }
            },
            "required": ["on", "kun"]
          },
          "examples": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Example words using this kanji"
          },
          "difficulty": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5,
            "description": "Difficulty rating (1-5)"
          }
        },
        "required": ["char", "meaning", "readings", "examples", "difficulty"]
      }
    },
    "isActive": {
      "type": "boolean",
      "description": "Whether the mood board is active/visible"
    },
    "sortOrder": {
      "type": "integer",
      "description": "Sort order for displaying mood boards"
    }
  },
  "required": ["title", "emoji", "jlpt", "background", "description", "kanji", "isActive"]
};

export function JsonEditor({ initialData, onSave, onCancel, isSaving = false }: JsonEditorProps) {
  const [jsonValue, setJsonValue] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setJsonValue(JSON.stringify(initialData, null, 2));
    }
  }, [initialData]);

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const errors: string[] = [];

      // Basic validation
      if (!parsed.title || typeof parsed.title !== 'string') {
        errors.push('Title is required and must be a string');
      }
      if (!parsed.emoji || typeof parsed.emoji !== 'string') {
        errors.push('Emoji is required and must be a string');
      }
      if (!parsed.jlpt || !['N5', 'N4', 'N3', 'N2', 'N1'].includes(parsed.jlpt)) {
        errors.push('JLPT level must be one of: N5, N4, N3, N2, N1');
      }
      if (!parsed.description || typeof parsed.description !== 'string') {
        errors.push('Description is required and must be a string');
      }
      if (!Array.isArray(parsed.kanji)) {
        errors.push('Kanji must be an array');
      } else {
        parsed.kanji.forEach((kanji: any, index: number) => {
          if (!kanji.char || typeof kanji.char !== 'string' || kanji.char.length !== 1) {
            errors.push(`Kanji ${index + 1}: char must be a single character`);
          }
          if (!kanji.meaning || typeof kanji.meaning !== 'string') {
            errors.push(`Kanji ${index + 1}: meaning is required`);
          }
          if (!kanji.readings || !Array.isArray(kanji.readings.on) || !Array.isArray(kanji.readings.kun)) {
            errors.push(`Kanji ${index + 1}: readings must have on and kun arrays`);
          }
          if (!Array.isArray(kanji.examples)) {
            errors.push(`Kanji ${index + 1}: examples must be an array`);
          }
          if (typeof kanji.difficulty !== 'number' || kanji.difficulty < 1 || kanji.difficulty > 5) {
            errors.push(`Kanji ${index + 1}: difficulty must be a number between 1 and 5`);
          }
        });
      }

      setValidationErrors(errors);
      return errors.length === 0 ? parsed : null;
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
      setValidationErrors([]);
      return null;
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonValue(value);
      setParseError(null);
      setValidationErrors([]);
    }
  };

  const handleSave = async () => {
    const validated = validateJson(jsonValue);
    if (validated) {
      await onSave(validated);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleValidate = () => {
    validateJson(jsonValue);
  };

  const isValid = !parseError && validationErrors.length === 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">JSON Editor</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Advanced mode for direct JSON editing with schema validation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormat}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Format
              </button>
              <button
                onClick={handleValidate}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Validate
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(parseError || validationErrors.length > 0) && (
          <div className="bg-destructive/10 border-b border-border p-4">
            {parseError && (
              <div className="mb-2">
                <h4 className="font-medium text-destructive mb-1">JSON Parse Error:</h4>
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}
            {validationErrors.length > 0 && (
              <div>
                <h4 className="font-medium text-destructive mb-1">Validation Errors:</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        <div className="relative">
          <Editor
            height="500px"
            language="json"
            value={jsonValue}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              formatOnPaste: true,
              formatOnType: true,
              autoIndent: 'full',
              tabSize: 2,
              wordWrap: 'on',
              folding: true,
              bracketPairColorization: { enabled: true },
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
            }}
          />
        </div>

        {/* Schema Helper */}
        <div className="bg-muted/30 border-t border-border p-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
              📋 View JSON Schema & Examples
            </summary>
            <div className="mt-3 space-y-4 text-xs">
              <div>
                <h5 className="font-medium text-foreground mb-2">Required Fields:</h5>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• <code>title</code> - String: Mood board title</li>
                  <li>• <code>emoji</code> - String: Emoji character (1-2 chars)</li>
                  <li>• <code>jlpt</code> - String: One of "N5", "N4", "N3", "N2", "N1"</li>
                  <li>• <code>background</code> - String: CSS gradient or color</li>
                  <li>• <code>description</code> - String: Description text</li>
                  <li>• <code>kanji</code> - Array: Array of kanji objects</li>
                  <li>• <code>isActive</code> - Boolean: Whether visible to users</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-foreground mb-2">Kanji Object Structure:</h5>
                <pre className="bg-background border border-border rounded p-2 text-xs overflow-x-auto">
{`{
  "char": "木",
  "meaning": "tree",
  "readings": {
    "on": ["もく", "ぼく"],
    "kun": ["き", "こ"]
  },
  "examples": ["木曜日", "木材"],
  "difficulty": 1
}`}
                </pre>
              </div>
            </div>
          </details>
        </div>

        {/* Action Buttons */}
        <div className="bg-muted/50 border-t border-border p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isValid ? 'Valid JSON' : 'Invalid JSON'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid || isSaving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
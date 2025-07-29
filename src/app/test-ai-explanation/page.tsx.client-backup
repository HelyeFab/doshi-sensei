'use client';

import { useState } from 'react';
import { AIExplanationTrigger } from '@/components/AIExplanation';

export default function TestAIExplanation() {
  const [customText, setCustomText] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Context Explanation Test Page</h1>
        
        {/* Test Cases */}
        <div className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Test Cases</h2>
          
          {/* Single word */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Single word</p>
                <p className="text-lg font-medium mb-2">食べる</p>
              </div>
              <AIExplanationTrigger
                text="食べる"
                contextType="word"
                size="md"
              />
            </div>
          </div>

          {/* Common phrase */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Common phrase</p>
                <p className="text-lg font-medium mb-2">お元気ですか</p>
              </div>
              <AIExplanationTrigger
                text="お元気ですか"
                contextType="phrase"
                size="md"
              />
            </div>
          </div>

          {/* Full sentence */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Full sentence</p>
                <p className="text-lg font-medium mb-2">昨日、友達と一緒に寿司を食べました。</p>
              </div>
              <AIExplanationTrigger
                text="昨日、友達と一緒に寿司を食べました。"
                contextType="sentence"
                size="md"
              />
            </div>
          </div>

          {/* Paragraph with context */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Paragraph with context</p>
                <p className="text-lg font-medium mb-2">
                  日本の文化では、お辞儀は相手への敬意を表す大切な挨拶の方法です。角度によって、敬意の程度が変わります。
                </p>
                <p className="text-sm text-gray-600 italic">
                  Context: This is from a cultural guide about Japanese greetings
                </p>
              </div>
              <AIExplanationTrigger
                text="日本の文化では、お辞儀は相手への敬意を表す大切な挨拶の方法です。角度によって、敬意の程度が変わります。"
                contextType="paragraph"
                surroundingContext="This is from a cultural guide about Japanese greetings"
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Custom Text Input */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Try Your Own Text</h2>
          <div className="space-y-4">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter Japanese text to explain..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 font-ja"
            />
            {customText && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Click the robot to get explanation →</span>
                <AIExplanationTrigger
                  text={customText}
                  contextType="sentence"
                  size="lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Different Variants Demo */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Different Display Variants</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span>Icon variant (default):</span>
              <AIExplanationTrigger
                text="これはテストです"
                contextType="sentence"
                variant="icon"
                size="md"
              />
            </div>
            <div className="flex items-center gap-4">
              <span>Inline variant:</span>
              <AIExplanationTrigger
                text="これはテストです"
                contextType="sentence"
                variant="inline"
              />
            </div>
            <div>
              <span>Floating variant (bottom right):</span>
              <AIExplanationTrigger
                text="これはテストです"
                contextType="sentence"
                variant="floating"
              />
            </div>
          </div>
        </div>

        {/* Usage Limits Info */}
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Usage Limits:</h3>
          <ul className="text-sm space-y-1">
            <li>• Guest users: 3 explanations per day</li>
            <li>• Free users: 3 explanations per day</li>
            <li>• Premium users: Unlimited</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
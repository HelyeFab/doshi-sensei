'use client';

import { useState } from 'react';

export default function QuickContextDemo() {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 QuickContext Demo
          </h1>
          <p className="text-gray-600">
            Test the intelligent Japanese text selection assistant
          </p>
        </header>

        {showInstructions && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-blue-900 mb-2">How to use QuickContext:</h2>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Select any Japanese text below or click on individual words</li>
                  <li>The Doshi bubble will appear near your selection</li>
                  <li>Click the bubble to see available actions</li>
                  <li>Use keyboard shortcuts: Q (save), L (listen), A (AI), C (copy), H (history)</li>
                  <li>Your selection history is saved automatically</li>
                </ol>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Demo Content Sections */}
        <div className="space-y-8">
          {/* Single Kanji Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Single Kanji</h2>
            <div className="grid grid-cols-4 gap-4">
              {['愛', '勉', '強', '日', '本', '語', '学', '習'].map((kanji) => (
                <div
                  key={kanji}
                  className="japanese-text text-4xl text-center p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  data-quickcontext="true"
                >
                  {kanji}
                </div>
              ))}
            </div>
          </section>

          {/* Vocabulary Words */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Vocabulary Words</h2>
            <div className="space-y-2">
              <p className="japanese-text text-lg">
                <span className="inline-block px-2 py-1 hover:bg-blue-50 rounded">勉強</span>
                <span className="inline-block px-2 py-1 hover:bg-blue-50 rounded">食べる</span>
                <span className="inline-block px-2 py-1 hover:bg-blue-50 rounded">美しい</span>
                <span className="inline-block px-2 py-1 hover:bg-blue-50 rounded">図書館</span>
                <span className="inline-block px-2 py-1 hover:bg-blue-50 rounded">ありがとう</span>
              </p>
            </div>
          </section>

          {/* Phrases */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Phrases</h2>
            <div className="space-y-3">
              <p className="japanese-text text-lg" data-quickcontext="true">
                日本語を勉強しています
              </p>
              <p className="japanese-text text-lg" data-quickcontext="true">
                お元気ですか
              </p>
              <p className="japanese-text text-lg" data-quickcontext="true">
                これは何ですか
              </p>
            </div>
          </section>

          {/* Full Sentences */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Complete Sentences</h2>
            <div className="space-y-3">
              <p className="japanese-text text-lg leading-relaxed" data-quickcontext="true">
                私は毎日日本語を勉強しています。とても楽しいです！
              </p>
              <p className="japanese-text text-lg leading-relaxed" data-quickcontext="true">
                昨日、友達と一緒に映画を見に行きました。
              </p>
              <p className="japanese-text text-lg leading-relaxed" data-quickcontext="true">
                来週の月曜日に、新しいプロジェクトが始まります。
              </p>
            </div>
          </section>

          {/* Mixed Content */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Article Sample</h2>
            <article className="prose max-w-none">
              <p className="japanese-text text-lg leading-relaxed" data-quickcontext="true">
                日本の文化は非常に豊かで多様です。古代から現代まで、様々な伝統が受け継がれています。
                茶道、華道、武道など、これらの伝統芸術は今でも多くの人々に愛されています。
              </p>
              <p className="japanese-text text-lg leading-relaxed mt-4" data-quickcontext="true">
                また、現代の日本は技術革新の最前線にあり、アニメ、マンガ、ゲームなどのポップカルチャーは
                世界中で人気を博しています。伝統と革新が共存する、それが日本の魅力の一つです。
              </p>
            </article>
          </section>

          {/* Interactive Test Area */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Interactive Test Area</h2>
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Try selecting different parts of this text:</p>
              <p className="japanese-text text-xl leading-relaxed" data-quickcontext="true">
                春は桜、夏は海、秋は紅葉、冬は雪。日本には四季があります。
              </p>
            </div>
          </section>
        </div>

        {/* Feature Status */}
        <footer className="mt-12 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">QuickContext Features:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>✅ Smart text detection (kanji/word/phrase/sentence)</div>
            <div>✅ Selection history tracking</div>
            <div>✅ Keyboard shortcuts</div>
            <div>✅ Copy to clipboard</div>
            <div>✅ TTS pronunciation</div>
            <div>✅ AI explanations</div>
            <div>✅ Dictionary lookup</div>
            <div>✅ Save to study lists</div>
            <div>✅ Visual feedback on hover</div>
            <div>✅ Mobile touch support</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
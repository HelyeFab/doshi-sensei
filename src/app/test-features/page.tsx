'use client';

import { useState } from 'react';
import EditableTranscriptDisplay from '@/app/tools/youtube-shadowing/components/EditableTranscriptDisplay';
import { TranscriptLine } from '@/app/tools/youtube-shadowing/YouTubeShadowing';

export default function TestFeatures() {
  const [transcript] = useState<TranscriptLine[]>([
    {
      id: 'line-1',
      text: 'これはテストです。',
      startTime: 0,
      endTime: 2,
    },
    {
      id: 'line-2',
      text: '音楽ビデオの検出をテストしています。',
      startTime: 2,
      endTime: 5,
    },
    {
      id: 'line-3',
      text: '編集可能なトランスクリプトです。',
      startTime: 5,
      endTime: 8,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-4">Feature Test Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Testing Editable Transcript Display</h2>
        <p className="text-sm text-gray-600 mb-4">
          You should see colored underlines for confidence and be able to click text to edit (premium only).
        </p>
        
        <EditableTranscriptDisplay
          transcript={transcript}
          videoId="test-video-123"
          videoTitle="Test Music Video MV"
          videoUrl="https://youtube.com/watch?v=test"
          metadata={{
            youtubeVideoId: 'test-123',
            channelName: 'Test Channel',
            duration: 180,
            isMusic: true,
          }}
          currentLineIndex={1}
          showFurigana={true}
          onTranscriptUpdate={(updated) => console.log('Updated:', updated)}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">What You Should See:</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>A "Music Video Detected" banner at the top (green/yellow box)</li>
          <li>Edit controls if you're a premium user</li>
          <li>Confidence legend showing different underline styles</li>
          <li>Three Japanese text segments</li>
          <li>The middle segment highlighted (active)</li>
          <li>Click any text to edit (premium only)</li>
        </ul>
      </div>
    </div>
  );
}
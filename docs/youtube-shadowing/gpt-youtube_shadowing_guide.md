# YouTube Captions Shadowing Feature Guide

This guide walks through building a "shadowing" feature in a Next.js 15 app using the YouTube Data API v3 Captions methods. It’s written for a junior developer and covers each step in a clear, detailed way.

---

## 📋 Prerequisites

Before you start, make sure you have:

- A Google account.
- A Next.js 15 project set up (with `app/` directory).
- Node.js (v16+) and npm or Yarn installed locally.
- Basic familiarity with React, TypeScript (optional), and Next.js.

---

## 1. Enable YouTube Data API & Create OAuth Credentials

1. Go to the **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project or select an existing one.
3. In the sidebar, click **APIs & Services** → **Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. Go to **APIs & Services** → **Credentials**.
6. Click **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**
7. Add your development URLs under **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
8. Copy and save the **Client ID** and **Client Secret**. We’ll use these soon.

---

## 2. Install Dependencies

Run the following in your project root:

```bash
# Using npm\ n
npm install googleapis next-auth @next-auth/google

# Or using Yarn

yarn add googleapis next-auth @next-auth/google
```

- **googleapis**: Official Node.js client for YouTube Data API.
- **next-auth**: Easy OAuth2 flow in Next.js.

---

## 3. Configure NextAuth for Google OAuth

Create a file at `app/api/auth/[...nextauth]/route.ts` if you’re using the new App Router, or `pages/api/auth/[...nextauth].ts` if using the Pages Router.

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const runtime = 'edge'; // for App Router

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/youtube.force-ssl'
          ].join(' ')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    }
  }
});
```

> 🔑 Make sure your `.env.local` contains:
>
> ```env
> GOOGLE_CLIENT_ID=<your client id>
> GOOGLE_CLIENT_SECRET=<your client secret>
> NEXTAUTH_SECRET=<a random secret string>
> ```

---

## 4. Build the Server-side Captions API Route

Create `app/api/captions/route.ts`. This will handle both **listing** and **downloading** captions.

```ts
// app/api/captions/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');
  const captionId = url.searchParams.get('captionId');

  // 1) Check authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken || !token.refreshToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Set up OAuth2 client
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken
  });
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });

  // 3a) List captions
  if (videoId) {
    const listRes = await youtube.captions.list({
      part: ['id', 'snippet'],
      videoId
    });
    return NextResponse.json({ items: listRes.data.items });
  }

  // 3b) Download captions
  if (captionId) {
    const downloadUrl =
      `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`;
    const response = await oauth2.request({ url: downloadUrl, responseType: 'arraybuffer' });
    const srtText = Buffer.from(response.data).toString('utf-8');

    return new NextResponse(srtText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  return NextResponse.json({ error: 'Provide videoId or captionId' }, { status: 400 });
}
```

- **Listing**: call `/api/captions?videoId=...` to get track IDs.
- **Downloading**: call `/api/captions?captionId=...&videoId=` to fetch SRT text.

---

## 5. Parse SRT into Cues

Add a helper at `lib/parseSrt.ts`:

```ts
export interface Cue {
  start: number;
  end: number;
  text: string;
}

export function parseSrt(srt: string): Cue[] {
  return srt
    .trim()
    .split(/\r?\n\r?\n/)
    .map(block => {
      const lines = block.split(/\r?\n/);
      const timeLine = lines[1];
      const [startStr, endStr] = timeLine.split(' --> ');
      const toSeconds = (t: string) => {
        const [h, m, s] = t.replace(',', '.').split(':').map(parseFloat);
        return h * 3600 + m * 60 + s;
      };
      return {
        start: toSeconds(startStr),
        end: toSeconds(endStr),
        text: lines.slice(2).join(' ')
      };
    });
}
```

This turns raw SRT text into an array of cues, each with a start/end time and text.

---

## 6. Build the Shadowing Component

Create `components/ShadowPlayer.tsx`:

```tsx
'use client';
import React, { useState, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { parseSrt, Cue } from '@/lib/parseSrt';

interface ShadowPlayerProps {
  videoId: string;
}

export default function ShadowPlayer({ videoId }: ShadowPlayerProps) {
  const [cues, setCues] = useState<Cue[]>([]);
  const [activeText, setActiveText] = useState<string>('');

  useEffect(() => {
    async function fetchCaptions() {
      // 1) List tracks
      const listRes = await fetch(`/api/captions?videoId=${videoId}`);
      const { items } = await listRes.json();
      if (!items.length) return;
      const { id: captionId } = items[0];

      // 2) Download SRT
      const srtRes = await fetch(`/api/captions?captionId=${captionId}`);
      const srtText = await srtRes.text();
      setCues(parseSrt(srtText));
    }
    fetchCaptions();
  }, [videoId]);

  const handleStateChange: YouTubeProps['onStateChange'] = event => {
    const current = event.target.getCurrentTime();
    const cue = cues.find(c => current >= c.start && current <= c.end);
    setActiveText(cue?.text || '');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <YouTube
        videoId={videoId}
        onStateChange={handleStateChange}
        opts={{ playerVars: { controls: 1 } }}
      />
      <div className="p-4 bg-gray-50 rounded-xl shadow">
        <h2 className="text-lg font-semibold">Shadowing Text</h2>
        <p className="mt-2 text-base">{activeText || 'Press play to start shadowing.'}</p>
      </div>
    </div>
  );
}
```

### How it works

1. **On mount**: calls `/api/captions?videoId=` → gets track ID → downloads SRT → parses cues.
2. **On video time update**: finds the cue matching current time → displays its text.

---

## 7. Testing & Debugging

- **Check console** for fetch errors or Google quota errors.
- **Verify tokens**: inspect NextAuth session to ensure `accessToken` exists.
- **Caption availability**: some videos don’t have captions or require special OAuth scopes.

---

## 8. Next Steps & Tips

- 🎨 Style the shadowing box: add animations, scroll long text.
- 🌐 Multilingual support: append `&tlang=xx` to download URL for automatic translation.
- 🚨 Error handling: show user-friendly messages for missing captions or expired tokens.
- 🔄 Caching: store parsed cues locally to avoid refetching on every play.

---

🎉 That’s it! With these steps, you’ll have a working caption shadowing feature ready for language learners.

Good luck, and feel free to ask any questions!


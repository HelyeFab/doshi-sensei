# Doshi Sensei - Japanese Learning Application

A comprehensive Japanese language learning app built with Next.js, featuring conjugation practice, vocabulary search, and interactive learning tools.

## Features

### 🎯 Core Learning Tools
- **Japanese Verb Conjugation Practice** - Interactive exercises for all verb types (Ichidan, Godan, Irregular)
- **Vocabulary Search** - High-quality dictionary with 22,569+ entries from JMdict Simplified
- **Kanji Browser** - Browse and study kanji with detailed information
- **Practice Modes** - Customizable practice sessions for different skill levels
- **Study Lists** - Create and manage personal vocabulary lists

### 📚 Dictionary Integration
- **Primary Source**: JMdict Simplified (22,569 common entries)
- **Fallback Sources**: Jisho API, WaniKani API
- **Smart Search**: Relevance-based ranking for accurate results
- **Offline Capable**: Local dictionary files for reliable access

### 🎨 User Experience
- **Progressive Web App (PWA)** - Install on mobile devices
- **Multiple Themes** - Dark mode and customizable themes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Offline Support** - Core features available without internet

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd doshi-sensei
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firestore (optional for cloud sync)
- **PWA**: next-pwa for offline functionality
- **Dictionary**: JMdict Simplified for high-quality vocabulary data

## Dictionary Sources & Acknowledgements

### Primary Dictionary: JMdict Simplified
This application uses **JMdict Simplified** by scriptin, which provides clean, JSON-formatted Japanese dictionary data.

- **Source**: [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- **Version**: 3.6.1 (22,569 common entries)
- **Format**: English-only, common words subset
- **License**: [EDRDG License](http://www.edrdg.org/edrdg/licence.html)

The JMdict Simplified project is derived from the **JMdict** (Japanese-Multilingual Dictionary) created by the Electronic Dictionary Research and Development Group (EDRDG) under the direction of Jim Breen.

### Fallback Sources
- **Jisho API**: For extended vocabulary coverage
- **WaniKani API**: For additional learning resources

### Original JMdict
The original JMdict files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group's [license](http://www.edrdg.org/edrdg/licence.html).

## Project Structure

```
doshi-sensei/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable React components
│   ├── utils/           # Utility functions and APIs
│   ├── contexts/        # React contexts
│   └── types/           # TypeScript type definitions
├── public/
│   └── dict/            # Dictionary files
├── docs/                # Project documentation
└── scripts/             # Build and utility scripts
```

## Development

### Key Files
- `src/utils/jmdictSimplifiedApi.ts` - Primary dictionary API
- `src/utils/api.ts` - Main search API with fallbacks
- `src/utils/conjugation.ts` - Verb conjugation logic
- `src/components/` - UI components

### Testing
```bash
npm run test
```

### Building
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source. The dictionary data is used under the EDRDG License terms.

## Acknowledgements

### Dictionary Data
- **Jim Breen** and the **Electronic Dictionary Research and Development Group (EDRDG)** for creating and maintaining JMdict
- **scriptin** for the JMdict Simplified project that makes this integration possible

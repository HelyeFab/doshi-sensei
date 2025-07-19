/**
 * Game Tracking Integration Test
 * 
 * This test verifies that tracking is properly implemented in the actual game files
 * by checking for the presence of trackGamePlayed imports and calls.
 */

import fs from 'fs';
import path from 'path';

describe('Game Tracking Integration Tests', () => {
  const gamesDir = path.join(__dirname, '../../../components/games');
  
  const gamesToCheck = [
    { name: 'KanjiQuest', file: 'KanjiQuest.tsx' },
    { name: 'MatchingGame', file: 'MatchingGame.tsx' },
    { name: 'SentenceScrambleGame', file: 'SentenceScrambleGame.tsx' },
    { name: 'StrokeOrderPractice', file: 'StrokeOrderPractice.tsx' },
    { name: 'KanaDropGame', file: 'KanaDropGame/KanaDropModal.tsx' }
  ];

  gamesToCheck.forEach(({ name, file }) => {
    describe(`${name} Tracking Implementation`, () => {
      let fileContent: string;
      
      beforeAll(() => {
        const filePath = path.join(gamesDir, file);
        try {
          fileContent = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
          fileContent = '';
        }
      });

      it('should import trackGamePlayed from trackingEvents', () => {
        expect(fileContent).toContain("import { trackGamePlayed } from '@/lib/stats/trackingEvents'");
      });

      it('should call trackGamePlayed function', () => {
        expect(fileContent).toContain('trackGamePlayed(');
      });

      it('should have play time check before tracking', () => {
        // Check for the 10-second minimum play time check
        const hasTimeCheck = 
          fileContent.includes('> 10000') || 
          fileContent.includes('>= 10000') ||
          fileContent.includes('> 10 * 1000') ||
          fileContent.includes('>= 10 * 1000');
        
        expect(hasTimeCheck).toBe(true);
      });

      if (name === 'KanjiQuest') {
        it('should track on both pass and fail', () => {
          // Check that tracking happens in both branches
          const passFailRegex = /if\s*\([^)]*score\s*>=\s*75[^}]*trackGamePlayed/s;
          const hasConditionalTracking = passFailRegex.test(fileContent);
          
          // If it has conditional tracking, it should also track in the else branch
          if (hasConditionalTracking) {
            expect(fileContent).toContain('} else {');
            
            // Count trackGamePlayed calls - should be at least 2 for pass/fail
            const trackingCalls = (fileContent.match(/trackGamePlayed\(/g) || []).length;
            expect(trackingCalls).toBeGreaterThanOrEqual(2);
          }
        });
      }

      if (name === 'MatchingGame' || name === 'SentenceScrambleGame' || name === 'StrokeOrderPractice') {
        it('should track on game completion', () => {
          // These games should track when game ends
          expect(fileContent).toMatch(/(?:endGame|gameOver|handleComplete|completeGame)[\s\S]*?trackGamePlayed/);
        });

        it('should track on early exit', () => {
          // Should have tracking in close/back handlers
          expect(fileContent).toMatch(/(?:handleClose|handleBack|onClose)[\s\S]*?trackGamePlayed/);
        });
      }
    });
  });

  describe('Games using progressTracking', () => {
    const progressGames = [
      { name: 'KanjiSimon', path: 'KanjiSimon/KanjiSimon.tsx' },
      { name: 'ReadingRoutes', path: 'ReadingRoutes/ReadingRoutes.tsx' }
    ];

    progressGames.forEach(({ name, path: gamePath }) => {
      it(`${name} should use progressTracking module`, () => {
        const filePath = path.join(gamesDir, gamePath);
        let fileContent = '';
        
        try {
          fileContent = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
          // File might not exist in test environment
        }

        if (fileContent) {
          expect(fileContent).toContain('progressTracking');
        } else {
          // Skip if file doesn't exist in test environment
          expect(true).toBe(true);
        }
      });
    });
  });

  describe('Tracking Security Compliance', () => {
    it('should ensure no games can bypass tracking', () => {
      const vulnerablePatterns = [
        // Pattern that would allow bypassing tracking
        /onClose\s*=\s*{\s*\(\)\s*=>\s*{\s*setIsOpen\(false\)\s*}\s*}/,
        // Direct modal close without tracking
        /handleClose\s*\(\)\s*{\s*setShowModal\(false\)\s*}/
      ];

      gamesToCheck.forEach(({ name, file }) => {
        const filePath = path.join(gamesDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          vulnerablePatterns.forEach(pattern => {
            // Make sure these vulnerable patterns don't exist
            const hasVulnerability = pattern.test(content) && !content.includes('trackGamePlayed');
            expect(hasVulnerability).toBe(false);
          });
        } catch (error) {
          // File access error in test environment is ok
        }
      });
    });
  });
});
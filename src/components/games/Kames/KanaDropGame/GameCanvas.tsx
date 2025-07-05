import React, { useEffect } from 'react';

// Start background music when game starts
useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && soundEnabled) {
        // Add a small delay to ensure all sounds have stopped
        const musicDelay = setTimeout(() => {
            audioManager.playBackgroundMusic();
        }, 200);

        return () => clearTimeout(musicDelay);
    } else {
        audioManager.stopBackgroundMusic();
    }
}, [gameState.isPlaying, gameState.isPaused, soundEnabled, audioManager]);

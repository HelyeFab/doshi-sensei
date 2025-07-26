// YouTube IFrame API Loader
// This file helps prevent 404 errors when YouTube tries to load scripts

if (!window.YT) {
  // Create a placeholder to prevent errors
  window.YT = {
    loading: 1,
    loaded: 0
  };
}

// The actual YouTube API will override this when loaded
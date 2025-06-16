'use client';

export default function FloatingDonateButton() {
  const handleClick = () => {
    // Placeholder for future "buy me a coffee" integration
    console.log('Donate button clicked - future integration point');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      aria-label="Support the developer"
      title="Support the developer"
    >
      {/* Coffee Cup Icon */}
      <svg
        className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M2 21h20v-2H2v2zM20 8h-2V5h2m0-2H4v10.1c0 .5.2 1 .6 1.4l1.9 1.9c.4.4.9.6 1.4.6h8.2c.5 0 1-.2 1.4-.6l1.9-1.9c.4-.4.6-.9.6-1.4V3m-4 10H8V5h8v8z"/>
      </svg>

      {/* Heart overlay for extra appeal */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    </button>
  );
}

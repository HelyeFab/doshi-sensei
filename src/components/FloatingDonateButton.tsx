'use client';

export default function FloatingDonateButton() {
  const handleClick = () => {
    // Placeholder for future "buy me a coffee" integration
    console.log('Donate button clicked - future integration point');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      aria-label="Support the developer"
      title="Support the developer"
    >
      {/* Heart Icon - clean style matching navigation */}
      <svg
        className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>

      {/* Pulse effect on hover */}
      <div className="absolute inset-0 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-20 group-hover:scale-125 transition-all duration-300"></div>
    </button>
  );
}

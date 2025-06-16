'use client';

export default function FloatingDonateButton() {
  const handleClick = () => {
    // Placeholder for future "buy me a coffee" integration
    console.log('Donate button clicked - future integration point');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-32 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-primary hover:bg-primary/90 border border-primary/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group backdrop-blur-md"
      aria-label="Support the developer"
      title="Support the developer"
    >
      {/* Coffee Cup Emoji - matching navigation style */}
      <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
        ☕
      </span>

      {/* Subtle pulse effect on hover */}
      <div className="absolute inset-0 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
}

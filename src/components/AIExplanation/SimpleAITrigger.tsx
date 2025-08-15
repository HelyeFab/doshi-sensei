'use client';

export default function SimpleAITrigger({ text }: { text: string }) {
  const handleClick = () => {

    alert(`AI Explanation would be shown for: ${text}`);
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded-full hover:bg-gray-100"
      title="Get AI explanation"
    >
      <img 
        src="/flat-icons/ui/robot.svg"
        alt="AI"
        className="w-5 h-5"
      />
    </button>
  );
}
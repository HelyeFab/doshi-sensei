import React, { useState, useEffect } from 'react';

// Distractor images from KanaDrop game
const DISTRACTOR_IMAGES = [
  // Pokemon-themed PNG files
  '/flat-icons/188915-pokemon-go/png/star.png',
  '/flat-icons/188915-pokemon-go/png/map.png',
  '/flat-icons/188915-pokemon-go/png/smartphone.png',
  '/flat-icons/188915-pokemon-go/png/pokedex.png',
  '/flat-icons/188915-pokemon-go/png/pokeball.png',
  
  // Farm Animals
  '/flat-icons/4193242-animals/svg/002-buffalo.svg',
  '/flat-icons/4193242-animals/svg/003-flamingo.svg',
  '/flat-icons/4193242-animals/svg/004-sheep.svg',
  '/flat-icons/4193242-animals/svg/005-horse.svg',
  '/flat-icons/4193242-animals/svg/006-cow.svg',
  '/flat-icons/4193242-animals/svg/007-pig.svg',
  '/flat-icons/4193242-animals/svg/008-hedgehog.svg',
  '/flat-icons/4193242-animals/svg/010-rabbit.svg',
  '/flat-icons/4193242-animals/svg/015-alpaca.svg',
  '/flat-icons/4193242-animals/svg/019-llama.svg',
  '/flat-icons/4193242-animals/svg/020-goat.svg',
  '/flat-icons/4193242-animals/svg/026-squirrel.svg',
  
  // Wild Animals
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg',
  
  // Emotions
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/011-laugh emoji.svg',
  '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
  '/flat-icons/17517790-summer-watermelon/svg/018-valentin day.svg',
  '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg',
  
  // Numbers
  '/flat-icons/4019664-alphabet-and-numbers/svg/035-1.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/036-2.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/037-3.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/038-4.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/039-5.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/040-6.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/041-7.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/042-8.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/043-9.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/044-0.svg',
];

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export default function ConfirmationDialog({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    isDestructive,
    onConfirm,
    onCancel,
    loading
}: ConfirmationDialogProps) {
    const [selectedDistractors, setSelectedDistractors] = useState<string[]>([]);
    const [distractorBackground, setDistractorBackground] = useState<string>('');

    // Vibrant pastel color options
    const pastelBackgrounds = [
        'bg-gradient-to-br from-pink-200 to-pink-300', // Pastel pink
        'bg-gradient-to-br from-blue-200 to-blue-300', // Pastel blue
        'bg-gradient-to-br from-green-200 to-green-300', // Pastel green
        'bg-gradient-to-br from-purple-200 to-purple-300', // Pastel purple
        'bg-gradient-to-br from-yellow-200 to-yellow-300', // Pastel yellow
        'bg-gradient-to-br from-orange-200 to-orange-300', // Pastel orange
        'bg-gradient-to-br from-teal-200 to-teal-300', // Pastel teal
        'bg-gradient-to-br from-rose-200 to-rose-300', // Pastel rose
        'bg-gradient-to-br from-indigo-200 to-indigo-300', // Pastel indigo
        'bg-gradient-to-br from-cyan-200 to-cyan-300', // Pastel cyan
        'bg-gradient-to-br from-emerald-200 to-emerald-300', // Pastel emerald
        'bg-gradient-to-br from-violet-200 to-violet-300', // Pastel violet
    ];

    // Select random distractor and background when modal opens
    useEffect(() => {
        if (isOpen) {
            const numDistractors = 1; // Show 1 distractor
            const shuffled = [...DISTRACTOR_IMAGES].sort(() => 0.5 - Math.random());
            setSelectedDistractors(shuffled.slice(0, numDistractors));
            
            // Select random pastel background
            const randomBackground = pastelBackgrounds[Math.floor(Math.random() * pastelBackgrounds.length)];
            setDistractorBackground(randomBackground);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full overflow-hidden">
                {/* Distractor decoration header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 border-b border-border">
                    <div className="flex items-center justify-center">
                        {selectedDistractors.map((imagePath, index) => (
                            <div
                                key={index}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl border border-white/30 flex items-center justify-center ${distractorBackground || 'bg-gradient-to-br from-pink-200 to-pink-300'}`}
                            >
                                <img
                                    src={imagePath}
                                    alt="decoration"
                                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain opacity-80"
                                    onError={(e) => {
                                        // Fallback to emoji
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.innerHTML = '<span class="text-lg sm:text-xl drop-shadow-sm">🎯</span>';
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
                    <p className="text-muted-foreground mb-6">{message}</p>
                    
                    {/* Button section */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="w-full sm:w-auto px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 order-2 sm:order-1"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-300 text-white hover:bg-purple-400 order-1 sm:order-2`}
                        >
                            {loading ? '⏳ Processing...' : confirmText}
                        </button>
                    </div>
                </div>

                {/* Simple decoration footer */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 h-2 border-t border-border">
                </div>
            </div>
        </div>
    );
}

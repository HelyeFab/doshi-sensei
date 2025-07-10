'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface KanjiQuestTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

export default function KanjiQuestTutorialModal({ isOpen, onClose, onStart }: KanjiQuestTutorialModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-yellow-100 via-orange-50 to-red-50 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Pokemon icons in corners */}
            <img 
              src="/flat-icons/1752632-pokemon/png/017-gaming.png" 
              alt="Pokeball"
              className="absolute top-4 right-4 w-12 h-12 opacity-20 animate-bounce"
            />
            <img 
              src="/flat-icons/1752632-pokemon/png/028-gaming.png" 
              alt="Pokemon"
              className="absolute bottom-4 left-4 w-12 h-12 opacity-20 animate-bounce"
              style={{ animationDelay: '0.5s' }}
            />
            <img 
              src="/flat-icons/1752632-pokemon/png/055-gaming.png" 
              alt="Pokemon"
              className="absolute top-4 left-16 w-10 h-10 opacity-15 animate-pulse"
            />
            <img 
              src="/flat-icons/1752632-pokemon/png/040-gaming.png" 
              alt="Pokemon"
              className="absolute bottom-4 right-16 w-10 h-10 opacity-15 animate-pulse"
              style={{ animationDelay: '1s' }}
            />

            <div className="p-8">
              {/* Header with Pokemon */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <img 
                    src="/flat-icons/1752632-pokemon/png/025-gaming.png" 
                    alt="Pokemon"
                    className="w-20 h-20 mx-auto mb-4"
                  />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                  Welcome to Kanji Quest! 🎮
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-200">
                  Catch 'em all... but with Kanji! 
                </p>
              </div>

              {/* Game Rules */}
              <div className="space-y-6 mb-8">
                {/* Step 1 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4 bg-white/70 dark:bg-gray-800/70 rounded-xl p-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      <img 
                        src="/flat-icons/1752632-pokemon/png/017-gaming.png" 
                        alt="Pokemon"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                      Select Your Kanji Opponents! 📚
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Choose 5-8 kanji to battle against. Each kanji will be encountered multiple times until you defeat them by mastering all their readings and meanings!
                    </p>
                  </div>
                </motion.div>

                {/* Step 2 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-4 bg-white/70 dark:bg-gray-800/70 rounded-xl p-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      <img 
                        src="/flat-icons/1752632-pokemon/png/028-gaming.png" 
                        alt="Pokemon"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                      Wild Encounters! ⚡
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Kanji appear randomly like wild Pokémon! Each kanji needs to be defeated by answering:
                    </p>
                    <ul className="mt-2 space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <span className="text-blue-500">●</span> On'yomi reading (if it has one)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">●</span> Kun'yomi reading (if it has one)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-500">●</span> Meaning (all kanji have this!)
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* Step 3 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-start gap-4 bg-white/70 dark:bg-gray-800/70 rounded-xl p-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      <img 
                        src="/flat-icons/1752632-pokemon/png/035-gaming.png" 
                        alt="Pokemon"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                      Battle & Learn! 💪
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Answer questions correctly to defeat the kanji! Wrong answers mean the kanji fights back and damages your HP. Master all aspects of every kanji to win!
                    </p>
                  </div>
                </motion.div>

                {/* Step 4 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-start gap-4 bg-white/70 dark:bg-gray-800/70 rounded-xl p-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      <img 
                        src="/flat-icons/1752632-pokemon/png/019-gaming.png" 
                        alt="Pokemon"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                      Catch the Pokémon! 🎯
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Complete all battles successfully to catch a wild Pokémon and add it to your Pokédex! The better you know your kanji, the rarer the Pokémon you might find!
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Pro Tips */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 rounded-xl p-4 mb-6"
              >
                <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                  <span className="text-2xl">💡</span> Pro Tips!
                </h4>
                <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                  <li>• Multiple readings are shown together (up to 4)</li>
                  <li>• Each kanji appears multiple times until fully mastered</li>
                  <li>• Wrong answers don't progress - you must get it right!</li>
                  <li>• The number of encounters = total questions for all kanji</li>
                </ul>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <img 
                    src="/flat-icons/1752632-pokemon/png/030-gaming.png" 
                    alt="Sleep"
                    className="w-5 h-5 opacity-70"
                  />
                  <span>Maybe Later</span>
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStart}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-bold shadow-lg hover:from-red-600 hover:to-orange-600 transition-all flex items-center gap-2"
                >
                  <span>Let's Battle!</span>
                  <img 
                    src="/flat-icons/1752632-pokemon/png/017-gaming.png" 
                    alt="Pokeball"
                    className="w-6 h-6"
                  />
                </motion.button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
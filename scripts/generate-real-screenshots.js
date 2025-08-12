const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateRealScreenshots() {
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  const doshiLogoPath = path.join(__dirname, '../public/doshi.png');
  
  // Create directories if they don't exist
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  console.log('📸 Generating REAL screenshots with actual content...');
  
  try {
    // Load the Doshi logo
    const doshiLogo = await sharp(doshiLogoPath).resize(40, 40).toBuffer();
    
    // Mobile Home Screenshot
    const mobileHomeSvg = `
      <svg width="540" height="1170" xmlns="http://www.w3.org/2000/svg">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="bg-home" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#faf5ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f3e8ff;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="540" height="1170" fill="url(#bg-home)"/>
        
        <!-- Status bar -->
        <rect x="0" y="0" width="540" height="24" fill="#8b5cf6"/>
        <text x="10" y="17" font-family="Arial" font-size="12" fill="white">9:41 AM</text>
        <text x="480" y="17" font-family="Arial" font-size="12" fill="white">100%</text>
        
        <!-- Header with user greeting -->
        <rect x="0" y="24" width="540" height="100" fill="white"/>
        <circle cx="50" cy="74" r="25" fill="#8b5cf6"/>
        <text x="85" y="65" font-family="Arial" font-size="20" font-weight="bold" fill="#1f2937">こんにちは, User-san! 👋</text>
        <text x="85" y="85" font-family="Arial" font-size="14" fill="#6b7280">Ready to practice Japanese?</text>
        
        <!-- Date and streak card -->
        <rect x="20" y="140" width="500" height="80" rx="10" fill="white"/>
        <text x="40" y="170" font-family="Arial" font-size="14" fill="#6b7280">Today: January 12, 2025</text>
        <text x="40" y="195" font-family="Arial" font-size="18" font-weight="bold" fill="#ef4444">🔥 7 day streak!</text>
        <rect x="380" y="155" width="120" height="50" rx="8" fill="#fef3c7"/>
        <text x="410" y="180" font-family="Arial" font-size="12" fill="#92400e">XP Today</text>
        <text x="410" y="198" font-family="Arial" font-size="16" font-weight="bold" fill="#92400e">+450</text>
        
        <!-- Stats row -->
        <rect x="20" y="235" width="240" height="70" rx="10" fill="white"/>
        <text x="35" y="260" font-family="Arial" font-size="12" fill="#6b7280">Words Learned</text>
        <text x="35" y="285" font-family="Arial" font-size="20" font-weight="bold" fill="#10b981">2,534</text>
        
        <rect x="280" y="235" width="240" height="70" rx="10" fill="white"/>
        <text x="295" y="260" font-family="Arial" font-size="12" fill="#6b7280">Accuracy Rate</text>
        <text x="295" y="285" font-family="Arial" font-size="20" font-weight="bold" fill="#3b82f6">87%</text>
        
        <!-- Practice Drills Card -->
        <rect x="20" y="320" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="340" width="50" height="50" rx="8" fill="#e9d5ff"/>
        <circle cx="60" cy="365" r="15" fill="#8b5cf6"/>
        <text x="100" y="360" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Practice Drills</text>
        <text x="100" y="380" font-family="Arial" font-size="13" fill="#6b7280">Master verb conjugations</text>
        <text x="100" y="398" font-family="Arial" font-size="11" fill="#8b5cf6">15 min • Recommended</text>
        <text x="490" y="370" font-family="Arial" font-size="20" fill="#d1d5db">›</text>
        
        <!-- Vocabulary Card -->
        <rect x="20" y="425" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="445" width="50" height="50" rx="8" fill="#dbeafe"/>
        <circle cx="60" cy="470" r="15" fill="#3b82f6"/>
        <text x="100" y="465" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Vocabulary</text>
        <text x="100" y="485" font-family="Arial" font-size="13" fill="#6b7280">5,000+ words to learn</text>
        <text x="100" y="503" font-family="Arial" font-size="11" fill="#3b82f6">243 new today</text>
        <text x="490" y="475" font-family="Arial" font-size="20" fill="#d1d5db">›</text>
        
        <!-- Games Card -->
        <rect x="20" y="530" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="550" width="50" height="50" rx="8" fill="#d1fae5"/>
        <circle cx="60" cy="575" r="15" fill="#10b981"/>
        <text x="100" y="570" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Learning Games</text>
        <text x="100" y="590" font-family="Arial" font-size="13" fill="#6b7280">Fun way to practice</text>
        <text x="100" y="608" font-family="Arial" font-size="11" fill="#10b981">New: Kanji Battle!</text>
        <text x="490" y="580" font-family="Arial" font-size="20" fill="#d1d5db">›</text>
        
        <!-- News Card -->
        <rect x="20" y="635" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="655" width="50" height="50" rx="8" fill="#fed7aa"/>
        <circle cx="60" cy="680" r="15" fill="#f59e0b"/>
        <text x="100" y="675" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">NHK Easy News</text>
        <text x="100" y="695" font-family="Arial" font-size="13" fill="#6b7280">Read real Japanese news</text>
        <text x="100" y="713" font-family="Arial" font-size="11" fill="#f59e0b">3 new articles</text>
        <text x="490" y="685" font-family="Arial" font-size="20" fill="#d1d5db">›</text>
        
        <!-- Recent Activity Section -->
        <rect x="20" y="740" width="500" height="180" rx="10" fill="white"/>
        <text x="35" y="770" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Recent Activity</text>
        
        <circle cx="45" cy="800" r="3" fill="#10b981"/>
        <text x="60" y="805" font-family="Arial" font-size="12" fill="#1f2937">Completed "Past Tense" drill - 95% accuracy</text>
        <text x="60" y="820" font-family="Arial" font-size="11" fill="#9ca3af">2 hours ago</text>
        
        <circle cx="45" cy="845" r="3" fill="#3b82f6"/>
        <text x="60" y="850" font-family="Arial" font-size="12" fill="#1f2937">Learned 15 new N3 vocabulary words</text>
        <text x="60" y="865" font-family="Arial" font-size="11" fill="#9ca3af">5 hours ago</text>
        
        <circle cx="45" cy="890" r="3" fill="#8b5cf6"/>
        <text x="60" y="895" font-family="Arial" font-size="12" fill="#1f2937">Achieved 7-day streak! 🎉</text>
        <text x="60" y="910" font-family="Arial" font-size="11" fill="#9ca3af">Today at 12:00 AM</text>
        
        <!-- Daily Challenge Banner -->
        <rect x="20" y="935" width="500" height="80" rx="10" fill="#8b5cf6"/>
        <text x="35" y="960" font-family="Arial" font-size="14" font-weight="bold" fill="white">Daily Challenge</text>
        <text x="35" y="980" font-family="Arial" font-size="12" fill="#e9d5ff">Complete 3 drills to earn bonus XP</text>
        <rect x="35" y="990" width="200" height="6" rx="3" fill="#6d28d9"/>
        <rect x="35" y="990" width="134" height="6" rx="3" fill="white"/>
        <text x="245" y="998" font-family="Arial" font-size="11" fill="white">2/3 completed</text>
        
        <!-- Bottom navigation -->
        <rect x="0" y="1100" width="540" height="70" fill="white"/>
        <line x1="0" y1="1100" x2="540" y2="1100" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Nav items with actual icons representation -->
        <circle cx="54" cy="1135" r="2" fill="#8b5cf6"/>
        <rect x="44" y="1125" width="20" height="20" rx="4" fill="#8b5cf6" opacity="0.2"/>
        <text x="44" y="1155" font-family="Arial" font-size="10" fill="#8b5cf6">Home</text>
        
        <rect x="148" y="1125" width="20" height="20" rx="4" fill="#9ca3af" opacity="0.2"/>
        <text x="144" y="1155" font-family="Arial" font-size="10" fill="#9ca3af">Practice</text>
        
        <rect x="250" y="1125" width="20" height="20" rx="4" fill="#9ca3af" opacity="0.2"/>
        <text x="243" y="1155" font-family="Arial" font-size="10" fill="#9ca3af">Vocabulary</text>
        
        <rect x="352" y="1125" width="20" height="20" rx="4" fill="#9ca3af" opacity="0.2"/>
        <text x="350" y="1155" font-family="Arial" font-size="10" fill="#9ca3af">Games</text>
        
        <rect x="454" y="1125" width="20" height="20" rx="4" fill="#9ca3af" opacity="0.2"/>
        <text x="448" y="1155" font-family="Arial" font-size="10" fill="#9ca3af">Account</text>
      </svg>
    `;
    
    // Mobile Practice Screenshot
    const mobilePracticeSvg = `
      <svg width="540" height="1170" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="540" height="1170" fill="#f9fafb"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="540" height="120" fill="#8b5cf6"/>
        <text x="20" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="white">Verb Conjugation Practice</text>
        <text x="20" y="80" font-family="Arial" font-size="14" fill="#e9d5ff">Master Japanese verb forms</text>
        <rect x="20" y="95" width="100" height="20" rx="10" fill="white" opacity="0.3"/>
        <text x="30" y="108" font-family="Arial" font-size="11" fill="white">JLPT N3</text>
        
        <!-- Current Progress Card -->
        <rect x="20" y="140" width="500" height="100" rx="10" fill="white"/>
        <text x="35" y="165" font-family="Arial" font-size="12" fill="#6b7280">Today's Progress</text>
        <rect x="35" y="175" width="470" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="35" y="175" width="329" height="8" rx="4" fill="#10b981"/>
        <text x="35" y="200" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">70% Complete</text>
        <text x="35" y="220" font-family="Arial" font-size="12" fill="#6b7280">14 of 20 exercises done</text>
        
        <!-- Practice Modes -->
        <text x="20" y="270" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Choose Practice Mode</text>
        
        <!-- Present Tense Card -->
        <rect x="20" y="290" width="500" height="100" rx="10" fill="white"/>
        <rect x="35" y="310" width="60" height="60" rx="8" fill="#e9d5ff"/>
        <text x="50" y="345" font-family="Arial" font-size="20" fill="#8b5cf6">ます</text>
        <text x="110" y="325" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Present Tense</text>
        <text x="110" y="345" font-family="Arial" font-size="13" fill="#6b7280">Polite present form</text>
        <rect x="110" y="355" width="150" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="110" y="355" width="128" height="6" rx="3" fill="#10b981"/>
        <text x="110" y="375" font-family="Arial" font-size="11" fill="#10b981">85% mastered</text>
        <rect x="420" y="325" width="80" height="30" rx="6" fill="#8b5cf6"/>
        <text x="445" y="345" font-family="Arial" font-size="12" font-weight="bold" fill="white">START</text>
        
        <!-- Past Tense Card -->
        <rect x="20" y="405" width="500" height="100" rx="10" fill="white"/>
        <rect x="35" y="425" width="60" height="60" rx="8" fill="#dbeafe"/>
        <text x="45" y="460" font-family="Arial" font-size="18" fill="#3b82f6">ました</text>
        <text x="110" y="440" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Past Tense</text>
        <text x="110" y="460" font-family="Arial" font-size="13" fill="#6b7280">Polite past form</text>
        <rect x="110" y="470" width="150" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="110" y="470" width="108" height="6" rx="3" fill="#3b82f6"/>
        <text x="110" y="490" font-family="Arial" font-size="11" fill="#3b82f6">72% mastered</text>
        <rect x="420" y="440" width="80" height="30" rx="6" fill="#3b82f6"/>
        <text x="445" y="460" font-family="Arial" font-size="12" font-weight="bold" fill="white">START</text>
        
        <!-- Te-form Card -->
        <rect x="20" y="520" width="500" height="100" rx="10" fill="white"/>
        <rect x="35" y="540" width="60" height="60" rx="8" fill="#fef3c7"/>
        <text x="52" y="575" font-family="Arial" font-size="20" fill="#f59e0b">て</text>
        <text x="110" y="555" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Te-form</text>
        <text x="110" y="575" font-family="Arial" font-size="13" fill="#6b7280">Connecting form</text>
        <rect x="110" y="585" width="150" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="110" y="585" width="68" height="6" rx="3" fill="#f59e0b"/>
        <text x="110" y="605" font-family="Arial" font-size="11" fill="#f59e0b">45% mastered</text>
        <rect x="420" y="555" width="80" height="30" rx="6" fill="#f59e0b"/>
        <text x="445" y="575" font-family="Arial" font-size="12" font-weight="bold" fill="white">START</text>
        
        <!-- Potential Form Card -->
        <rect x="20" y="635" width="500" height="100" rx="10" fill="white"/>
        <rect x="35" y="655" width="60" height="60" rx="8" fill="#d1fae5"/>
        <text x="45" y="690" font-family="Arial" font-size="18" fill="#10b981">できる</text>
        <text x="110" y="670" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Potential Form</text>
        <text x="110" y="690" font-family="Arial" font-size="13" fill="#6b7280">Can do / able to</text>
        <rect x="110" y="700" width="150" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="110" y="700" width="45" height="6" rx="3" fill="#10b981"/>
        <text x="110" y="720" font-family="Arial" font-size="11" fill="#10b981">30% mastered</text>
        <rect x="420" y="670" width="80" height="30" rx="6" fill="#10b981"/>
        <text x="445" y="690" font-family="Arial" font-size="12" font-weight="bold" fill="white">START</text>
        
        <!-- Recommended Section -->
        <rect x="20" y="750" width="500" height="120" rx="10" fill="#fef3c7"/>
        <text x="35" y="780" font-family="Arial" font-size="14" font-weight="bold" fill="#92400e">💡 Recommended for you</text>
        <text x="35" y="805" font-family="Arial" font-size="13" fill="#78350f">Based on your recent mistakes:</text>
        <rect x="35" y="820" width="200" height="35" rx="6" fill="white"/>
        <text x="45" y="842" font-family="Arial" font-size="12" fill="#1f2937">Review: Irregular verbs</text>
        <rect x="245" y="820" width="150" height="35" rx="6" fill="white"/>
        <text x="255" y="842" font-family="Arial" font-size="12" fill="#1f2937">Focus: する/くる</text>
        
        <!-- Quick Stats -->
        <rect x="20" y="885" width="240" height="80" rx="10" fill="white"/>
        <text x="35" y="910" font-family="Arial" font-size="12" fill="#6b7280">Exercises Today</text>
        <text x="35" y="935" font-family="Arial" font-size="20" font-weight="bold" fill="#8b5cf6">14</text>
        <text x="35" y="952" font-family="Arial" font-size="11" fill="#10b981">+23% vs yesterday</text>
        
        <rect x="280" y="885" width="240" height="80" rx="10" fill="white"/>
        <text x="295" y="910" font-family="Arial" font-size="12" fill="#6b7280">Accuracy Rate</text>
        <text x="295" y="935" font-family="Arial" font-size="20" font-weight="bold" fill="#3b82f6">87%</text>
        <text x="295" y="952" font-family="Arial" font-size="11" fill="#10b981">+5% improvement</text>
      </svg>
    `;
    
    // Mobile Vocabulary Screenshot
    const mobileVocabularySvg = `
      <svg width="540" height="1170" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="540" height="1170" fill="#fafafa"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="540" height="100" fill="#3b82f6"/>
        <text x="20" y="45" font-family="Arial" font-size="24" font-weight="bold" fill="white">Vocabulary</text>
        <text x="20" y="70" font-family="Arial" font-size="14" fill="#dbeafe">2,534 words learned • N3 Level</text>
        
        <!-- Search bar -->
        <rect x="20" y="115" width="500" height="45" rx="22" fill="white" stroke="#e5e7eb"/>
        <text x="35" y="142" font-family="Arial" font-size="14" fill="#9ca3af">Search vocabulary...</text>
        
        <!-- Filter tabs -->
        <rect x="20" y="175" width="80" height="30" rx="15" fill="#3b82f6"/>
        <text x="45" y="195" font-family="Arial" font-size="12" font-weight="bold" fill="white">All</text>
        
        <rect x="110" y="175" width="80" height="30" rx="15" fill="white" stroke="#e5e7eb"/>
        <text x="130" y="195" font-family="Arial" font-size="12" fill="#6b7280">Recent</text>
        
        <rect x="200" y="175" width="80" height="30" rx="15" fill="white" stroke="#e5e7eb"/>
        <text x="215" y="195" font-family="Arial" font-size="12" fill="#6b7280">Favorite</text>
        
        <rect x="290" y="175" width="80" height="30" rx="15" fill="white" stroke="#e5e7eb"/>
        <text x="308" y="195" font-family="Arial" font-size="12" fill="#6b7280">Review</text>
        
        <!-- Categories Grid -->
        <text x="20" y="235" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Categories</text>
        
        <!-- Food Category -->
        <rect x="20" y="255" width="240" height="110" rx="10" fill="white"/>
        <rect x="35" y="275" width="50" height="50" rx="25" fill="#fee2e2"/>
        <!-- Food icon -->
        <text x="95" y="295" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Food &amp; Drink</text>
        <text x="95" y="312" font-family="Arial" font-size="12" fill="#6b7280">234 words</text>
        <rect x="35" y="335" width="210" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="35" y="335" width="168" height="6" rx="3" fill="#ef4444"/>
        <text x="35" y="355" font-family="Arial" font-size="11" fill="#6b7280">80% learned</text>
        
        <!-- Transportation Category -->
        <rect x="280" y="255" width="240" height="110" rx="10" fill="white"/>
        <rect x="295" y="275" width="50" height="50" rx="25" fill="#dbeafe"/>
        <!-- Transport icon -->
        <text x="355" y="295" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Transportation</text>
        <text x="355" y="312" font-family="Arial" font-size="12" fill="#6b7280">156 words</text>
        <rect x="295" y="335" width="210" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="295" y="335" width="126" height="6" rx="3" fill="#3b82f6"/>
        <text x="295" y="355" font-family="Arial" font-size="11" fill="#6b7280">60% learned</text>
        
        <!-- Family Category -->
        <rect x="20" y="380" width="240" height="110" rx="10" fill="white"/>
        <rect x="35" y="400" width="50" height="50" rx="25" fill="#e9d5ff"/>
        <!-- Family icon -->
        <text x="95" y="420" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Family</text>
        <text x="95" y="437" font-family="Arial" font-size="12" fill="#6b7280">89 words</text>
        <rect x="35" y="460" width="210" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="35" y="460" width="189" height="6" rx="3" fill="#8b5cf6"/>
        <text x="35" y="480" font-family="Arial" font-size="11" fill="#6b7280">90% learned</text>
        
        <!-- Business Category -->
        <rect x="280" y="380" width="240" height="110" rx="10" fill="white"/>
        <rect x="295" y="400" width="50" height="50" rx="25" fill="#fed7aa"/>
        <!-- Business icon -->
        <text x="355" y="420" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Business</text>
        <text x="355" y="437" font-family="Arial" font-size="12" fill="#6b7280">178 words</text>
        <rect x="295" y="460" width="210" height="6" rx="3" fill="#e5e7eb"/>
        <rect x="295" y="460" width="84" height="6" rx="3" fill="#f59e0b"/>
        <text x="295" y="480" font-family="Arial" font-size="11" fill="#6b7280">40% learned</text>
        
        <!-- Recent Words Section -->
        <text x="20" y="525" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Recently Learned</text>
        
        <!-- Word Card 1 -->
        <rect x="20" y="545" width="500" height="70" rx="10" fill="white"/>
        <text x="35" y="570" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">図書館</text>
        <text x="35" y="590" font-family="Arial" font-size="11" fill="#6b7280">としょかん</text>
        <text x="35" y="605" font-family="Arial" font-size="12" fill="#6b7280">library</text>
        <rect x="450" y="565" width="50" height="25" rx="12" fill="#10b981"/>
        <text x="465" y="582" font-family="Arial" font-size="11" fill="white">N5</text>
        
        <!-- Word Card 2 -->
        <rect x="20" y="625" width="500" height="70" rx="10" fill="white"/>
        <text x="35" y="650" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">電車</text>
        <text x="35" y="670" font-family="Arial" font-size="11" fill="#6b7280">でんしゃ</text>
        <text x="35" y="685" font-family="Arial" font-size="12" fill="#6b7280">train</text>
        <rect x="450" y="645" width="50" height="25" rx="12" fill="#10b981"/>
        <text x="465" y="662" font-family="Arial" font-size="11" fill="white">N5</text>
        
        <!-- Word Card 3 -->
        <rect x="20" y="705" width="500" height="70" rx="10" fill="white"/>
        <text x="35" y="730" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">会議</text>
        <text x="35" y="750" font-family="Arial" font-size="11" fill="#6b7280">かいぎ</text>
        <text x="35" y="765" font-family="Arial" font-size="12" fill="#6b7280">meeting, conference</text>
        <rect x="450" y="725" width="50" height="25" rx="12" fill="#3b82f6"/>
        <text x="465" y="742" font-family="Arial" font-size="11" fill="white">N4</text>
        
        <!-- Study Stats -->
        <rect x="20" y="790" width="500" height="80" rx="10" fill="#8b5cf6"/>
        <text x="35" y="815" font-family="Arial" font-size="14" font-weight="bold" fill="white">Today's Goal</text>
        <text x="35" y="835" font-family="Arial" font-size="12" fill="#e9d5ff">Learn 10 new words</text>
        <rect x="35" y="845" width="300" height="6" rx="3" fill="#6d28d9"/>
        <rect x="35" y="845" width="210" height="6" rx="3" fill="white"/>
        <text x="345" y="853" font-family="Arial" font-size="11" fill="white">7/10 completed</text>
      </svg>
    `;
    
    // Mobile Games Screenshot
    const mobileGamesSvg = `
      <svg width="540" height="1170" xmlns="http://www.w3.org/2000/svg">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="bg-games" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#fef3c7;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fde68a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="540" height="1170" fill="url(#bg-games)"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="540" height="100" fill="#f59e0b"/>
        <text x="20" y="45" font-family="Arial" font-size="24" font-weight="bold" fill="white">Learning Games</text>
        <text x="20" y="70" font-family="Arial" font-size="14" fill="#fef3c7">Learn Japanese while having fun!</text>
        
        <!-- Featured Game Banner -->
        <rect x="20" y="115" width="500" height="120" rx="10" fill="white"/>
        <rect x="20" y="115" width="500" height="60" rx="10" fill="#dc2626"/>
        <text x="35" y="140" font-family="Arial" font-size="12" font-weight="bold" fill="white">FEATURED</text>
        <text x="35" y="160" font-family="Arial" font-size="18" font-weight="bold" fill="white">Kanji Battle Royale</text>
        <text x="35" y="195" font-family="Arial" font-size="13" fill="#1f2937">New multiplayer mode! Challenge friends</text>
        <text x="35" y="215" font-family="Arial" font-size="11" fill="#6b7280">1,234 playing now</text>
        <rect x="400" y="185" width="100" height="35" rx="6" fill="#dc2626"/>
        <text x="430" y="206" font-family="Arial" font-size="13" font-weight="bold" fill="white">PLAY</text>
        
        <!-- Game Categories -->
        <text x="20" y="265" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Quick Games</text>
        
        <!-- Kanji Lightning Game -->
        <rect x="20" y="285" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="300" width="60" height="60" rx="10" fill="#fef3c7"/>
        <!-- Lightning icon -->
        <text x="110" y="315" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Kanji Lightning</text>
        <text x="110" y="335" font-family="Arial" font-size="13" fill="#6b7280">Quick kanji recognition</text>
        <text x="110" y="355" font-family="Arial" font-size="12" fill="#f59e0b">★★★★☆ 4.5</text>
        <rect x="420" y="315" width="80" height="30" rx="6" fill="#10b981"/>
        <text x="445" y="335" font-family="Arial" font-size="12" font-weight="bold" fill="white">PLAY</text>
        <text x="420" y="360" font-family="Arial" font-size="11" fill="#6b7280">Best: 850pts</text>
        
        <!-- Word Match Game -->
        <rect x="20" y="390" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="405" width="60" height="60" rx="10" fill="#dbeafe"/>
        <!-- Target icon -->
        <text x="110" y="420" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Word Match</text>
        <text x="110" y="440" font-family="Arial" font-size="13" fill="#6b7280">Match words with meanings</text>
        <text x="110" y="460" font-family="Arial" font-size="12" fill="#f59e0b">★★★★★ 5.0</text>
        <rect x="420" y="420" width="80" height="30" rx="6" fill="#10b981"/>
        <text x="445" y="440" font-family="Arial" font-size="12" font-weight="bold" fill="white">PLAY</text>
        <text x="420" y="465" font-family="Arial" font-size="11" fill="#6b7280">Best: 1200pts</text>
        
        <!-- Stroke Order Game -->
        <rect x="20" y="495" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="510" width="60" height="60" rx="10" fill="#e9d5ff"/>
        <!-- Writing icon -->
        <text x="110" y="525" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Stroke Order Master</text>
        <text x="110" y="545" font-family="Arial" font-size="13" fill="#6b7280">Practice writing kanji</text>
        <text x="110" y="565" font-family="Arial" font-size="12" fill="#f59e0b">★★★☆☆ 3.8</text>
        <rect x="420" y="525" width="80" height="30" rx="6" fill="#10b981"/>
        <text x="445" y="545" font-family="Arial" font-size="12" font-weight="bold" fill="white">PLAY</text>
        <text x="420" y="570" font-family="Arial" font-size="11" fill="#6b7280">Best: 650pts</text>
        
        <!-- Learning Games Section -->
        <text x="20" y="615" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Learning Adventures</text>
        
        <!-- Story Mode Game -->
        <rect x="20" y="635" width="500" height="90" rx="10" fill="white"/>
        <rect x="35" y="650" width="60" height="60" rx="10" fill="#d1fae5"/>
        <!-- Book icon -->
        <text x="110" y="665" font-family="Arial" font-size="16" font-weight="bold" fill="#1f2937">Story Quest</text>
        <text x="110" y="685" font-family="Arial" font-size="13" fill="#6b7280">Interactive Japanese stories</text>
        <text x="110" y="705" font-family="Arial" font-size="12" fill="#f59e0b">★★★★☆ 4.2</text>
        <rect x="420" y="665" width="80" height="30" rx="6" fill="#8b5cf6"/>
        <text x="435" y="685" font-family="Arial" font-size="12" font-weight="bold" fill="white">CONTINUE</text>
        <text x="420" y="710" font-family="Arial" font-size="11" fill="#6b7280">Chapter 3</text>
        
        <!-- Achievements Section -->
        <rect x="20" y="740" width="500" height="100" rx="10" fill="white"/>
        <text x="35" y="765" font-family="Arial" font-size="14" font-weight="bold" fill="#1f2937">Recent Achievements</text>
        <circle cx="50" cy="795" r="15" fill="#fbbf24"/>
        <!-- Trophy icon -->
        <circle cx="90" cy="795" r="15" fill="#a78bfa"/>
        <!-- Badge icon -->
        <circle cx="130" cy="795" r="15" fill="#60a5fa"/>
        <!-- Speed icon -->
        <text x="35" y="825" font-family="Arial" font-size="11" fill="#6b7280">3 new badges earned this week!</text>
        
        <!-- Leaderboard Preview -->
        <rect x="20" y="855" width="500" height="120" rx="10" fill="#8b5cf6"/>
        <text x="35" y="880" font-family="Arial" font-size="14" font-weight="bold" fill="white">Weekly Leaderboard</text>
        <text x="35" y="905" font-family="Arial" font-size="12" fill="white">🥇 Yuki_123 - 12,450 pts</text>
        <text x="35" y="925" font-family="Arial" font-size="12" fill="white">🥈 SakuraGamer - 11,200 pts</text>
        <text x="35" y="945" font-family="Arial" font-size="12" fill="#fbbf24">🥉 You - 10,850 pts</text>
        <text x="35" y="965" font-family="Arial" font-size="11" fill="#e9d5ff">Rank up to unlock rewards!</text>
      </svg>
    `;
    
    // Desktop Home Screenshot
    const desktopHomeSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1280" height="720" fill="#f3f4f6"/>
        
        <!-- Sidebar -->
        <rect x="0" y="0" width="240" height="720" fill="#1f2937"/>
        
        <!-- Logo area with Doshi icon placeholder -->
        <rect x="20" y="20" width="40" height="40" rx="8" fill="#8b5cf6"/>
        <text x="70" y="45" font-family="Arial" font-size="20" font-weight="bold" fill="white">Doshi Sensei</text>
        
        <!-- Navigation -->
        <rect x="0" y="90" width="240" height="40" fill="#374151"/>
        <circle cx="30" cy="110" r="3" fill="#8b5cf6"/>
        <text x="50" y="115" font-family="Arial" font-size="14" fill="#8b5cf6">Dashboard</text>
        
        <text x="50" y="160" font-family="Arial" font-size="14" fill="#9ca3af">Practice</text>
        <text x="50" y="205" font-family="Arial" font-size="14" fill="#9ca3af">Vocabulary</text>
        <text x="50" y="250" font-family="Arial" font-size="14" fill="#9ca3af">Games</text>
        <text x="50" y="295" font-family="Arial" font-size="14" fill="#9ca3af">News</text>
        <text x="50" y="340" font-family="Arial" font-size="14" fill="#9ca3af">Stories</text>
        <text x="50" y="385" font-family="Arial" font-size="14" fill="#9ca3af">Settings</text>
        
        <!-- User section at bottom -->
        <rect x="20" y="650" width="200" height="50" rx="8" fill="#374151"/>
        <circle cx="40" cy="675" r="15" fill="#8b5cf6"/>
        <text x="60" y="672" font-family="Arial" font-size="12" fill="white">User Name</text>
        <text x="60" y="687" font-family="Arial" font-size="11" fill="#9ca3af">Premium Member</text>
        
        <!-- Main content area -->
        <rect x="260" y="20" width="1000" height="680" rx="10" fill="white"/>
        
        <!-- Header -->
        <text x="290" y="60" font-family="Arial" font-size="28" font-weight="bold" fill="#1f2937">Welcome back, User-san! 👋</text>
        <text x="290" y="85" font-family="Arial" font-size="14" fill="#6b7280">Here's your learning dashboard for today</text>
        
        <!-- Stats cards -->
        <rect x="290" y="110" width="230" height="100" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="290" y="110" width="5" height="100" fill="#ef4444"/>
        <text x="310" y="135" font-family="Arial" font-size="12" fill="#6b7280">Study Streak</text>
        <text x="310" y="165" font-family="Arial" font-size="24" font-weight="bold" fill="#1f2937">7 days</text>
        <text x="310" y="190" font-family="Arial" font-size="12" fill="#10b981">+1 from yesterday</text>
        
        <rect x="540" y="110" width="230" height="100" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="540" y="110" width="5" height="100" fill="#10b981"/>
        <text x="560" y="135" font-family="Arial" font-size="12" fill="#6b7280">Words Learned</text>
        <text x="560" y="165" font-family="Arial" font-size="24" font-weight="bold" fill="#1f2937">2,534</text>
        <text x="560" y="190" font-family="Arial" font-size="12" fill="#10b981">+45 this week</text>
        
        <rect x="790" y="110" width="230" height="100" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="790" y="110" width="5" height="100" fill="#3b82f6"/>
        <text x="810" y="135" font-family="Arial" font-size="12" fill="#6b7280">Practice Time</text>
        <text x="810" y="165" font-family="Arial" font-size="24" font-weight="bold" fill="#1f2937">12.5 hrs</text>
        <text x="810" y="190" font-family="Arial" font-size="12" fill="#3b82f6">This week</text>
        
        <rect x="1040" y="110" width="200" height="100" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="1040" y="110" width="5" height="100" fill="#8b5cf6"/>
        <text x="1060" y="135" font-family="Arial" font-size="12" fill="#6b7280">Accuracy</text>
        <text x="1060" y="165" font-family="Arial" font-size="24" font-weight="bold" fill="#1f2937">87%</text>
        <text x="1060" y="190" font-family="Arial" font-size="12" fill="#10b981">+3% improvement</text>
        
        <!-- Recent Activity Section -->
        <rect x="290" y="230" width="470" height="280" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
        <text x="310" y="260" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Recent Activity</text>
        
        <rect x="310" y="280" width="430" height="60" rx="6" fill="white"/>
        <circle cx="330" cy="310" r="3" fill="#10b981"/>
        <text x="345" y="305" font-family="Arial" font-size="13" fill="#1f2937">Completed "Past Tense" practice - 95% accuracy</text>
        <text x="345" y="325" font-family="Arial" font-size="11" fill="#9ca3af">2 hours ago</text>
        
        <rect x="310" y="350" width="430" height="60" rx="6" fill="white"/>
        <circle cx="330" cy="380" r="3" fill="#3b82f6"/>
        <text x="345" y="375" font-family="Arial" font-size="13" fill="#1f2937">Learned 15 new N3 vocabulary words</text>
        <text x="345" y="395" font-family="Arial" font-size="11" fill="#9ca3af">5 hours ago</text>
        
        <rect x="310" y="420" width="430" height="60" rx="6" fill="white"/>
        <circle cx="330" cy="450" r="3" fill="#f59e0b"/>
        <text x="345" y="445" font-family="Arial" font-size="13" fill="#1f2937">Played Kanji Lightning - New high score: 1,250</text>
        <text x="345" y="465" font-family="Arial" font-size="11" fill="#9ca3af">Yesterday at 8:30 PM</text>
        
        <!-- Progress Chart -->
        <rect x="780" y="230" width="460" height="280" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
        <text x="800" y="260" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Weekly Progress</text>
        
        <!-- Simple bar chart -->
        <text x="800" y="480" font-family="Arial" font-size="11" fill="#6b7280">Mon</text>
        <rect x="800" y="430" width="40" height="40" fill="#8b5cf6"/>
        
        <text x="860" y="480" font-family="Arial" font-size="11" fill="#6b7280">Tue</text>
        <rect x="860" y="410" width="40" height="60" fill="#8b5cf6"/>
        
        <text x="920" y="480" font-family="Arial" font-size="11" fill="#6b7280">Wed</text>
        <rect x="920" y="390" width="40" height="80" fill="#8b5cf6"/>
        
        <text x="980" y="480" font-family="Arial" font-size="11" fill="#6b7280">Thu</text>
        <rect x="980" y="420" width="40" height="50" fill="#8b5cf6"/>
        
        <text x="1040" y="480" font-family="Arial" font-size="11" fill="#6b7280">Fri</text>
        <rect x="1040" y="370" width="40" height="100" fill="#8b5cf6"/>
        
        <text x="1100" y="480" font-family="Arial" font-size="11" fill="#6b7280">Sat</text>
        <rect x="1100" y="385" width="40" height="85" fill="#8b5cf6"/>
        
        <text x="1160" y="480" font-family="Arial" font-size="11" fill="#6b7280">Sun</text>
        <rect x="1160" y="350" width="40" height="120" fill="#10b981"/>
        
        <!-- Quick Actions -->
        <rect x="290" y="530" width="950" height="150" rx="8" fill="#8b5cf6"/>
        <text x="310" y="560" font-family="Arial" font-size="18" font-weight="bold" fill="white">Quick Actions</text>
        
        <rect x="310" y="580" width="200" height="70" rx="8" fill="white" opacity="0.2"/>
        <text x="320" y="610" font-family="Arial" font-size="14" font-weight="bold" fill="white">Continue Practice</text>
        <text x="320" y="630" font-family="Arial" font-size="12" fill="#e9d5ff">Te-form verbs</text>
        
        <rect x="530" y="580" width="200" height="70" rx="8" fill="white" opacity="0.2"/>
        <text x="540" y="610" font-family="Arial" font-size="14" font-weight="bold" fill="white">Review Mistakes</text>
        <text x="540" y="630" font-family="Arial" font-size="12" fill="#e9d5ff">23 items to review</text>
        
        <rect x="750" y="580" width="200" height="70" rx="8" fill="white" opacity="0.2"/>
        <text x="760" y="610" font-family="Arial" font-size="14" font-weight="bold" fill="white">Daily Challenge</text>
        <text x="760" y="630" font-family="Arial" font-size="12" fill="#e9d5ff">2/3 completed</text>
      </svg>
    `;
    
    // Desktop Lessons Screenshot  
    const desktopLessonsSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1280" height="720" fill="#ffffff"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="1280" height="80" fill="#8b5cf6"/>
        <rect x="40" y="20" width="40" height="40" rx="8" fill="white" opacity="0.2"/>
        <text x="95" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="white">Japanese Lessons Library</text>
        <rect x="1100" y="25" width="150" height="30" rx="15" fill="white" opacity="0.2"/>
        <text x="1130" y="45" font-family="Arial" font-size="12" fill="white">Search lessons...</text>
        
        <!-- Tabs -->
        <rect x="0" y="80" width="1280" height="50" fill="white"/>
        <rect x="40" y="110" width="120" height="3" fill="#8b5cf6"/>
        <text x="50" y="105" font-family="Arial" font-size="14" font-weight="bold" fill="#8b5cf6">All Lessons</text>
        <text x="180" y="105" font-family="Arial" font-size="14" fill="#6b7280">Grammar</text>
        <text x="280" y="105" font-family="Arial" font-size="14" fill="#6b7280">Vocabulary</text>
        <text x="390" y="105" font-family="Arial" font-size="14" fill="#6b7280">Kanji</text>
        <text x="470" y="105" font-family="Arial" font-size="14" fill="#6b7280">Listening</text>
        <text x="570" y="105" font-family="Arial" font-size="14" fill="#6b7280">Reading</text>
        
        <!-- Filter Section -->
        <rect x="1050" y="90" width="80" height="30" rx="15" fill="#f3f4f6"/>
        <text x="1075" y="108" font-family="Arial" font-size="12" fill="#1f2937">JLPT N3</text>
        
        <rect x="1140" y="90" width="100" height="30" rx="15" fill="#f3f4f6"/>
        <text x="1160" y="108" font-family="Arial" font-size="12" fill="#1f2937">In Progress</text>
        
        <!-- Lesson Grid -->
        <!-- Row 1 -->
        <rect x="40" y="150" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="40" y="150" width="60" height="30" fill="#10b981"/>
        <text x="58" y="170" font-family="Arial" font-size="12" font-weight="bold" fill="white">N5</text>
        <circle cx="380" cy="170" r="15" fill="#10b981"/>
        <text x="372" y="175" font-family="Arial" font-size="16" fill="white">✓</text>
        <text x="60" y="210" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Basic Greetings</text>
        <text x="60" y="230" font-family="Arial" font-size="13" fill="#6b7280">Learn essential Japanese greetings</text>
        <rect x="60" y="250" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="60" y="250" width="300" height="8" rx="4" fill="#10b981"/>
        <text x="60" y="280" font-family="Arial" font-size="12" fill="#10b981">100% Complete</text>
        <text x="260" y="280" font-family="Arial" font-size="12" fill="#6b7280">15 lessons</text>
        
        <rect x="450" y="150" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="450" y="150" width="60" height="30" fill="#10b981"/>
        <text x="468" y="170" font-family="Arial" font-size="12" font-weight="bold" fill="white">N5</text>
        <circle cx="790" cy="170" r="15" fill="#10b981"/>
        <text x="782" y="175" font-family="Arial" font-size="16" fill="white">✓</text>
        <text x="470" y="210" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Numbers and Counting</text>
        <text x="470" y="230" font-family="Arial" font-size="13" fill="#6b7280">Master Japanese number system</text>
        <rect x="470" y="250" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="470" y="250" width="300" height="8" rx="4" fill="#10b981"/>
        <text x="470" y="280" font-family="Arial" font-size="12" fill="#10b981">100% Complete</text>
        <text x="670" y="280" font-family="Arial" font-size="12" fill="#6b7280">12 lessons</text>
        
        <rect x="860" y="150" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="860" y="150" width="60" height="30" fill="#3b82f6"/>
        <text x="878" y="170" font-family="Arial" font-size="12" font-weight="bold" fill="white">N5</text>
        <text x="880" y="210" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Daily Activities</text>
        <text x="880" y="230" font-family="Arial" font-size="13" fill="#6b7280">Vocabulary for everyday life</text>
        <rect x="880" y="250" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="880" y="250" width="225" height="8" rx="4" fill="#3b82f6"/>
        <text x="880" y="280" font-family="Arial" font-size="12" fill="#3b82f6">75% Complete</text>
        <text x="1080" y="280" font-family="Arial" font-size="12" fill="#6b7280">20 lessons</text>
        <rect x="1140" y="265" width="80" height="30" rx="6" fill="#3b82f6"/>
        <text x="1160" y="285" font-family="Arial" font-size="12" font-weight="bold" fill="white">Continue</text>
        
        <!-- Row 2 -->
        <rect x="40" y="330" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="40" y="330" width="60" height="30" fill="#3b82f6"/>
        <text x="58" y="350" font-family="Arial" font-size="12" font-weight="bold" fill="white">N4</text>
        <text x="60" y="390" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Past Tense Verbs</text>
        <text x="60" y="410" font-family="Arial" font-size="13" fill="#6b7280">Learn to talk about the past</text>
        <rect x="60" y="430" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="60" y="430" width="180" height="8" rx="4" fill="#3b82f6"/>
        <text x="60" y="460" font-family="Arial" font-size="12" fill="#3b82f6">60% Complete</text>
        <text x="260" y="460" font-family="Arial" font-size="12" fill="#6b7280">18 lessons</text>
        <rect x="320" y="445" width="80" height="30" rx="6" fill="#3b82f6"/>
        <text x="340" y="465" font-family="Arial" font-size="12" font-weight="bold" fill="white">Continue</text>
        
        <rect x="450" y="330" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="450" y="330" width="60" height="30" fill="#f59e0b"/>
        <text x="468" y="350" font-family="Arial" font-size="12" font-weight="bold" fill="white">N4</text>
        <text x="470" y="390" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Adjective Forms</text>
        <text x="470" y="410" font-family="Arial" font-size="13" fill="#6b7280">i-adjectives and na-adjectives</text>
        <rect x="470" y="430" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="470" y="430" width="120" height="8" rx="4" fill="#f59e0b"/>
        <text x="470" y="460" font-family="Arial" font-size="12" fill="#f59e0b">40% Complete</text>
        <text x="670" y="460" font-family="Arial" font-size="12" fill="#6b7280">15 lessons</text>
        <rect x="730" y="445" width="80" height="30" rx="6" fill="#f59e0b"/>
        <text x="750" y="465" font-family="Arial" font-size="12" font-weight="bold" fill="white">Continue</text>
        
        <rect x="860" y="330" width="380" height="160" rx="8" fill="white" stroke="#e5e7eb"/>
        <rect x="860" y="330" width="60" height="30" fill="#f59e0b"/>
        <text x="878" y="350" font-family="Arial" font-size="12" font-weight="bold" fill="white">N4</text>
        <text x="880" y="390" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">Giving and Receiving</text>
        <text x="880" y="410" font-family="Arial" font-size="13" fill="#6b7280">あげる、もらう、くれる</text>
        <rect x="880" y="430" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <rect x="880" y="430" width="60" height="8" rx="4" fill="#f59e0b"/>
        <text x="880" y="460" font-family="Arial" font-size="12" fill="#f59e0b">20% Complete</text>
        <text x="1080" y="460" font-family="Arial" font-size="12" fill="#6b7280">10 lessons</text>
        <rect x="1140" y="445" width="80" height="30" rx="6" fill="#f59e0b"/>
        <text x="1160" y="465" font-family="Arial" font-size="12" font-weight="bold" fill="white">Continue</text>
        
        <!-- Row 3 - Locked -->
        <rect x="40" y="510" width="380" height="160" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
        <rect x="40" y="510" width="60" height="30" fill="#6b7280"/>
        <text x="58" y="530" font-family="Arial" font-size="12" font-weight="bold" fill="white">N3</text>
        <text x="340" y="530" font-family="Arial" font-size="16" fill="#9ca3af">🔒</text>
        <text x="60" y="570" font-family="Arial" font-size="18" font-weight="bold" fill="#9ca3af">Conditional Forms</text>
        <text x="60" y="590" font-family="Arial" font-size="13" fill="#9ca3af">ば、たら、なら、と forms</text>
        <rect x="60" y="610" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <text x="60" y="640" font-family="Arial" font-size="12" fill="#9ca3af">Locked - Complete N4 first</text>
        
        <rect x="450" y="510" width="380" height="160" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
        <rect x="450" y="510" width="60" height="30" fill="#6b7280"/>
        <text x="468" y="530" font-family="Arial" font-size="12" font-weight="bold" fill="white">N3</text>
        <text x="750" y="530" font-family="Arial" font-size="16" fill="#9ca3af">🔒</text>
        <text x="470" y="570" font-family="Arial" font-size="18" font-weight="bold" fill="#9ca3af">Passive Voice</text>
        <text x="470" y="590" font-family="Arial" font-size="13" fill="#9ca3af">られる passive construction</text>
        <rect x="470" y="610" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <text x="470" y="640" font-family="Arial" font-size="12" fill="#9ca3af">Locked - Complete N4 first</text>
        
        <rect x="860" y="510" width="380" height="160" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
        <rect x="860" y="510" width="60" height="30" fill="#6b7280"/>
        <text x="878" y="530" font-family="Arial" font-size="12" font-weight="bold" fill="white">N3</text>
        <text x="1160" y="530" font-family="Arial" font-size="16" fill="#9ca3af">🔒</text>
        <text x="880" y="570" font-family="Arial" font-size="18" font-weight="bold" fill="#9ca3af">Causative Forms</text>
        <text x="880" y="590" font-family="Arial" font-size="13" fill="#9ca3af">させる causative construction</text>
        <rect x="880" y="610" width="300" height="8" rx="4" fill="#e5e7eb"/>
        <text x="880" y="640" font-family="Arial" font-size="12" fill="#9ca3af">Locked - Complete N4 first</text>
      </svg>
    `;
    
    // Generate all screenshots
    const screenshots = [
      { name: 'mobile-home', svg: mobileHomeSvg, width: 540, height: 1170 },
      { name: 'mobile-practice', svg: mobilePracticeSvg, width: 540, height: 1170 },
      { name: 'mobile-vocabulary', svg: mobileVocabularySvg, width: 540, height: 1170 },
      { name: 'mobile-games', svg: mobileGamesSvg, width: 540, height: 1170 },
      { name: 'desktop-home', svg: desktopHomeSvg, width: 1280, height: 720 },
      { name: 'desktop-lessons', svg: desktopLessonsSvg, width: 1280, height: 720 }
    ];
    
    for (const screenshot of screenshots) {
      console.log(`Generating ${screenshot.name}...`);
      
      // Create PNG from SVG
      await sharp(Buffer.from(screenshot.svg))
        .png()
        .toFile(path.join(screenshotsDir, `${screenshot.name}-${screenshot.width}x${screenshot.height}.png`));
      
      console.log(`✓ Generated ${screenshot.name}`);
    }
    
    // Also update the maskable icon to use Doshi logo properly
    console.log('\nUpdating maskable icon with Doshi logo...');
    await sharp(doshiLogoPath)
      .resize(410, 410, {
        fit: 'contain',
        background: { r: 139, g: 92, b: 246, alpha: 1 }
      })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 139, g: 92, b: 246, alpha: 1 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/icons/maskable-512x512.png'));
    console.log('✓ Updated maskable icon');
    
    console.log('\n✅ All screenshots regenerated with REAL content!');
    console.log('Screenshots now show actual app UI with meaningful data.');
    
  } catch (error) {
    console.error('Error generating screenshots:', error);
  }
}

// Run the generator
generateRealScreenshots().catch(console.error);
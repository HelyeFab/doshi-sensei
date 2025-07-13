#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Language configurations
const languages = {
  'fr': { name: 'French', 
    nav: {
      home: "Accueil",
      practice: "Pratique",
      drill: "Exercice",
      vocab: "Vocabulaire",
      settings: "Paramètres",
      adminDashboard: "Tableau de bord administrateur",
      pokedex: "Pokédex",
      kanjiBrowser: "Navigateur Kanji",
      kanjiMoods: "Humeurs Kanji",
      favourites: "Favoris",
      account: "Compte",
      news: "Actualités",
      games: "Jeux",
      resources: "Ressources",
      stories: "Histoires"
    }
  },
  'it': { name: 'Italian',
    nav: {
      home: "Home",
      practice: "Pratica",
      drill: "Esercizio",
      vocab: "Vocabolario",
      settings: "Impostazioni",
      adminDashboard: "Pannello di amministrazione",
      pokedex: "Pokédex",
      kanjiBrowser: "Browser Kanji",
      kanjiMoods: "Umori Kanji",
      favourites: "Preferiti",
      account: "Account",
      news: "Notizie",
      games: "Giochi",
      resources: "Risorse",
      stories: "Storie"
    }
  },
  'de': { name: 'German',
    nav: {
      home: "Startseite",
      practice: "Üben",
      drill: "Übung",
      vocab: "Vokabular",
      settings: "Einstellungen",
      adminDashboard: "Admin-Dashboard",
      pokedex: "Pokédex",
      kanjiBrowser: "Kanji-Browser",
      kanjiMoods: "Kanji-Stimmungen",
      favourites: "Favoriten",
      account: "Konto",
      news: "Nachrichten",
      games: "Spiele",
      resources: "Ressourcen",
      stories: "Geschichten"
    }
  },
  'es': { name: 'Spanish',
    nav: {
      home: "Inicio",
      practice: "Práctica",
      drill: "Ejercicio",
      vocab: "Vocabulario",
      settings: "Configuración",
      adminDashboard: "Panel de administración",
      pokedex: "Pokédex",
      kanjiBrowser: "Navegador Kanji",
      kanjiMoods: "Estados de ánimo Kanji",
      favourites: "Favoritos",
      account: "Cuenta",
      news: "Noticias",
      games: "Juegos",
      resources: "Recursos",
      stories: "Historias"
    }
  },
  'ar': { name: 'Arabic',
    nav: {
      home: "الرئيسية",
      practice: "ممارسة",
      drill: "تدريب",
      vocab: "المفردات",
      settings: "الإعدادات",
      adminDashboard: "لوحة الإدارة",
      pokedex: "بوكيديكس",
      kanjiBrowser: "متصفح الكانجي",
      kanjiMoods: "مزاج الكانجي",
      favourites: "المفضلة",
      account: "الحساب",
      news: "الأخبار",
      games: "الألعاب",
      resources: "الموارد",
      stories: "القصص"
    }
  },
  'ko': { name: 'Korean',
    nav: {
      home: "홈",
      practice: "연습",
      drill: "훈련",
      vocab: "어휘",
      settings: "설정",
      adminDashboard: "관리자 대시보드",
      pokedex: "포켓몬 도감",
      kanjiBrowser: "한자 브라우저",
      kanjiMoods: "한자 무드",
      favourites: "즐겨찾기",
      account: "계정",
      news: "뉴스",
      games: "게임",
      resources: "자료",
      stories: "이야기"
    }
  }
};

// Read the English structure
function getEnglishStructure() {
  const enPath = 'src/config/strings/en.ts';
  const content = fs.readFileSync(enPath, 'utf8');
  const match = content.match(/export const en = ({[\s\S]*});/);
  if (!match) throw new Error('Could not parse en.ts');
  return eval(`(${match[1]})`);
}

// Read flat translations
function readFlatTranslations(langCode) {
  const filePath = `src/config/strings/translations/${langCode}.ts`;
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(new RegExp(`export const ${langCode} = ({[\\s\\S]*});`));
  if (!match) throw new Error(`Could not parse ${langCode}.ts`);
  return eval(`(${match[1]})`);
}

// Merge translations with English structure
function mergeTranslations(enStructure, flatTranslations, langConfig) {
  const merged = JSON.parse(JSON.stringify(enStructure)); // Deep clone
  
  // Apply known navigation translations
  if (langConfig.nav && merged.nav) {
    Object.assign(merged.nav, langConfig.nav);
  }
  
  // Apply flat translations to extracted section
  merged.extracted = {};
  
  // Group flat translations by component/page
  Object.entries(flatTranslations).forEach(([key, value]) => {
    // Skip if it's the extracted section itself
    if (key === 'extracted' && typeof value === 'object') {
      Object.assign(merged.extracted, value);
    } else {
      merged.extracted[key] = value;
    }
  });
  
  return merged;
}

// Save the translation file
function saveTranslation(langCode, langName, translationObj) {
  const content = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Merged with English structure

export const ${langCode} = ${JSON.stringify(translationObj, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;

  const filePath = `src/config/strings/translations/${langCode}.ts`;
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${langCode}.ts`);
}

// Main function
async function main() {
  console.log('🔧 Merging translations with proper structure...\n');
  
  try {
    const enStructure = getEnglishStructure();
    console.log('📋 Loaded English structure\n');
    
    for (const [langCode, langConfig] of Object.entries(languages)) {
      console.log(`🔄 Processing ${langConfig.name}...`);
      
      try {
        const flatTranslations = readFlatTranslations(langCode);
        const merged = mergeTranslations(enStructure, flatTranslations, langConfig);
        saveTranslation(langCode, langConfig.name, merged);
      } catch (error) {
        console.error(`❌ Error processing ${langConfig.name}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All translations merged successfully!');
    console.log('\nThe navigation menu should now work in all languages.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

main();
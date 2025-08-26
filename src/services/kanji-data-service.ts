import fs from 'fs';
import path from 'path';

interface KanjiData {
  kanji: string;
  meaning: string;
  meanings?: string[];
  onyomi: string[];
  kunyomi: string[];
  jlpt?: number;
  grade?: number;
  frequency?: number;
  stroke_count?: number;
  radicals?: string[];
}

// Cache for loaded kanji data
let kanjiCache: Map<string, KanjiData> = new Map();
let allKanjiLoaded = false;

// Load all JLPT kanji data
export async function loadAllKanjiData(): Promise<void> {
  if (allKanjiLoaded) return;
  
  try {
    const kanjiDataDir = path.join(process.cwd(), 'kanji_data');
    
    // Read all directories in kanji_data
    const directories = fs.readdirSync(kanjiDataDir);
    
    for (const dir of directories) {
      const dirPath = path.join(kanjiDataDir, dir);
      const stats = fs.statSync(dirPath);
      
      if (stats.isDirectory()) {
        // Look for JSON files in this directory
        const files = fs.readdirSync(dirPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(dirPath, jsonFile);
          
          try {
            const fileContents = fs.readFileSync(filePath, 'utf8');
            const kanjiList = JSON.parse(fileContents);
            
            // Extract JLPT level from directory name if possible
            let jlptLevel = null;
            if (dir.includes('jlpt_')) {
              const match = dir.match(/jlpt_(\d)/);
              if (match) {
                jlptLevel = parseInt(match[1]);
              }
            }
            
            // Handle both array and single object formats
            const kanjiArray = Array.isArray(kanjiList) ? kanjiList : [kanjiList];
            
            kanjiArray.forEach((k: any) => {
              // Skip if not a valid kanji entry
              if (!k.kanji && !k.character) return;
              
              const kanjiChar = k.kanji || k.character;
              
              const kanjiData: KanjiData = {
                kanji: kanjiChar,
                meaning: k.meaning || k.meanings?.[0] || '',
                meanings: k.meanings || (k.meaning ? [k.meaning] : []),
                onyomi: k.onyomi || k.on_readings || [],
                kunyomi: k.kunyomi || k.kun_readings || [],
                jlpt: k.jlpt || k.jlpt_level || jlptLevel,
                grade: k.grade || null,
                frequency: k.frequency || null,
                stroke_count: k.stroke_count || k.strokes || null,
                radicals: k.radicals || k.components || []
              };
              
              kanjiCache.set(kanjiChar, kanjiData);
            });
          } catch (error) {
            console.error(`Error loading ${jsonFile}:`, error);
          }
        }
      }
    }
    
    allKanjiLoaded = true;
    console.log(`Loaded ${kanjiCache.size} kanji into cache`);
  } catch (error) {
    console.error('Error loading kanji data:', error);
  }
}

// Get kanji by component/radical
export async function getKanjiByComponent(component: string): Promise<KanjiData[]> {
  await loadAllKanjiData();
  
  const results: KanjiData[] = [];
  
  // Check each kanji if it contains the component
  kanjiCache.forEach((data, kanji) => {
    if (kanji.includes(component)) {
      results.push(data);
    }
  });
  
  // Sort by JLPT level and frequency
  results.sort((a, b) => {
    if (a.jlpt !== b.jlpt) {
      return (a.jlpt || 99) - (b.jlpt || 99);
    }
    return (a.frequency || 9999) - (b.frequency || 9999);
  });
  
  return results;
}

// Common radical to kanji mappings (shared between functions)
const radicalMappings: Record<string, string[]> = {
  // Water radical and related components
  '氵': ['海', '河', '湖', '洗', '泳', '洋', '深', '波', '涙', '消', '流', '浴', '港', '湯', '汁', '沢', '油', '治', '泉', '洋', '津', '液', '混', '清', '済', '渡', '満', '漁', '潮', '激', '濃', '法', '活', '派', '浅', '演', '漢', '潟', '源', '滑', '滞', '滝', '漏', '澄', '沖', '沿', '泥', '注', '泳', '洞', '派', '浜', '浮', '涼', '淡', '添', '渇', '溶', '漠', '漫', '滴'],
  '水': ['水', '永', '氷', '求', '泉', '原', '源', '願', '泰', '録', '緑', '様', '永'],
  '氷': ['氷', '冷', '凍', '冬', '寒'],
  '汁': ['汁', '汗', '江', '汚', '汐', '沙', '沈', '沖', '沢', '河', '油', '治', '泊', '泌', '泡', '波', '泥', '注', '泳', '洋', '洗', '洞', '派', '流', '浦', '浪', '浴', '海', '消', '涼', '淡', '深', '混', '清', '済', '渉', '渋', '渓', '温', '測', '港', '湖', '湯', '湾', '湿', '満', '源', '準', '溝', '溶', '滋', '滑', '滝', '滞', '滴', '漁', '漂', '漆', '漏', '演', '漠', '漢', '漫', '潔', '潜', '潟', '潤', '潮', '澄', '激', '濁', '濃', '濯', '瀬'],
  
  // Hand radical
  '扌': ['持', '打', '投', '折', '押', '抜', '担', '拾', '指', '振', '捨', '掃', '授', '掛', '採', '探', '接', '揺', '握', '援', '抱', '抵', '抗', '押', '拡', '括', '拠', '挙', '掘', '掲', '控', '推', '措', '捕', '揮', '携', '搬', '摘', '撤', '撮', '択', '把', '披', '抽', '拍', '搭', '揚', '提', '換', '握', '揃', '挿', '捜', '掌', '排', '掴', '括', '拐', '挟', '据', '捻', '擁', '擦', '撲', '操'],
  
  // Speech radical
  '言': ['話', '語', '読', '言', '記', '説', '論', '議', '談', '訳', '詩', '評', '認', '誌', '証', '訪', '許', '設', '診', '詞', '詰', '誤', '課', '謝', '識', '護', '講', '謡', '謹', '譲', '詐', '詳', '誇', '誉', '誓', '詮', '該', '診', '託', '訴', '訂', '訓', '託', '詠', '誘', '諭', '謀', '謁', '諮', '諾', '謙', '譜', '警', '議'],
  
  // Person radical
  '亻': ['何', '作', '使', '例', '供', '係', '信', '倍', '候', '借', '値', '停', '健', '側', '働', '億', '優', '仁', '仕', '他', '付', '仙', '代', '令', '以', '仮', '仰', '仲', '件', '任', '企', '伏', '伐', '休', '会', '伝', '伯', '伴', '伸', '伺', '似', '但', '位', '低', '住', '佐', '体', '何', '余', '佛', '作', '佳', '併', '使', '例', '侍', '供', '依', '価', '侮', '侯', '侵', '侶', '便', '係', '促', '俊', '俗', '保', '信', '修', '俳', '俵', '俸', '俺', '倉', '個', '倍', '倒', '倖', '候', '借', '倣', '値', '倫', '倹', '偉', '偏', '停', '健', '側', '偵', '偶', '偽', '傍', '傑', '傘', '備', '催', '債', '傷', '傾', '働', '像', '僕', '僚', '僧', '儀', '億', '儒', '償', '優', '儲'],
  '人': ['人', '入', '八', '内', '全', '公', '共', '兵', '具', '典', '兼'],
  
  // Heart/mind radical
  '忄': ['情', '性', '快', '怖', '悪', '恐', '悲', '惜', '愉', '慌', '憎', '憶', '懐', '懸', '忙', '忘', '忠', '怒', '怠', '急', '恥', '恩', '恵', '悟', '悩', '惨', '惰', '愁', '慄', '憂', '憤', '憾', '懇', '懲', '怪', '恨', '悔', '慎', '憧', '怜', '悦', '惧', '慨', '憐', '懊', '悼', '惹', '愕', '慟', '憫', '悴', '怯', '悄', '愴', '慚', '憔', '悽', '惆', '悵'],
  '心': ['心', '必', '忍', '志', '忘', '忙', '応', '忠', '念', '怒', '怠', '急', '怨', '怪', '恋', '恐', '恒', '恥', '恨', '恩', '恵', '恭', '息', '恵', '悔', '悟', '悠', '患', '悦', '悩', '悪', '悲', '悼', '惑', '惜', '惧', '惨', '惰', '想', '愁', '愉', '意', '愚', '愛', '感', '慈', '態', '慌', '慎', '慕', '慢', '慣', '慨', '慮', '慰', '慶', '憂', '憎', '憤', '憧', '憩', '憲', '憶', '憾', '懇', '懐', '懲', '懸', '恋'],
  
  // Tree/wood radical
  '木': ['木', '林', '森', '村', '材', '松', '板', '柱', '根', '植', '極', '楽', '構', '標', '模', '様', '橋', '機', '権', '欄', '樹', '枝', '果', '架', '株', '棚', '検', '械', '概', '桜', '梅', '柿', '栗', '杉', '椅', '棒', '柄', '枠', '析', '枯', '柔', '染', '柳', '栄', '桃', '梨', '椿', '楓', '樫', '榊', '楠', '梓', '柏', '桐', '槙', '楢', '樟', '栃', '椎', '榎', '樺', '欅'],
  
  // Fire radical and components
  '火': ['火', '灯', '炎', '焼', '燃', '煙', '爆', '灰', '災', '炭', '燥', '燦', '煌', '焦', '煎', '煮', '熔', '燈', '烈', '焚', '煤', '燭', '熾', '煉', '燻', '焙', '煽', '熨', '燐', '炊', '炉', '炒', '炬', '烙', '焔', '煥', '燵', '烽', '燗', '熕', '燼', '炸', '烋', '炯', '煖', '熹', '燮', '燧', '燠', '煬', '熏', '燹', '煕', '熄', '炮', '烟', '焜', '煆'],
  '灬': ['点', '熱', '然', '無', '焦', '煮', '照', '熊', '黒', '烈', '煎', '熟', '燕'],
  
  // Earth/soil radical  
  '土': ['土', '地', '場', '坂', '均', '坊', '垂', '型', '域', '城', '執', '基', '堅', '堂', '塔', '塗', '塩', '境', '墓', '増', '壁', '壊', '壌', '士', '壮', '圧', '在', '坐', '坑', '坪', '垢', '垣', '埋', '培', '堆', '堤', '塀', '塊', '塑', '塚', '墨', '墳', '墾', '壇', '壕', '壜', '坦', '垢', '埃', '埼', '堰', '堺', '塵', '墜', '填', '壺', '堕', '堡', '塹', '壟', '垳', '埖'],
  
  // Metal radical
  '金': ['金', '銀', '鉄', '銅', '鋼', '鉛', '錫', '鋭', '鈍', '鎖', '鍵', '針', '釣', '鐘', '鏡', '釜', '銃', '銘', '鋳', '錬', '鍛', '鉱', '鋒', '錠', '錯', '鍋', '釘', '鈴', '鉢', '銭', '釦', '鎧', '錨', '鋲', '鍬', '鎌', '鋏', '鑿', '錐', '鉋', '鎚', '鑢', '鋸', '鑷', '鉗', '錆', '鈷', '鉾', '鏑', '鏃', '鋤', '鋪', '錘', '鎔', '鋳', '鍍', '鏤', '鐚', '鐔', '鐓', '鐐', '鐇', '鐃', '鍼'],
  
  // Grass/plant radical
  '艹': ['花', '草', '茶', '薬', '葉', '落', '蔵', '薄', '藤', '芸', '若', '苦', '英', '茂', '荷', '菓', '菜', '華', '萌', '蒸', '蓄', '薦', '薫', '藩', '芝', '芯', '芳', '苗', '茎', '荒', '莫', '菊', '菌', '萎', '葛', '葬', '蓋', '蓮', '蔑', '蔽', '藍', '藻', '蘇', '芋', '芙', '芥', '苑', '苔', '苛', '茄', '茨', '荊', '莢', '菖', '萄', '萩', '葱', '蒔', '蒲', '蓬', '蔦', '蕾', '薔', '薇', '蘭', '蕉', '蕎'],
  
  // Animal radical
  '犭': ['犬', '狂', '狭', '狩', '独', '猛', '猫', '獄', '獣', '獲', '狐', '狼', '猿', '猪', '狸', '獅', '猟', '狙', '猶', '猥', '狡', '狽', '獰', '獏', '猜', '猾', '狒', '狢', '狛', '狗', '狎', '狆', '猊', '猝', '猖', '猯', '猩', '猴', '狷', '狹', '狠', '狃', '狄', '狂', '狷', '猗'],
  
  // Mouth radical
  '口': ['口', '古', '句', '可', '台', '史', '右', '司', '各', '合', '同', '名', '向', '君', '否', '含', '告', '呉', '周', '味', '呼', '命', '和', '品', '員', '商', '問', '喜', '営', '器', '囲', '困', '回', '団', '園', '図', '固', '国', '圏', '器', '嚇', '噴', '嘱', '嘲', '噂', '噛', '嘆', '喧', '喉', '唆', '唇', '唐', '唯', '唱', '啓', '善', '喚', '喪', '喫', '嘉', '囁', '呵', '吃', '吊', '吐', '吟', '吠', '吹', '呂', '呆', '咎', '咳', '咽', '哨', '哺', '唖', '喝', '喩', '嗅', '嘔', '嘩', '噌', '噸', '囃', '嚢', '囂'],
  
  // Eye radical
  '目': ['目', '見', '親', '観', '覚', '視', '眼', '眠', '督', '瞬', '睡', '睦', '瞳', '眺', '眉', '看', '県', '盲', '相', '省', '眞', '着', '睨', '睫', '瞥', '瞭', '瞰', '矚', '眩', '眷', '睾', '睹', '瞑', '瞠', '瞞', '瞋', '睥', '睚', '睛', '睇', '睆', '睊', '瞎', '瞇', '睺', '瞼', '瞽', '瞿', '矇', '矍'],
  
  // Foot/leg radical
  '足': ['足', '路', '跡', '踊', '距', '跳', '践', '踏', '蹴', '躍', '踪', '跨', '跪', '蹄', '蹟', '躇', '躊', '跋', '跌', '跛', '跣', '跼', '踈', '踉', '踝', '踞', '踟', '踰', '踴', '踵', '蹂', '蹉', '蹊', '蹌', '蹐', '蹕', '蹙', '蹣', '蹤', '蹠', '蹲', '蹶', '蹼', '躁', '躄', '躅', '躋', '躑', '躓', '躔', '躙', '躡', '躪', '躬', '躯', '躰', '躱'],
  
  // Cloth/clothing radical
  '衤': ['初', '補', '裕', '複', '褒', '襟', '袖', '被', '裁', '装', '裂', '製', '褐', '複', '襲', '衣', '表', '袋', '裏', '裸', '袴', '襖', '袈', '裟', '褌', '袢', '袱', '裃', '裄', '裔', '裘', '裙', '裨', '裲', '裴', '裹', '裼', '裾', '褂', '褄', '褊', '褓', '褞', '褥', '褪', '褫', '褶', '褸', '褻', '襁', '襄', '襌', '襍', '襞', '襠', '襤', '襦', '襪', '襯', '襴', '襷', '襾'],
  
  // Sun/day radical
  '日': ['日', '明', '時', '昨', '春', '昼', '晩', '暗', '曜', '晴', '暖', '暮', '曇', '昭', '晶', '暇', '昇', '昆', '昌', '易', '星', '映', '晃', '晋', '晏', '晒', '晦', '晨', '晰', '暁', '暈', '暉', '暎', '暘', '暝', '曙', '曚', '曠', '曦', '曩', '曰', '旦', '旭', '旬', '旱', '昂', '昊', '昏', '昔', '昜', '昞', '昤', '昧', '昵', '昶', '昿', '晁', '時', '晄', '晉', '晟', '晢', '晤', '晧', '晬', '晳', '晸', '暃', '暄', '暐', '暑', '暖', '暙', '暠'],
  
  // Moon/meat radical
  '月': ['月', '有', '服', '朝', '期', '望', '朗', '肉', '肌', '肝', '肺', '胃', '胸', '脳', '腕', '腰', '膝', '臓', '肩', '背', '腹', '脂', '胆', '胎', '胞', '胴', '脈', '腐', '膜', '膨', '臆', '臓', '腎', '腸', '膚', '膠', '腫', '腺', '膿', '臍', '肋', '肘', '肛', '肢', '肪', '肯', '肱', '育', '肴', '肺', '胚', '胡', '胤', '胯', '胱', '胼', '脆', '脊', '脚', '脛', '脩', '脱', '脳', '脹', '脾', '腋', '腑', '腔', '腥', '腦', '腱', '腴', '膂', '膈', '膊', '膏', '膣', '膩', '膰', '膵', '膺', '膽', '臀', '臂', '臈', '臉', '臑', '臘', '臙', '臚', '臟', '臠', '臣', '臥', '臧', '臨'],
};

// Get kanji by multiple components (for families)
export async function getKanjiByComponents(components: string[]): Promise<KanjiData[]> {
  await loadAllKanjiData();
  
  const resultsSet = new Set<string>();
  const results: KanjiData[] = [];
  
  // For each component, get kanji from the predefined mappings
  for (const component of components) {
    const mappedKanji = radicalMappings[component] || [];
    mappedKanji.forEach(k => resultsSet.add(k));
    
    // Also check if the component itself is a kanji
    if (kanjiCache.has(component)) {
      resultsSet.add(component);
    }
  }
  
  // Convert set to array of KanjiData
  resultsSet.forEach(kanji => {
    const data = kanjiCache.get(kanji);
    if (data) {
      results.push(data);
    }
  });
  
  // Sort by JLPT level and frequency
  results.sort((a, b) => {
    if (a.jlpt !== b.jlpt) {
      return (a.jlpt || 99) - (b.jlpt || 99);
    }
    return (a.frequency || 9999) - (b.frequency || 9999);
  });
  
  return results;
}

// Get kanji by radical (using predefined mappings)
export async function getKanjiByRadical(radical: string): Promise<KanjiData[]> {
  await loadAllKanjiData();
  
  const kanjiList = radicalMappings[radical] || [];
  const results: KanjiData[] = [];
  
  for (const kanji of kanjiList) {
    const data = kanjiCache.get(kanji);
    if (data) {
      results.push(data);
    }
  }
  
  return results;
}

// Get all kanji data
export async function getAllKanji(): Promise<KanjiData[]> {
  await loadAllKanjiData();
  return Array.from(kanjiCache.values());
}

// Get kanji by character
export async function getKanjiByCharacter(character: string): Promise<KanjiData | null> {
  await loadAllKanjiData();
  return kanjiCache.get(character) || null;
}
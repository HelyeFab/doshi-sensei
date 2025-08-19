// Test the furigana cleaning patterns

const testTexts = [
  "言葉(ことば)の意味",
  "言葉（ことば）の意味", 
  "大会(たいかい)で",
  "地方（ちほう）では",
  "漢字[かんじ]を勉強",
  "日本【にほん】の文化"
];

// Pattern to match kanji followed by furigana in various bracket types
const patterns = [
  // Standard parentheses: 漢字(ひらがな)
  /([一-龯々]+)\([ぁ-んー]+\)/g,
  // Full-width parentheses: 漢字（ひらがな）
  /([一-龯々]+)（[ぁ-んー]+）/g,
  // Square brackets: 漢字[ひらがな]
  /([一-龯々]+)\[[ぁ-んー]+\]/g,
  // Full-width square brackets: 漢字【ひらがな】
  /([一-龯々]+)【[ぁ-んー]+】/g,
];

console.log("Testing furigana removal patterns:\n");

testTexts.forEach(text => {
  let cleaned = text;
  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '$1');
  });
  console.log(`Original: ${text}`);
  console.log(`Cleaned:  ${cleaned}`);
  console.log('---');
});
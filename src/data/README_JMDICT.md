# JMdict Integration for Kanji Vocabulary

## Instructions for adding JMdict JSON data:

1. Place your JMdict JSON file in this directory (`/src/data/`)
2. Name it `jmdict.json` or `jmdict-vocab.json`

## Expected JSON structure:

The JMdict JSON should ideally contain entries like:
```json
{
  "entries": [
    {
      "kanji": ["木曜日"],
      "readings": ["もくようび"],
      "meanings": ["Thursday"],
      "jlpt": "N5"
    },
    {
      "kanji": ["大木"],
      "readings": ["たいぼく", "おおき"],
      "meanings": ["big tree", "large tree"],
      "jlpt": "N3"
    }
  ]
}
```

Or any similar structure - I can adapt the parser to match your format.

## What the system will do:

1. When loading kanji, it will search the JMdict data for vocabulary containing that kanji
2. For words without readings, it will use the furigana API to generate them
3. Display the vocabulary with proper readings in the study cards
4. Allow toggling furigana on/off as already implemented

## Benefits:

- Real vocabulary examples for all JLPT levels (N5-N1)
- Proper readings for compound words
- Multiple examples per kanji
- Contextual learning with actual Japanese words
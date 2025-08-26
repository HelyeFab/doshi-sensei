#!/usr/bin/env python3
"""
Import the newly extracted vocabulary decks into the app
"""
import json
import re
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional

# Paths
MCP_EXTRACTED = Path("/home/mate/Dev/MCPs/anki-word-generator/data/extracted_advanced")
OUTPUT_DIR = Path("/home/mate/Dev/NextProjects/doshi-sensei/src/data/textbook-vocabulary")

def detect_jlpt_level(word: str, meaning: str = "") -> str:
    """Simple JLPT level detection"""
    word_len = len(word)
    if word_len <= 2:
        return "N5"
    elif word_len <= 4:
        return "N4"
    elif word_len <= 6:
        return "N3"
    else:
        return "N2"

def process_genki2_new(input_file: Path):
    """Process the new Genki 2 vocabulary (589 cards)"""
    print("Processing new Genki 2 vocabulary...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Group by lessons (13-23)
    lessons_data = defaultdict(list)
    
    for idx, card in enumerate(cards):
        fields = card.get('fields', {})
        
        # Extract data
        japanese_kana = fields.get('japanese_kana', '')
        kanji = fields.get('kanjis', '')
        english = fields.get('english', '')
        
        if not japanese_kana or not english:
            continue
        
        # Use kanji if available, otherwise kana
        japanese = kanji if kanji and kanji != '-' else japanese_kana
        
        # Estimate lesson based on position (589 cards / 11 lessons ≈ 53 cards per lesson)
        lesson_num = 13 + min(idx // 53, 10)  # Lessons 13-23
        
        # Create card in app format
        app_card = {
            "id": f"genki-2-{lesson_num}-new-{idx}",
            "japanese": japanese,
            "reading": japanese_kana if kanji and kanji != '-' else "",
            "meaning": english,
            "jlptLevel": detect_jlpt_level(japanese, english),
            "partOfSpeech": [],
            "examples": [{
                "japanese": japanese,
                "reading": "",
                "english": str(lesson_num)
            }],
            "tags": [
                detect_jlpt_level(japanese, english).lower(),
                f"lesson-{lesson_num}",
                "genki-2"
            ],
            "lesson": lesson_num,
            "textbook": "genki-2"
        }
        
        lessons_data[lesson_num].append(app_card)
    
    # Save the new Genki 2 data
    output_path = OUTPUT_DIR / "genki-2-new"
    output_path.mkdir(parents=True, exist_ok=True)
    
    all_cards = []
    for lesson_num in range(13, 24):
        lesson_cards = lessons_data.get(lesson_num, [])
        all_cards.extend(lesson_cards)
        
        # Save lesson file
        with open(output_path / f"lesson-{lesson_num}.json", 'w', encoding='utf-8') as f:
            json.dump(lesson_cards, f, ensure_ascii=False, indent=2)
        
        if lesson_cards:
            print(f"  Lesson {lesson_num}: {len(lesson_cards)} cards")
    
    # Save combined file
    with open(output_path / "all.json", 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)
    
    print(f"  Total: {len(all_cards)} cards saved to genki-2-new/")
    
    return len(all_cards)

def process_kaishi_15k(input_file: Path):
    """Process Kaishi 15k vocabulary"""
    print("\nProcessing Kaishi 15k vocabulary...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Group by JLPT level
    jlpt_groups = defaultdict(list)
    
    for idx, card in enumerate(cards[1:], 1):  # Skip welcome card
        fields = card.get('fields', {})
        
        word = fields.get('Word', '')
        reading = fields.get('Word Reading', '')
        meaning = fields.get('Word Meaning', '')
        furigana = fields.get('Word Furigana', '')
        sentence = fields.get('Sentence', '')
        sentence_meaning = fields.get('Sentence Meaning', '')
        frequency = fields.get('Frequency', '')
        
        if not word or not meaning:
            continue
        
        # Clean HTML from fields
        import html
        word = re.sub(r'<[^>]+>', '', word)
        meaning = re.sub(r'<[^>]+>', '', meaning)
        
        # Detect JLPT level (could be improved with actual JLPT lists)
        try:
            freq_num = int(frequency) if frequency else 99999
            if freq_num <= 500:
                jlpt = "N5"
            elif freq_num <= 1500:
                jlpt = "N4"
            elif freq_num <= 3000:
                jlpt = "N3"
            elif freq_num <= 6000:
                jlpt = "N2"
            else:
                jlpt = "N1"
        except:
            jlpt = detect_jlpt_level(word, meaning)
        
        # Create card
        app_card = {
            "id": f"kaishi-{idx}",
            "japanese": word,
            "reading": reading or word,
            "meaning": meaning,
            "jlptLevel": jlpt,
            "partOfSpeech": [],
            "examples": [{
                "japanese": sentence if sentence else word,
                "reading": "",
                "english": sentence_meaning if sentence_meaning else ""
            }] if sentence else [],
            "tags": [
                jlpt.lower(),
                "kaishi-15k",
                f"freq-{frequency}" if frequency else ""
            ],
            "frequency": int(frequency) if frequency and frequency.isdigit() else None,
            "source": "kaishi-15k"
        }
        
        jlpt_groups[jlpt].append(app_card)
    
    # Save by JLPT level
    output_path = OUTPUT_DIR / "kaishi-15k"
    output_path.mkdir(parents=True, exist_ok=True)
    
    all_cards = []
    for jlpt_level in ["N5", "N4", "N3", "N2", "N1"]:
        level_cards = jlpt_groups.get(jlpt_level, [])
        all_cards.extend(level_cards)
        
        # Sort by frequency if available
        level_cards.sort(key=lambda x: x.get('frequency', 99999))
        
        # Save JLPT level file
        with open(output_path / f"{jlpt_level.lower()}.json", 'w', encoding='utf-8') as f:
            json.dump(level_cards, f, ensure_ascii=False, indent=2)
        
        print(f"  {jlpt_level}: {len(level_cards)} cards")
    
    # Save combined file
    with open(output_path / "all.json", 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)
    
    # Save metadata
    metadata = {
        "source": "kaishi-15k",
        "totalCards": len(all_cards),
        "levels": {
            level: len(jlpt_groups.get(level, []))
            for level in ["N5", "N4", "N3", "N2", "N1"]
        },
        "lastUpdated": "2025-01-26"
    }
    
    with open(output_path / "metadata.json", 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"  Total: {len(all_cards)} cards saved to kaishi-15k/")
    return len(all_cards)

def process_kanji_in_context(input_file: Path):
    """Process Kanji in Context vocabulary"""
    print("\nProcessing Kanji in Context...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Group by chapters (estimate based on card count)
    chapter_groups = defaultdict(list)
    cards_per_chapter = len(cards) // 50  # Estimate 50 chapters
    
    for idx, card in enumerate(cards):
        fields = card.get('fields', {})
        
        expression = fields.get('Expression', '')
        reading = fields.get('Reading', '')
        meaning = fields.get('Meaning', '')
        
        if not expression or not meaning:
            continue
        
        # Estimate chapter
        chapter = min(idx // cards_per_chapter + 1, 50)
        
        # Create card
        app_card = {
            "id": f"kic-{chapter}-{idx}",
            "japanese": expression,
            "reading": reading or expression,
            "meaning": meaning,
            "jlptLevel": detect_jlpt_level(expression, meaning),
            "partOfSpeech": [],
            "examples": [],
            "tags": [
                detect_jlpt_level(expression, meaning).lower(),
                "kanji-in-context",
                f"chapter-{chapter}"
            ],
            "chapter": chapter,
            "source": "kanji-in-context"
        }
        
        chapter_groups[chapter].append(app_card)
    
    # Save by chapter
    output_path = OUTPUT_DIR / "kanji-in-context"
    output_path.mkdir(parents=True, exist_ok=True)
    
    all_cards = []
    for chapter in range(1, 51):
        chapter_cards = chapter_groups.get(chapter, [])
        all_cards.extend(chapter_cards)
        
        if chapter_cards:
            # Save chapter file
            with open(output_path / f"chapter-{chapter}.json", 'w', encoding='utf-8') as f:
                json.dump(chapter_cards, f, ensure_ascii=False, indent=2)
    
    # Save combined file
    with open(output_path / "all.json", 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)
    
    print(f"  Total: {len(all_cards)} cards saved to kanji-in-context/")
    print(f"  Chapters with content: {len([c for c in chapter_groups if chapter_groups[c]])}")
    
    return len(all_cards)

def update_main_index():
    """Update the main index file with all vocabulary sources"""
    print("\nUpdating main index...")
    
    index_data = {
        "totalCards": 0,
        "textbooks": {},
        "vocabularySources": {}
    }
    
    # Add existing textbooks
    for textbook_id in ["genki-1", "genki-2", "genki-2-new", "minna-1", "minna-2"]:
        textbook_path = OUTPUT_DIR / textbook_id
        if textbook_path.exists():
            all_file = textbook_path / "all.json"
            if all_file.exists():
                with open(all_file, 'r', encoding='utf-8') as f:
                    cards = json.load(f)
                    index_data["textbooks"][textbook_id] = {
                        "title": textbook_id.replace("-", " ").title(),
                        "cardCount": len(cards)
                    }
                    index_data["totalCards"] += len(cards)
    
    # Add new vocabulary sources
    for source_id in ["kaishi-15k", "kanji-in-context"]:
        source_path = OUTPUT_DIR / source_id
        if source_path.exists():
            all_file = source_path / "all.json"
            if all_file.exists():
                with open(all_file, 'r', encoding='utf-8') as f:
                    cards = json.load(f)
                    index_data["vocabularySources"][source_id] = {
                        "title": source_id.replace("-", " ").title(),
                        "cardCount": len(cards)
                    }
                    index_data["totalCards"] += len(cards)
    
    # Save updated index
    with open(OUTPUT_DIR / "index.json", 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"  Total cards in system: {index_data['totalCards']:,}")

def main():
    print("=== Importing New Vocabulary Decks ===\n")
    
    # Process each deck
    genki2_file = MCP_EXTRACTED / "Genki_2_3rd_edition_with_sound_files_cards.json"
    if genki2_file.exists():
        process_genki2_new(genki2_file)
    
    kaishi_file = MCP_EXTRACTED / "Kaishi_15k_-_Basic_Japanese_Vocabulary_cards.json"
    if kaishi_file.exists():
        process_kaishi_15k(kaishi_file)
    
    kic_file = MCP_EXTRACTED / "Kanji_in_Context_Revised_Edition_2025_Edit_cards.json"
    if kic_file.exists():
        process_kanji_in_context(kic_file)
    
    # Update index
    update_main_index()
    
    print("\n✅ Import complete!")

if __name__ == "__main__":
    main()
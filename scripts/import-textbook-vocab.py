#!/usr/bin/env python3
"""
Import and transform textbook vocabulary from MCP Anki server data
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Paths
MCP_DATA_DIR = Path("/home/mate/Dev/MCPs/anki-word-generator/data/extracted")
OUTPUT_DIR = Path("/home/mate/Dev/NextProjects/doshi-sensei/src/data/textbook-vocabulary")

def detect_jlpt_level(word: str, meaning: str = "") -> str:
    """Detect JLPT level based on word complexity and common word lists"""
    # Basic detection - can be enhanced with proper JLPT word lists
    common_n5_words = {
        "わたし", "あなた", "ひと", "こども", "せんせい", "がくせい",
        "ともだち", "かぞく", "おとうさん", "おかあさん", "あに", "あね",
        "いもうと", "おとうと", "たべる", "のむ", "みる", "きく", "よむ",
        "かく", "いく", "くる", "かえる", "ある", "いる", "する"
    }
    
    common_n4_words = {
        "おもう", "いう", "つかう", "つくる", "しる", "すむ", "はたらく",
        "やすむ", "おきる", "ねる", "あそぶ", "およぐ", "はしる", "あるく"
    }
    
    if word in common_n5_words:
        return "N5"
    elif word in common_n4_words:
        return "N4"
    elif len(word) <= 3:
        return "N5"
    elif len(word) <= 5:
        return "N4"
    else:
        return "N3"

def parse_lesson_number(card: Dict, source_deck: str) -> int:
    """Extract lesson number from card data"""
    # Try from example_translation field (common pattern)
    if card.get("example_translation"):
        try:
            return int(card["example_translation"])
        except (ValueError, TypeError):
            pass
    
    # Try from additional_fields
    if card.get("additional_fields"):
        for field, value in card["additional_fields"].items():
            try:
                # Look for lesson numbers like "1", "Lesson 1", etc.
                if isinstance(value, str):
                    match = re.search(r'(?:lesson\s*)?(\d+)', value.lower())
                    if match:
                        return int(match.group(1))
            except:
                pass
    
    # Default to lesson 1
    return 1

def transform_minna_card(card: Dict, textbook_id: str) -> Optional[Dict]:
    """Transform Minna no Nihongo card to app format"""
    if not card.get("japanese") or card["japanese"] == "Please update to the latest Anki version":
        return None
    
    lesson = parse_lesson_number(card, card.get("source_deck", ""))
    
    # Clean up the Japanese text
    japanese = card["japanese"].strip()
    reading = card.get("reading") or japanese
    meaning = card.get("meaning", "").strip()
    
    if not meaning:
        return None
    
    # Detect JLPT level
    jlpt = detect_jlpt_level(japanese, meaning)
    
    # Generate ID
    card_id = f"{textbook_id}-{lesson}-{card.get('id', '')}"
    
    return {
        "id": card_id,
        "japanese": japanese,
        "reading": reading,
        "meaning": meaning,
        "jlptLevel": jlpt,
        "partOfSpeech": [],
        "examples": [{
            "japanese": card.get("example_sentence") or japanese,
            "reading": "",
            "english": str(lesson)
        }],
        "tags": [
            jlpt.lower(),
            f"lesson-{lesson}",
            textbook_id
        ],
        "lesson": lesson,
        "textbook": textbook_id
    }

def process_minna_no_nihongo():
    """Process Minna no Nihongo vocabulary"""
    print("Processing Minna no Nihongo...")
    
    # Load the full Minna 1&2 dataset (4218 cards)
    minna_file = MCP_DATA_DIR / "Japanese_Minna_no_Nihongo_1__2_Lessons_1_-_50_cards.json"
    
    if not minna_file.exists():
        print(f"File not found: {minna_file}")
        return
    
    with open(minna_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    print(f"Loaded {len(cards)} Minna no Nihongo cards")
    
    # Group by textbook and lesson
    minna1_by_lesson = defaultdict(list)
    minna2_by_lesson = defaultdict(list)
    
    for card in cards:
        transformed = transform_minna_card(card, "minna-temp")
        if not transformed:
            continue
        
        lesson = transformed["lesson"]
        
        # Minna 1 has lessons 1-25, Minna 2 has lessons 26-50
        if lesson <= 25:
            transformed["textbook"] = "minna-1"
            transformed["tags"][2] = "minna-1"
            transformed["id"] = transformed["id"].replace("minna-temp", "minna-1")
            minna1_by_lesson[lesson].append(transformed)
        else:
            # Adjust lesson number for Minna 2 (26-50 -> 1-25)
            adjusted_lesson = lesson - 25
            transformed["lesson"] = adjusted_lesson
            transformed["tags"][1] = f"lesson-{adjusted_lesson}"
            transformed["textbook"] = "minna-2"
            transformed["tags"][2] = "minna-2"
            transformed["id"] = transformed["id"].replace("minna-temp", "minna-2")
            minna2_by_lesson[adjusted_lesson].append(transformed)
    
    # Save Minna 1
    save_textbook_data("minna-1", minna1_by_lesson, 25)
    
    # Save Minna 2
    save_textbook_data("minna-2", minna2_by_lesson, 25)

def deduplicate_cards(cards: List[Dict]) -> List[Dict]:
    """Remove duplicate cards, keeping the one with most information"""
    seen = {}
    
    for card in cards:
        # Create a key from japanese + meaning for deduplication
        key = (card["japanese"], card["meaning"][:30] if card["meaning"] else "")
        
        if key not in seen:
            seen[key] = card
        else:
            # Keep the card with more information
            existing = seen[key]
            if (not existing.get("reading") and card.get("reading")) or \
               (len(card.get("meaning", "")) > len(existing.get("meaning", ""))):
                seen[key] = card
    
    return list(seen.values())

def save_textbook_data(textbook_id: str, lessons_data: Dict[int, List], total_lessons: int):
    """Save textbook data to JSON files"""
    output_path = OUTPUT_DIR / textbook_id
    output_path.mkdir(parents=True, exist_ok=True)
    
    all_cards = []
    
    # Save individual lesson files with deduplication
    for lesson_num in range(1, total_lessons + 1):
        lesson_cards = lessons_data.get(lesson_num, [])
        
        # Deduplicate within lesson
        lesson_cards = deduplicate_cards(lesson_cards)
        
        all_cards.extend(lesson_cards)
        
        lesson_file = output_path / f"lesson-{lesson_num}.json"
        with open(lesson_file, 'w', encoding='utf-8') as f:
            json.dump(lesson_cards, f, ensure_ascii=False, indent=2)
        
        if lesson_cards:
            print(f"  Saved {len(lesson_cards)} unique cards to lesson-{lesson_num}.json")
    
    # Deduplicate across all lessons
    all_cards = deduplicate_cards(all_cards)
    
    # Save combined file
    all_file = output_path / "all.json"
    with open(all_file, 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)
    
    print(f"  Total: {len(all_cards)} unique cards saved for {textbook_id}")
    
    # Save metadata
    metadata = {
        "textbook": textbook_id,
        "totalCards": len(all_cards),
        "lessons": list(range(1, total_lessons + 1)),
        "lastUpdated": "2025-01-26"
    }
    
    metadata_file = output_path / "metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def process_genki_kanji():
    """Process Genki Kanji data"""
    print("Processing Genki Kanji...")
    
    genki_file = MCP_DATA_DIR / "Genki_1__2_Kanji_ (1)_cards.json"
    
    if not genki_file.exists():
        print(f"File not found: {genki_file}")
        return
    
    with open(genki_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    print(f"Loaded {len(cards)} Genki Kanji cards")
    
    # Note: These are kanji cards, not vocabulary
    # We'll save them separately for potential future use
    kanji_output = OUTPUT_DIR / "genki-kanji"
    kanji_output.mkdir(parents=True, exist_ok=True)
    
    with open(kanji_output / "all-kanji.json", 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    
    print(f"  Saved {len(cards)} kanji cards for reference")

def update_index_file():
    """Update the main index.json file"""
    print("\nUpdating index.json...")
    
    index_data = {
        "totalCards": 0,
        "textbooks": {}
    }
    
    # Count cards for each textbook
    for textbook_dir in OUTPUT_DIR.iterdir():
        if textbook_dir.is_dir() and textbook_dir.name in ["minna-1", "minna-2", "genki-1", "genki-2"]:
            all_file = textbook_dir / "all.json"
            if all_file.exists():
                with open(all_file, 'r', encoding='utf-8') as f:
                    cards = json.load(f)
                    card_count = len(cards)
                    index_data["totalCards"] += card_count
                    
                    # Get lesson numbers
                    lessons = sorted(set(card["lesson"] for card in cards if "lesson" in card))
                    
                    textbook_name = {
                        "minna-1": "Minna no Nihongo 1",
                        "minna-2": "Minna no Nihongo 2",
                        "genki-1": "Genki 1",
                        "genki-2": "Genki 2"
                    }.get(textbook_dir.name, textbook_dir.name)
                    
                    index_data["textbooks"][textbook_dir.name] = {
                        "title": textbook_name,
                        "cardCount": card_count,
                        "lessons": lessons
                    }
    
    # Save index file
    index_file = OUTPUT_DIR / "index.json"
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"Index updated: {index_data['totalCards']} total cards across {len(index_data['textbooks'])} textbooks")

def main():
    """Main import process"""
    print("Starting textbook vocabulary import...")
    print(f"MCP Data: {MCP_DATA_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Process each textbook
    process_minna_no_nihongo()
    process_genki_kanji()
    
    # Update index
    update_index_file()
    
    print("\nImport complete!")

if __name__ == "__main__":
    main()
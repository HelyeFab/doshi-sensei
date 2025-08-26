#!/usr/bin/env python3
"""
Merge old and new Genki 2 data to create a comprehensive dataset
"""
import json
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path("src/data/textbook-vocabulary")

def merge_genki2():
    """Merge old and new Genki 2 data"""
    print("Merging Genki 2 datasets...")
    
    # Load old Genki 2
    old_genki2_file = DATA_DIR / "genki-2/all.json"
    with open(old_genki2_file, 'r', encoding='utf-8') as f:
        old_cards = json.load(f)
    print(f"  Old Genki 2: {len(old_cards)} cards")
    
    # Load new Genki 2
    new_genki2_file = DATA_DIR / "genki-2-new/all.json"
    with open(new_genki2_file, 'r', encoding='utf-8') as f:
        new_cards = json.load(f)
    print(f"  New Genki 2: {len(new_cards)} cards")
    
    # Create deduplication key
    seen = {}
    merged_cards = []
    
    # Add old cards first (they have better formatting)
    for card in old_cards:
        key = (card['japanese'], card['meaning'][:30])
        if key not in seen:
            seen[key] = True
            merged_cards.append(card)
    
    # Add new cards that don't exist
    added = 0
    for card in new_cards:
        key = (card['japanese'], card['meaning'][:30])
        if key not in seen:
            seen[key] = True
            merged_cards.append(card)
            added += 1
    
    print(f"  Added {added} new unique cards from new dataset")
    print(f"  Total merged: {len(merged_cards)} cards")
    
    # Sort by lesson
    merged_cards.sort(key=lambda x: (x.get('lesson', 99), x.get('japanese', '')))
    
    # Group by lesson
    lessons_data = defaultdict(list)
    for card in merged_cards:
        lesson = card.get('lesson', 13)
        lessons_data[lesson].append(card)
    
    # Save merged data
    output_path = DATA_DIR / "genki-2-complete"
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Save individual lesson files
    for lesson in range(13, 24):
        lesson_cards = lessons_data.get(lesson, [])
        with open(output_path / f"lesson-{lesson}.json", 'w', encoding='utf-8') as f:
            json.dump(lesson_cards, f, ensure_ascii=False, indent=2)
        if lesson_cards:
            print(f"    Lesson {lesson}: {len(lesson_cards)} cards")
    
    # Save combined file
    with open(output_path / "all.json", 'w', encoding='utf-8') as f:
        json.dump(merged_cards, f, ensure_ascii=False, indent=2)
    
    # Save metadata
    metadata = {
        "textbook": "genki-2-complete",
        "totalCards": len(merged_cards),
        "lessons": list(range(13, 24)),
        "lastUpdated": "2025-01-26",
        "sources": ["original-genki-2", "genki-2-3rd-edition-anki"]
    }
    
    with open(output_path / "metadata.json", 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Merged Genki 2 saved to genki-2-complete/")
    return len(merged_cards)

def update_summary():
    """Print final summary of all vocabulary"""
    print("\n📚 FINAL VOCABULARY SUMMARY")
    print("=" * 50)
    
    sources = [
        ("Genki 1", "genki-1"),
        ("Genki 2 (Original)", "genki-2"),
        ("Genki 2 (New Extract)", "genki-2-new"),
        ("Genki 2 (Complete)", "genki-2-complete"),
        ("Minna no Nihongo 1", "minna-1"),
        ("Minna no Nihongo 2", "minna-2"),
        ("Kaishi 15k", "kaishi-15k"),
        ("Kanji in Context", "kanji-in-context")
    ]
    
    total = 0
    for name, folder in sources:
        all_file = DATA_DIR / folder / "all.json"
        if all_file.exists():
            with open(all_file, 'r', encoding='utf-8') as f:
                cards = json.load(f)
                count = len(cards)
                total += count
                print(f"{name:30} {count:,} cards")
    
    print("-" * 50)
    print(f"{'TOTAL VOCABULARY:':30} {total:,} cards")
    
    print("\n💡 RECOMMENDATIONS:")
    print("1. Use 'genki-2-complete' instead of the separate genki-2 datasets")
    print("2. Kaishi 15k provides frequency-based core vocabulary")
    print("3. Kanji in Context offers comprehensive kanji compounds")
    print("4. When you get a proper Genki 2 deck, we can replace/merge again")

def main():
    merge_genki2()
    update_summary()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Merge new vocabulary from MCP server with existing data, avoiding duplicates
"""
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Paths
OLD_DATA_DIR = Path("/home/mate/Dev/NextProjects/doshi-sensei-old/src/data/textbook-vocabulary")
MCP_DATA_DIR = Path("/home/mate/Dev/MCPs/anki-word-generator/data/extracted")
OUTPUT_DIR = Path("/home/mate/Dev/NextProjects/doshi-sensei/src/data/textbook-vocabulary")

def load_existing_data(textbook_id: str) -> Tuple[List[Dict], Set[str]]:
    """Load existing data and create a set of unique keys"""
    old_path = OLD_DATA_DIR / textbook_id / "all.json"
    
    if not old_path.exists():
        return [], set()
    
    with open(old_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Create unique keys for existing cards
    existing_keys = set()
    for card in cards:
        # Use japanese + first 30 chars of meaning as key
        key = f"{card['japanese']}:{card['meaning'][:30] if card.get('meaning') else ''}"
        existing_keys.add(key)
    
    return cards, existing_keys

def analyze_duplicates():
    """Analyze existing duplicates and potential new additions"""
    print("Analyzing existing data and potential duplicates...\n")
    
    for textbook_id in ['minna-1', 'minna-2', 'genki-1', 'genki-2']:
        old_cards, existing_keys = load_existing_data(textbook_id)
        
        if not old_cards:
            print(f"{textbook_id}: No existing data found")
            continue
        
        # Check for duplicates within existing data
        unique_japanese = set()
        duplicates = []
        
        for card in old_cards:
            if card['japanese'] in unique_japanese:
                duplicates.append(card['japanese'])
            else:
                unique_japanese.add(card['japanese'])
        
        print(f"{textbook_id}:")
        print(f"  Total existing cards: {len(old_cards)}")
        print(f"  Unique Japanese words: {len(unique_japanese)}")
        print(f"  Duplicate entries: {len(duplicates)}")
        
        if duplicates[:5]:  # Show first 5 duplicates as examples
            print(f"  Example duplicates: {duplicates[:5]}")
        
        # Analyze MCP data for potential additions
        if textbook_id.startswith('minna'):
            mcp_file = MCP_DATA_DIR / "Japanese_Minna_no_Nihongo_1__2_Lessons_1_-_50_cards.json"
            if mcp_file.exists():
                with open(mcp_file, 'r', encoding='utf-8') as f:
                    mcp_cards = json.load(f)
                
                # Count potential new cards
                new_count = 0
                for mcp_card in mcp_cards:
                    if mcp_card.get("japanese") and mcp_card.get("meaning"):
                        key = f"{mcp_card['japanese']}:{mcp_card['meaning'][:30]}"
                        if key not in existing_keys:
                            new_count += 1
                
                print(f"  Potential new cards from MCP: {new_count}")
        
        print()

def copy_existing_with_deduplication():
    """Copy existing data with deduplication"""
    print("Copying existing data with deduplication...\n")
    
    for textbook_id in ['minna-1', 'minna-2', 'genki-1', 'genki-2']:
        old_dir = OLD_DATA_DIR / textbook_id
        
        if not old_dir.exists():
            print(f"{textbook_id}: No existing data to copy")
            continue
        
        # Create output directory
        output_path = OUTPUT_DIR / textbook_id
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Load all cards
        all_file = old_dir / "all.json"
        if all_file.exists():
            with open(all_file, 'r', encoding='utf-8') as f:
                all_cards = json.load(f)
            
            # Deduplicate
            seen_keys = {}
            unique_cards = []
            
            for card in all_cards:
                # Create unique key
                key = (card['japanese'], card.get('meaning', '')[:50])
                
                if key not in seen_keys:
                    seen_keys[key] = True
                    unique_cards.append(card)
                else:
                    # Keep the card with more information
                    for i, existing_card in enumerate(unique_cards):
                        if (existing_card['japanese'], existing_card.get('meaning', '')[:50]) == key:
                            # Replace if new card has more info
                            if len(card.get('meaning', '')) > len(existing_card.get('meaning', '')):
                                unique_cards[i] = card
                            break
            
            # Group by lesson
            lessons_data = {}
            for card in unique_cards:
                lesson = card.get('lesson', 1)
                if lesson not in lessons_data:
                    lessons_data[lesson] = []
                lessons_data[lesson].append(card)
            
            # Save individual lesson files
            for lesson_num, lesson_cards in lessons_data.items():
                lesson_file = output_path / f"lesson-{lesson_num}.json"
                with open(lesson_file, 'w', encoding='utf-8') as f:
                    json.dump(lesson_cards, f, ensure_ascii=False, indent=2)
            
            # Save all cards
            with open(output_path / "all.json", 'w', encoding='utf-8') as f:
                json.dump(unique_cards, f, ensure_ascii=False, indent=2)
            
            # Copy metadata if exists
            metadata_file = old_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                metadata['totalCards'] = len(unique_cards)
                with open(output_path / "metadata.json", 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f"{textbook_id}:")
            print(f"  Original cards: {len(all_cards)}")
            print(f"  After deduplication: {len(unique_cards)}")
            print(f"  Removed duplicates: {len(all_cards) - len(unique_cards)}")
            print()

def copy_other_files():
    """Copy other necessary files"""
    print("Copying other files...")
    
    # Copy index.json
    old_index = OLD_DATA_DIR / "index.json"
    if old_index.exists():
        output_index = OUTPUT_DIR / "index.json"
        with open(old_index, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
        
        # Update counts
        for textbook_id in index_data.get('textbooks', {}):
            all_file = OUTPUT_DIR / textbook_id / "all.json"
            if all_file.exists():
                with open(all_file, 'r', encoding='utf-8') as f:
                    cards = json.load(f)
                    index_data['textbooks'][textbook_id]['cardCount'] = len(cards)
        
        # Recalculate total
        index_data['totalCards'] = sum(
            tb['cardCount'] for tb in index_data['textbooks'].values()
        )
        
        with open(output_index, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        print(f"  Updated index.json: {index_data['totalCards']} total cards")
    
    # Copy themes.json if exists
    themes_file = OLD_DATA_DIR / "themes.json"
    if themes_file.exists():
        import shutil
        shutil.copy2(themes_file, OUTPUT_DIR / "themes.json")
        print("  Copied themes.json")

def main():
    """Main merge process"""
    print("=== Textbook Vocabulary Merge Tool ===\n")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Analyze existing data
    analyze_duplicates()
    
    # Step 2: Copy and deduplicate
    copy_existing_with_deduplication()
    
    # Step 3: Copy other files
    copy_other_files()
    
    print("\n✅ Merge complete! Data saved to:", OUTPUT_DIR)
    print("\nNext steps:")
    print("1. Review the deduplicated data")
    print("2. Consider adding new vocabulary from MCP server if needed")
    print("3. Test the imported data in the application")

if __name__ == "__main__":
    main()
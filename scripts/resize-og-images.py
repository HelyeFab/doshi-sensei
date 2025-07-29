#!/usr/bin/env python3
"""
Resize and create Open Graph images for Doshi Sensei
Creates 1200x630px images with branding
"""

import os
from PIL import Image, ImageDraw, ImageFont
import shutil

# Configuration
BRAND_COLOR = (138, 92, 246)  # #8a5cf6 in RGB
WHITE = (255, 255, 255)
OG_WIDTH = 1200
OG_HEIGHT = 630

# Directory paths
base_dir = "/home/mate/Dev/NextProjects/doshi-sensei/public/og-images"
os.chdir(base_dir)

# Create backup directory
if not os.path.exists("originals"):
    os.makedirs("originals")

# Image mappings with titles and subtitles
image_configs = [
    {
        "input": "game-console.png",
        "output": "og-games.png",
        "title": "Japanese Learning Games",
        "subtitle": "Play fun games while learning Japanese"
    },
    {
        "input": "target.png",
        "output": "og-practice.png",
        "title": "Practice Japanese",
        "subtitle": "Master hiragana, katakana, and kanji"
    },
    {
        "input": "dictionary.png",
        "output": "og-vocabulary.png",
        "title": "Japanese Vocabulary",
        "subtitle": "Build your vocabulary with smart flashcards"
    },
    {
        "input": "cordless-drill.png",
        "output": "og-drill.png",
        "title": "Conjugation Drills",
        "subtitle": "Master Japanese verb conjugations"
    },
    {
        "input": "stories.png",
        "output": "og-stories.png",
        "title": "Japanese Stories",
        "subtitle": "Read engaging stories with furigana support"
    },
    {
        "input": "stakeholder.png",
        "output": "og-resources.png",
        "title": "Learning Resources",
        "subtitle": "Curated Japanese learning materials"
    },
    {
        "input": "kanji.png",
        "output": "og-kanji.png",
        "title": "Kanji Browser",
        "subtitle": "Explore kanji with stroke orders and meanings"
    },
    {
        "input": "tool-box.png",
        "output": "og-tools.png",
        "title": "Japanese Learning Tools",
        "subtitle": "YouTube shadowing & textbook vocabulary"
    },
    {
        "input": "stories.png",  # Reusing stories for news
        "output": "og-news.png",
        "title": "Japanese News",
        "subtitle": "Read NHK news with furigana support"
    }
]

def create_og_image(config):
    """Create an Open Graph image with icon and text"""
    
    # Skip if input doesn't exist
    if not os.path.exists(config["input"]):
        print(f"Warning: {config['input']} not found, skipping...")
        return
    
    print(f"Creating {config['output']}...")
    
    # Create backup
    if not os.path.exists(f"originals/{config['input']}"):
        shutil.copy2(config["input"], f"originals/{config['input']}")
    
    # Create new image with brand color background
    og_image = Image.new('RGB', (OG_WIDTH, OG_HEIGHT), BRAND_COLOR)
    draw = ImageDraw.Draw(og_image)
    
    # Load and resize icon
    icon = Image.open(config["input"])
    if icon.mode == 'RGBA':
        # Create white background for icon
        icon_bg = Image.new('RGB', icon.size, WHITE)
        icon_bg.paste(icon, mask=icon.split()[3])
        icon = icon_bg
    
    # Resize icon to fit nicely
    icon_size = 280
    icon.thumbnail((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    # Paste icon on left side
    icon_x = 100
    icon_y = (OG_HEIGHT - icon.height) // 2
    og_image.paste(icon, (icon_x, icon_y))
    
    # Try to use system fonts (fallback to default if not available)
    try:
        # Try common font paths
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        url_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        url_font = ImageFont.load_default()
    
    # Draw title
    title_x = icon_x + icon_size + 80
    title_y = OG_HEIGHT // 2 - 80
    draw.text((title_x, title_y), config["title"], fill=WHITE, font=title_font)
    
    # Draw subtitle
    subtitle_y = title_y + 100
    draw.text((title_x, subtitle_y), config["subtitle"], fill=WHITE, font=subtitle_font)
    
    # Draw website URL
    url_text = "doshisensei.com"
    url_x = OG_WIDTH - 200
    url_y = OG_HEIGHT - 60
    draw.text((url_x, url_y), url_text, fill=WHITE, font=url_font)
    
    # Save the image
    og_image.save(config["output"], 'PNG', optimize=True)
    print(f"✓ Created {config['output']}")

# Process all images
print("Creating Open Graph images...")
print(f"Working directory: {os.getcwd()}")

for config in image_configs:
    try:
        create_og_image(config)
    except Exception as e:
        print(f"Error creating {config['output']}: {e}")

print("\nDone! Open Graph images have been created.")
print("Original images are backed up in ./originals/")
print("\nTo use these images, update your page.tsx files with:")
print('image: "/og-images/og-[section].png"')
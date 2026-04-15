#!/bin/bash
# Generate PWA icons using ImageMagick (or replace with your actual logo)
# Run: bash scripts/generate-icons.sh

mkdir -p public/icons

# Create a simple blue "D" icon as placeholder
# Replace these with your actual Doptex logo files
convert -size 512x512 xc:'#2563EB' \
  -fill white -font Helvetica-Bold -pointsize 300 \
  -gravity center -annotate 0 'D' \
  public/icons/icon-512.png 2>/dev/null || \

# Fallback: create with Python if ImageMagick not available
python3 << 'PYEOF'
try:
    from PIL import Image, ImageDraw, ImageFont
    for size in [192, 512]:
        img = Image.new('RGB', (size, size), '#2563EB')
        draw = ImageDraw.Draw(img)
        font_size = size // 2
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), "D", font=font)
        x = (size - (bbox[2] - bbox[0])) // 2
        y = (size - (bbox[3] - bbox[1])) // 2
        draw.text((x, y), "D", fill="white", font=font)
        img.save(f"public/icons/icon-{size}.png")
    print("Icons generated successfully!")
except Exception as e:
    print(f"Could not generate icons: {e}")
    print("Please add icon-192.png and icon-512.png manually to public/icons/")
PYEOF

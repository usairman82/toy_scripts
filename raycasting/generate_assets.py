"""
Asset Generator for Dungeon Adventure Game
This script generates all the necessary textures, sprites, and UI elements
and saves them directly to the appropriate directories.

Requirements:
- Python 3.6+
- Pillow library (pip install pillow)
"""

import os
from PIL import Image, ImageDraw

# Ensure directories exist
def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

# Create all necessary directories
def create_directories():
    directories = [
        "assets/textures",
        "assets/sprites",
        "assets/sprites/enemies",
        "assets/sprites/items",
        "assets/sprites/player",
        "assets/audio",
        "assets/audio/music",
        "assets/audio/sfx",
        "assets/maps",
        "assets/ui"
    ]
    
    for directory in directories:
        ensure_dir(directory)
    
    print("Created all necessary directories.")

# Helper function to create a new image with transparent background
def create_transparent_image(width, height):
    return Image.new("RGBA", (width, height), (0, 0, 0, 0))

# Helper function to create a new image with solid background
def create_solid_image(width, height, color):
    return Image.new("RGB", (width, height), color)

# Wall Textures
def generate_stone_wall():
    img = create_solid_image(64, 64, (85, 85, 85))
    draw = ImageDraw.Draw(img)
    
    # Stone pattern
    for y in range(4):
        for x in range(4):
            offset_x = x * 16
            offset_y = y * 16
            
            # Alternate stone pattern
            if (x + y) % 2 == 0:
                draw.rectangle([offset_x + 1, offset_y + 1, offset_x + 15, offset_y + 15], fill=(119, 119, 119))
            else:
                draw.rectangle([offset_x + 2, offset_y + 2, offset_x + 14, offset_y + 14], fill=(119, 119, 119))
    
    # Add some noise
    import random
    for _ in range(100):
        x = random.randint(0, 63)
        y = random.randint(0, 63)
        draw.point([x, y], fill=(102, 102, 102))
    
    img.save("assets/textures/stone_wall.png")
    print("Generated stone_wall.png")

def generate_brick_wall():
    img = create_solid_image(64, 64, (165, 42, 42))
    draw = ImageDraw.Draw(img)
    
    # Brick pattern
    # Horizontal lines (mortar)
    for y in range(0, 64, 16):
        draw.rectangle([0, y, 63, y + 1], fill=(139, 0, 0))
    
    # Vertical lines (mortar)
    for x in range(0, 64, 16):
        draw.rectangle([x, 0, x + 1, 63], fill=(139, 0, 0))
    
    # Offset every other row
    for y in range(0, 64, 32):
        draw.rectangle([8, y + 16, 63, y + 17], fill=(139, 0, 0))
    
    img.save("assets/textures/brick_wall.png")
    print("Generated brick_wall.png")

def generate_wood_wall():
    img = create_solid_image(64, 64, (139, 69, 19))
    draw = ImageDraw.Draw(img)
    
    # Wood grain
    for i in range(8):
        draw.rectangle([0, i * 8, 63, i * 8 + 3], fill=(160, 82, 45))
    
    # Wood knots
    draw.ellipse([12, 12, 20, 20], fill=(101, 67, 33))
    draw.ellipse([43, 35, 53, 45], fill=(101, 67, 33))
    
    img.save("assets/textures/wood_wall.png")
    print("Generated wood_wall.png")

def generate_secret_wall():
    img = create_solid_image(64, 64, (85, 85, 85))
    draw = ImageDraw.Draw(img)
    
    # Stone pattern (similar to stone wall but with a subtle difference)
    for y in range(4):
        for x in range(4):
            offset_x = x * 16
            offset_y = y * 16
            
            # Alternate stone pattern
            if (x + y) % 2 == 0:
                draw.rectangle([offset_x + 1, offset_y + 1, offset_x + 15, offset_y + 15], fill=(119, 119, 119))
            else:
                draw.rectangle([offset_x + 2, offset_y + 2, offset_x + 14, offset_y + 14], fill=(119, 119, 119))
    
    # Secret mark (subtle)
    draw.ellipse([24, 24, 40, 40], fill=(136, 136, 136))
    
    img.save("assets/textures/secret_wall.png")
    print("Generated secret_wall.png")

# Floor and Ceiling Textures
def generate_floor_texture():
    img = create_solid_image(64, 64, (85, 85, 85))
    draw = ImageDraw.Draw(img)
    
    # Floor pattern
    for y in range(8):
        for x in range(8):
            if (x + y) % 2 == 0:
                draw.rectangle([x * 8, y * 8, x * 8 + 7, y * 8 + 7], fill=(68, 68, 68))
    
    img.save("assets/textures/floor_stone.png")
    print("Generated floor_stone.png")

def generate_ceiling_texture():
    img = create_solid_image(64, 64, (51, 51, 51))
    draw = ImageDraw.Draw(img)
    
    # Ceiling pattern
    for i in range(0, 64, 16):
        draw.line([(0, i), (63, i)], fill=(34, 34, 34))
        draw.line([(i, 0), (i, 63)], fill=(34, 34, 34))
    
    img.save("assets/textures/ceiling_stone.png")
    print("Generated ceiling_stone.png")

# Door Textures
def generate_doors():
    # Closed door
    img_closed = create_solid_image(64, 64, (139, 69, 19))
    draw_closed = ImageDraw.Draw(img_closed)
    
    # Door frame
    draw_closed.rectangle([0, 0, 63, 3], fill=(101, 67, 33))
    draw_closed.rectangle([0, 60, 63, 63], fill=(101, 67, 33))
    draw_closed.rectangle([0, 0, 3, 63], fill=(101, 67, 33))
    draw_closed.rectangle([60, 0, 63, 63], fill=(101, 67, 33))
    
    # Door handle
    draw_closed.ellipse([48, 28, 56, 36], fill=(255, 215, 0))
    
    img_closed.save("assets/textures/door_closed.png")
    print("Generated door_closed.png")
    
    # Open door
    img_open = create_solid_image(64, 64, (0, 0, 0))
    draw_open = ImageDraw.Draw(img_open)
    
    # Door frame only
    draw_open.rectangle([0, 0, 63, 3], fill=(101, 67, 33))
    draw_open.rectangle([0, 60, 63, 63], fill=(101, 67, 33))
    draw_open.rectangle([0, 0, 3, 63], fill=(101, 67, 33))
    draw_open.rectangle([60, 0, 63, 63], fill=(101, 67, 33))
    
    img_open.save("assets/textures/door_open.png")
    print("Generated door_open.png")

# Player Items
def generate_player_hand():
    img = create_transparent_image(64, 64)
    draw = ImageDraw.Draw(img)
    
    # Hand/arm
    draw.rectangle([24, 32, 39, 63], fill=(255, 218, 185))
    
    # Sword handle
    draw.rectangle([28, 16, 35, 31], fill=(139, 69, 19))
    
    # Sword blade
    draw.rectangle([28, 0, 35, 15], fill=(192, 192, 192))
    
    img.save("assets/sprites/player/player_hand.png")
    print("Generated player_hand.png")

def generate_crossbow():
    img = create_transparent_image(64, 64)
    draw = ImageDraw.Draw(img)
    
    # Crossbow body
    draw.rectangle([24, 32, 39, 63], fill=(139, 69, 19))
    
    # Crossbow horizontal part
    draw.rectangle([8, 36, 55, 41], fill=(139, 69, 19))
    
    # Bowstring
    draw.line([(8, 39), (24, 32)], fill=(255, 255, 255))
    draw.line([(56, 39), (40, 32)], fill=(255, 255, 255))
    
    # Arrow
    draw.rectangle([24, 20, 25, 31], fill=(139, 69, 19))
    
    # Arrow tip
    draw.polygon([(25, 16), (28, 20), (22, 20)], fill=(192, 192, 192))
    
    img.save("assets/sprites/player/crossbow.png")
    print("Generated crossbow.png")

# Enemy Sprites
def generate_skeleton_idle():
    img = create_transparent_image(64, 64)
    draw = ImageDraw.Draw(img)
    
    # Skeleton body
    # Head
    draw.ellipse([20, 4, 44, 28], fill=(248, 248, 255))
    
    # Body
    draw.rectangle([24, 28, 39, 51], fill=(248, 248, 255))
    
    # Arms
    draw.rectangle([16, 28, 23, 43], fill=(248, 248, 255))
    draw.rectangle([40, 28, 47, 43], fill=(248, 248, 255))
    
    # Legs
    draw.rectangle([24, 52, 31, 63], fill=(248, 248, 255))
    draw.rectangle([32, 52, 39, 63], fill=(248, 248, 255))
    
    # Eyes
    draw.ellipse([26, 12, 30, 16], fill=(0, 0, 0))
    draw.ellipse([34, 12, 38, 16], fill=(0, 0, 0))
    
    img.save("assets/sprites/enemies/skeleton_idle.png")
    print("Generated skeleton_idle.png")

def generate_goblin_sprites():
    # Goblin idle
    img_idle = create_transparent_image(64, 64)
    draw_idle = ImageDraw.Draw(img_idle)
    
    # Goblin body (green)
    # Head
    draw_idle.ellipse([22, 6, 42, 26], fill=(0, 170, 85))
    
    # Body
    draw_idle.rectangle([26, 26, 37, 45], fill=(0, 170, 85))
    
    # Arms
    draw_idle.rectangle([18, 26, 25, 37], fill=(0, 170, 85))
    draw_idle.rectangle([38, 26, 45, 37], fill=(0, 170, 85))
    
    # Legs
    draw_idle.rectangle([26, 46, 31, 55], fill=(0, 170, 85))
    draw_idle.rectangle([32, 46, 37, 55], fill=(0, 170, 85))
    
    # Eyes
    draw_idle.ellipse([26, 12, 30, 16], fill=(255, 0, 0))
    draw_idle.ellipse([34, 12, 38, 16], fill=(255, 0, 0))
    
    img_idle.save("assets/sprites/enemies/goblin_idle.png")
    print("Generated goblin_idle.png")
    
    # Goblin attack
    img_attack = create_transparent_image(64, 64)
    draw_attack = ImageDraw.Draw(img_attack)
    
    # Goblin body (green)
    # Head
    draw_attack.ellipse([22, 6, 42, 26], fill=(0, 170, 85))
    
    # Body
    draw_attack.rectangle([26, 26, 37, 45], fill=(0, 170, 85))
    
    # Arms (attacking position)
    draw_attack.rectangle([14, 20, 25, 25], fill=(0, 170, 85))
    draw_attack.rectangle([38, 20, 49, 25], fill=(0, 170, 85))
    
    # Legs
    draw_attack.rectangle([26, 46, 31, 55], fill=(0, 170, 85))
    draw_attack.rectangle([32, 46, 37, 55], fill=(0, 170, 85))
    
    # Eyes (angry)
    draw_attack.ellipse([25, 11, 31, 17], fill=(255, 0, 0))
    draw_attack.ellipse([33, 11, 39, 17], fill=(255, 0, 0))
    
    img_attack.save("assets/sprites/enemies/goblin_attack.png")
    print("Generated goblin_attack.png")

def generate_wizard_sprites():
    # Wizard idle
    img_idle = create_transparent_image(64, 64)
    draw_idle = ImageDraw.Draw(img_idle)
    
    # Wizard body (purple)
    # Robe
    draw_idle.polygon([(22, 20), (42, 20), (46, 56), (18, 56)], fill=(96, 0, 144))
    
    # Head
    draw_idle.ellipse([24, 8, 40, 24], fill=(255, 218, 185))
    
    # Hat
    draw_idle.polygon([(20, 16), (32, 0), (44, 16)], fill=(96, 0, 144))
    
    # Eyes
    draw_idle.ellipse([28, 15, 30, 17], fill=(0, 0, 0))
    draw_idle.ellipse([34, 15, 36, 17], fill=(0, 0, 0))
    
    img_idle.save("assets/sprites/enemies/dark_wizard_idle.png")
    print("Generated dark_wizard_idle.png")
    
    # Wizard casting
    img_cast = create_transparent_image(64, 64)
    draw_cast = ImageDraw.Draw(img_cast)
    
    # Wizard body (purple)
    # Robe
    draw_cast.polygon([(22, 20), (42, 20), (46, 56), (18, 56)], fill=(96, 0, 144))
    
    # Head
    draw_cast.ellipse([24, 8, 40, 24], fill=(255, 218, 185))
    
    # Hat
    draw_cast.polygon([(20, 16), (32, 0), (44, 16)], fill=(96, 0, 144))
    
    # Eyes (glowing)
    draw_cast.ellipse([27, 14, 31, 18], fill=(0, 255, 255))
    draw_cast.ellipse([33, 14, 37, 18], fill=(0, 255, 255))
    
    # Casting hands
    draw_cast.ellipse([44, 26, 52, 34], fill=(255, 218, 185))
    
    # Magic effect
    # Create a semi-transparent cyan circle
    magic_img = create_transparent_image(16, 16)
    magic_draw = ImageDraw.Draw(magic_img)
    magic_draw.ellipse([0, 0, 15, 15], fill=(0, 255, 255, 128))
    
    # Paste the magic effect onto the main image
    img_cast.paste(magic_img, (48, 26), magic_img)
    
    img_cast.save("assets/sprites/enemies/dark_wizard_cast.png")
    print("Generated dark_wizard_cast.png")

def generate_boss_sprites():
    # Boss idle
    img_idle = create_transparent_image(64, 64)
    draw_idle = ImageDraw.Draw(img_idle)
    
    # Boss body (dark red)
    # Larger body
    draw_idle.rectangle([22, 24, 41, 55], fill=(153, 0, 0))
    
    # Head
    draw_idle.ellipse([18, 2, 46, 30], fill=(153, 0, 0))
    
    # Horns
    draw_idle.polygon([(24, 10), (18, 0), (26, 8)], fill=(153, 0, 0))
    draw_idle.polygon([(40, 10), (46, 0), (38, 8)], fill=(153, 0, 0))
    
    # Eyes
    draw_idle.ellipse([23, 11, 29, 17], fill=(255, 255, 0))
    draw_idle.ellipse([35, 11, 41, 17], fill=(255, 255, 0))
    
    img_idle.save("assets/sprites/enemies/boss_idle.png")
    print("Generated boss_idle.png")
    
    # Boss attack
    img_attack = create_transparent_image(64, 64)
    draw_attack = ImageDraw.Draw(img_attack)
    
    # Boss body (dark red)
    # Larger body
    draw_attack.rectangle([22, 24, 41, 55], fill=(153, 0, 0))
    
    # Head
    draw_attack.ellipse([18, 2, 46, 30], fill=(153, 0, 0))
    
    # Horns
    draw_attack.polygon([(24, 10), (18, 0), (26, 8)], fill=(153, 0, 0))
    draw_attack.polygon([(40, 10), (46, 0), (38, 8)], fill=(153, 0, 0))
    
    # Eyes (angry)
    draw_attack.ellipse([22, 10, 30, 18], fill=(255, 0, 0))
    draw_attack.ellipse([34, 10, 42, 18], fill=(255, 0, 0))
    
    # Attack claws
    draw_attack.polygon([(16, 30), (10, 26), (14, 34), (8, 32), (16, 38)], fill=(102, 0, 0))
    draw_attack.polygon([(48, 30), (54, 26), (50, 34), (56, 32), (48, 38)], fill=(102, 0, 0))
    
    img_attack.save("assets/sprites/enemies/boss_attack.png")
    print("Generated boss_attack.png")

# Item Sprites
def generate_health_potion():
    img = create_transparent_image(32, 32)
    draw = ImageDraw.Draw(img)
    
    # Bottle
    draw.rectangle([10, 12, 21, 27], fill=(139, 0, 0))
    
    # Bottle neck
    draw.rectangle([12, 8, 19, 11], fill=(165, 42, 42))
    
    # Bottle cap
    draw.rectangle([12, 4, 19, 7], fill=(255, 215, 0))
    
    # Highlight
    # Create a semi-transparent white rectangle
    highlight_img = create_transparent_image(4, 8)
    highlight_draw = ImageDraw.Draw(highlight_img)
    highlight_draw.rectangle([0, 0, 3, 7], fill=(255, 255, 255, 128))
    
    # Paste the highlight onto the main image
    img.paste(highlight_img, (14, 14), highlight_img)
    
    img.save("assets/sprites/items/health_potion.png")
    print("Generated health_potion.png")

def generate_keys():
    # Gold key
    img_gold = create_transparent_image(32, 32)
    draw_gold = ImageDraw.Draw(img_gold)
    
    # Key handle
    draw_gold.ellipse([4, 4, 16, 16], fill=(255, 215, 0))
    
    # Key hole
    draw_gold.ellipse([8, 8, 12, 12], fill=(0, 0, 0))
    
    # Key shaft
    draw_gold.rectangle([16, 8, 27, 12], fill=(255, 215, 0))
    
    # Key teeth
    draw_gold.rectangle([22, 12, 24, 16], fill=(255, 215, 0))
    draw_gold.rectangle([26, 12, 28, 18], fill=(255, 215, 0))
    
    img_gold.save("assets/sprites/items/key_gold.png")
    print("Generated key_gold.png")
    
    # Silver key
    img_silver = create_transparent_image(32, 32)
    draw_silver = ImageDraw.Draw(img_silver)
    
    # Key handle
    draw_silver.ellipse([4, 4, 16, 16], fill=(192, 192, 192))
    
    # Key hole
    draw_silver.ellipse([8, 8, 12, 12], fill=(0, 0, 0))
    
    # Key shaft
    draw_silver.rectangle([16, 8, 27, 12], fill=(192, 192, 192))
    
    # Key teeth
    draw_silver.rectangle([22, 12, 24, 16], fill=(192, 192, 192))
    draw_silver.rectangle([26, 12, 28, 18], fill=(192, 192, 192))
    
    img_silver.save("assets/sprites/items/key_silver.png")
    print("Generated key_silver.png")

def generate_chest():
    # Closed chest
    img_closed = create_transparent_image(64, 64)
    draw_closed = ImageDraw.Draw(img_closed)
    
    # Chest body
    draw_closed.rectangle([8, 24, 55, 55], fill=(139, 69, 19))
    
    # Chest lid
    draw_closed.rectangle([8, 16, 55, 23], fill=(160, 82, 45))
    
    # Chest lock
    draw_closed.rectangle([28, 20, 35, 23], fill=(255, 215, 0))
    
    # Chest details
    draw_closed.rectangle([8, 40, 55, 41], fill=(101, 67, 33))
    draw_closed.rectangle([16, 24, 17, 55], fill=(101, 67, 33))
    draw_closed.rectangle([46, 24, 47, 55], fill=(101, 67, 33))
    
    img_closed.save("assets/sprites/items/chest_closed.png")
    print("Generated chest_closed.png")
    
    # Open chest
    img_open = create_transparent_image(64, 64)
    draw_open = ImageDraw.Draw(img_open)
    
    # Chest body
    draw_open.rectangle([8, 24, 55, 55], fill=(139, 69, 19))
    
    # Chest lid (open)
    draw_open.rectangle([8, 8, 55, 15], fill=(160, 82, 45))
    
    # Chest lock (open)
    draw_open.rectangle([28, 8, 35, 11], fill=(255, 215, 0))
    
    # Chest details
    draw_open.rectangle([8, 40, 55, 41], fill=(101, 67, 33))
    draw_open.rectangle([16, 24, 17, 55], fill=(101, 67, 33))
    draw_open.rectangle([46, 24, 47, 55], fill=(101, 67, 33))
    
    # Chest interior
    draw_open.rectangle([10, 26, 53, 39], fill=(0, 0, 0))
    
    # Chest treasure glow
    # Create a semi-transparent gold rectangle
    treasure_img = create_transparent_image(32, 6)
    treasure_draw = ImageDraw.Draw(treasure_img)
    treasure_draw.rectangle([0, 0, 31, 5], fill=(255, 215, 0, 128))
    
    # Paste the treasure glow onto the main image
    img_open.paste(treasure_img, (16, 30), treasure_img)
    
    img_open.save("assets/sprites/items/chest_open.png")
    print("Generated chest_open.png")

# UI Elements
def generate_hud_elements():
    # Health bar
    img_health = create_solid_image(200, 20, (0, 0, 0, 128))
    draw_health = ImageDraw.Draw(img_health)
    draw_health.rectangle([2, 2, 197, 17], fill=(255, 0, 0))
    img_health.save("assets/ui/hud_healthbar.png")
    print("Generated hud_healthbar.png")
    
    # Crosshair
    img_crosshair = create_transparent_image(32, 32)
    draw_crosshair = ImageDraw.Draw(img_crosshair)
    draw_crosshair.line([(16, 8), (16, 24)], fill=(255, 255, 255), width=2)
    draw_crosshair.line([(8, 16), (24, 16)], fill=(255, 255, 255), width=2)
    img_crosshair.save("assets/ui/hud_crosshair.png")
    print("Generated hud_crosshair.png")
    
    # Inventory frame
    img_inv_frame = create_transparent_image(64, 64)
    draw_inv_frame = ImageDraw.Draw(img_inv_frame)
    # Create a semi-transparent black background
    for y in range(64):
        for x in range(64):
            img_inv_frame.putpixel((x, y), (0, 0, 0, 128))
    # Draw white border
    for i in range(2):
        draw_inv_frame.rectangle([i, i, 63-i, 63-i], outline=(255, 255, 255))
    img_inv_frame.save("assets/ui/inventory_frame.png")
    print("Generated inventory_frame.png")
    
    # Inventory selected
    img_inv_selected = create_transparent_image(64, 64)
    draw_inv_selected = ImageDraw.Draw(img_inv_selected)
    # Create a semi-transparent white background
    for y in range(64):
        for x in range(64):
            img_inv_selected.putpixel((x, y), (255, 255, 255, 76))
    # Draw yellow border
    for i in range(2):
        draw_inv_selected.rectangle([i, i, 63-i, 63-i], outline=(255, 255, 0))
    img_inv_selected.save("assets/ui/inventory_selected.png")
    print("Generated inventory_selected.png")

# Generate a screenshot for the README
def generate_screenshot():
    img = create_solid_image(800, 450, (0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw ceiling
    draw.rectangle([0, 0, 799, 224], fill=(51, 51, 51))
    
    # Draw floor
    draw.rectangle([0, 225, 799, 449], fill=(85, 85, 85))
    
    # Draw walls
    num_walls = 10
    wall_width = 800 // num_walls
    
    for i in range(num_walls):
        # Calculate wall height based on distance
        distance = 1 + i * 0.5
        wall_height = min(450, int((450 * 1.5) / distance))
        
        # Calculate wall position
        wall_x = i * wall_width
        wall_y = (450 - wall_height) // 2
        
        # Draw wall
        brightness = min(1, 1 - distance / 10)
        color = (int(200 * brightness), int(200 * brightness), int(200 * brightness))
        
        draw.rectangle([wall_x, wall_y, wall_x + wall_width - 1, wall_y + wall_height - 1], fill=color)
        
        # Draw wall texture
        if i % 2 == 0:
            # Stone pattern
            texture_color = (int(100 * brightness), int(100 * brightness), int(100 * brightness))
            
            for y in range(0, wall_height, 20):
                for x in range(0, wall_width, 20):
                    if (x + y) % 40 == 0:
                        draw.rectangle([wall_x + x, wall_y + y, wall_x + x + 9, wall_y + y + 9], fill=texture_color)
    
    # Draw enemy
    enemy_x = int(800 * 0.7)
    enemy_y = int(450 * 0.6)
    enemy_size = 60
    
    # Enemy body
    draw.ellipse([enemy_x - enemy_size//3, enemy_y - enemy_size*5//6, 
                  enemy_x + enemy_size//3, enemy_y - enemy_size//6], fill=(248, 248, 255))
    
    draw.rectangle([enemy_x - enemy_size//6, enemy_y - enemy_size//3, 
                   enemy_x + enemy_size//6, enemy_y + enemy_size//6], fill=(248, 248, 255))
    
    # Enemy eyes
    draw.ellipse([enemy_x - enemy_size//10 - enemy_size//15, enemy_y - enemy_size//2 - enemy_size//15, 
                  enemy_x - enemy_size//10 + enemy_size//15, enemy_y - enemy_size//2 + enemy_size//15], fill=(255, 0, 0))
    draw.ellipse([enemy_x + enemy_size//10 - enemy_size//15, enemy_y - enemy_size//2 - enemy_size//15, 
                  enemy_x + enemy_size//10 + enemy_size//15, enemy_y - enemy_size//2 + enemy_size//15], fill=(255, 0, 0))
    
    # Draw weapon
    draw.rectangle([int(800 * 0.9), int(450 * 0.7), int(800 * 0.9) + 10, int(450 * 0.7) + 100], fill=(139, 69, 19))
    draw.rectangle([int(800 * 0.88), int(450 * 0.6), int(800 * 0.88) + 14, int(450 * 0.6) + 40], fill=(192, 192, 192))
    
    # Draw HUD
    # Health bar
    draw.rectangle([20, 450 - 30, 220, 450 - 10], fill=(0, 0, 0, 128))
    draw.rectangle([22, 450 - 28, 172, 450 - 12], fill=(255, 0, 0))
    
    # Crosshair
    draw.line([(400 - 10, 225), (400 + 10, 225)], fill=(255, 255, 255), width=2)
    draw.line([(400, 225 - 10), (400, 225 + 10)], fill=(255, 255, 255), width=2)
    
    # Game title
    # PIL doesn't support text with a specific font easily, so we'll just draw a placeholder
    draw.rectangle([300, 20, 500, 40], fill=(0, 0, 0))
    
    img.save("screenshot.png")
    print("Generated screenshot.png")

# Main function to generate all assets
def main():
    print("Dungeon Adventure Game Asset Generator")
    print("--------------------------------------")
    
    # Create directories
    create_directories()
    
    # Generate wall textures
    generate_stone_wall()
    generate_brick_wall()
    generate_wood_wall()
    generate_secret_wall()
    
    # Generate floor and ceiling textures
    generate_floor_texture()
    generate_ceiling_texture()
    
    # Generate door textures
    generate_doors()
    
    # Generate player items
    generate_player_hand()
    generate_crossbow()
    
    # Generate enemy sprites
    generate_skeleton_idle()
    generate_goblin_sprites()
    generate_wizard_sprites()
    generate_boss_sprites()
    
    # Generate item sprites
    generate_health_potion()
    generate_keys()
    generate_chest()
    
    # Generate UI elements
    generate_hud_elements()
    
    # Generate screenshot
    generate_screenshot()
    
    print("\nAll assets generated successfully!")
    print("Assets have been saved to their respective directories.")

if __name__ == "__main__":
    main()

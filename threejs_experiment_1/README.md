# Procedural World Explorer

A Three.js-based procedural world generation experiment with dynamic terrain, vegetation, weather, day/night cycle, and ambient audio.

## Project Structure

```
threejs_experiment_1/
│
├── index.html                  # Main HTML file
├── styles.css                  # CSS styles
├── README.md                   # This documentation file
│
├── assets/                     # Static assets
│   ├── audio/                  # Audio files
│   │   ├── ambient/            # Ambient background sounds
│   │   │   ├── background_music.mp3  # Main background music
│   │   │   ├── morning.mp3     # Morning ambient sounds
│   │   │   ├── day.mp3         # Daytime ambient sounds
│   │   │   ├── evening.mp3     # Evening ambient sounds
│   │   │   └── night.mp3       # Night ambient sounds
│   │   │
│   │   ├── weather/            # Weather-specific sounds
│   │   │   ├── clear.mp3       # Clear weather ambient
│   │   │   ├── rain.mp3        # Rain sounds
│   │   │   ├── snow.mp3        # Snow/wind sounds
│   │   │   └── fog.mp3         # Foggy ambient sounds
│   │   │
│   │   └── animals/            # Animal sounds
│   │       ├── birds_morning.mp3  # Dawn chorus, birds chirping
│   │       ├── birds_day.mp3   # Daytime bird calls
│   │       ├── owl.mp3         # Owl hoots (night)
│   │       ├── crickets.mp3    # Cricket sounds (evening/night)
│   │       ├── cicadas.mp3     # Cicada sounds (hot days)
│   │       ├── wolf.mp3        # Wolf howls (night)
│   │       ├── coyote.mp3      # Coyote calls (night)
│   │       ├── cat.mp3         # Cat meows (evening/night)
│   │       └── frog.mp3        # Frog croaks (near water, night)
│   │
│   └── images/                 # Image assets
│
├── js/                         # JavaScript source files
│   ├── main.js                 # Main application entry point
│   │
│   ├── audio/                  # Audio system
│   │   └── AudioManager.js     # Handles all audio playback and management
│   │
│   ├── character/              # Character controls
│   │   └── Character.js        # Player character implementation
│   │
│   ├── core/                   # Core systems
│   │   └── LoadingManager.js   # Asset loading management
│   │
│   ├── utils/                  # Utility classes
│   │   ├── Noise.js            # Noise generation for procedural content
│   │   └── Stats.js            # Performance monitoring
│   │
│   └── world/                  # World generation and management
│       ├── World.js            # Main world container and manager
│       ├── Terrain.js          # Procedural terrain generation
│       ├── Vegetation.js       # Procedural vegetation placement
│       ├── Buildings.js        # Procedural building placement
│       ├── WeatherSystem.js    # Dynamic weather system
│       └── DayNightCycle.js    # Day/night cycle management
```

## Audio System

The project includes a comprehensive ambient audio system that dynamically changes based on:

1. **Time of Day**: Different ambient sounds play during morning, day, evening, and night
2. **Weather Conditions**: Weather-specific ambient sounds for clear, rain, snow, and fog
3. **Situational Animal Sounds**: Animal sounds that play at appropriate times:
   - Birds are active in the morning and day
   - Crickets and cicadas become active in the evening and night
   - Owls, wolves, and coyotes can be heard at night
   - Cats may occasionally be heard in the evening and night
   - Frogs can be heard near water at night

### Audio Fallback System

The audio system is designed to work even if audio assets are missing:

- Each audio loading function includes fallback mechanisms
- If an audio file fails to load, a placeholder sound is used instead
- The game will continue to run normally even without audio assets

## Running the Project

1. Start a local web server in the project directory
2. Open the index.html file in your browser
3. Explore the procedural world using the controls shown on screen

## Controls

- **WASD**: Move
- **SPACE**: Jump
- **SHIFT**: Sprint
- **MOUSE**: Look around
- **F**: Toggle camera mode
- **M**: Toggle music/sound

## Technical Details

- Built with Three.js for 3D rendering
- Uses procedural generation for terrain, vegetation, and buildings
- Features dynamic weather system with visual and audio effects
- Implements a realistic day/night cycle with appropriate lighting
- Includes a comprehensive audio system with situational ambient sounds

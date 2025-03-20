# Dungeon Adventure Game

A first-person dungeon adventure game that runs entirely in the browser using JavaScript and Canvas2D with raycasting-based rendering. The game features textured walls, environmental interactions (doors, chests, levers), and basic combat.

![Dungeon Adventure Game](screenshot.png)

## Features

- **Raycasting Engine**: 3D rendering of a 2D grid-based map
- **Texture Mapping**: Detailed wall textures and sprite rendering
- **Environmental Interactions**: Doors, chests, levers, and more
- **Combat System**: Fight enemies with different weapons
- **Inventory System**: Collect and use items
- **Save/Load**: Game progress saved to localStorage
- **Fully Client-Side**: No server dependencies, perfect for static hosting

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Basic knowledge of HTML, CSS, and JavaScript (for development)

### Setup

1. Clone or download this repository
2. Run the setup script to create the necessary directories:
   - On Windows: Double-click `setup_directories.bat` or run `npm run setup`
3. Generate the placeholder textures:
   - Open `generate_textures.html` in your browser
   - Click the "Generate All Textures" button
   - Save each texture to its appropriate directory as prompted
4. Open `index.html` in your browser to play the game

### Development Setup

If you want to modify the game:

1. Install Node.js if you want to use the provided npm scripts
2. Run `npm install` to install development dependencies
3. Use `npm start` to run a local development server
4. Make changes to the JavaScript files (`engine.js`, `game.js`)
5. Refresh the browser to see your changes
6. No build step is required as this is pure JavaScript

## Game Controls

- **W, A, S, D**: Move forward/backward, strafe left/right
- **Mouse or Arrow Keys**: Turn left/right
- **E**: Interact with objects (open doors, chests, press switches)
- **Space**: Attack
- **I**: Open/close inventory

## Level Creation

Levels are defined in JSON files located in the `assets/maps` directory. Each level file follows this format:

```json
{
  "width": 15,
  "height": 15,
  "layout": [
    ["W", "W", "W", "W", "W"],
    ["W", ".", ".", ".", "W"],
    ["W", ".", "W", ".", "W"],
    ["W", ".", ".", ".", "W"],
    ["W", "W", "W", "W", "W"]
  ],
  "objects": {
    "D": {"type": "door", "locked": true, "keyType": "gold"},
    "S": {"type": "enemy", "enemyType": "skeleton"},
    "C": {"type": "chest", "contains": "key_gold"}
  },
  "playerStart": {"x": 1, "y": 1}
}
```

Where:
- `W` represents walls
- `.` represents empty space
- Other letters represent objects defined in the `objects` section

## Deployment on Amazon S3

### Automated Deployment

The project includes a deployment script that automates the process:

```
node deploy-to-s3.js your-bucket-name [region]
```

Or using npm:

```
npm run deploy your-bucket-name [region]
```

This script will:
1. Create an S3 bucket if it doesn't exist
2. Configure it for static website hosting
3. Set appropriate permissions
4. Upload all game files
5. Provide you with the URL to access your game

### Manual S3 Bucket Setup

If you prefer to set up the S3 bucket manually:

1. **Create an S3 bucket**:
   - Sign in to the AWS Management Console
   - Navigate to the S3 service
   - Click "Create bucket"
   - Enter a unique bucket name (e.g., `dungeon-game`)
   - Choose a region close to your target audience
   - Keep default settings and click "Create bucket"

2. **Enable Static Website Hosting**:
   - Select your new bucket
   - Go to the "Properties" tab
   - Scroll down to "Static website hosting"
   - Click "Edit"
   - Select "Enable"
   - Enter `index.html` for both Index and Error document
   - Click "Save changes"

3. **Set Bucket Permissions**:
   - Go to the "Permissions" tab
   - Uncheck "Block all public access" (since this is a public website)
   - Click "Save"
   - Confirm by typing "confirm"
   - Add a Bucket Policy to make all objects public:
     - Click "Bucket Policy"
     - Paste the following policy (replace `your-bucket-name` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

4. **Upload the Game Files**:
   - Go to the "Objects" tab
   - Click "Upload"
   - Add all files and folders from your project
   - Click "Upload"

   Alternatively, use the AWS CLI:
   ```sh
   aws s3 sync ./dungeon-crawler s3://your-bucket-name --acl public-read
   ```

5. **Access Your Game**:
   - Go to the "Properties" tab
   - Scroll down to "Static website hosting"
   - Find your website endpoint URL (e.g., `http://your-bucket-name.s3-website-us-east-1.amazonaws.com`)
   - Open this URL in your browser to play the game

### Optional: Set Up CloudFront for Better Performance

1. Create a CloudFront distribution pointing to your S3 bucket
2. Use the CloudFront URL for faster global access to your game

## Project Structure

```
/dungeon-crawler/
├── index.html         # Main HTML entry point
├── game.js            # Core game logic
├── engine.js          # Raycasting engine
├── styles.css         # Game styling
├── assets/            # Assets directory
│   ├── textures/      # Wall & floor textures
│   ├── sprites/       # Enemies, items, projectiles
│   ├── audio/         # Game sound effects and music
│   ├── maps/          # Level definitions in JSON
│   ├── ui/            # UI Elements
├── generate_textures.html  # Tool to generate placeholder textures
├── generate_textures.js    # Texture generation script
├── README.md          # Project documentation
```

## Browser Compatibility

The game uses standard HTML5 Canvas API and JavaScript features supported by all modern browsers. For best performance, use the latest version of Chrome, Firefox, Safari, or Edge.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic games like Wolfenstein 3D
- Built with pure JavaScript and HTML5 Canvas
- Special thanks to the raycasting community for their tutorials and resources

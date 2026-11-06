# Reptile Interactive Cursor 2.1

A responsive, interactive reptile animation experiment with a refined mobile-first habitat layout built with vanilla HTML, CSS, Canvas 2D, and JavaScript.

**Tagline:** A Living Creature. A Responsive World.

## Features

- Pointer and touch interaction inside the habitat
- Follow, Idle, Explore, and Precision modes
- Five creature skin presets
- Adjustable animation speed, creature scale, and follow sensitivity
- Toggleable neon aura and eye illumination
- Responsive desktop, tablet, and mobile layout
- Canvas resizing with device-pixel-ratio handling
- `requestAnimationFrame` animation loop
- Page visibility and reduced-motion awareness
- No build step or framework required

## Run locally

Download or clone the repository, then open `index.html` in a modern browser. For a local web server, you can use VS Code Live Server or run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages deployment

1. Push the project files to the repository's `main` branch.
2. Open **Settings → Pages** in GitHub.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site.

## Controls

- Move a mouse or finger within the habitat to guide the creature.
- Choose a behaviour mode in the Control Center.
- Adjust speed, scale, and sensitivity with the sliders.
- Choose a skin preset and toggle visual effects.
- Use Pause and Reset to control the animation.

## Project files

```text
index.html
style.css
script.js
README.md
```

## Notes

The animation is rendered locally in the browser. No user pointer data is sent to a server. The Google Fonts stylesheet is an optional external font enhancement; system fallbacks remain available if it cannot load.

## Testing checklist

Test on current desktop and mobile browsers:
- Mouse movement and touch input
- Portrait and landscape orientation
- Canvas resizing
- All settings and buttons
- Browser tab visibility changes
- Reduced-motion preference

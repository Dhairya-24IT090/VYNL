# Lyrics Background Images

Drop your custom background images here (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`).

The VYNL lyrics panel automatically discovers all image files placed in this folder via Vite's `import.meta.glob`.
Each background's display name and identifier are derived from its filename (e.g. `cyberpunk-neon.webp` -> `Cyberpunk Neon`).

If this folder is empty, VYNL seamlessly falls back to the default ambient gradient.

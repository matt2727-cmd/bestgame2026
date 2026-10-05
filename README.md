# 🎮 Minecraft 3D Web Edition (bestgame2026)

A full-featured 3D voxel sandbox game built with JavaScript, Three.js, and Web Audio API running right in the browser!

## ✨ Features
- **Procedural Voxel World**: Rolling hills, valleys, underground caves, water bodies, sandy beaches, and oak trees generated with Perlin noise.
- **18+ Authentic Blocks**: Grass, Dirt, Stone, Cobblestone, Oak Wood, Planks, Leaves, Sand, Water, Glass, Brick, Diamond Ore, Gold Ore, Coal Ore, Glowstone, TNT, Bedrock, Obsidian, Bookshelf.
- **Explosives & Destruction**: Left-click TNT to prime fuse, causing an explosive crater blast with dynamic particles.
- **Procedural Audio**: Web Audio API footsteps, block dig/place/break sounds, TNT fuse/explosion sound, and peaceful ambient soundtrack.
- **First-Person Physics & Controls**: Smooth pointer-lock camera, jumping, gravity, step-assist, and Flying Mode (`F`).
- **Celestial Day/Night Cycle**: Orbiting sun/moon, dynamic lighting, and changing sky colors.
- **Creative Inventory & Hotbar**: 9-slot hotbar, creative block picker (`E`), and in-game commands (`T`).
- **Save & Load**: Saves your creations to browser `localStorage`.

## 🕹️ Controls
- **WASD**: Walk / Move
- **Space**: Jump (or fly up)
- **Shift**: Sprint (or fly down)
- **Left Click**: Mine / Break block / Ignite TNT
- **Right Click**: Place selected block
- **1-9 / Scroll Wheel**: Select hotbar item
- **E**: Buka Creative Inventory
- **X** / **Esc**: Tutup (X) Inventory
- **Alt** / **C**: Toggle Kursor Bebas / Terkunci
- **F**: Toggle Fly Mode
- **T** atau **/**: Buka Chat / Perintah:
  - `/x` atau `/close` — Tutup inventory
  - `/inv` atau `/inventory` — Buka creative inventory
  - `/clear` atau `/clearinv` — Kosongkan/reset hotbar & chat
  - `/give <nama_blok>` — Beri blok (cth: `/give diamond`, `/give tnt`)
  - `/time day` / `/time night` / `/time sunrise` — Ganti waktu
  - `/fly` — Terbang
  - `/tp <x> <y> <z>` — Teleportasi
  - `/save` — Simpan dunia
- **Esc**: Pause menu (pengaturan FOV, volume, simpan/reset dunia)

## 🚀 How to Run Locally
1. Simply double-click `index.html` to open in any web browser, or serve with any static server:
   ```bash
   npx serve .
   ```
2. Click **ENTER WORLD** and start exploring and building!
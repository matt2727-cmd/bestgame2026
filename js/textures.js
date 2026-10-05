// Procedural 16x16 pixel-art texture generator for authentic Minecraft blocks
const BlockTypes = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  WOOD_LOG: 5,
  WOOD_PLANKS: 6,
  LEAVES: 7,
  SAND: 8,
  WATER: 9,
  GLASS: 10,
  BRICK: 11,
  DIAMOND_ORE: 12,
  GOLD_ORE: 13,
  COAL_ORE: 14,
  GLOWSTONE: 15,
  TNT: 16,
  BEDROCK: 17,
  OBSIDIAN: 18,
  BOOKSHELF: 19
};

const BlockDefs = {
  [BlockTypes.GRASS]: {
    name: 'Grass Block',
    hardness: 1.0,
    sound: 'grass',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.DIRT]: {
    name: 'Dirt',
    hardness: 1.0,
    sound: 'dirt',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.STONE]: {
    name: 'Stone',
    hardness: 2.0,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.COBBLESTONE]: {
    name: 'Cobblestone',
    hardness: 2.0,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.WOOD_LOG]: {
    name: 'Oak Wood Log',
    hardness: 1.5,
    sound: 'wood',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.WOOD_PLANKS]: {
    name: 'Oak Planks',
    hardness: 1.2,
    sound: 'wood',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.LEAVES]: {
    name: 'Oak Leaves',
    hardness: 0.5,
    sound: 'grass',
    transparent: true,
    icon: null,
    light: 0
  },
  [BlockTypes.SAND]: {
    name: 'Sand',
    hardness: 0.8,
    sound: 'sand',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.WATER]: {
    name: 'Water',
    hardness: 0.0,
    sound: 'water',
    transparent: true,
    liquid: true,
    icon: null,
    light: 0
  },
  [BlockTypes.GLASS]: {
    name: 'Glass',
    hardness: 0.5,
    sound: 'stone',
    transparent: true,
    icon: null,
    light: 0
  },
  [BlockTypes.BRICK]: {
    name: 'Brick Block',
    hardness: 2.0,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.DIAMOND_ORE]: {
    name: 'Diamond Ore',
    hardness: 2.5,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 2
  },
  [BlockTypes.GOLD_ORE]: {
    name: 'Gold Ore',
    hardness: 2.2,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.COAL_ORE]: {
    name: 'Coal Ore',
    hardness: 2.0,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.GLOWSTONE]: {
    name: 'Glowstone',
    hardness: 0.8,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 15
  },
  [BlockTypes.TNT]: {
    name: 'TNT',
    hardness: 0.4,
    sound: 'grass',
    transparent: false,
    icon: null,
    special: 'tnt',
    light: 0
  },
  [BlockTypes.BEDROCK]: {
    name: 'Bedrock',
    hardness: 9999,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.OBSIDIAN]: {
    name: 'Obsidian',
    hardness: 5.0,
    sound: 'stone',
    transparent: false,
    icon: null,
    light: 0
  },
  [BlockTypes.BOOKSHELF]: {
    name: 'Bookshelf',
    hardness: 1.2,
    sound: 'wood',
    transparent: false,
    icon: null,
    light: 0
  }
};

class TextureManager {
  constructor() {
    this.textures = {};
    this.materials = {};
    this.icons = {};
  }

  // Create a 16x16 canvas
  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // PRNG helper for consistent texture generation
  seededNoise(x, y, seed = 1) {
    const val = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
    return val - Math.floor(val);
  }

  // Color helper
  rgb(r, g, b, a = 1) {
    return a === 1 ? `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})` : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  }

  init() {
    // 1. Dirt Texture
    const dirt = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 10);
        const r = 120 + n * 40;
        const g = 80 + n * 30;
        const b = 50 + n * 20;
        dirt.ctx.fillStyle = this.rgb(r, g, b);
        dirt.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['dirt'] = dirt.canvas;

    // 2. Grass Top
    const grassTop = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 20);
        const r = 70 + n * 35;
        const g = 145 + n * 45;
        const b = 40 + n * 25;
        grassTop.ctx.fillStyle = this.rgb(r, g, b);
        grassTop.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['grass_top'] = grassTop.canvas;

    // 3. Grass Side (Dirt with jagged grass overhang)
    const grassSide = this.createCanvas();
    grassSide.ctx.drawImage(dirt.canvas, 0, 0);
    for (let x = 0; x < 16; x++) {
      const drop = Math.floor(this.seededNoise(x, 0, 30) * 3) + 2;
      for (let y = 0; y <= drop; y++) {
        const n = this.seededNoise(x, y, 25);
        const r = 65 + n * 30;
        const g = 140 + n * 40;
        const b = 35 + n * 20;
        grassSide.ctx.fillStyle = this.rgb(r, g, b);
        grassSide.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['grass_side'] = grassSide.canvas;

    // 4. Stone
    const stone = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 40);
        const v = 105 + n * 45;
        stone.ctx.fillStyle = this.rgb(v, v, v);
        stone.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['stone'] = stone.canvas;

    // 5. Cobblestone
    const cobble = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 50);
        let v = 95 + n * 50;
        // add dark mortar lines
        if ((x % 4 === 0 && (y < 4 || y > 8)) || (y % 4 === 0) || (x === 8 && y >= 4 && y <= 8)) {
          v -= 45;
        }
        cobble.ctx.fillStyle = this.rgb(v, v, v);
        cobble.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['cobblestone'] = cobble.canvas;

    // 6. Wood Log Side
    const logSide = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const barkStripe = Math.sin(x * 1.5) * 15;
        const n = this.seededNoise(x, y, 60);
        const r = 100 + barkStripe + n * 25;
        const g = 75 + barkStripe * 0.75 + n * 20;
        const b = 45 + barkStripe * 0.5 + n * 15;
        logSide.ctx.fillStyle = this.rgb(r, g, b);
        logSide.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['wood_log_side'] = logSide.canvas;

    // 7. Wood Log Top
    const logTop = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ring = Math.floor(dist * 1.2) % 2 === 0 ? 20 : 0;
        const n = this.seededNoise(x, y, 70);
        const isBark = dist >= 6.5;
        if (isBark) {
          logTop.ctx.fillStyle = this.rgb(85 + n * 20, 60 + n * 15, 35 + n * 10);
        } else {
          logTop.ctx.fillStyle = this.rgb(160 - ring + n * 20, 125 - ring + n * 15, 75 - ring + n * 10);
        }
        logTop.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['wood_log_top'] = logTop.canvas;

    // 8. Wood Planks
    const planks = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const plankIdx = Math.floor(y / 4);
        const isGroove = (y % 4 === 3);
        const n = this.seededNoise(x, y, 80 + plankIdx * 10);
        let r = 175 + n * 25;
        let g = 135 + n * 20;
        let b = 80 + n * 15;
        if (isGroove || (x === (plankIdx % 2 === 0 ? 8 : 4) && y % 4 !== 3)) {
          r -= 50; g -= 40; b -= 30;
        }
        planks.ctx.fillStyle = this.rgb(r, g, b);
        planks.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['wood_planks'] = planks.canvas;

    // 9. Leaves
    const leaves = this.createCanvas();
    leaves.ctx.clearRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 90);
        if (n > 0.22) {
          const r = 35 + n * 40;
          const g = 110 + n * 60;
          const b = 25 + n * 30;
          leaves.ctx.fillStyle = this.rgb(r, g, b, 0.95);
          leaves.ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    this.textures['leaves'] = leaves.canvas;

    // 10. Sand
    const sand = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 100);
        const r = 215 + n * 25;
        const g = 200 + n * 25;
        const b = 140 + n * 25;
        sand.ctx.fillStyle = this.rgb(r, g, b);
        sand.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['sand'] = sand.canvas;

    // 11. Water
    const water = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 110);
        const r = 35 + n * 25;
        const g = 85 + n * 45;
        const b = 220 + n * 35;
        water.ctx.fillStyle = this.rgb(r, g, b, 0.72);
        water.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['water'] = water.canvas;

    // 12. Glass
    const glass = this.createCanvas();
    glass.ctx.clearRect(0, 0, 16, 16);
    // border
    glass.ctx.fillStyle = 'rgba(220, 240, 255, 0.8)';
    glass.ctx.strokeRect(0.5, 0.5, 15, 15);
    // highlight streak
    glass.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    glass.ctx.fillRect(2, 2, 2, 2);
    glass.ctx.fillRect(4, 4, 3, 2);
    glass.ctx.fillRect(10, 10, 2, 2);
    this.textures['glass'] = glass.canvas;

    // 13. Brick
    const brick = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const row = Math.floor(y / 4);
        const isMortarY = (y % 4 === 3);
        const offset = (row % 2) * 4;
        const isMortarX = ((x + offset) % 8 === 7);
        const n = this.seededNoise(x, y, 130);
        if (isMortarY || isMortarX) {
          brick.ctx.fillStyle = this.rgb(200 + n * 20, 195 + n * 20, 185 + n * 20);
        } else {
          brick.ctx.fillStyle = this.rgb(155 + n * 40, 65 + n * 25, 50 + n * 20);
        }
        brick.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['brick'] = brick.canvas;

    // 14. Diamond Ore
    const diamondOre = this.createCanvas();
    diamondOre.ctx.drawImage(stone.canvas, 0, 0);
    const orePoints = [[3,4], [4,4], [3,5], [11,3], [12,3], [11,4], [7,10], [8,10], [7,11], [8,11], [4,12]];
    for (const [ox, oy] of orePoints) {
      diamondOre.ctx.fillStyle = '#55ffff';
      diamondOre.ctx.fillRect(ox, oy, 1, 1);
      diamondOre.ctx.fillStyle = '#ffffff';
      diamondOre.ctx.fillRect(ox + 1, oy, 1, 1);
    }
    this.textures['diamond_ore'] = diamondOre.canvas;

    // 15. Gold Ore
    const goldOre = this.createCanvas();
    goldOre.ctx.drawImage(stone.canvas, 0, 0);
    const goldPoints = [[5,3], [6,3], [5,4], [10,6], [11,6], [12,6], [4,9], [5,9], [9,12], [10,12]];
    for (const [ox, oy] of goldPoints) {
      goldOre.ctx.fillStyle = '#ffcc22';
      goldOre.ctx.fillRect(ox, oy, 1, 1);
      goldOre.ctx.fillStyle = '#fff4a0';
      goldOre.ctx.fillRect(ox + 1, oy, 1, 1);
    }
    this.textures['gold_ore'] = goldOre.canvas;

    // 16. Coal Ore
    const coalOre = this.createCanvas();
    coalOre.ctx.drawImage(stone.canvas, 0, 0);
    const coalPoints = [[3,3], [4,3], [3,4], [4,4], [11,5], [12,5], [11,6], [6,10], [7,10], [8,10], [7,11]];
    for (const [ox, oy] of coalPoints) {
      coalOre.ctx.fillStyle = '#222222';
      coalOre.ctx.fillRect(ox, oy, 1, 1);
      coalOre.ctx.fillStyle = '#3a3a3a';
      coalOre.ctx.fillRect(ox + 1, oy, 1, 1);
    }
    this.textures['coal_ore'] = coalOre.canvas;

    // 17. Glowstone
    const glow = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 170);
        const r = 230 + n * 25;
        const g = 180 + n * 45;
        const b = 80 + n * 50;
        glow.ctx.fillStyle = this.rgb(r, g, b);
        glow.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['glowstone'] = glow.canvas;

    // 18. TNT Side
    const tntSide = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const isWhiteBand = (y >= 6 && y <= 9);
        const n = this.seededNoise(x, y, 180);
        if (isWhiteBand) {
          tntSide.ctx.fillStyle = this.rgb(235 + n * 20, 235 + n * 20, 235 + n * 20);
        } else {
          tntSide.ctx.fillStyle = this.rgb(190 + n * 40, 45 + n * 20, 30 + n * 15);
        }
        tntSide.ctx.fillRect(x, y, 1, 1);
      }
    }
    // Draw "TNT" pixel text in black
    tntSide.ctx.fillStyle = '#111';
    tntSide.ctx.font = 'bold 5px sans-serif';
    tntSide.ctx.fillText('TNT', 3, 10);
    this.textures['tnt_side'] = tntSide.canvas;

    // TNT Top
    const tntTop = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 185);
        tntTop.ctx.fillStyle = this.rgb(180 + n * 40, 40 + n * 20, 30 + n * 15);
        tntTop.ctx.fillRect(x, y, 1, 1);
      }
    }
    tntTop.ctx.fillStyle = '#444';
    tntTop.ctx.fillRect(7, 7, 2, 2);
    tntTop.ctx.fillStyle = '#ccc';
    tntTop.ctx.fillRect(8, 6, 1, 2);
    this.textures['tnt_top'] = tntTop.canvas;

    // 19. Bedrock
    const bedrock = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 190);
        const v = 30 + n * 50;
        bedrock.ctx.fillStyle = this.rgb(v, v, v);
        bedrock.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['bedrock'] = bedrock.canvas;

    // 20. Obsidian
    const obsidian = this.createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = this.seededNoise(x, y, 200);
        const r = 25 + n * 30;
        const g = 15 + n * 20;
        const b = 45 + n * 40;
        obsidian.ctx.fillStyle = this.rgb(r, g, b);
        obsidian.ctx.fillRect(x, y, 1, 1);
      }
    }
    this.textures['obsidian'] = obsidian.canvas;

    // 21. Bookshelf Side
    const bookshelf = this.createCanvas();
    bookshelf.ctx.drawImage(planks.canvas, 0, 0);
    // Draw 2 rows of books
    const bookColors = ['#9e2a2b', '#335c67', '#e09f3e', '#540b0e', '#3f88c5', '#2a9d8f'];
    for (let row = 0; row < 2; row++) {
      const startY = row === 0 ? 2 : 9;
      let curX = 1;
      while (curX < 15) {
        const width = 1 + (curX % 2);
        const color = bookColors[(curX + row * 3) % bookColors.length];
        bookshelf.ctx.fillStyle = color;
        bookshelf.ctx.fillRect(curX, startY, width, 5);
        curX += width;
      }
    }
    this.textures['bookshelf_side'] = bookshelf.canvas;

    // Convert all canvases to Three.js textures
    this.createThreeMaterials();
  }

  createThreeTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  createThreeMaterials() {
    const getMat = (texName, transparent = false, opacity = 1.0, emissive = 0x000000) => {
      const texture = this.createThreeTexture(this.textures[texName]);
      return new THREE.MeshLambertMaterial({
        map: texture,
        transparent: transparent,
        opacity: opacity,
        emissive: emissive,
        alphaTest: transparent && opacity === 1.0 ? 0.4 : 0
      });
    };

    // Material definitions for each block type:
    // BoxGeometry material array order: [right (+X), left (-X), top (+Y), bottom (-Y), front (+Z), back (-Z)]
    
    // Grass
    const grassTopMat = getMat('grass_top');
    const grassSideMat = getMat('grass_side');
    const dirtMat = getMat('dirt');
    this.materials[BlockTypes.GRASS] = [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat];
    this.icons[BlockTypes.GRASS] = this.textures['grass_side'];

    // Dirt
    this.materials[BlockTypes.DIRT] = dirtMat;
    this.icons[BlockTypes.DIRT] = this.textures['dirt'];

    // Stone
    const stoneMat = getMat('stone');
    this.materials[BlockTypes.STONE] = stoneMat;
    this.icons[BlockTypes.STONE] = this.textures['stone'];

    // Cobblestone
    const cobbleMat = getMat('cobblestone');
    this.materials[BlockTypes.COBBLESTONE] = cobbleMat;
    this.icons[BlockTypes.COBBLESTONE] = this.textures['cobblestone'];

    // Wood Log
    const logSideMat = getMat('wood_log_side');
    const logTopMat = getMat('wood_log_top');
    this.materials[BlockTypes.WOOD_LOG] = [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat];
    this.icons[BlockTypes.WOOD_LOG] = this.textures['wood_log_side'];

    // Planks
    const plankMat = getMat('wood_planks');
    this.materials[BlockTypes.WOOD_PLANKS] = plankMat;
    this.icons[BlockTypes.WOOD_PLANKS] = this.textures['wood_planks'];

    // Leaves
    const leavesMat = getMat('leaves', true, 0.9);
    this.materials[BlockTypes.LEAVES] = leavesMat;
    this.icons[BlockTypes.LEAVES] = this.textures['leaves'];

    // Sand
    const sandMat = getMat('sand');
    this.materials[BlockTypes.SAND] = sandMat;
    this.icons[BlockTypes.SAND] = this.textures['sand'];

    // Water
    const waterMat = getMat('water', true, 0.7);
    this.materials[BlockTypes.WATER] = waterMat;
    this.icons[BlockTypes.WATER] = this.textures['water'];

    // Glass
    const glassMat = getMat('glass', true, 0.4);
    this.materials[BlockTypes.GLASS] = glassMat;
    this.icons[BlockTypes.GLASS] = this.textures['glass'];

    // Brick
    const brickMat = getMat('brick');
    this.materials[BlockTypes.BRICK] = brickMat;
    this.icons[BlockTypes.BRICK] = this.textures['brick'];

    // Diamond Ore
    const diaMat = getMat('diamond_ore', false, 1.0, 0x113333);
    this.materials[BlockTypes.DIAMOND_ORE] = diaMat;
    this.icons[BlockTypes.DIAMOND_ORE] = this.textures['diamond_ore'];

    // Gold Ore
    const goldMat = getMat('gold_ore');
    this.materials[BlockTypes.GOLD_ORE] = goldMat;
    this.icons[BlockTypes.GOLD_ORE] = this.textures['gold_ore'];

    // Coal Ore
    const coalMat = getMat('coal_ore');
    this.materials[BlockTypes.COAL_ORE] = coalMat;
    this.icons[BlockTypes.COAL_ORE] = this.textures['coal_ore'];

    // Glowstone
    const glowMat = getMat('glowstone', false, 1.0, 0x665522);
    this.materials[BlockTypes.GLOWSTONE] = glowMat;
    this.icons[BlockTypes.GLOWSTONE] = this.textures['glowstone'];

    // TNT
    const tntSideMat = getMat('tnt_side');
    const tntTopMat = getMat('tnt_top');
    this.materials[BlockTypes.TNT] = [tntSideMat, tntSideMat, tntTopMat, tntTopMat, tntSideMat, tntSideMat];
    this.icons[BlockTypes.TNT] = this.textures['tnt_side'];

    // Bedrock
    const bedrockMat = getMat('bedrock');
    this.materials[BlockTypes.BEDROCK] = bedrockMat;
    this.icons[BlockTypes.BEDROCK] = this.textures['bedrock'];

    // Obsidian
    const obsMat = getMat('obsidian');
    this.materials[BlockTypes.OBSIDIAN] = obsMat;
    this.icons[BlockTypes.OBSIDIAN] = this.textures['obsidian'];

    // Bookshelf
    const shelfSideMat = getMat('bookshelf_side');
    this.materials[BlockTypes.BOOKSHELF] = [shelfSideMat, shelfSideMat, plankMat, plankMat, shelfSideMat, shelfSideMat];
    this.icons[BlockTypes.BOOKSHELF] = this.textures['bookshelf_side'];

    // Assign icons back to BlockDefs
    for (const id in BlockDefs) {
      if (this.icons[id]) {
        BlockDefs[id].icon = this.icons[id];
      }
    }
  }

  getBlockMaterial(type) {
    return this.materials[type] || this.materials[BlockTypes.DIRT];
  }

  getIconDataURL(type) {
    const canvas = this.icons[type];
    return canvas ? canvas.toDataURL() : '';
  }
}

// Global singleton
window.TextureManager = new TextureManager();

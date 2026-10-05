// Simplex / Perlin Noise implementation for realistic Minecraft terrain generation
class PerlinNoise {
  constructor(seed = 1337) {
    this.seed = seed;
    this.p = new Uint8Array(512);
    this.permutation = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
      8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
      35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
      134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
      55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
      18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
      250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
      189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
      172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
      228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
      107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i = 0; i < 256; i++) {
      this.p[256 + i] = this.p[i] = this.permutation[(i + seed) % 256];
    }
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y, 0), this.grad(this.p[B], x - 1, y, 0)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1, 0), this.grad(this.p[B + 1], x - 1, y - 1, 0))
    );
  }

  // Fractal Brownian Motion for rich multi-octave terrain
  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

// Chunk dimensions
const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;
const WORLD_HEIGHT = 48;
const SEA_LEVEL = 10;

class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;
    // Flat 1D array for ultra-fast indexing: [y * 256 + z * 16 + x]
    this.voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z * WORLD_HEIGHT);
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);
    this.isDirty = true;
  }

  getIndex(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || lz < 0 || lz >= CHUNK_SIZE_Z || ly < 0 || ly >= WORLD_HEIGHT) {
      return -1;
    }
    return ly * 256 + lz * 16 + lx;
  }

  getBlock(lx, ly, lz) {
    const idx = this.getIndex(lx, ly, lz);
    return idx === -1 ? BlockTypes.AIR : this.voxels[idx];
  }

  setBlock(lx, ly, lz, type) {
    const idx = this.getIndex(lx, ly, lz);
    if (idx !== -1) {
      this.voxels[idx] = type;
      this.isDirty = true;
    }
  }

  // Build optimized InstancedMesh per block type within this chunk
  rebuildMesh(scene) {
    // Clean old meshes
    while (this.meshGroup.children.length > 0) {
      const child = this.meshGroup.children[0];
      this.meshGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    if (!scene.children.includes(this.meshGroup)) {
      scene.add(this.meshGroup);
    }

    // Count visible instances per block type
    const counts = {};
    const visibleBlocks = [];

    const isOpaque = (type) => {
      if (type === BlockTypes.AIR) return false;
      const def = BlockDefs[type];
      return def ? !def.transparent : true;
    };

    // Check each block in chunk
    for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const type = this.getBlock(lx, ly, lz);
          if (type === BlockTypes.AIR) continue;

          // Check if at least one adjacent face is exposed
          const gx = this.cx * CHUNK_SIZE_X + lx;
          const gz = this.cz * CHUNK_SIZE_Z + lz;

          const neighbors = [
            this.world.getBlock(gx + 1, ly, gz),
            this.world.getBlock(gx - 1, ly, gz),
            this.world.getBlock(gx, ly + 1, gz),
            this.world.getBlock(gx, ly - 1, gz),
            this.world.getBlock(gx, ly, gz + 1),
            this.world.getBlock(gx, ly, gz - 1)
          ];

          const hasExposedFace = neighbors.some(n => !isOpaque(n));
          if (hasExposedFace) {
            counts[type] = (counts[type] || 0) + 1;
            visibleBlocks.push({ lx, ly, lz, type });
          }
        }
      }
    }

    // Create InstancedMesh for each block type present
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    const instancedMeshes = {};
    const indices = {};

    for (const type in counts) {
      const mat = window.TextureManager.getBlockMaterial(Number(type));
      const count = counts[type];
      const instMesh = new THREE.InstancedMesh(baseGeo, mat, count);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;
      // Store reference to chunk & type for raycasting
      instMesh.userData = { chunk: this, blockType: Number(type) };
      this.meshGroup.add(instMesh);
      instancedMeshes[type] = instMesh;
      indices[type] = 0;
    }

    const dummy = new THREE.Object3D();
    for (const b of visibleBlocks) {
      const mesh = instancedMeshes[b.type];
      const idx = indices[b.type]++;
      dummy.position.set(b.lx + 0.5, b.ly + 0.5, b.lz + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }

    for (const type in instancedMeshes) {
      instancedMeshes[type].instanceMatrix.needsUpdate = true;
    }

    this.isDirty = false;
  }
}

class VoxelWorld {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // key: "cx,cz"
    this.perlin = new PerlinNoise(4242);
    this.chunkRadius = 3; // 7x7 chunks = 112x112 block world! Smooth 60 FPS
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  getOrCreateChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz, this);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getBlock(gx, gy, gz) {
    if (gy < 0 || gy >= WORLD_HEIGHT) return BlockTypes.AIR;
    const cx = Math.floor(gx / CHUNK_SIZE_X);
    const cz = Math.floor(gz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockTypes.AIR;
    const lx = ((gx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((gz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getBlock(lx, gy, lz);
  }

  setBlock(gx, gy, gz, type) {
    if (gy < 0 || gy >= WORLD_HEIGHT) return false;
    const cx = Math.floor(gx / CHUNK_SIZE_X);
    const cz = Math.floor(gz / CHUNK_SIZE_Z);
    const chunk = this.getOrCreateChunk(cx, cz);
    const lx = ((gx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((gz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    chunk.setBlock(lx, gy, lz, type);

    // If on chunk border, mark neighboring chunks dirty
    if (lx === 0) this.markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE_X - 1) this.markChunkDirty(cx + 1, cz);
    if (lz === 0) this.markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE_Z - 1) this.markChunkDirty(cx, cz + 1);

    chunk.rebuildMesh(this.scene);
    return true;
  }

  markChunkDirty(cx, cz) {
    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      chunk.isDirty = true;
      chunk.rebuildMesh(this.scene);
    }
  }

  // Procedural terrain generation for chunk
  generateChunkTerrain(chunk) {
    const cx = chunk.cx;
    const cz = chunk.cz;

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const gx = cx * CHUNK_SIZE_X + lx;
        const gz = cz * CHUNK_SIZE_Z + lz;

        // Multi-frequency Perlin noise for rolling hills and mountains
        const elevation = this.perlin.fbm(gx * 0.03, gz * 0.03, 4, 0.45, 2.0);
        // Base ground level around 13-14, peaks up to 25, valleys down to 8
        const surfaceHeight = Math.floor(14 + elevation * 10);

        for (let gy = 0; gy < WORLD_HEIGHT; gy++) {
          if (gy === 0) {
            // Unbreakable Bedrock at bottom
            chunk.setBlock(lx, gy, lz, BlockTypes.BEDROCK);
          } else if (gy < surfaceHeight - 4) {
            // Stone layer with ores
            const oreNoise = this.perlin.noise2D(gx * 0.25, (gz + gy * 7) * 0.25);
            if (gy < 6 && oreNoise > 0.45) {
              chunk.setBlock(lx, gy, lz, BlockTypes.DIAMOND_ORE);
            } else if (gy < 10 && oreNoise > 0.38) {
              chunk.setBlock(lx, gy, lz, BlockTypes.GOLD_ORE);
            } else if (oreNoise > 0.32) {
              chunk.setBlock(lx, gy, lz, BlockTypes.COAL_ORE);
            } else {
              chunk.setBlock(lx, gy, lz, BlockTypes.STONE);
            }
          } else if (gy < surfaceHeight) {
            // Dirt under surface or sand if near water
            if (surfaceHeight <= SEA_LEVEL + 1) {
              chunk.setBlock(lx, gy, lz, BlockTypes.SAND);
            } else {
              chunk.setBlock(lx, gy, lz, BlockTypes.DIRT);
            }
          } else if (gy === surfaceHeight) {
            // Top layer: Sand if near water, Grass otherwise
            if (surfaceHeight <= SEA_LEVEL + 1) {
              chunk.setBlock(lx, gy, lz, BlockTypes.SAND);
            } else {
              chunk.setBlock(lx, gy, lz, BlockTypes.GRASS);
            }
          } else if (gy <= SEA_LEVEL && surfaceHeight < SEA_LEVEL) {
            // Water body fills valleys below sea level
            chunk.setBlock(lx, gy, lz, BlockTypes.WATER);
          }
        }

        // Procedural Tree Generation: on grassy plains, away from chunk borders
        if (surfaceHeight > SEA_LEVEL + 1 && lx >= 2 && lx <= CHUNK_SIZE_X - 3 && lz >= 2 && lz <= CHUNK_SIZE_Z - 3) {
          const treeNoise = this.perlin.noise2D(gx * 0.8, gz * 0.8);
          if (treeNoise > 0.48) {
            this.plantTree(chunk, lx, surfaceHeight + 1, lz);
          }
        }
      }
    }
  }

  // Grow an authentic Minecraft Oak Tree
  plantTree(chunk, lx, baseY, lz) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    // Wood trunk
    for (let y = 0; y < trunkHeight; y++) {
      chunk.setBlock(lx, baseY + y, lz, BlockTypes.WOOD_LOG);
    }

    // Leaves canopy (2 layers of 5x5, 2 layers of 3x3)
    const leafStart = baseY + trunkHeight - 2;
    for (let dy = 0; dy <= 3; dy++) {
      const radius = dy >= 2 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < 2) continue; // trunk inside
          // Round out corners for organic natural shape
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && (Math.random() > 0.4 || dy === 3)) {
            continue;
          }
          const curType = chunk.getBlock(lx + dx, leafStart + dy, lz + dz);
          if (curType === BlockTypes.AIR) {
            chunk.setBlock(lx + dx, leafStart + dy, lz + dz, BlockTypes.LEAVES);
          }
        }
      }
    }
  }

  // Generate complete starting world
  initWorld() {
    for (let cx = -this.chunkRadius; cx <= this.chunkRadius; cx++) {
      for (let cz = -this.chunkRadius; cz <= this.chunkRadius; cz++) {
        const chunk = this.getOrCreateChunk(cx, cz);
        this.generateChunkTerrain(chunk);
      }
    }
    // Mesh all chunks
    for (const chunk of this.chunks.values()) {
      chunk.rebuildMesh(this.scene);
    }
  }

  // Raycast to find block clicked and exact neighbor position for placement
  raycast(origin, direction, maxDistance = 6) {
    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    let bx = Math.floor(px);
    let by = Math.floor(py);
    let bz = Math.floor(pz);

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;

    const dx = Math.abs(direction.x);
    const dy = Math.abs(direction.y);
    const dz = Math.abs(direction.z);

    let tMaxX = dx > 0 ? ((direction.x > 0 ? bx + 1 - px : px - bx) / dx) : Infinity;
    let tMaxY = dy > 0 ? ((direction.y > 0 ? by + 1 - py : py - by) / dy) : Infinity;
    let tMaxZ = dz > 0 ? ((direction.z > 0 ? bz + 1 - pz : pz - bz) / dz) : Infinity;

    const tDeltaX = dx > 0 ? (1 / dx) : Infinity;
    const tDeltaY = dy > 0 ? (1 / dy) : Infinity;
    const tDeltaZ = dz > 0 ? (1 / dz) : Infinity;

    let normal = { x: 0, y: 0, z: 0 };
    let distance = 0;

    while (distance < maxDistance) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          bx += stepX;
          distance = tMaxX;
          tMaxX += tDeltaX;
          normal = { x: -stepX, y: 0, z: 0 };
        } else {
          bz += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      } else {
        if (tMaxY < tMaxZ) {
          by += stepY;
          distance = tMaxY;
          tMaxY += tDeltaY;
          normal = { x: 0, y: -stepY, z: 0 };
        } else {
          bz += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      }

      const blockType = this.getBlock(bx, by, bz);
      if (blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER) {
        return {
          hit: true,
          block: { x: bx, y: by, z: bz },
          type: blockType,
          normal: normal,
          placePos: { x: bx + normal.x, y: by + normal.y, z: bz + normal.z },
          distance: distance
        };
      }
    }

    return { hit: false };
  }

  // Trigger explosive blast (TNT)
  explode(cx, cy, cz, radius = 3.5) {
    const radSq = radius * radius;
    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const minY = Math.max(1, Math.floor(cy - radius));
    const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(cy + radius));
    const minZ = Math.floor(cz - radius);
    const maxZ = Math.ceil(cz + radius);

    const affectedChunks = new Set();

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const distSq = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
          if (distSq <= radSq) {
            const block = this.getBlock(x, y, z);
            if (block !== BlockTypes.AIR && block !== BlockTypes.BEDROCK) {
              const chunkX = Math.floor(x / CHUNK_SIZE_X);
              const chunkZ = Math.floor(z / CHUNK_SIZE_Z);
              const chunk = this.getChunk(chunkX, chunkZ);
              if (chunk) {
                const lx = ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
                const lz = ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
                chunk.setBlock(lx, y, lz, BlockTypes.AIR);
                affectedChunks.add(chunk);
              }
            }
          }
        }
      }
    }

    for (const chunk of affectedChunks) {
      chunk.rebuildMesh(this.scene);
    }
  }

  // Save world data to localStorage
  saveToStorage() {
    try {
      const data = {};
      for (const [key, chunk] of this.chunks.entries()) {
        const compressed = [];
        let curVal = chunk.voxels[0];
        let runLen = 1;
        for (let i = 1; i < chunk.voxels.length; i++) {
          if (chunk.voxels[i] === curVal) {
            runLen++;
          } else {
            compressed.push([curVal, runLen]);
            curVal = chunk.voxels[i];
            runLen = 1;
          }
        }
        compressed.push([curVal, runLen]);
        data[key] = compressed;
      }
      localStorage.setItem('bestgame_minecraft_world', JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save world:', e);
      return false;
    }
  }

  // Load world data from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('bestgame_minecraft_world');
      if (!saved) return false;
      const data = JSON.parse(saved);
      for (const key in data) {
        const [cx, cz] = key.split(',').map(Number);
        const chunk = this.getOrCreateChunk(cx, cz);
        let ptr = 0;
        for (const [val, count] of data[key]) {
          for (let i = 0; i < count; i++) {
            chunk.voxels[ptr++] = val;
          }
        }
        chunk.rebuildMesh(this.scene);
      }
      return true;
    } catch (e) {
      console.error('Failed to load world:', e);
      return false;
    }
  }
}

window.VoxelWorld = VoxelWorld;
window.BlockTypes = BlockTypes;
window.BlockDefs = BlockDefs;

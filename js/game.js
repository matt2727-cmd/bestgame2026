// Main Minecraft Game Loop, Day/Night Cycle, Particle Engine, Hotbar & UI Manager
class MinecraftGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');

    // Hotbar state: 9 slots
    this.hotbar = [
      BlockTypes.GRASS,
      BlockTypes.DIRT,
      BlockTypes.STONE,
      BlockTypes.WOOD_PLANKS,
      BlockTypes.WOOD_LOG,
      BlockTypes.BRICK,
      BlockTypes.GLASS,
      BlockTypes.TNT,
      BlockTypes.GLOWSTONE
    ];
    this.selectedSlot = 0;

    // Day / Night Cycle
    this.timeOfDay = 0.25; // 0.0 to 1.0 (0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 0.0 = midnight)
    this.daySpeed = 0.005; // ~200 seconds per full day

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.player = null;

    // Lights
    this.dirLight = null;
    this.hemiLight = null;
    this.sunMesh = null;
    this.moonMesh = null;

    // Block selection wireframe
    this.selectionBox = null;
    this.targetRaycast = null;

    // Particle System
    this.particles = [];
    this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    // Active TNT entities
    this.tntEntities = [];

    // Frame timing
    this.clock = new THREE.Clock();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    this.init();
  }

  init() {
    // 1. Initialize textures
    window.TextureManager.init();

    // 2. Initialize Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.015);

    // 3. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    this.scene.add(this.camera);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // authentic crisp pixel edges
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // 5. Build Sun, Moon & Celestial lighting
    this.setupLighting();

    // 6. Block Highlight Wireframe
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    this.selectionBox = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      depthTest: true
    }));
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    // 7. Initialize Voxel World & Player
    this.world = new VoxelWorld(this.scene);
    this.world.initWorld();

    this.player = new PlayerController(this.camera, this.world, this.renderer.domElement);

    // Try loading saved world if present
    const loaded = this.world.loadFromStorage();
    if (loaded) {
      this.showToast('💾 Loaded previous world save!');
    }

    // 8. Setup UI & Interaction Handlers
    this.setupHotbarUI();
    this.setupInventoryModal();
    this.setupChat();
    this.setupMouseActions();
    this.setupEventListeners();

    // 9. Resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // 10. Start game loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    this.scene.add(this.hemiLight);

    // Directional Sun / Moon light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    const d = 30;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Square Sun Mesh
    const sunGeo = new THREE.PlaneGeometry(16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, side: THREE.DoubleSide });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Square Moon Mesh
    const moonGeo = new THREE.PlaneGeometry(14, 14);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff, side: THREE.DoubleSide });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);
  }

  updateDayNightCycle(delta) {
    this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 1.0;
    const angle = this.timeOfDay * Math.PI * 2;

    const sunDist = 120;
    const sunX = Math.cos(angle) * sunDist;
    const sunY = Math.sin(angle) * sunDist;

    // Update Sun position
    this.sunMesh.position.set(this.player.position.x + sunX, sunY, this.player.position.z);
    this.sunMesh.lookAt(this.player.position);

    // Moon on opposite side
    this.moonMesh.position.set(this.player.position.x - sunX, -sunY, this.player.position.z);
    this.moonMesh.lookAt(this.player.position);

    // Update directional light
    const isDay = sunY > 0;
    if (isDay) {
      this.dirLight.position.set(this.player.position.x + sunX, sunY, this.player.position.z);
      this.dirLight.target.position.copy(this.player.position);
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = Math.max(0.2, (sunY / sunDist) * 1.1);
    } else {
      this.dirLight.position.set(this.player.position.x - sunX, -sunY, this.player.position.z);
      this.dirLight.target.position.copy(this.player.position);
      this.dirLight.color.setHex(0x5566aa);
      this.dirLight.intensity = 0.2;
    }

    // Sky & Fog colors transition smoothly
    let skyColor;
    if (sunY > 20) {
      // Full Day
      skyColor = new THREE.Color(0x78a7ff);
      this.hemiLight.intensity = 0.75;
    } else if (sunY > -10) {
      // Golden Sunrise / Sunset
      const t = (sunY + 10) / 30;
      skyColor = new THREE.Color(0xff8844).lerp(new THREE.Color(0x78a7ff), t);
      this.hemiLight.intensity = 0.5;
    } else {
      // Starry Night
      skyColor = new THREE.Color(0x0c0e18);
      this.hemiLight.intensity = 0.25;
    }

    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
  }

  setupHotbarUI() {
    const hotbarEl = document.getElementById('hotbar');
    hotbarEl.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = `hotbar-slot ${i === this.selectedSlot ? 'active' : ''}`;
      slot.dataset.slot = i;

      const num = document.createElement('span');
      num.className = 'slot-number';
      num.textContent = (i + 1);
      slot.appendChild(num);

      const blockType = this.hotbar[i];
      const icon = window.TextureManager.icons[blockType];
      if (icon) {
        const img = document.createElement('img');
        img.src = icon.toDataURL();
        slot.appendChild(img);
      }

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectSlot(i);
      });

      hotbarEl.appendChild(slot);
    }

    // Keys 1-9 and Wheel to change slots
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key >= '1' && e.key <= '9') {
        const slotIdx = parseInt(e.key) - 1;
        this.selectSlot(slotIdx);
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.player.isLocked) return;
      if (e.deltaY > 0) {
        this.selectSlot((this.selectedSlot + 1) % 9);
      } else if (e.deltaY < 0) {
        this.selectSlot((this.selectedSlot + 8) % 9);
      }
    });
  }

  selectSlot(index) {
    this.selectedSlot = index;
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((s, idx) => {
      s.classList.toggle('active', idx === index);
    });

    const blockType = this.hotbar[this.selectedSlot];
    this.player.updateHeldBlock(blockType);

    // Show block name banner
    const def = BlockDefs[blockType];
    if (def) {
      const nameEl = document.getElementById('selected-block-name');
      if (nameEl) {
        nameEl.textContent = def.name;
        nameEl.classList.add('show');
        clearTimeout(this.nameTimeout);
        this.nameTimeout = setTimeout(() => nameEl.classList.remove('show'), 1500);
      }
    }
  }

  setupInventoryModal() {
    const invGrid = document.getElementById('inventory-grid');
    const invModal = document.getElementById('inventory-modal');
    invGrid.innerHTML = '';

    for (const key in BlockDefs) {
      const type = Number(key);
      if (type === BlockTypes.AIR) continue;
      const def = BlockDefs[type];

      const slot = document.createElement('div');
      slot.className = 'inv-slot';

      const icon = window.TextureManager.icons[type];
      if (icon) {
        const img = document.createElement('img');
        img.src = icon.toDataURL();
        slot.appendChild(img);
      }

      const tooltip = document.createElement('div');
      tooltip.className = 'inv-slot-name';
      tooltip.textContent = def.name;
      slot.appendChild(tooltip);

      slot.addEventListener('click', () => {
        // Place selected item into current hotbar slot
        this.hotbar[this.selectedSlot] = type;
        this.setupHotbarUI();
        this.player.updateHeldBlock(type);
        this.showToast(`Selected ${def.name}`);
        invModal.classList.add('hidden');
      });

      invGrid.appendChild(slot);
    }

    // Toggle inventory with 'E' or close with 'X'
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.code === 'KeyE') {
        if (invModal.classList.contains('hidden')) {
          invModal.classList.remove('hidden');
          try { document.exitPointerLock(); } catch(err) {}
          if (this.player) {
            this.player.isLocked = false;
            this.player.updateCursorHUD();
          }
        } else {
          invModal.classList.add('hidden');
        }
      } else if (e.code === 'KeyX' && !invModal.classList.contains('hidden')) {
        // Pressing X closes inventory
        invModal.classList.add('hidden');
      }
    });

    // Make sure cursor is always free when hovering inside inventory
    invModal.addEventListener('mouseenter', () => {
      try { document.exitPointerLock(); } catch(err) {}
      if (this.player) {
        this.player.isLocked = false;
        this.player.updateCursorHUD();
      }
    });

    const closeInventoryModal = () => {
      invModal.classList.add('hidden');
    };

    const closeBtn = document.getElementById('inventory-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeInventoryModal);

    // Clear inventory hotbar button
    const clearBtn = document.getElementById('inventory-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearInventory();
      });
    }
  }

  // Clear / reset hotbar inventory
  clearInventory() {
    this.hotbar = [
      BlockTypes.GRASS,
      BlockTypes.DIRT,
      BlockTypes.STONE,
      BlockTypes.WOOD_PLANKS,
      BlockTypes.WOOD_LOG,
      BlockTypes.BRICK,
      BlockTypes.GLASS,
      BlockTypes.TNT,
      BlockTypes.GLOWSTONE
    ];
    this.selectedSlot = 0;
    this.setupHotbarUI();
    this.player.updateHeldBlock(this.hotbar[0]);
    this.showToast('🗑️ Hotbar inventory dikosongkan / direset!');
  }

  setupMouseActions() {
    this.mouseScreenX = window.innerWidth / 2;
    this.mouseScreenY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      // Don't trigger block actions if clicking on UI modals, buttons, or input boxes
      if (e.target.closest('#pause-screen, #start-screen, #inventory-modal, #chat-input, #cursor-toggle-btn, .hotbar-slot')) {
        return;
      }
      window.SoundManager.ensureContext();

      // If user was dragging camera (dragDistance > 6), ignore mining/placing
      if (!this.player.isLocked && this.player.dragDistance > 6) {
        return;
      }

      if (e.button === 0) {
        // Left Click: Dig / Break Block
        this.player.swingArm();
        if (this.targetRaycast && this.targetRaycast.hit) {
          const b = this.targetRaycast.block;
          const hitType = this.targetRaycast.type;

          if (hitType === BlockTypes.BEDROCK) {
            this.showToast('⚠️ Bedrock tidak bisa dihancurkan!');
            return;
          }

          if (hitType === BlockTypes.TNT) {
            // Prime TNT
            this.primeTNT(b.x, b.y, b.z);
            this.world.setBlock(b.x, b.y, b.z, BlockTypes.AIR);
            return;
          }

          // Spawn block break particles
          this.spawnBreakParticles(b.x + 0.5, b.y + 0.5, b.z + 0.5, hitType);

          const def = BlockDefs[hitType];
          window.SoundManager.playBreak(def ? def.sound : 'stone');

          this.world.setBlock(b.x, b.y, b.z, BlockTypes.AIR);
        }
      } else if (e.button === 2) {
        // Right Click: Place Block
        e.preventDefault();
        this.player.swingArm();

        if (this.targetRaycast && this.targetRaycast.hit) {
          const p = this.targetRaycast.placePos;
          const blockToPlace = this.hotbar[this.selectedSlot];

          // Check collision with player bounding box so we don't trap the player inside solid block
          const playerPos = this.player.position;
          const halfW = this.player.width / 2;
          const overlapsPlayer = (
            p.x + 1 > playerPos.x - halfW && p.x < playerPos.x + halfW &&
            p.y + 1 > playerPos.y && p.y < playerPos.y + this.player.height &&
            p.z + 1 > playerPos.z - halfW && p.z < playerPos.z + halfW
          );

          if (!overlapsPlayer || this.player.isFlying) {
            this.world.setBlock(p.x, p.y, p.z, blockToPlace);
            window.SoundManager.playPlace();
          }
        }
      }
    });

    // Prevent context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Spawn break particles matching block texture color
  spawnBreakParticles(x, y, z, blockType) {
    const mat = window.TextureManager.getBlockMaterial(blockType);
    const particleMat = Array.isArray(mat) ? mat[0] : mat;

    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, particleMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        y + (Math.random() - 0.5) * 0.6,
        z + (Math.random() - 0.5) * 0.6
      );
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 1.5,
        (Math.random() - 0.5) * 4
      );

      this.particles.push({
        mesh: mesh,
        velocity: vel,
        life: 0.7 + Math.random() * 0.3
      });
    }
  }

  // Prime TNT: flashing white entity that counts down and detonates
  primeTNT(x, y, z) {
    window.SoundManager.playFuse();
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const mat = window.TextureManager.getBlockMaterial(BlockTypes.TNT);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    this.tntEntities.push({
      mesh: mesh,
      pos: { x: x + 0.5, y: y + 0.5, z: z + 0.5 },
      timer: 2.8,
      flashTimer: 0
    });
  }

  updateTNT(delta) {
    for (let i = this.tntEntities.length - 1; i >= 0; i--) {
      const tnt = this.tntEntities[i];
      tnt.timer -= delta;
      tnt.flashTimer += delta * 8;

      // Pulse size & flash white
      const scale = 1.0 + Math.sin(tnt.flashTimer) * 0.08;
      tnt.mesh.scale.set(scale, scale, scale);

      if (tnt.timer <= 0) {
        // Boom!
        this.scene.remove(tnt.mesh);
        tnt.mesh.geometry.dispose();
        this.tntEntities.splice(i, 1);

        window.SoundManager.playExplosion();
        this.world.explode(tnt.pos.x, tnt.pos.y, tnt.pos.z, 3.8);

        // Huge explosion particles
        for (let p = 0; p < 45; p++) {
          const pMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.4 ? 0xff4400 : (Math.random() > 0.5 ? 0xffdd00 : 0x777777)
          });
          const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), pMat);
          pMesh.position.set(tnt.pos.x, tnt.pos.y, tnt.pos.z);
          this.scene.add(pMesh);

          this.particles.push({
            mesh: pMesh,
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 12,
              Math.random() * 10 + 2,
              (Math.random() - 0.5) * 12
            ),
            life: 1.2
          });
        }
      }
    }
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.velocity.y -= 18.0 * delta; // particle gravity
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += delta * 5;
      p.mesh.rotation.y += delta * 5;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  setupChat() {
    const input = document.getElementById('chat-input');
    const msgContainer = document.getElementById('chat-messages');

    const addMessage = (text, type = '') => {
      const div = document.createElement('div');
      div.className = `chat-msg ${type}`;
      div.textContent = text;
      msgContainer.appendChild(div);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        input.blur();
        this.renderer.domElement.requestPointerLock();

        if (!val) return;
        addMessage(`> ${val}`);

        // Command processing
        if (val.startsWith('/')) {
          const parts = val.slice(1).split(' ');
          const cmd = parts[0].toLowerCase();

          if (cmd === 'time') {
            if (parts[1] === 'day') {
              this.timeOfDay = 0.5;
              addMessage('Set time to Day (12:00)', 'command');
            } else if (parts[1] === 'night') {
              this.timeOfDay = 0.0;
              addMessage('Set time to Night (00:00)', 'command');
            } else if (parts[1] === 'sunrise') {
              this.timeOfDay = 0.25;
              addMessage('Set time to Sunrise (06:00)', 'command');
            }
          } else if (cmd === 'gamemode' || cmd === 'fly') {
            this.player.isFlying = !this.player.isFlying;
            addMessage(`Fly Mode: ${this.player.isFlying ? 'Enabled' : 'Disabled'}`, 'command');
          } else if (cmd === 'tp') {
            const x = parseFloat(parts[1]) || 0;
            const y = parseFloat(parts[2]) || 24;
            const z = parseFloat(parts[3]) || 0;
            this.player.teleport(x, y, z);
            addMessage(`Teleported to ${x}, ${y}, ${z}`, 'command');
          } else if (cmd === 'save') {
            this.world.saveToStorage();
            addMessage('World saved to browser storage!', 'command');
          } else if (cmd === 'x' || cmd === 'close') {
            const invModal = document.getElementById('inventory-modal');
            invModal.classList.add('hidden');
            addMessage('Closed inventory / menu', 'command');
          } else if (cmd === 'inv' || cmd === 'inventory') {
            const invModal = document.getElementById('inventory-modal');
            invModal.classList.toggle('hidden');
            addMessage(invModal.classList.contains('hidden') ? 'Closed creative inventory' : 'Opened creative inventory', 'command');
          } else if (cmd === 'clear' || cmd === 'clearinv' || cmd === 'ci') {
            this.clearInventory();
            msgContainer.innerHTML = '';
            addMessage('Cleared inventory hotbar & chat log!', 'command');
          } else if (cmd === 'give') {
            const itemQuery = (parts[1] || '').toLowerCase();
            let matchedType = null;
            for (const id in BlockDefs) {
              const bDef = BlockDefs[id];
              if (bDef && (bDef.name.toLowerCase().includes(itemQuery) || id === itemQuery)) {
                matchedType = Number(id);
                break;
              }
            }
            if (matchedType) {
              this.hotbar[this.selectedSlot] = matchedType;
              this.setupHotbarUI();
              this.player.updateHeldBlock(matchedType);
              addMessage(`Given ${BlockDefs[matchedType].name} to slot ${this.selectedSlot + 1}`, 'command');
            } else {
              addMessage(`Block '${itemQuery}' not found. Try: diamond, tnt, glowstone, gold, obsidian, etc.`, 'system');
            }
          } else {
            addMessage(`Unknown command: ${cmd}. Available: /x, /inv, /clear, /give <block>, /time day|night, /fly, /tp X Y Z, /save`, 'system');
          }
        }
      }
    });

    // Press 'T' or '/' to open chat prompt
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.code === 'KeyT' || e.code === 'Slash') {
        e.preventDefault();
        input.focus();
      }
    });
  }

  setupEventListeners() {
    // Start game button: directly hides screen without locking cursor!
    document.getElementById('play-btn').addEventListener('click', () => {
      window.SoundManager.ensureContext();
      document.getElementById('start-screen').classList.add('hidden');
    });

    // Resume button
    document.getElementById('resume-btn').addEventListener('click', () => {
      document.getElementById('pause-screen').classList.add('hidden');
    });

    // Save world button
    document.getElementById('save-btn').addEventListener('click', () => {
      const ok = this.world.saveToStorage();
      this.showToast(ok ? '💾 World Saved Successfully!' : '❌ Save Failed');
    });

    // Reset world button
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Regenerate fresh world? Unsaved building will be reset.')) {
        localStorage.removeItem('bestgame_minecraft_world');
        location.reload();
      }
    });

    // Settings slider
    const fovSlider = document.getElementById('fov-slider');
    if (fovSlider) {
      fovSlider.addEventListener('input', (e) => {
        this.camera.fov = Number(e.target.value);
        this.camera.updateProjectionMatrix();
      });
    }

    const volSlider = document.getElementById('vol-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        window.SoundManager.setVolume(Number(e.target.value) / 100);
      });
    }
  }

  showToast(text) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateDebugHUD() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const p = this.player.position;
      const yawDeg = ((this.player.yaw * 180 / Math.PI) % 360 + 360) % 360;
      let facing = 'South (+Z)';
      if (yawDeg >= 45 && yawDeg < 135) facing = 'West (-X)';
      else if (yawDeg >= 135 && yawDeg < 225) facing = 'North (-Z)';
      else if (yawDeg >= 225 && yawDeg < 315) facing = 'East (+X)';

      const hud = document.getElementById('debug-info');
      if (hud) {
        hud.innerHTML = `
          <div><span class="badge">FPS</span> ${this.fps}</div>
          <div>XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}</div>
          <div>Facing: ${facing}</div>
          <div>Mode: ${this.player.isFlying ? 'Flying (F)' : 'Survival'}</div>
        `;
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // 1. Update Player movement and physics
    this.player.update(delta);

    // 2. Update Day / Night cycle
    this.updateDayNightCycle(delta);

    // 3. Update TNT & Particles
    this.updateTNT(delta);
    this.updateParticles(delta);

    // 4. Raycast block targeting (from center when locked, or from mouse pointer when free)
    let rayDir;
    if (this.player.isLocked) {
      rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    } else {
      const ndcX = ((this.mouseScreenX || (window.innerWidth / 2)) / window.innerWidth) * 2 - 1;
      const ndcY = -((this.mouseScreenY || (window.innerHeight / 2)) / window.innerHeight) * 2 + 1;
      const mouseRay = new THREE.Raycaster();
      mouseRay.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
      rayDir = mouseRay.ray.direction;
    }
    this.targetRaycast = this.world.raycast(this.camera.position, rayDir, 6.5);

    if (this.targetRaycast.hit) {
      this.selectionBox.visible = true;
      const b = this.targetRaycast.block;
      this.selectionBox.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
    } else {
      this.selectionBox.visible = false;
    }

    // 5. Update HUD stats
    this.updateDebugHUD();

    // 6. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new MinecraftGame();
  window.showToast = (msg) => window.game.showToast(msg);
});

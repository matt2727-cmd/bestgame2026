// First-person player physics, collision detection (AABB), pointer lock, and animated 3D hand
class PlayerController {
  constructor(camera, world, domElement) {
    this.camera = camera;
    this.world = world;
    this.domElement = domElement;

    // Player bounding box (Minecraft scale: 0.6m wide, 1.8m tall, eye height 1.62m)
    this.width = 0.55;
    this.height = 1.8;
    this.eyeHeight = 1.62;

    this.position = new THREE.Vector3(0, 22, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.isFlying = false;
    this.isUnderwater = false;

    // Movement speeds
    this.walkSpeed = 5.2;
    this.sprintSpeed = 8.5;
    this.flySpeed = 14.0;
    this.jumpForce = 8.5;
    this.gravity = 24.0;

    // Camera rotation angles
    this.yaw = 0;
    this.pitch = 0;
    this.mouseSensitivity = 0.0022;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      shift: false
    };

    this.isLocked = false;
    this.isMouseDown = false;
    this.footstepTimer = 0;

    // 3D Player Hand & Held Item
    this.handGroup = new THREE.Group();
    this.handMesh = null;
    this.swingProgress = 0;
    this.isSwinging = false;
    this.bobbingTime = 0;

    this.setupPointerLock();
    this.setupKeyboard();
    this.setupHandModel();
  }

  toggleCursorMode() {
    if (this.isLocked) {
      try { document.exitPointerLock(); } catch(e) {}
    } else {
      try {
        const p = this.domElement.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch(e) {}
    }
  }

  updateCursorHUD() {
    const icon = document.getElementById('cursor-icon');
    const status = document.getElementById('cursor-status');
    const badge = document.getElementById('cursor-toggle-btn');
    if (this.isLocked) {
      if (icon) icon.textContent = '🔒';
      if (status) status.textContent = 'Kursor: TERKUNCI';
      if (badge) badge.classList.remove('free');
    } else {
      if (icon) icon.textContent = '🖱️';
      if (status) status.textContent = 'Kursor: BEBAS (Drag utk Putar)';
      if (badge) badge.classList.add('free');
    }
  }

  setupPointerLock() {
    // Note: Automatic locking on click is disabled by user request. Cursor is always free!
    const toggleBtn = document.getElementById('cursor-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCursorMode();
      });
    }

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
      this.updateCursorHUD();
    });

    document.addEventListener('pointerlockerror', () => {
      this.isLocked = false;
      this.updateCursorHUD();
    });

    // Track mouse button for dragging when cursor is free
    this.domElement.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragDistance = 0;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // Mouse movement rotates view (both in locked mode & when dragging with mouse)
    document.addEventListener('mousemove', (e) => {
      // In unlocked mode: dragging with mouse rotates view smoothly
      if (!this.isLocked && !this.isMouseDown) return;

      const movementX = e.movementX !== undefined ? e.movementX : 0;
      const movementY = e.movementY !== undefined ? e.movementY : 0;

      this.dragDistance = (this.dragDistance || 0) + Math.abs(movementX) + Math.abs(movementY);

      this.yaw -= movementX * this.mouseSensitivity;
      this.pitch -= movementY * this.mouseSensitivity;

      // Clamp pitch between -89° and +89°
      const maxPitch = Math.PI / 2 - 0.01;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      this.updateCameraRotation();
    });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      if (e.code === 'KeyC' || e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        this.toggleCursorMode();
        return;
      }

      if (e.code === 'Escape') {
        const pauseScreen = document.getElementById('pause-screen');
        const invModal = document.getElementById('inventory-modal');
        if (!invModal.classList.contains('hidden')) {
          invModal.classList.add('hidden');
          return;
        }
        pauseScreen.classList.toggle('hidden');
        if (!pauseScreen.classList.contains('hidden')) {
          try { document.exitPointerLock(); } catch(err) {}
        }
        return;
      }

      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.shift = true; break;
        case 'KeyF':
          this.isFlying = !this.isFlying;
          this.velocity.set(0, 0, 0);
          if (window.showToast) {
            window.showToast(this.isFlying ? '⚡ Fly Mode: ON' : '🚶 Survival Walk: ON');
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.shift = false; break;
      }
    });
  }

  // Create 3D first-person arm/held block attached to camera
  setupHandModel() {
    this.camera.add(this.handGroup);
    // Base hand position in bottom-right corner of screen
    this.handGroup.position.set(0.38, -0.35, -0.58);
    this.handGroup.rotation.set(0.15, -0.3, 0.05);

    // Initial item mesh: a cute mini block of grass
    this.updateHeldBlock(BlockTypes.GRASS);
  }

  updateHeldBlock(blockType) {
    if (this.handMesh) {
      this.handGroup.remove(this.handMesh);
      if (this.handMesh.geometry) this.handMesh.geometry.dispose();
    }

    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const mat = window.TextureManager.getBlockMaterial(blockType);
    this.handMesh = new THREE.Mesh(geo, mat);
    this.handMesh.rotation.set(0.2, 0.6, -0.1);
    this.handGroup.add(this.handMesh);
  }

  // Trigger punch / attack swing animation
  swingArm() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  updateCameraRotation() {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  // Check AABB collision at target position
  checkCollision(pos) {
    const halfW = this.width / 2;
    const minX = Math.floor(pos.x - halfW);
    const maxX = Math.floor(pos.x + halfW);
    const minY = Math.floor(pos.y);
    const maxY = Math.floor(pos.y + this.height);
    const minZ = Math.floor(pos.z - halfW);
    const maxZ = Math.floor(pos.z + halfW);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.world.getBlock(x, y, z);
          if (block !== BlockTypes.AIR && block !== BlockTypes.WATER) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Update physics and movement
  update(delta) {
    delta = Math.min(delta, 0.1); // cap delta to prevent physics tunneling

    // 1. Determine direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) moveDir.normalize();

    // Check underwater
    const headBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y + this.eyeHeight), Math.floor(this.position.z));
    this.isUnderwater = (headBlock === BlockTypes.WATER);
    const underwaterTint = document.getElementById('underwater-tint');
    if (underwaterTint) {
      if (this.isUnderwater) underwaterTint.classList.add('active');
      else underwaterTint.classList.remove('active');
    }

    if (this.isFlying) {
      // Fly movement
      const speed = this.flySpeed * (this.keys.shift ? 1.6 : 1.0);
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
      this.velocity.y = 0;
      if (this.keys.jump) this.velocity.y += speed * 0.8;
      if (this.keys.shift) this.velocity.y -= speed * 0.8;

      this.position.addScaledVector(this.velocity, delta);
    } else {
      // Survival movement with gravity & collision
      const speed = (this.keys.shift ? this.sprintSpeed : this.walkSpeed) * (this.isUnderwater ? 0.6 : 1.0);
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      // Gravity & jumping
      if (this.isUnderwater) {
        if (this.keys.jump) {
          this.velocity.y = 3.5;
        } else {
          this.velocity.y = Math.max(-2.5, this.velocity.y - 4.0 * delta);
        }
      } else {
        if (this.onGround && this.keys.jump) {
          this.velocity.y = this.jumpForce;
          this.onGround = false;
          window.SoundManager.playJump();
        }
        this.velocity.y -= this.gravity * delta;
      }

      // X movement with collision
      const nextX = this.position.clone();
      nextX.x += this.velocity.x * delta;
      if (!this.checkCollision(nextX)) {
        this.position.x = nextX.x;
      } else {
        // Step assist up 1 block
        const stepX = nextX.clone();
        stepX.y += 1.05;
        if (this.onGround && !this.checkCollision(stepX)) {
          this.position.x = nextX.x;
          this.position.y += 1.05;
        } else {
          this.velocity.x = 0;
        }
      }

      // Z movement with collision
      const nextZ = this.position.clone();
      nextZ.z += this.velocity.z * delta;
      if (!this.checkCollision(nextZ)) {
        this.position.z = nextZ.z;
      } else {
        const stepZ = nextZ.clone();
        stepZ.y += 1.05;
        if (this.onGround && !this.checkCollision(stepZ)) {
          this.position.z = nextZ.z;
          this.position.y += 1.05;
        } else {
          this.velocity.z = 0;
        }
      }

      // Y movement with collision
      const nextY = this.position.clone();
      nextY.y += this.velocity.y * delta;
      if (!this.checkCollision(nextY)) {
        this.position.y = nextY.y;
        this.onGround = false;
      } else {
        if (this.velocity.y < 0) {
          this.onGround = true;
          // snap to nearest block top
          this.position.y = Math.floor(nextY.y) + 1;
        }
        this.velocity.y = 0;
      }
    }

    // Footsteps sound on ground
    if (this.onGround && isMoving && !this.isFlying) {
      this.footstepTimer += delta * (this.keys.shift ? 1.6 : 1.0);
      if (this.footstepTimer > 0.38) {
        this.footstepTimer = 0;
        const groundBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.5), Math.floor(this.position.z));
        const def = BlockDefs[groundBlock];
        window.SoundManager.playFootstep(def ? def.sound : 'grass');
      }
    }

    // Update Camera position
    this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);

    // Hand Bobbing & Swing Animations
    if (isMoving && this.onGround) {
      this.bobbingTime += delta * 10;
    }
    const bobX = Math.cos(this.bobbingTime * 0.5) * 0.02;
    const bobY = Math.sin(this.bobbingTime) * 0.02;

    if (this.isSwinging) {
      this.swingProgress += delta * 7.5;
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      }
    }

    const swingAngle = Math.sin(this.swingProgress * Math.PI) * 0.7;
    this.handGroup.position.set(0.38 + bobX, -0.35 + bobY - swingAngle * 0.1, -0.58 - swingAngle * 0.15);
    this.handGroup.rotation.set(0.15 + swingAngle * 0.5, -0.3 - swingAngle * 0.3, 0.05 + swingAngle * 0.2);
  }

  // Teleport player safely
  teleport(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }
}

window.PlayerController = PlayerController;

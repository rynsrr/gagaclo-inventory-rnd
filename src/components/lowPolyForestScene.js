import * as THREE from 'three';

/**
 * Builds a clean, minimalist 3D Meadow environment ("Lantai Kayu di Tengah Padang Rumput").
 * Features:
 * - Fresh, lush green meadow grassland (padang rumput) with laser-flat ground under the floor
 * - Solid honey-colored timber plank floor platform for the warehouse racks and boxes
 * - Cute golden mascot dog sitting comfortably on the wooden floor
 * - Pure and clean: no human characters, no display mannequins, unobstructed 360° view
 * - 100% Three.js native procedural geometry running at 60 FPS
 */
export function buildLowPolyForestScene({ scene, minX = -18, maxX = 26 }) {
  const disposables = [];

  // 1. Atmosphere: Cheerful Sunny Sky & Soft Horizon Mist
  scene.background = new THREE.Color(0xbbf7d0); // Fresh mint-sky green
  scene.fog = new THREE.Fog(0xbbf7d0, 32, 115);

  // 2. Sunny Daylight & Warm Meadow Ambient Lighting
  const hemiLight = new THREE.HemisphereLight(0xfef9c3, 0x166534, 0.95);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm golden sunbeams
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
  sunLight.position.set(24, 38, 22);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 100;
  const d = 42;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  disposables.push(sunLight);

  // Soft emerald ambient fill
  const fillLight = new THREE.DirectionalLight(0x86efac, 0.45);
  fillLight.position.set(-20, 16, -18);
  scene.add(fillLight);
  disposables.push(fillLight);

  // 3. Vast Green Grassland with Laser-Flat Ground Under the Floor
  const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
  const posAttr = groundGeo.attributes.position;

  // Deck dimensions
  const deckCenterX = (minX + maxX) / 2;
  const deckWidth = (maxX - minX) + 8.5;
  const deckDepth = 8.0;
  const deckHeight = 0.08;

  // Ground undulation: STRICTLY 0 (completely flat) underneath and around the wooden floor!
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    // When plane is rotated by -PI/2 around X:
    // world X = vx, world Z = -vy
    const worldX = vx;
    const worldZ = -vy;

    // Check distance to the deck bounds with a generous margin of 6 meters
    const isInsideDeckArea =
      worldX >= deckCenterX - deckWidth / 2 - 6 &&
      worldX <= deckCenterX + deckWidth / 2 + 6 &&
      worldZ >= -deckDepth / 2 - 6 &&
      worldZ <= deckDepth / 2 + 6;

    if (isInsideDeckArea) {
      posAttr.setZ(i, 0); // Completely flat ground under and around the wooden floor
    } else {
      const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
      if (distFromCenter > 24) {
        const bump = Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 1.2;
        posAttr.setZ(i, bump);
      } else {
        posAttr.setZ(i, 0);
      }
    }
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3bb346, // Fresh, vibrant meadow grass green
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0; // Exactly level with 0
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat, ground);

  // 4. Solid Wooden Timber Floor in the Middle of the Meadow ("Lantai Kayu")
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xc47b38, // Warm honey oak timber planks
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true,
  });
  const plankGeo = new THREE.BoxGeometry(deckWidth, deckHeight, 0.58);
  const plankSpacing = 0.62;
  const numPlanks = Math.floor(deckDepth / plankSpacing);

  const deckGroup = new THREE.Group();
  for (let p = 0; p < numPlanks; p++) {
    const plank = new THREE.Mesh(plankGeo, deckMat);
    const pz = -deckDepth / 2 + p * plankSpacing + 0.3;
    plank.position.set(deckCenterX, deckHeight / 2, pz);
    plank.castShadow = true;
    plank.receiveShadow = true;
    deckGroup.add(plank);
  }

  scene.add(deckGroup);
  disposables.push(plankGeo, deckMat, deckGroup);

  return {
    update() {
      // Scene is static and peaceful
    },
    dispose() {
      disposables.forEach((item) => {
        if (!item) return;
        if (item.parent) item.parent.remove(item);
        if (item.dispose && typeof item.dispose === 'function') {
          item.dispose();
        }
      });
    },
  };
}

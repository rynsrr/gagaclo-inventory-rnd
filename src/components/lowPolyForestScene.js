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

  // Floor outer perimeter border trim
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8, flatShading: true });
  const borderGeo = new THREE.BoxGeometry(deckWidth + 0.2, deckHeight + 0.02, 0.12);
  const borderFront = new THREE.Mesh(borderGeo, borderMat);
  borderFront.position.set(deckCenterX, deckHeight / 2, deckDepth / 2);
  deckGroup.add(borderFront);
  const borderBack = new THREE.Mesh(borderGeo, borderMat);
  borderBack.position.set(deckCenterX, deckHeight / 2, -deckDepth / 2);
  deckGroup.add(borderBack);

  scene.add(deckGroup);
  disposables.push(plankGeo, deckMat, borderMat, borderGeo, deckGroup);

  // =========================================================================
  // 5. ANJING: Maskot Duduk Menemani di Atas Lantai Kayu
  // =========================================================================
  const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, flatShading: true });
  const dogCollarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  disposables.push(dogMat, dogCollarMat);

  const dogGroup = new THREE.Group();
  dogGroup.position.set(deckCenterX - 1.2, deckHeight, 2.8);

  // Dog Torso
  const dogBodyGeo = new THREE.BoxGeometry(0.38, 0.34, 0.6);
  const dogBody = new THREE.Mesh(dogBodyGeo, dogMat);
  dogBody.position.y = 0.32;
  dogBody.castShadow = true;
  dogGroup.add(dogBody);
  disposables.push(dogBodyGeo, dogBody);

  // Dog Head
  const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), dogMat);
  dogHead.position.set(0, 0.48, 0.26);
  dogGroup.add(dogHead);
  disposables.push(dogHead);

  // Collar
  const dogCollar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), dogCollarMat);
  dogCollar.position.set(0, 0.38, 0.24);
  dogGroup.add(dogCollar);
  disposables.push(dogCollar);

  // Snout & black nose
  const dogSnout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.18), dogMat);
  dogSnout.position.set(0, 0.44, 0.42);
  const darkNose = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x18181b })
  );
  darkNose.position.set(0, 0.48, 0.52);
  dogGroup.add(dogSnout, darkNose);
  disposables.push(dogSnout, darkNose);

  // Dog Ears
  const dogEarGeo = new THREE.ConeGeometry(0.07, 0.18, 4);
  const dEarL = new THREE.Mesh(dogEarGeo, dogMat);
  dEarL.position.set(-0.1, 0.58, 0.22);
  dEarL.rotation.z = -0.2;
  const dEarR = new THREE.Mesh(dogEarGeo, dogMat);
  dEarR.position.set(0.1, 0.58, 0.22);
  dEarR.rotation.z = 0.2;
  dogGroup.add(dEarL, dEarR);
  disposables.push(dogEarGeo, dEarL, dEarR);

  // Wagging Tail
  const dTailGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.32, 4);
  const dTail = new THREE.Mesh(dTailGeo, dogMat);
  dTail.position.set(0, 0.4, -0.32);
  dTail.rotation.x = -0.65;
  dogGroup.add(dTail);
  disposables.push(dTailGeo, dTail);

  scene.add(dogGroup);
  disposables.push(dogGroup);

  return {
    update(elapsed) {
      // Meadow Mascot Dog tail wagging
      dTail.rotation.y = Math.sin(elapsed * 14) * 0.55;
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

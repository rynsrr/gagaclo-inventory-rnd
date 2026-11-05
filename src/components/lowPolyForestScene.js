import * as THREE from 'three';

/**
 * Builds a charming, clean and high-performance Low Poly 3D meadow glade environment.
 * Features:
 * - Clean rolling green meadow terrain for unobstructed view
 * - Honey-colored timber plank clearing platform for the warehouse racks
 * - Whimsical red-and-white toadstool mushrooms, mossy boulders & colorful flowers
 * - Warm golden sunbeams and soft cheerful sky
 * - 100% lightweight procedural low-poly geometry (flatShading) running at 60 FPS
 */
export function buildLowPolyForestScene({ scene, minX = -18, maxX = 26, ecoModeRef }) {
  const disposables = [];

  // 1. Atmosphere: Warm Cheerful Sky & Soft Forest Fog
  scene.background = new THREE.Color(0xbfe3cc);
  scene.fog = new THREE.Fog(0xbfe3cc, 25, 92);

  // 2. Warm Magical Forest Lighting (Disney golden hour sun)
  const hemiLight = new THREE.HemisphereLight(0xe8f5e9, 0x1b4332, 0.95);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm golden sunbeams
  const sunLight = new THREE.DirectionalLight(0xfff1cf, 1.45);
  sunLight.position.set(24, 36, 20);
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

  // Soft minty ambient fill
  const fillLight = new THREE.DirectionalLight(0xa7f3d0, 0.4);
  fillLight.position.set(-22, 18, -16);
  scene.add(fillLight);
  disposables.push(fillLight);

  // 3. Faceted Low-Poly Forest Ground (Disney rolling green terrain)
  const groundGeo = new THREE.PlaneGeometry(150, 150, 28, 28);
  const posAttr = groundGeo.attributes.position;
  // Gentle organic hillock undulation
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    // Keep clearing center flat
    const distFromCenter = Math.sqrt(vx * vx + vy * vy);
    if (distFromCenter > 16) {
      const bump = Math.sin(vx * 0.12) * Math.cos(vy * 0.12) * 1.3 + Math.sin(vx * 0.25) * 0.4;
      posAttr.setZ(i, bump);
    }
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x48b652,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat, ground);

  // 4. Honey-Colored Wooden Timber Deck for the Racks
  const deckCenterX = (minX + maxX) / 2;
  const deckWidth = (maxX - minX) + 7.5;
  const deckDepth = 7.6;
  const deckHeight = 0.08;

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xc47b38, // Warm honey oak wood
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

  // Stepping stones path in front of the platform
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.8,
    flatShading: true,
  });
  const stoneGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.05, 6);
  disposables.push(stoneGeo, stoneMat);

  const stonePath = [
    { x: deckCenterX - 3.2, z: 4.8 },
    { x: deckCenterX - 1.8, z: 6.0 },
    { x: deckCenterX - 0.2, z: 7.2 },
    { x: deckCenterX + 1.4, z: 8.5 },
    { x: deckCenterX + 3.0, z: 9.8 },
  ];
  stonePath.forEach(({ x, z }) => {
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(x, 0.02, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
    disposables.push(stone);
  });

  // 5. Whimsical Meadow Accents
  // A. Red-and-White Fairy Toadstools (Jamur Payung)
  const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.7, flatShading: true });
  const mushCapMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6, flatShading: true });
  const mushDotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true });
  disposables.push(mushStemMat, mushCapMat, mushDotMat);

  const mushroomSpots = [
    { x: minX - 2.8, z: 4.6, s: 0.55 },
    { x: minX - 3.4, z: 4.8, s: 0.4 },
    { x: maxX + 2.8, z: 4.5, s: 0.5 },
    { x: maxX + 3.3, z: 4.2, s: 0.35 },
    { x: deckCenterX + 4.2, z: 5.2, s: 0.45 },
    { x: deckCenterX - 5.0, z: 5.0, s: 0.4 },
  ];

  mushroomSpots.forEach(({ x, z, s }) => {
    const mush = new THREE.Group();
    // Stem
    const sGeo = new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 0.7 * s, 6);
    const stem = new THREE.Mesh(sGeo, mushStemMat);
    stem.position.y = (0.7 * s) / 2;
    stem.castShadow = true;
    mush.add(stem);
    disposables.push(sGeo, stem);

    // Red Cap
    const cGeo = new THREE.ConeGeometry(0.55 * s, 0.45 * s, 7);
    const cap = new THREE.Mesh(cGeo, mushCapMat);
    cap.position.y = 0.65 * s;
    cap.castShadow = true;
    mush.add(cap);
    disposables.push(cGeo, cap);

    // Little white dots
    for (let d = 0; d < 4; d++) {
      const dotGeo = new THREE.SphereGeometry(0.08 * s, 4, 4);
      const dot = new THREE.Mesh(dotGeo, mushDotMat);
      const angle = (d * Math.PI) / 2;
      dot.position.set(Math.cos(angle) * 0.28 * s, 0.6 * s, Math.sin(angle) * 0.28 * s);
      mush.add(dot);
      disposables.push(dotGeo, dot);
    }

    mush.position.set(x, 0, z);
    scene.add(mush);
    disposables.push(mush);
  });

  // B. Low-Poly Mossy Boulders (Batu Bersegi)
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.85,
    flatShading: true,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x558b2f,
    roughness: 0.9,
    flatShading: true,
  });
  disposables.push(rockMat, mossMat);

  const boulderSpots = [
    { x: minX - 3.8, z: 3.0, s: 1.1 },
    { x: minX - 1.8, z: 5.5, s: 0.75 },
    { x: maxX + 3.2, z: 2.8, s: 1.2 },
    { x: maxX + 2.0, z: 5.6, s: 0.8 },
    { x: deckCenterX - 6.5, z: 4.8, s: 0.7 },
  ];

  boulderSpots.forEach(({ x, z, s }) => {
    const rockGeo = new THREE.DodecahedronGeometry(0.85 * s, 0);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.55 * s, z);
    rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    disposables.push(rockGeo, rock);

    // Moss cap on top
    const mossGeo = new THREE.ConeGeometry(0.7 * s, 0.25 * s, 5);
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.position.set(x, 1.05 * s, z);
    scene.add(moss);
    disposables.push(mossGeo, moss);
  });

  // C. Tiny Stylized Wildflowers (Kuning, Pink, Biru Muda)
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });
  const flowerPetalMats = [
    new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true }), // Yellow
    new THREE.MeshStandardMaterial({ color: 0xf472b6, flatShading: true }), // Pink
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, flatShading: true }), // Sky Blue
  ];
  disposables.push(flowerStemMat, ...flowerPetalMats);

  const flowerPositions = [
    { x: minX - 1.2, z: 4.5, color: 0 },
    { x: minX - 2.2, z: 5.2, color: 1 },
    { x: minX - 0.8, z: 5.8, color: 2 },
    { x: maxX + 1.2, z: 4.6, color: 1 },
    { x: maxX + 2.4, z: 5.2, color: 0 },
    { x: maxX + 1.5, z: 6.0, color: 2 },
    { x: deckCenterX - 4.2, z: 5.6, color: 0 },
    { x: deckCenterX + 4.8, z: 5.4, color: 1 },
    { x: deckCenterX - 1.0, z: 5.8, color: 2 },
  ];

  flowerPositions.forEach(({ x, z, color }) => {
    const fl = new THREE.Group();
    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 4);
    const stem = new THREE.Mesh(stemGeo, flowerStemMat);
    stem.position.y = 0.22;
    fl.add(stem);
    disposables.push(stemGeo, stem);

    // Petal blossom head
    const petalGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const petal = new THREE.Mesh(petalGeo, flowerPetalMats[color % flowerPetalMats.length]);
    petal.position.y = 0.48;
    petal.castShadow = true;
    fl.add(petal);
    disposables.push(petalGeo, petal);

    fl.position.set(x, 0, z);
    scene.add(fl);
    disposables.push(fl);
  });

  return {
    update(_elapsed) {
      // Scene is static and optimized
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

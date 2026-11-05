import * as THREE from 'three';

/**
 * Builds a vibrant, fresh Low Poly 3D Meadow environment with a central floor platform.
 * ("Lantai di Tengah Padang Rumput")
 * Features:
 * - Vast, rolling green meadow grassland (padang rumput) under a sunny sky
 * - Honey-colored timber plank floor platform for the warehouse boxes
 * - Stepping stones path & colorful wildflowers in the green grass
 * - 3D Safety Vest rotating mannequin display stand on the floor
 * - Project worker wearing a hi-vis neon orange safety vest & yellow hardhat
 * - Person wearing a warming thermal balaclava & puffer jacket
 * - Friendly golden mascot dog sitting happily on the floor
 * - 100% Three.js native procedural geometry running at 60 FPS
 */
export function buildLowPolyForestScene({ scene, minX = -18, maxX = 26 }) {
  const disposables = [];

  // 1. Atmosphere: Cheerful Meadow Sky & Soft Fresh Horizon Fog
  scene.background = new THREE.Color(0xbbf7d0); // Fresh mint-sky green
  scene.fog = new THREE.Fog(0xbbf7d0, 30, 115);

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

  // 3. Vast Rolling Green Grassland ("Padang Rumput Hijau yang Luas")
  const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
  const posAttr = groundGeo.attributes.position;
  // Gentle organic hillock undulation around the clearing
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const distFromCenter = Math.sqrt(vx * vx + vy * vy);
    // Keep floor clearing flat in the center
    if (distFromCenter > 16) {
      const bump = Math.sin(vx * 0.12) * Math.cos(vy * 0.12) * 1.35 + Math.sin(vx * 0.24) * 0.45;
      posAttr.setZ(i, bump);
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
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat, ground);

  // 4. Solid Floor in the Middle of the Meadow ("Lantai di Tengah Padang Rumput")
  const deckCenterX = (minX + maxX) / 2;
  const deckWidth = (maxX - minX) + 8.5;
  const deckDepth = 8.0;
  const deckHeight = 0.1;

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
  const borderFrontGeo = new THREE.BoxGeometry(deckWidth + 0.2, deckHeight + 0.02, 0.12);
  const borderFront = new THREE.Mesh(borderFrontGeo, borderMat);
  borderFront.position.set(deckCenterX, deckHeight / 2, deckDepth / 2);
  deckGroup.add(borderFront);
  const borderBack = new THREE.Mesh(borderFrontGeo, borderMat);
  borderBack.position.set(deckCenterX, deckHeight / 2, -deckDepth / 2);
  deckGroup.add(borderBack);

  scene.add(deckGroup);
  disposables.push(plankGeo, deckMat, borderMat, borderFrontGeo, deckGroup);

  // Stepping stones path across the meadow leading up to the floor
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.82,
    flatShading: true,
  });
  const stoneGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.05, 6);
  disposables.push(stoneGeo, stoneMat);

  const stonePath = [
    { x: deckCenterX - 3.2, z: 5.2 },
    { x: deckCenterX - 1.8, z: 6.4 },
    { x: deckCenterX - 0.2, z: 7.6 },
    { x: deckCenterX + 1.4, z: 8.8 },
    { x: deckCenterX + 3.0, z: 10.0 },
  ];
  stonePath.forEach(({ x, z }) => {
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(x, 0.02, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
    disposables.push(stone);
  });

  // Tiny Stylized Wildflowers in the Meadow (Kuning, Pink, Biru)
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, flatShading: true });
  const flowerPetalMats = [
    new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true }), // Yellow
    new THREE.MeshStandardMaterial({ color: 0xf472b6, flatShading: true }), // Pink
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, flatShading: true }), // Sky Blue
  ];
  disposables.push(flowerStemMat, ...flowerPetalMats);

  const flowerPositions = [
    { x: minX - 2.5, z: 4.8, color: 0 },
    { x: minX - 3.8, z: 5.5, color: 1 },
    { x: minX - 1.5, z: 6.2, color: 2 },
    { x: maxX + 2.2, z: 4.8, color: 1 },
    { x: maxX + 3.6, z: 5.5, color: 0 },
    { x: maxX + 2.5, z: 6.5, color: 2 },
    { x: deckCenterX - 5.5, z: 5.8, color: 0 },
    { x: deckCenterX + 5.5, z: 5.6, color: 1 },
  ];
  flowerPositions.forEach(({ x, z, color }) => {
    const fl = new THREE.Group();
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 4);
    const stem = new THREE.Mesh(stemGeo, flowerStemMat);
    stem.position.y = 0.22;
    fl.add(stem);
    disposables.push(stemGeo, stem);

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

  // Shared skin tone material for human characters
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cfb3, roughness: 0.65, flatShading: true });
  disposables.push(skinMat);

  // =========================================================================
  // 5. 3D SAFETY VEST DISPLAY STAND (Rotating Display on the Meadow Floor)
  // =========================================================================
  const vestStandGroup = new THREE.Group();
  vestStandGroup.position.set(deckCenterX - 0.2, deckHeight, 2.8);

  // Chrome / Matte Black Pedestal
  const baseStandGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.06, 16);
  const baseStandMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.8 });
  const baseStand = new THREE.Mesh(baseStandGeo, baseStandMat);
  baseStand.position.y = 0.03;
  baseStand.castShadow = true;
  vestStandGroup.add(baseStand);

  const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 0.46;
  pole.castShadow = true;
  vestStandGroup.add(pole);

  // Studio Mannequin Torso
  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  const mTorsoGeo = new THREE.BoxGeometry(0.48, 0.68, 0.26);
  const mTorso = new THREE.Mesh(mTorsoGeo, mannequinMat);
  mTorso.position.y = 1.15;
  mTorso.castShadow = true;
  vestStandGroup.add(mTorso);

  // 3D Hi-Vis Safety Vest Outer Layers:
  // Lower Body: Fluorescent Neon Orange
  const vestOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, flatShading: true });
  const vLowerGeo = new THREE.BoxGeometry(0.52, 0.38, 0.3);
  const vLower = new THREE.Mesh(vLowerGeo, vestOrangeMat);
  vLower.position.y = 1.02;
  vLower.castShadow = true;
  vestStandGroup.add(vLower);

  // Upper Chest & Shoulders: Fluorescent Neon Lime-Yellow
  const vestLimeMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.45, flatShading: true });
  const vUpperGeo = new THREE.BoxGeometry(0.52, 0.32, 0.3);
  const vUpper = new THREE.Mesh(vUpperGeo, vestLimeMat);
  vUpper.position.y = 1.34;
  vUpper.castShadow = true;
  vestStandGroup.add(vUpper);

  // Reflective Silver Safety Stripes (Horizontal & Vertical)
  const vStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 });

  // Waist horizontal stripe
  const vStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.32), vStripeMat);
  vStripe1.position.y = 0.98;
  // Chest horizontal stripe
  const vStripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.32), vStripeMat);
  vStripe2.position.y = 1.22;

  // Left and Right Vertical Shoulder reflective suspenders
  const vStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.32), vStripeMat);
  vStripeL.position.set(-0.16, 1.35, 0);
  const vStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.32), vStripeMat);
  vStripeR.position.set(0.16, 1.35, 0);
  vestStandGroup.add(vStripe1, vStripe2, vStripeL, vStripeR);

  // Heavy duty black zipper line down the front
  const zipper = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.68, 0.33),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  zipper.position.set(0, 1.18, 0);
  vestStandGroup.add(zipper);

  // ID Card Badge on upper chest
  const badgeHolder = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.16, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  badgeHolder.position.set(-0.15, 1.32, 0.18);
  vestStandGroup.add(badgeHolder);

  // Utility flap pockets
  const pocketGeo = new THREE.BoxGeometry(0.16, 0.14, 0.05);
  const pocketL = new THREE.Mesh(pocketGeo, vestOrangeMat);
  pocketL.position.set(-0.15, 0.96, 0.18);
  const pocketR = new THREE.Mesh(pocketGeo, vestOrangeMat);
  pocketR.position.set(0.15, 0.96, 0.18);
  vestStandGroup.add(pocketL, pocketR);

  scene.add(vestStandGroup);
  disposables.push(
    vestStandGroup,
    baseStandGeo, baseStandMat, baseStand,
    poleGeo, poleMat, pole,
    mTorsoGeo, mannequinMat, mTorso,
    vestOrangeMat, vLowerGeo, vLower,
    vestLimeMat, vUpperGeo, vUpper,
    vStripeMat, vStripe1, vStripe2, vStripeL, vStripeR,
    zipper, badgeHolder, pocketGeo, pocketL, pocketR
  );

  // =========================================================================
  // 6. PEKERJA PROYEK: Memakai Rompi Hi-Vis di Atas Lantai Padang Rumput
  // =========================================================================
  const workerGroup = new THREE.Group();
  workerGroup.position.set(deckCenterX + 4.5, deckHeight, 3.2);

  // Construction Yellow Safety Hardhat (Helm Proyek Kuning)
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, flatShading: true });
  const helmetGeo = new THREE.SphereGeometry(0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.set(0, 1.82, 0);

  const brimGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.04, 12);
  const brim = new THREE.Mesh(brimGeo, helmetMat);
  brim.position.set(0, 1.72, 0);
  workerGroup.add(helmet, brim);
  disposables.push(helmetMat, helmetGeo, helmet, brimGeo, brim);

  // Worker Head
  const wHeadGeo = new THREE.BoxGeometry(0.28, 0.3, 0.26);
  const wHead = new THREE.Mesh(wHeadGeo, skinMat);
  wHead.position.set(0, 1.62, 0);
  workerGroup.add(wHead);
  disposables.push(wHeadGeo, wHead);

  // Fluorescent Hi-Vis Neon Orange Vest (Rompi Hi-Vis Proyek)
  const hiVisMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, flatShading: true });
  const wTorsoGeo = new THREE.BoxGeometry(0.52, 0.65, 0.32);
  const wTorso = new THREE.Mesh(wTorsoGeo, hiVisMat);
  wTorso.position.set(0, 1.18, 0);
  wTorso.castShadow = true;
  workerGroup.add(wTorso);
  disposables.push(hiVisMat, wTorsoGeo, wTorso);

  // Reflective Silver Safety Tape Stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.85 });
  const stripe1Geo = new THREE.BoxGeometry(0.54, 0.08, 0.34);
  const stripe1 = new THREE.Mesh(stripe1Geo, stripeMat);
  stripe1.position.set(0, 1.15, 0);

  const stripe2Geo = new THREE.BoxGeometry(0.54, 0.08, 0.34);
  const stripe2 = new THREE.Mesh(stripe2Geo, stripeMat);
  stripe2.position.set(0, 1.34, 0);
  workerGroup.add(stripe1, stripe2);
  disposables.push(stripeMat, stripe1Geo, stripe1, stripe2Geo, stripe2);

  // Arms in work sleeves
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7, flatShading: true });
  const wArmGeo = new THREE.BoxGeometry(0.14, 0.55, 0.16);
  const wArmL = new THREE.Mesh(wArmGeo, sleeveMat);
  wArmL.position.set(-0.33, 1.18, 0.08);
  wArmL.rotation.x = -0.3;
  const wArmR = new THREE.Mesh(wArmGeo, sleeveMat);
  wArmR.position.set(0.33, 1.18, 0.08);
  wArmR.rotation.x = -0.4;
  workerGroup.add(wArmL, wArmR);
  disposables.push(sleeveMat, wArmGeo, wArmL, wArmR);

  // Inspection Clipboard with Checklist
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const clipGeo = new THREE.BoxGeometry(0.24, 0.34, 0.04);
  const clipboard = new THREE.Mesh(clipGeo, clipMat);
  clipboard.position.set(0.22, 1.12, 0.28);
  clipboard.rotation.set(-0.4, 0.25, 0);
  workerGroup.add(clipboard);
  disposables.push(clipMat, clipGeo, clipboard);

  // Dark Blue Work Jeans
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8, flatShading: true });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7, flatShading: true });
  const legGeo = new THREE.BoxGeometry(0.18, 0.82, 0.2);
  const wLegL = new THREE.Mesh(legGeo, jeansMat);
  wLegL.position.set(-0.16, 0.45, 0);
  wLegL.castShadow = true;
  const wLegR = new THREE.Mesh(legGeo, jeansMat);
  wLegR.position.set(0.16, 0.45, 0);
  wLegR.castShadow = true;
  workerGroup.add(wLegL, wLegR);
  disposables.push(jeansMat, legGeo, wLegL, wLegR);

  // Heavy Work Boots
  const bootGeo = new THREE.BoxGeometry(0.2, 0.16, 0.28);
  const wBootL = new THREE.Mesh(bootGeo, bootMat);
  wBootL.position.set(-0.16, 0.08, 0.04);
  const wBootR = new THREE.Mesh(bootGeo, bootMat);
  wBootR.position.set(0.16, 0.08, 0.04);
  workerGroup.add(wBootL, wBootR);
  disposables.push(bootMat, bootGeo, wBootL, wBootR);

  scene.add(workerGroup);
  disposables.push(workerGroup);

  // =========================================================================
  // 7. ORANG MEMAKAI WARMING BALACLAVA DI ATAS LANTAI
  // =========================================================================
  const balaGroup = new THREE.Group();
  balaGroup.position.set(deckCenterX - 4.2, deckHeight, 3.2);

  // Thermal Warming Balaclava
  const balaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, flatShading: true });
  const balaHeadGeo = new THREE.BoxGeometry(0.34, 0.38, 0.32);
  const balaHead = new THREE.Mesh(balaHeadGeo, balaMat);
  balaHead.position.set(0, 1.62, 0);
  balaHead.castShadow = true;
  balaGroup.add(balaHead);
  disposables.push(balaMat, balaHeadGeo, balaHead);

  // Icy-Blue Thermal Ski/Tactical Visor Slit
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.9 });
  const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.04);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.65, 0.16);
  balaGroup.add(visor);
  disposables.push(visorMat, visorGeo, visor);

  // Winter Puffer Jacket
  const pufferMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, flatShading: true });
  const bTorsoGeo = new THREE.BoxGeometry(0.56, 0.68, 0.36);
  const bTorso = new THREE.Mesh(bTorsoGeo, pufferMat);
  bTorso.position.set(0, 1.16, 0);
  bTorso.castShadow = true;
  balaGroup.add(bTorso);
  disposables.push(pufferMat, bTorsoGeo, bTorso);

  // Jacket Sleeves with Hands in Warm Pockets
  const bArmGeo = new THREE.BoxGeometry(0.16, 0.58, 0.18);
  const bArmL = new THREE.Mesh(bArmGeo, pufferMat);
  bArmL.position.set(-0.35, 1.12, 0.05);
  bArmL.rotation.z = 0.12;
  bArmL.rotation.x = -0.15;
  const bArmR = new THREE.Mesh(bArmGeo, pufferMat);
  bArmR.position.set(0.35, 1.12, 0.05);
  bArmR.rotation.z = -0.12;
  bArmR.rotation.x = -0.15;
  balaGroup.add(bArmL, bArmR);
  disposables.push(bArmGeo, bArmL, bArmR);

  // Dark Thermal Cargo Trousers
  const bPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, flatShading: true });
  const bLegL = new THREE.Mesh(legGeo, bPantsMat);
  bLegL.position.set(-0.16, 0.45, 0);
  bLegL.castShadow = true;
  const bLegR = new THREE.Mesh(legGeo, bPantsMat);
  bLegR.position.set(0.16, 0.45, 0);
  bLegR.castShadow = true;
  balaGroup.add(bLegL, bLegR);
  disposables.push(bPantsMat, bLegL, bLegR);

  // Insulated Winter Boots
  const bBootL = new THREE.Mesh(bootGeo, balaMat);
  bBootL.position.set(-0.16, 0.08, 0.04);
  const bBootR = new THREE.Mesh(bootGeo, balaMat);
  bBootR.position.set(0.16, 0.08, 0.04);
  balaGroup.add(bBootL, bBootR);
  disposables.push(bBootL, bBootR);

  scene.add(balaGroup);
  disposables.push(balaGroup);

  // =========================================================================
  // 8. ANJING MASKOT PADANG RUMPUT: Duduk Menemani di Atas Lantai
  // =========================================================================
  const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, flatShading: true });
  const dogCollarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  disposables.push(dogMat, dogCollarMat);

  const dogGroup = new THREE.Group();
  dogGroup.position.set(deckCenterX - 2.2, deckHeight, 3.5);

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
      // 1. 3D Safety Vest Display Stand gentle rotation showcase
      vestStandGroup.rotation.y = elapsed * 0.35;

      // 2. Worker subtle checking posture
      wHead.rotation.y = Math.sin(elapsed * 0.8) * 0.22;
      clipboard.rotation.z = Math.sin(elapsed * 1.2) * 0.05;

      // 3. Balaclava Person subtle idle breathing
      bTorso.scale.y = 1.0 + Math.sin(elapsed * 1.5) * 0.015;

      // 4. Meadow Mascot Dog tail wagging
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

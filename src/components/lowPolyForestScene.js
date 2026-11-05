import * as THREE from 'three';

/**
 * Builds a vibrant, high-performance 3D Lake Pier environment ("Di Tengah Danau").
 * Features:
 * - Serene crystal-blue lake surrounding the mid-lake wooden pier dock
 * - Animated shimmering lake surface waves & water ripples
 * - Wooden lake pier platform with underwater timber pilings and swim ladder
 * - Orang berenang dengan baju renang & kacamata renang di dalam air danau
 * - Pekerja proyek dengan helm safety kuning & rompi hi-vis oranye berpita reflektif
 * - Orang memakai warming balaclava hitam dengan visor termal & jaket puffer
 * - Friendly dock mascot dog sitting happily on the pier
 * - 100% Three.js native procedural geometry running at a smooth 60 FPS
 */
export function buildLowPolyForestScene({ scene, minX = -18, maxX = 26 }) {
  const disposables = [];

  // 1. Atmosphere: Cheerful Lake Sky & Soft Horizon Mist
  scene.background = new THREE.Color(0x7dd3fc); // Bright sky blue
  scene.fog = new THREE.Fog(0xbae6fd, 28, 95);

  // 2. Sun & Lakeside Ambient Lighting
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0369a1, 0.95);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm golden sunbeams reflecting off water
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
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

  // Soft cyan water reflection fill
  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
  fillLight.position.set(-20, 16, -18);
  scene.add(fillLight);
  disposables.push(fillLight);

  // 3. Vast Crystal Lake Water ("Di Tengah Danau")
  const waterGeo = new THREE.PlaneGeometry(160, 160, 52, 52);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Vibrant azure lake blue
    roughness: 0.12,
    metalness: 0.72,
    flatShading: true,
    transparent: true,
    opacity: 0.88,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.05;
  water.receiveShadow = true;
  scene.add(water);
  disposables.push(waterGeo, waterMat, water);

  // Lakebed underneath water
  const lakeBedGeo = new THREE.PlaneGeometry(160, 160, 16, 16);
  const lakeBedMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e, // Deep turquoise lakebed
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const lakeBed = new THREE.Mesh(lakeBedGeo, lakeBedMat);
  lakeBed.rotation.x = -Math.PI / 2;
  lakeBed.position.y = -1.2;
  lakeBed.receiveShadow = true;
  scene.add(lakeBed);
  disposables.push(lakeBedGeo, lakeBedMat, lakeBed);

  // 4. Mid-Lake Wooden Pier Platform ("Dermaga Kayu di Tengah Danau")
  const deckCenterX = (minX + maxX) / 2;
  const deckWidth = (maxX - minX) + 8.5;
  const deckDepth = 8.2;
  const deckHeight = 0.1;

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xc47b38, // Warm honey oak timber
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

  // Wooden dock support pilings under the pier extending into the water
  const pilingMat = new THREE.MeshStandardMaterial({
    color: 0x5c3818, // Weathered wood piling
    roughness: 0.9,
    flatShading: true,
  });
  const pilingGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.4, 6);
  disposables.push(pilingMat, pilingGeo);

  const halfW = deckWidth / 2;
  const halfD = deckDepth / 2;
  const pilingPositions = [
    { x: deckCenterX - halfW + 0.4, z: -halfD + 0.4 },
    { x: deckCenterX - halfW + 0.4, z: halfD - 0.4 },
    { x: deckCenterX + halfW - 0.4, z: -halfD + 0.4 },
    { x: deckCenterX + halfW - 0.4, z: halfD - 0.4 },
    { x: deckCenterX - 4, z: halfD - 0.4 },
    { x: deckCenterX + 4, z: halfD - 0.4 },
    { x: deckCenterX - 4, z: -halfD + 0.4 },
    { x: deckCenterX + 4, z: -halfD + 0.4 },
  ];
  pilingPositions.forEach(({ x, z }) => {
    const piling = new THREE.Mesh(pilingGeo, pilingMat);
    piling.position.set(x, -0.65, z);
    piling.castShadow = true;
    piling.receiveShadow = true;
    scene.add(piling);
    disposables.push(piling);
  });

  // Swimming ladder on the front edge of the dock
  const ladderGroup = new THREE.Group();
  ladderGroup.position.set(deckCenterX + 1.8, 0, halfD);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.35, -0.25, 0.15);
  const railR = new THREE.Mesh(railGeo, railMat);
  railR.position.set(0.35, -0.25, 0.15);
  ladderGroup.add(railL, railR);
  disposables.push(railMat, railGeo);

  // Ladder rungs
  const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6);
  for (let r = 0; r < 3; r++) {
    const rung = new THREE.Mesh(rungGeo, railMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, -0.1 - r * 0.28, 0.15);
    ladderGroup.add(rung);
    disposables.push(rung);
  }
  scene.add(ladderGroup);
  disposables.push(rungGeo, ladderGroup);

  // Lifebuoy ring (Pelampung Renang) mounted on the dock post
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Bright red buoy
  const stripeBuoyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }); // White bands
  const buoyGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 20);
  const buoy = new THREE.Mesh(buoyGeo, buoyMat);
  buoy.position.set(deckCenterX + 2.4, 0.65, halfD - 0.1);
  buoy.rotation.y = 0;
  buoy.castShadow = true;
  scene.add(buoy);
  disposables.push(buoyMat, stripeBuoyMat, buoyGeo, buoy);

  // Shared skin tone material for human characters
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cfb3, roughness: 0.65, flatShading: true });
  disposables.push(skinMat);

  // =========================================================================
  // 5. KARAKTER 1: Orang Berenang dengan Baju Renang (Swimmer in the Lake)
  // =========================================================================
  const swimmerGroup = new THREE.Group();
  swimmerGroup.position.set(deckCenterX + 1.8, -0.08, halfD + 1.6);

  // Swimmer Head
  const sHeadGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const sHead = new THREE.Mesh(sHeadGeo, skinMat);
  sHead.position.set(0, 0.18, 0);

  // Red Swimming Cap (Topi Renang)
  const sCapMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, flatShading: true });
  const sCapGeo = new THREE.SphereGeometry(0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.75);
  const sCap = new THREE.Mesh(sCapGeo, sCapMat);
  sCap.position.set(0, 0.19, 0);
  sHead.add(sCap);
  disposables.push(sCapMat, sCapGeo);

  // Blue Swimming Goggles (Kacamata Renang)
  const goggleMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.7 });
  const goggleGeo = new THREE.BoxGeometry(0.32, 0.09, 0.12);
  const goggle = new THREE.Mesh(goggleGeo, goggleMat);
  goggle.position.set(0, 0.17, 0.22);
  sHead.add(goggle);
  disposables.push(goggleMat, goggleGeo);
  swimmerGroup.add(sHead);
  disposables.push(sHeadGeo, sHead);

  // Swimmer Torso & Swim Trunks (Baju Renang Biru)
  const sTrunkMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5, flatShading: true });
  const sTorsoGeo = new THREE.BoxGeometry(0.54, 0.26, 0.72);
  const sTorso = new THREE.Mesh(sTorsoGeo, sTrunkMat);
  sTorso.position.set(0, -0.06, -0.32);
  swimmerGroup.add(sTorso);
  disposables.push(sTrunkMat, sTorsoGeo, sTorso);

  // Swimming Arms (Breaststroke / Freestyle Stroke Pivots)
  const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.52);
  disposables.push(armGeo);

  const sArmL = new THREE.Group();
  sArmL.position.set(-0.32, 0, -0.1);
  const sArmMeshL = new THREE.Mesh(armGeo, skinMat);
  sArmMeshL.position.set(0, 0, 0.25);
  sArmL.add(sArmMeshL);
  swimmerGroup.add(sArmL);
  disposables.push(sArmMeshL, sArmL);

  const sArmR = new THREE.Group();
  sArmR.position.set(0.32, 0, -0.1);
  const sArmMeshR = new THREE.Mesh(armGeo, skinMat);
  sArmMeshR.position.set(0, 0, 0.25);
  sArmR.add(sArmMeshR);
  swimmerGroup.add(sArmR);
  disposables.push(sArmMeshR, sArmR);

  // Water Ripple Splash Ring around the swimmer
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const rippleGeo = new THREE.RingGeometry(0.5, 0.85, 16);
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.02;
  swimmerGroup.add(ripple);
  disposables.push(rippleMat, rippleGeo, ripple);

  scene.add(swimmerGroup);
  disposables.push(swimmerGroup);

  // =========================================================================
  // 6. KARAKTER 2: Pekerja Proyek Memakai Rompi Hi-Vis (Project Worker)
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

  // Reflective Silver Safety Tape Stripes (Pita Reflektif Rompi)
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
  const clipPaperMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const clipGeo = new THREE.BoxGeometry(0.24, 0.34, 0.04);
  const clipboard = new THREE.Mesh(clipGeo, clipMat);
  clipboard.position.set(0.22, 1.12, 0.28);
  clipboard.rotation.set(-0.4, 0.25, 0);
  workerGroup.add(clipboard);
  disposables.push(clipMat, clipPaperMat, clipGeo, clipboard);

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
  // 7. KARAKTER 3: Orang yang Memakai Warming Balaclava
  // =========================================================================
  const balaGroup = new THREE.Group();
  balaGroup.position.set(deckCenterX - 4.2, deckHeight, 3.5);

  // Thermal Warming Balaclava (Menutupi seluruh kepala, leher & dagu)
  const balaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, flatShading: true }); // Charcoal black fleece
  const balaHeadGeo = new THREE.BoxGeometry(0.34, 0.38, 0.32);
  const balaHead = new THREE.Mesh(balaHeadGeo, balaMat);
  balaHead.position.set(0, 1.62, 0);
  balaHead.castShadow = true;
  balaGroup.add(balaHead);
  disposables.push(balaMat, balaHeadGeo, balaHead);

  // Icy-Blue Thermal Ski/Tactical Visor Slit (Celah Mata / Visor)
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.9 });
  const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.04);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.65, 0.16);
  balaGroup.add(visor);
  disposables.push(visorMat, visorGeo, visor);

  // Winter Puffer Jacket (Jaket Hangat Puffer Abu Gelap)
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
  // 8. DOCK MASCOT: Anjing Golden Lucu Duduk Menemani di Dermaga
  // =========================================================================
  const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, flatShading: true }); // Warm golden coat
  const dogCollarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }); // Red collar
  disposables.push(dogMat, dogCollarMat);

  const dogGroup = new THREE.Group();
  dogGroup.position.set(deckCenterX - 2.2, deckHeight, 3.8);

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

  // =========================================================================
  // 9. 3D SAFETY VEST DISPLAY STAND (Mannequin Display on the Dock)
  // =========================================================================
  const vestStandGroup = new THREE.Group();
  vestStandGroup.position.set(deckCenterX - 0.2, deckHeight, halfD - 1.2);

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

  return {
    update(elapsed) {
      // 1. Shimmering Lake Surface Wave Animation
      const posAttr = waterGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const wave = Math.sin(vx * 0.18 + elapsed * 1.6) * Math.cos(vy * 0.18 + elapsed * 1.3) * 0.14
                   + Math.sin(vx * 0.35 - elapsed * 1.1) * 0.05;
        posAttr.setZ(i, wave);
      }
      waterGeo.computeVertexNormals();
      posAttr.needsUpdate = true;

      // 2. Swimmer Swimming Animation (Stroke, Splash Ripple & Water Bob)
      const swimStroke = elapsed * 3.8;
      sArmL.rotation.x = -Math.sin(swimStroke) * 0.85;
      sArmR.rotation.x = -Math.sin(swimStroke + Math.PI) * 0.85;
      sHead.position.y = 0.18 + Math.sin(swimStroke * 2) * 0.04;
      swimmerGroup.position.y = -0.08 + Math.sin(elapsed * 1.8) * 0.03;

      // Ripple expand and pulse
      const rippleScale = 1.0 + Math.sin(elapsed * 4) * 0.18;
      ripple.scale.set(rippleScale, rippleScale, rippleScale);

      // 3. Worker subtle checking posture
      wHead.rotation.y = Math.sin(elapsed * 0.8) * 0.22;
      clipboard.rotation.z = Math.sin(elapsed * 1.2) * 0.05;

      // 4. Balaclava Person subtle idle breathing
      bTorso.scale.y = 1.0 + Math.sin(elapsed * 1.5) * 0.015;

      // 5. Dock Mascot Dog tail wagging
      dTail.rotation.y = Math.sin(elapsed * 14) * 0.55;

      // 6. 3D Safety Vest Display Stand gentle rotation showcase
      vestStandGroup.rotation.y = elapsed * 0.35;
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

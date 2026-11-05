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
export function buildLowPolyForestScene({ scene, minX = -18, maxX = 26, isDarkMode = false }) {
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

  // =========================================================================
  // 5. LAMPU SOROT 4 SISI LANTAI KAYU (MENYOROT BOX & RAK GUDANG)
  // =========================================================================
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Slate dark steel
    roughness: 0.5,
    metalness: 0.7,
    flatShading: true,
  });
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.8,
    flatShading: true,
  });
  const lensMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a, // Warm glowing floodlight lens
  });
  disposables.push(poleMat, fixtureMat, lensMat);

  const poleHeight = 4.4;
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, poleHeight, 6);
  const baseGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.12, 6);
  const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.55);
  const headGeo = new THREE.BoxGeometry(0.42, 0.28, 0.34);
  const lensGeo = new THREE.PlaneGeometry(0.38, 0.24);
  disposables.push(poleGeo, baseGeo, armGeo, headGeo, lensGeo);

  // 4 posisi lampu sorot di 4 sudut/sisi perimeter lantai kayu
  const lampConfigs = [
    // 1. Sisi Depan Kiri
    {
      x: deckCenterX - deckWidth / 2 + 1.2,
      z: deckDepth / 2 - 1.0,
      targetX: deckCenterX - deckWidth / 4,
      targetZ: 0,
    },
    // 2. Sisi Depan Kanan
    {
      x: deckCenterX + deckWidth / 2 - 1.2,
      z: deckDepth / 2 - 1.0,
      targetX: deckCenterX + deckWidth / 4,
      targetZ: 0,
    },
    // 3. Sisi Belakang Kiri
    {
      x: deckCenterX - deckWidth / 2 + 1.2,
      z: -deckDepth / 2 + 1.0,
      targetX: deckCenterX - deckWidth / 4,
      targetZ: 0,
    },
    // 4. Sisi Belakang Kanan
    {
      x: deckCenterX + deckWidth / 2 - 1.2,
      z: -deckDepth / 2 + 1.0,
      targetX: deckCenterX + deckWidth / 4,
      targetZ: 0,
    },
  ];

  const spotLights = [];

  lampConfigs.forEach((cfg) => {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(cfg.x, deckHeight, cfg.z);

    // Dudukan tiang baja di atas lantai kayu
    const base = new THREE.Mesh(baseGeo, poleMat);
    base.position.y = 0.06;
    lampGroup.add(base);

    // Tiang lampu vertikal
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = poleHeight / 2;
    pole.castShadow = true;
    lampGroup.add(pole);

    // Lengan breket lampu mengarah ke area rak
    const arm = new THREE.Mesh(armGeo, fixtureMat);
    arm.position.set(0, poleHeight, 0);
    const angleToTarget = Math.atan2(cfg.targetZ - cfg.z, cfg.targetX - cfg.x);
    arm.rotation.y = angleToTarget;
    lampGroup.add(arm);

    // Kepala kap lampu sorot (floodlight housing)
    const head = new THREE.Mesh(headGeo, fixtureMat);
    head.position.set(
      Math.cos(angleToTarget) * 0.35,
      poleHeight + 0.05,
      Math.sin(angleToTarget) * 0.35
    );
    head.rotation.y = angleToTarget;
    head.rotation.x = 0.35; // Mengarah menunduk ke arah box
    head.castShadow = true;
    lampGroup.add(head);

    // Lensa lampu menyala terang
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, 0.18);
    head.add(lens);

    scene.add(lampGroup);
    disposables.push(lampGroup);

    // Lampu Sorot SpotLight Three.js yang menyinari langsung ke box & rak
    const spot = new THREE.SpotLight(0xfffbeb, 3.2, 70, Math.PI / 3.2, 0.55, 1.1);
    spot.position.set(cfg.x, deckHeight + poleHeight, cfg.z);

    const targetObj = new THREE.Object3D();
    targetObj.position.set(cfg.targetX, 2.0, cfg.targetZ);
    scene.add(targetObj);
    spot.target = targetObj;

    scene.add(spot);
    spotLights.push(spot);
    disposables.push(spot, targetObj);
  });

  // 6. Langit Malam Berbintang (Aktif saat Mode Gelap)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 350;
  const starPositions = new Float32Array(starCount * 3);
  for (let s = 0; s < starCount; s++) {
    starPositions[s * 3] = (Math.random() - 0.5) * 160;
    starPositions[s * 3 + 1] = 16 + Math.random() * 45;
    starPositions[s * 3 + 2] = (Math.random() - 0.5) * 160;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.55,
    transparent: true,
    opacity: 0.85,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.visible = false;
  scene.add(starPoints);
  disposables.push(starGeo, starMat, starPoints);

  // =========================================================================
  // 7. KUPU-KUPU (BUTTERFLIES) TERBANG RANDOM DI SEKITAR BOX & RAK
  // =========================================================================
  const wingGeoL = new THREE.PlaneGeometry(0.18, 0.24);
  wingGeoL.translate(0.09, 0, 0); // Pivot hinge
  const wingGeoR = new THREE.PlaneGeometry(0.18, 0.24);
  wingGeoR.translate(-0.09, 0, 0);
  const bodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4);
  const bBodyMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  disposables.push(wingGeoL, wingGeoR, bodyGeo, bBodyMat);

  const butterflyColors = [0x38bdf8, 0xfbbf24, 0xf43f5e, 0xa855f7, 0x34d399, 0xf97316];
  const butterflies = [];
  const butterflyCount = 14;

  for (let i = 0; i < butterflyCount; i++) {
    const color = butterflyColors[i % butterflyColors.length];
    const wingMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    disposables.push(wingMat);

    const bGroup = new THREE.Group();
    const wingL = new THREE.Mesh(wingGeoL, wingMat);
    const wingR = new THREE.Mesh(wingGeoR, wingMat);
    const body = new THREE.Mesh(bodyGeo, bBodyMat);
    body.rotation.x = Math.PI / 2;

    bGroup.add(wingL);
    bGroup.add(wingR);
    bGroup.add(body);

    const baseX = minX + 2 + Math.random() * (maxX - minX - 4);
    const baseY = 1.0 + Math.random() * 3.5;
    const baseZ = (Math.random() - 0.5) * 5.5;

    bGroup.position.set(baseX, baseY, baseZ);
    scene.add(bGroup);
    disposables.push(bGroup);

    butterflies.push({
      group: bGroup,
      wingL,
      wingR,
      baseX,
      baseY,
      baseZ,
      radiusX: 2.2 + Math.random() * 3.5,
      radiusY: 0.6 + Math.random() * 1.2,
      radiusZ: 1.5 + Math.random() * 2.5,
      speed: 0.6 + Math.random() * 0.7,
      flapSpeed: 14 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // =========================================================================
  // 8. KUNANG-KUNANG (FIREFLIES) BERCAHAYA TERBANG DI SEKITAR BOX
  // =========================================================================
  const ffCoreGeo = new THREE.SphereGeometry(0.045, 6, 6);
  const ffHaloGeo = new THREE.SphereGeometry(0.14, 6, 6);
  disposables.push(ffCoreGeo, ffHaloGeo);

  const fireflies = [];
  const fireflyCount = 26;

  for (let j = 0; j < fireflyCount; j++) {
    const ffGroup = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x84cc16,
      transparent: true,
      opacity: 0.5,
    });
    disposables.push(coreMat, haloMat);

    const core = new THREE.Mesh(ffCoreGeo, coreMat);
    const halo = new THREE.Mesh(ffHaloGeo, haloMat);
    ffGroup.add(core);
    ffGroup.add(halo);

    const baseX = minX + 1 + Math.random() * (maxX - minX - 2);
    const baseY = 0.5 + Math.random() * 4.2;
    const baseZ = (Math.random() - 0.5) * 6.5;

    ffGroup.position.set(baseX, baseY, baseZ);
    scene.add(ffGroup);
    disposables.push(ffGroup);

    fireflies.push({
      group: ffGroup,
      coreMat,
      halo,
      haloMat,
      baseX,
      baseY,
      baseZ,
      radiusX: 1.8 + Math.random() * 3.0,
      radiusY: 0.8 + Math.random() * 1.4,
      radiusZ: 1.5 + Math.random() * 2.8,
      speedX: 0.4 + Math.random() * 0.5,
      speedY: 0.5 + Math.random() * 0.6,
      speedZ: 0.35 + Math.random() * 0.45,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      blinkSpeed: 2.0 + Math.random() * 3.0,
      blinkPhase: Math.random() * Math.PI * 2,
    });
  }

  // =========================================================================
  // 9. ANJING PENJAGA BERJALAN RANDOM (WAJAH LUCU, PUPPY EYES & PATROLI RAK)
  // =========================================================================
  const dogGroup = new THREE.Group();
  dogGroup.position.set(deckCenterX, deckHeight, 2.5);

  const dogFurMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Golden honey fur
    roughness: 0.65,
    flatShading: true,
  });
  const dogWhiteFurMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5, // Creamy muzzle and chest patch
    roughness: 0.65,
    flatShading: true,
  });
  const dogDarkMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Glossy button nose
    roughness: 0.25,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6, // Cute pink tongue
    roughness: 0.4,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Red collar
    roughness: 0.5,
  });
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Golden bell tag
    metalness: 0.8,
    roughness: 0.2,
  });
  disposables.push(dogFurMat, dogWhiteFurMat, dogDarkMat, tongueMat, collarMat, bellMat);

  // 1. Torso
  const dogBodyGeo = new THREE.BoxGeometry(0.44, 0.38, 0.65);
  const dogBody = new THREE.Mesh(dogBodyGeo, dogFurMat);
  dogBody.position.y = 0.38;
  dogBody.castShadow = true;
  dogGroup.add(dogBody);
  disposables.push(dogBodyGeo, dogBody);

  // Cute white chest patch
  const chestGeo = new THREE.BoxGeometry(0.3, 0.26, 0.12);
  const dogChest = new THREE.Mesh(chestGeo, dogWhiteFurMat);
  dogChest.position.set(0, 0.38, 0.29);
  dogGroup.add(dogChest);
  disposables.push(chestGeo, dogChest);

  // 2. Head with Cute Expressive Face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0.35);

  const dogHeadGeo = new THREE.BoxGeometry(0.36, 0.34, 0.34);
  const dogHead = new THREE.Mesh(dogHeadGeo, dogFurMat);
  headGroup.add(dogHead);
  disposables.push(dogHeadGeo, dogHead);

  // Muzzle (moncong lucu)
  const muzzleGeo = new THREE.BoxGeometry(0.24, 0.18, 0.22);
  const dogMuzzle = new THREE.Mesh(muzzleGeo, dogWhiteFurMat);
  dogMuzzle.position.set(0, -0.06, 0.22);
  headGroup.add(dogMuzzle);
  disposables.push(muzzleGeo, dogMuzzle);

  // Button nose
  const noseGeo = new THREE.BoxGeometry(0.08, 0.07, 0.06);
  const dogNose = new THREE.Mesh(noseGeo, dogDarkMat);
  dogNose.position.set(0, -0.01, 0.34);
  headGroup.add(dogNose);
  disposables.push(noseGeo, dogNose);

  // Minecraft Pixel Style Eyes (Sesuai gambar referensi user)
  const mcEyePupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Hitam pekat pupil bagian dalam
  const mcEyeTanMat = new THREE.MeshBasicMaterial({ color: 0xc29d62 }); // Warna tan/caramel bagian luar
  disposables.push(mcEyePupilMat, mcEyeTanMat);

  const eyePixelGeo = new THREE.PlaneGeometry(0.045, 0.055);
  disposables.push(eyePixelGeo);

  // Mata Kiri (bagian dalam hitam, bagian luar tan)
  const eyePupilL = new THREE.Mesh(eyePixelGeo, mcEyePupilMat);
  eyePupilL.position.set(-0.046, 0.055, 0.172);
  const eyeTanL = new THREE.Mesh(eyePixelGeo, mcEyeTanMat);
  eyeTanL.position.set(-0.091, 0.055, 0.172);
  headGroup.add(eyePupilL, eyeTanL);
  disposables.push(eyePupilL, eyeTanL);

  // Mata Kanan (bagian dalam hitam, bagian luar tan)
  const eyePupilR = new THREE.Mesh(eyePixelGeo, mcEyePupilMat);
  eyePupilR.position.set(0.046, 0.055, 0.172);
  const eyeTanR = new THREE.Mesh(eyePixelGeo, mcEyeTanMat);
  eyeTanR.position.set(0.091, 0.055, 0.172);
  headGroup.add(eyePupilR, eyeTanR);
  disposables.push(eyePupilR, eyeTanR);

  // Playful pink tongue (lidah menjulur gemas)
  const tongueGeo = new THREE.BoxGeometry(0.1, 0.04, 0.14);
  const dogTongue = new THREE.Mesh(tongueGeo, tongueMat);
  dogTongue.position.set(0.02, -0.14, 0.28);
  dogTongue.rotation.x = 0.2;
  headGroup.add(dogTongue);
  disposables.push(tongueGeo, dogTongue);

  // Cute Floppy Ears (Telinga anjing lucu yang berayun)
  const earGeo = new THREE.BoxGeometry(0.09, 0.22, 0.12);
  disposables.push(earGeo);

  const earL = new THREE.Mesh(earGeo, dogFurMat);
  earL.position.set(-0.19, 0.12, 0.02);
  earL.rotation.z = 0.35;
  earL.rotation.x = -0.1;
  headGroup.add(earL);

  const earR = new THREE.Mesh(earGeo, dogFurMat);
  earR.position.set(0.19, 0.12, 0.02);
  earR.rotation.z = -0.35;
  earR.rotation.x = -0.1;
  headGroup.add(earR);

  dogGroup.add(headGroup);

  // 3. Collar with Bell Tag
  const collarGeo = new THREE.BoxGeometry(0.38, 0.06, 0.38);
  const dogCollar = new THREE.Mesh(collarGeo, collarMat);
  dogCollar.position.set(0, 0.44, 0.3);
  dogGroup.add(dogCollar);
  disposables.push(collarGeo, dogCollar);

  const bellGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const dogBell = new THREE.Mesh(bellGeo, bellMat);
  dogBell.position.set(0, 0.41, 0.49);
  dogGroup.add(dogBell);
  disposables.push(bellGeo, dogBell);

  // 4. Tail (Ekor bergoyang riang)
  const tailGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.34, 4);
  const dogTail = new THREE.Mesh(tailGeo, dogFurMat);
  dogTail.position.set(0, 0.44, -0.34);
  dogTail.rotation.x = -0.7;
  dogGroup.add(dogTail);
  disposables.push(tailGeo, dogTail);

  // 5. Four Walking Legs (4 Kaki Berjalan Berayun)
  const legGeo = new THREE.BoxGeometry(0.12, 0.28, 0.13);
  disposables.push(legGeo);

  const legFL = new THREE.Mesh(legGeo, dogFurMat);
  legFL.position.set(-0.16, 0.14, 0.22);
  legFL.castShadow = true;
  dogGroup.add(legFL);

  const legFR = new THREE.Mesh(legGeo, dogFurMat);
  legFR.position.set(0.16, 0.14, 0.22);
  legFR.castShadow = true;
  dogGroup.add(legFR);

  const legBL = new THREE.Mesh(legGeo, dogFurMat);
  legBL.position.set(-0.16, 0.14, -0.22);
  legBL.castShadow = true;
  dogGroup.add(legBL);

  const legBR = new THREE.Mesh(legGeo, dogFurMat);
  legBR.position.set(0.16, 0.14, -0.22);
  legBR.castShadow = true;
  dogGroup.add(legBR);

  scene.add(dogGroup);
  disposables.push(dogGroup);

  // Wandering AI State around Racks
  const dogAI = {
    targetX: deckCenterX - 4,
    targetZ: 2.2,
    speed: 1.15,
    isWalking: true,
    pauseUntil: 0,
    walkCycle: 0,
    currentAngle: 0,
  };

  function pickNextDogWaypoint(now) {
    // Patrol along front and between racks on the wooden floor
    dogAI.targetX = minX + 3 + Math.random() * (maxX - minX - 6);
    dogAI.targetZ = 1.4 + Math.random() * 1.8;
    dogAI.isWalking = true;
  }

  let currentIsDark = false;

  function applyMode(isDark) {
    currentIsDark = Boolean(isDark);
    if (isDark) {
      // Midnight Twilight Atmosphere & Dense Fog
      scene.background.setHex(0x060d17);
      scene.fog.color.setHex(0x060d17);
      scene.fog.near = 18;
      scene.fog.far = 95;

      // Redupkan cahaya matahari menjadi pantulan sinar bulan yang lembut
      hemiLight.intensity = 0.12;
      hemiLight.color.setHex(0x60a5fa);
      hemiLight.groundColor.setHex(0x022c22);
      sunLight.intensity = 0.18;
      sunLight.color.setHex(0x93c5fd);
      fillLight.intensity = 0.05;

      // Lampu Sorot MENYALA SANGAT TERANG & FOKUS MENYOROT BOX!
      spotLights.forEach((spot) => {
        spot.intensity = 11.5; // Sorotan super terang dramatis
        spot.distance = 110;
        spot.penumbra = 0.45;
        spot.color.setHex(0xfff7ed);
      });
      lensMat.color.setHex(0xffffff); // Lensa bersinar putih keemasan

      starPoints.visible = true;
    } else {
      // Suasana Siang Ceria
      scene.background.setHex(0xbbf7d0);
      scene.fog.color.setHex(0xbbf7d0);
      scene.fog.near = 32;
      scene.fog.far = 115;

      hemiLight.intensity = 0.95;
      hemiLight.color.setHex(0xfef9c3);
      hemiLight.groundColor.setHex(0x166534);
      sunLight.intensity = 1.45;
      sunLight.color.setHex(0xfff7ed);
      fillLight.intensity = 0.45;

      // Sorotan normal siang hari
      spotLights.forEach((spot) => {
        spot.intensity = 3.2;
        spot.distance = 70;
        spot.penumbra = 0.55;
        spot.color.setHex(0xfffbeb);
      });
      lensMat.color.setHex(0xfef08a);

      starPoints.visible = false;
    }
  }

  // Terapkan mode awal
  applyMode(Boolean(isDarkMode));

  return {
    setDarkMode(isDark) {
      applyMode(isDark);
    },
    update(elapsed) {
      // 1. Kerlap-kerlip bintang lembut di malam hari
      if (starPoints.visible) {
        starMat.opacity = 0.75 + Math.sin(elapsed * 2.8) * 0.2;
      }

      // 2. Kupu-kupu mengepakkan sayap & terbang mengitari box
      butterflies.forEach((b) => {
        const flap = Math.sin(elapsed * b.flapSpeed + b.phase) * 0.9;
        b.wingL.rotation.y = flap;
        b.wingR.rotation.y = -flap;

        const prevX = b.group.position.x;
        const prevZ = b.group.position.z;

        const newX = b.baseX + Math.sin(elapsed * b.speed + b.phase) * b.radiusX;
        const newY = b.baseY + Math.sin(elapsed * b.speed * 2.0 + b.phase) * b.radiusY;
        const newZ = b.baseZ + Math.cos(elapsed * b.speed + b.phase) * b.radiusZ;

        b.group.position.set(newX, newY, newZ);

        const dx = newX - prevX;
        const dz = newZ - prevZ;
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          b.group.rotation.y = Math.atan2(dx, dz);
        }
      });

      // 3. Kunang-kunang melayang bercahaya kelap-kelip di sekitar box
      fireflies.forEach((ff) => {
        ff.group.position.x = ff.baseX + Math.sin(elapsed * ff.speedX + ff.phaseX) * ff.radiusX;
        ff.group.position.y = ff.baseY + Math.sin(elapsed * ff.speedY + ff.phaseY) * ff.radiusY;
        ff.group.position.z = ff.baseZ + Math.cos(elapsed * ff.speedZ + ff.phaseZ) * ff.radiusZ;

        const blink = Math.pow(Math.max(0, Math.sin(elapsed * ff.blinkSpeed + ff.blinkPhase)), 2.0);
        ff.halo.scale.setScalar(0.7 + blink * 0.9);
        ff.haloMat.opacity = currentIsDark ? (0.25 + blink * 0.7) : (0.15 + blink * 0.35);
        ff.coreMat.color.setHex(blink > 0.35 ? 0xfef08a : 0xa3e635);
      });

      // 4. Anjing Penjaga Berjalan Random & Berpatroli di Sekitar Rak
      dogTail.rotation.y = Math.sin(elapsed * 14) * 0.6;
      dogTongue.position.y = -0.14 + Math.sin(elapsed * 8) * 0.015;
      earL.rotation.x = -0.1 + Math.sin(elapsed * 8) * 0.08;
      earR.rotation.x = -0.1 + Math.cos(elapsed * 8) * 0.08;

      const curX = dogGroup.position.x;
      const curZ = dogGroup.position.z;
      const distToTarget = Math.hypot(dogAI.targetX - curX, dogAI.targetZ - curZ);

      if (distToTarget < 0.4) {
        if (dogAI.isWalking) {
          dogAI.isWalking = false;
          dogAI.pauseUntil = elapsed + (2.5 + Math.random() * 2.5); // istirahat sejenak 2.5 - 5 detik
        } else if (elapsed > dogAI.pauseUntil) {
          pickNextDogWaypoint(elapsed);
        }
        legFL.rotation.x *= 0.85;
        legFR.rotation.x *= 0.85;
        legBL.rotation.x *= 0.85;
        legBR.rotation.x *= 0.85;
        dogBody.position.y = 0.38;
        headGroup.rotation.y = Math.sin(elapsed * 2) * 0.22; // tengok kanan-kiri lucu
      } else {
        dogAI.isWalking = true;
        const targetAngle = Math.atan2(dogAI.targetX - curX, dogAI.targetZ - curZ);

        let diff = targetAngle - dogAI.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        dogAI.currentAngle += diff * 0.12;
        dogGroup.rotation.y = dogAI.currentAngle;

        const stepSpeed = 0.024;
        dogGroup.position.x += Math.sin(dogAI.currentAngle) * stepSpeed;
        dogGroup.position.z += Math.cos(dogAI.currentAngle) * stepSpeed;

        dogAI.walkCycle += 0.22;
        legFL.rotation.x = Math.sin(dogAI.walkCycle) * 0.45;
        legFR.rotation.x = -Math.sin(dogAI.walkCycle) * 0.45;
        legBL.rotation.x = -Math.sin(dogAI.walkCycle) * 0.45;
        legBR.rotation.x = Math.sin(dogAI.walkCycle) * 0.45;
        dogBody.position.y = 0.38 + Math.abs(Math.sin(dogAI.walkCycle * 2)) * 0.03;
        headGroup.rotation.y = Math.sin(dogAI.walkCycle) * 0.08;
      }
    },
    getDogPosition() {
      return {
        x: dogGroup.position.x,
        y: dogGroup.position.y,
        z: dogGroup.position.z,
      };
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

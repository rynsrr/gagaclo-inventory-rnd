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

  // 1. Atmosphere: Langit Putih Bersih & Kabut Cakrawala Lembut (Clean White Sky)
  const SKY_WHITE = 0xffffff;
  scene.background = new THREE.Color(SKY_WHITE);
  scene.fog = new THREE.Fog(SKY_WHITE, 45, 140);

  // 2. Daylight & Meadow Ambient Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x166534, 1.0);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm radiant sunbeams
  const sunLight = new THREE.DirectionalLight(0xfffdf5, 1.5);
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

  // Soft clean fill
  const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.4);
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
  // 7. KUPU-KUPU TUNGGAL (1 BUTTERFLY YANG LINCAH & DIKEJAR ANJING)
  // =========================================================================
  const wingGeoL = new THREE.PlaneGeometry(0.24, 0.32);
  wingGeoL.translate(0.12, 0, 0); // Pivot hinge
  const wingGeoR = new THREE.PlaneGeometry(0.24, 0.32);
  wingGeoR.translate(-0.12, 0, 0);
  const bodyGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 4);
  const bBodyMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  disposables.push(wingGeoL, wingGeoR, bodyGeo, bBodyMat);

  const wingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8, // Electric cyan / sky-blue yang kontras & mencolok
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  disposables.push(wingMat);

  const singleButterflyGroup = new THREE.Group();
  const bWingL = new THREE.Mesh(wingGeoL, wingMat);
  const bWingR = new THREE.Mesh(wingGeoR, wingMat);
  const bBody = new THREE.Mesh(bodyGeo, bBodyMat);
  bBody.rotation.x = Math.PI / 2;

  singleButterflyGroup.add(bWingL, bWingR, bBody);
  singleButterflyGroup.position.set(deckCenterX, deckHeight + 1.2, 2.0);
  scene.add(singleButterflyGroup);
  disposables.push(singleButterflyGroup);

  // =========================================================================
  // 8. ANJING PENJAGA BERJALAN RANDOM & MENGEJAR KUPU-KUPU
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

  // Helper ketinggian permukaan: lantai kayu (deckHeight = 0.08) vs padang rumput hijau (0.0)
  const getGroundHeightAt = (x, z) => {
    const halfW = deckWidth / 2;
    const halfD = deckDepth / 2;
    const onDeck =
      x >= deckCenterX - halfW &&
      x <= deckCenterX + halfW &&
      z >= -halfD &&
      z <= halfD;
    return onDeck ? deckHeight : 0.0;
  };

  // Kupu-kupu AI: Menjelajah Luas & Acak ke Padang Rumput
  const butterflyAI = {
    x: deckCenterX,
    y: deckHeight + 1.2,
    z: 2.0,
    targetX: deckCenterX,
    targetY: 1.5,
    targetZ: 6.5,
    currentAngle: 0,
    rollAngle: 0,
    nextWaypointTime: 0,
  };

  const pickButterflyWaypoint = (elapsed) => {
    const roll = Math.random();
    let tx, tz, ty;

    if (roll < 0.52) {
      // 52% Padang Rumput Depan (Front Meadow): hamparan rumput hijau luas di depan rak & kamera
      tx = deckCenterX + (Math.random() - 0.5) * (deckWidth * 0.95);
      tz = 4.8 + Math.random() * 9.5; // Z: 4.8 s/d 14.3 (rumput hijau depan)
      ty = 0.5 + Math.random() * 1.6;
    } else if (roll < 0.74) {
      // 22% Padang Rumput Samping (Flanks Meadow): sisi barat atau timur di luar lantai kayu
      const side = Math.random() > 0.5 ? 1 : -1;
      tx = deckCenterX + side * (deckWidth * 0.5 + 3.0 + Math.random() * 8.0);
      tz = (Math.random() - 0.5) * 16.0;
      ty = 0.7 + Math.random() * 2.0;
    } else if (roll < 0.88) {
      // 14% Padang Rumput Belakang (Back Meadow): rumput hijau di balik rak
      tx = deckCenterX + (Math.random() - 0.5) * (deckWidth * 0.85);
      tz = -4.8 - Math.random() * 6.5; // Z: -4.8 s/d -11.3
      ty = 0.6 + Math.random() * 1.8;
    } else {
      // 12% Melintas di atas area rak & lantai kayu
      tx = deckCenterX + (Math.random() - 0.5) * (deckWidth * 0.6);
      tz = (Math.random() - 0.5) * 3.5;
      ty = 1.8 + Math.random() * 2.0;
    }

    butterflyAI.targetX = tx;
    butterflyAI.targetZ = tz;
    butterflyAI.targetY = ty;
    butterflyAI.nextWaypointTime = elapsed + 4.5 + Math.random() * 4.5;
  };
  pickButterflyWaypoint(0);

  // Dog AI Chase, Jump & Playful Meadow Roaming State
  const dogAI = {
    currentAngle: 0,
    walkCycle: 0,
    isJumping: false,
    jumpStartTime: 0,
    jumpDuration: 0.72,
    jumpHeight: 1.25,
    lastJumpTime: -10,
    jumpCooldown: 2.2,
    mode: 'CHASE', // 'CHASE' atau 'ROAM'
    nextModeSwitchTime: 8,
    roamTargetX: deckCenterX,
    roamTargetZ: 6.5,
    currentBaseY: deckHeight,
  };

  let lastElapsed = null;
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

      starPoints.visible = true;
    } else {
      // Suasana Siang Bersih dengan Langit Putih
      scene.background.setHex(0xffffff);
      scene.fog.color.setHex(0xffffff);
      scene.fog.near = 45;
      scene.fog.far = 140;

      hemiLight.intensity = 1.0;
      hemiLight.color.setHex(0xffffff);
      hemiLight.groundColor.setHex(0x166534);
      sunLight.intensity = 1.5;
      sunLight.color.setHex(0xfffdf5);
      fillLight.intensity = 0.4;

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
      const dt = lastElapsed === null ? 0.016 : Math.min(0.05, Math.max(0.001, elapsed - lastElapsed));
      lastElapsed = elapsed;

      // 1. Kerlap-kerlip bintang lembut di malam hari
      if (starPoints.visible) {
        starMat.opacity = 0.75 + Math.sin(elapsed * 2.8) * 0.2;
      }

      // 3. Kupu-kupu terbang acak & dinamis mengitari padang rumput luas
      const distToBTarget = Math.hypot(butterflyAI.targetX - butterflyAI.x, butterflyAI.targetZ - butterflyAI.z);
      if (elapsed > butterflyAI.nextWaypointTime || distToBTarget < 1.4) {
        pickButterflyWaypoint(elapsed);
      }

      const bTargetAngle = Math.atan2(butterflyAI.targetX - butterflyAI.x, butterflyAI.targetZ - butterflyAI.z);
      let bAngleDiff = bTargetAngle - butterflyAI.currentAngle;
      while (bAngleDiff < -Math.PI) bAngleDiff += Math.PI * 2;
      while (bAngleDiff > Math.PI) bAngleDiff -= Math.PI * 2;
      butterflyAI.currentAngle += bAngleDiff * Math.min(1.0, dt * 3.2);

      const bSpeed = 3.8 + Math.sin(elapsed * 2.4) * 0.8;
      butterflyAI.x += Math.sin(butterflyAI.currentAngle) * bSpeed * dt;
      butterflyAI.z += Math.cos(butterflyAI.currentAngle) * bSpeed * dt;

      // Ketinggian terbang kupu-kupu + kepakan lembut
      const bSurfaceY = getGroundHeightAt(butterflyAI.x, butterflyAI.z);
      const naturalBob = Math.sin(elapsed * 5.2) * 0.22 + Math.cos(elapsed * 2.3) * 0.15;
      const targetBY = Math.max(bSurfaceY + 0.45, butterflyAI.targetY + naturalBob);
      butterflyAI.y += (targetBY - butterflyAI.y) * Math.min(1.0, dt * 2.8);

      const isEvading = dogAI.isJumping;
      const jumpEvade = isEvading ? Math.sin(((elapsed - dogAI.jumpStartTime) / dogAI.jumpDuration) * Math.PI) * 1.25 : 0;
      const finalBY = Math.max(bSurfaceY + 0.45, butterflyAI.y + jumpEvade);

      singleButterflyGroup.position.set(butterflyAI.x, finalBY, butterflyAI.z);
      singleButterflyGroup.rotation.y = butterflyAI.currentAngle;
      butterflyAI.rollAngle += (-bAngleDiff * 0.7 - butterflyAI.rollAngle) * Math.min(1.0, dt * 4.5);
      singleButterflyGroup.rotation.z = butterflyAI.rollAngle;

      // Kepakan sayap dinamis
      const flapSpeed = 26 + (isEvading ? 16 : 0);
      const flap = Math.sin(elapsed * flapSpeed) * 0.95;
      bWingL.rotation.y = flap;
      bWingR.rotation.y = -flap;

      // 3. Anjing Penjaga: Mengejar Kupu-Kupu & Menjelajah Padang Rumput
      dogTail.rotation.y = Math.sin(elapsed * (dogAI.isJumping ? 26 : 18)) * 0.8;
      dogTongue.position.y = -0.14 + Math.sin(elapsed * 12) * 0.02;
      earL.rotation.x = -0.12 + Math.sin(elapsed * 10) * 0.12;
      earR.rotation.x = -0.12 + Math.cos(elapsed * 10) * 0.12;

      // Pergantian mode bermain anjing di padang rumput secara acak
      if (elapsed > dogAI.nextModeSwitchTime && !dogAI.isJumping) {
        if (dogAI.mode === 'CHASE') {
          // Kesempatan anjing menjelajah atau mengendus rumput padang rumput secara mandiri
          dogAI.mode = 'ROAM';
          const roamSide = Math.random() > 0.4 ? 1 : -1;
          dogAI.roamTargetX = deckCenterX + (Math.random() - 0.5) * (deckWidth * 0.85);
          dogAI.roamTargetZ = 5.0 + Math.random() * 8.5; // Hamparan rumput depan
          if (Math.random() < 0.35) {
            // Hamparan rumput samping
            dogAI.roamTargetX = deckCenterX + roamSide * (deckWidth * 0.5 + 4.0 + Math.random() * 6.0);
            dogAI.roamTargetZ = (Math.random() - 0.5) * 12.0;
          }
          dogAI.nextModeSwitchTime = elapsed + 3.0 + Math.random() * 3.5;
        } else {
          // Kembali mengejar kupu-kupu ke padang rumput
          dogAI.mode = 'CHASE';
          dogAI.nextModeSwitchTime = elapsed + 8.0 + Math.random() * 10.0;
        }
      }

      let dogTargetX = butterflyAI.x;
      let dogTargetZ = butterflyAI.z;
      if (dogAI.mode === 'ROAM') {
        dogTargetX = dogAI.roamTargetX;
        dogTargetZ = dogAI.roamTargetZ;
      }

      const curX = dogGroup.position.x;
      const curZ = dogGroup.position.z;
      const distToTarget = Math.hypot(dogTargetX - curX, dogTargetZ - curZ);
      const distToButterfly = Math.hypot(butterflyAI.x - curX, butterflyAI.z - curZ);

      // Ketinggian permukaan dasar: menyesuaikan lantai kayu (0.08) atau rumput (0.0)
      const surfaceBaseY = getGroundHeightAt(curX, curZ);
      dogAI.currentBaseY += (surfaceBaseY - dogAI.currentBaseY) * Math.min(1.0, dt * 10.0);

      // Cek apakah anjing siap melompat saat dekat kupu-kupu
      if (!dogAI.isJumping && distToButterfly < 1.9 && (elapsed - dogAI.lastJumpTime) > dogAI.jumpCooldown) {
        dogAI.isJumping = true;
        dogAI.jumpStartTime = elapsed;
        dogAI.lastJumpTime = elapsed;
      }

      if (dogAI.isJumping) {
        const jumpProgress = (elapsed - dogAI.jumpStartTime) / dogAI.jumpDuration;
        if (jumpProgress >= 1) {
          // Mendarat kembali
          dogAI.isJumping = false;
          dogGroup.position.y = dogAI.currentBaseY;
          dogBody.position.y = 0.38;
          dogBody.rotation.x = 0;
          headGroup.rotation.x = 0;
          legFL.rotation.x = 0;
          legFR.rotation.x = 0;
          legBL.rotation.x = 0;
          legBR.rotation.x = 0;
        } else {
          // Busur parabola lompatan anjing yang lincah
          const arc = Math.sin(jumpProgress * Math.PI);
          dogGroup.position.y = dogAI.currentBaseY + arc * dogAI.jumpHeight;
          dogBody.position.y = 0.38 + arc * 0.12;

          // Meluncur maju ke arah target saat melayang di udara
          dogGroup.position.x += Math.sin(dogAI.currentAngle) * (0.042 * (dt / 0.016));
          dogGroup.position.z += Math.cos(dogAI.currentAngle) * (0.042 * (dt / 0.016));

          // Pose anjing melompat lucu
          legFL.rotation.x = -0.95 * arc;
          legFR.rotation.x = -0.95 * arc;
          legBL.rotation.x = 0.75 * arc;
          legBR.rotation.x = 0.75 * arc;
          headGroup.rotation.x = -0.65 * arc;
          dogBody.rotation.x = (0.5 - jumpProgress) * 0.55;
        }
      } else {
        // Berlari di atas permukaan tanah (lantai kayu / rumput)
        dogGroup.position.y = dogAI.currentBaseY;
        dogBody.rotation.x = 0;

        const targetAngle = Math.atan2(dogTargetX - curX, dogTargetZ - curZ);
        let diff = targetAngle - dogAI.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        dogAI.currentAngle += diff * Math.min(1.0, dt * 7.5);
        dogGroup.rotation.y = dogAI.currentAngle;

        if (dogAI.mode === 'ROAM') {
          // Sedang menjelajah/mengendus rumput di padang rumput
          headGroup.rotation.x = 0.22 + Math.sin(elapsed * 4) * 0.08;
        } else {
          // Sedang mengejar kupu-kupu: kepala mendongak ke arah ketinggian kupu-kupu
          const heightDiff = finalBY - (dogAI.currentBaseY + 0.6);
          headGroup.rotation.x = -Math.min(0.55, Math.max(0, heightDiff * 0.35));
        }

        // Kecepatan lari
        const baseSpeed = dogAI.mode === 'CHASE' ? Math.min(0.062, Math.max(0.038, distToTarget * 0.05)) : 0.038;
        const stepSpeed = baseSpeed * (dt / 0.016);
        dogGroup.position.x += Math.sin(dogAI.currentAngle) * stepSpeed;
        dogGroup.position.z += Math.cos(dogAI.currentAngle) * stepSpeed;

        // Ayunan kaki berjalan/berlari
        dogAI.walkCycle += (dogAI.mode === 'CHASE' ? 0.42 : 0.3) * (dt / 0.016);
        legFL.rotation.x = Math.sin(dogAI.walkCycle) * 0.55;
        legFR.rotation.x = -Math.sin(dogAI.walkCycle) * 0.55;
        legBL.rotation.x = -Math.sin(dogAI.walkCycle) * 0.55;
        legBR.rotation.x = Math.sin(dogAI.walkCycle) * 0.55;
        dogBody.position.y = 0.38 + Math.abs(Math.sin(dogAI.walkCycle * 2)) * 0.04;
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

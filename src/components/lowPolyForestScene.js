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

  // Dog AI Chase & Jump State (Mengejar 1 Kupu-kupu & Melompat Lucu)
  const dogAI = {
    currentAngle: 0,
    walkCycle: 0,
    isJumping: false,
    jumpStartTime: 0,
    jumpDuration: 0.72,
    jumpHeight: 1.15,
    lastJumpTime: -10,
    jumpCooldown: 2.2,
  };

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

      // 2. Kupu-kupu terbang acak & dinamis mengitari rak hingga keluar ke padang rumput
      const flap = Math.sin(elapsed * 28 + Math.sin(elapsed * 3.5) * 3) * 0.95;
      bWingL.rotation.y = flap;
      bWingR.rotation.y = -flap;

      const prevBX = singleButterflyGroup.position.x;
      const prevBZ = singleButterflyGroup.position.z;

      // Trajektori multi-frekuensi acak luas (bisa keluar dari lantai kayu ke rumput hijau)
      const bX = deckCenterX + Math.sin(elapsed * 0.45) * (deckWidth * 0.65) + Math.cos(elapsed * 0.92) * 4.2 + Math.sin(elapsed * 1.7) * 1.5;
      const bZ = Math.cos(elapsed * 0.38) * 6.0 + Math.sin(elapsed * 0.82) * 3.2 + Math.cos(elapsed * 1.55) * 1.2;

      // Ketinggian terbang bervariasi: menukik rendah ke rumput lalu melambung tinggi di atas rak
      const isEvading = dogAI.isJumping;
      const jumpEvade = isEvading ? Math.sin(((elapsed - dogAI.jumpStartTime) / dogAI.jumpDuration) * Math.PI) * 0.95 : 0;
      const bYBase = 1.6 + Math.sin(elapsed * 0.72) * 1.1 + Math.cos(elapsed * 1.45) * 0.6 + Math.sin(elapsed * 3.6) * 0.25;
      const bY = Math.max(0.65, bYBase + jumpEvade);

      singleButterflyGroup.position.set(bX, bY, bZ);

      const bDx = bX - prevBX;
      const bDz = bZ - prevBZ;
      if (Math.abs(bDx) > 0.001 || Math.abs(bDz) > 0.001) {
        singleButterflyGroup.rotation.y = Math.atan2(bDx, bDz);
        singleButterflyGroup.rotation.z = Math.sin(elapsed * 2.8) * 0.2; // Sedikit miring saat berbelok
      }

      // 4. Anjing Penjaga Mengejar Kupu-Kupu & Melompat (Jump!)
      dogTail.rotation.y = Math.sin(elapsed * (dogAI.isJumping ? 26 : 18)) * 0.8;
      dogTongue.position.y = -0.14 + Math.sin(elapsed * 12) * 0.02;
      earL.rotation.x = -0.12 + Math.sin(elapsed * 10) * 0.12;
      earR.rotation.x = -0.12 + Math.cos(elapsed * 10) * 0.12;

      const curX = dogGroup.position.x;
      const curZ = dogGroup.position.z;
      const distToB = Math.hypot(bX - curX, bZ - curZ);

      // Cek apakah anjing siap melompat saat dekat kupu-kupu
      if (!dogAI.isJumping && distToB < 1.7 && (elapsed - dogAI.lastJumpTime) > dogAI.jumpCooldown) {
        dogAI.isJumping = true;
        dogAI.jumpStartTime = elapsed;
        dogAI.lastJumpTime = elapsed;
      }

      if (dogAI.isJumping) {
        const jumpProgress = (elapsed - dogAI.jumpStartTime) / dogAI.jumpDuration;
        if (jumpProgress >= 1) {
          // Mendarat kembali di lantai kayu
          dogAI.isJumping = false;
          dogGroup.position.y = deckHeight;
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
          dogGroup.position.y = deckHeight + arc * dogAI.jumpHeight;
          dogBody.position.y = 0.38 + arc * 0.12;

          // Sedikit meluncur maju ke arah kupu-kupu saat melayang
          dogGroup.position.x += Math.sin(dogAI.currentAngle) * 0.038;
          dogGroup.position.z += Math.cos(dogAI.currentAngle) * 0.038;

          // Pose anjing melompat lucu: kedua kaki depan menggapai ke atas, kaki belakang merentang
          legFL.rotation.x = -0.95 * arc;
          legFR.rotation.x = -0.95 * arc;
          legBL.rotation.x = 0.75 * arc;
          legBR.rotation.x = 0.75 * arc;

          // Kepala mendongak ke atas menatap kupu-kupu
          headGroup.rotation.x = -0.65 * arc;

          // Badan menengadah saat naik, lalu menukik saat turun
          dogBody.rotation.x = (0.5 - jumpProgress) * 0.55;
        }
      } else {
        // Anjing berlari di lantai mengejar kupu-kupu
        dogGroup.position.y = deckHeight;
        dogBody.rotation.x = 0;

        // Hadapkan anjing tepat ke posisi kupu-kupu
        const targetAngle = Math.atan2(bX - curX, bZ - curZ);
        let diff = targetAngle - dogAI.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        dogAI.currentAngle += diff * 0.16;
        dogGroup.rotation.y = dogAI.currentAngle;

        // Kepala sedikit mendongak ke arah ketinggian kupu-kupu
        const heightDiff = bY - (deckHeight + 0.6);
        headGroup.rotation.x = -Math.min(0.5, Math.max(0, heightDiff * 0.35));

        // Lari mengejar kupu-kupu
        const stepSpeed = Math.min(0.048, distToB * 0.045);
        dogGroup.position.x += Math.sin(dogAI.currentAngle) * stepSpeed;
        dogGroup.position.z += Math.cos(dogAI.currentAngle) * stepSpeed;

        // Animasi ayunan 4 kaki berlari kencang
        dogAI.walkCycle += 0.36;
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

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

  // 1. Atmosphere: Langit Putih Bersih Tanpa Kabut (Clean White Sky, No Fog)
  const SKY_WHITE = 0xffffff;
  scene.background = new THREE.Color(SKY_WHITE);
  scene.fog = null;

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

  // 3. Vast Flat Green Grassland (Lantai Padang Rumput Datar Sempurna / Laser-Flat)
  const groundGeo = new THREE.PlaneGeometry(260, 260);

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3bb346, // Fresh, vibrant meadow grass green
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0; // Exactly level with 0
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat, ground);

  // 4. Architectural Floor Plan Slab (Lantai Kayu Datar sesuai Denah Arsitektural)
  // Polygon 8-vertex: Long Corridor, Middle Squares, Right Wing with L-Notch
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-30, 50);   // z = -50
  floorShape.lineTo(55, 50);    // z = -50
  floorShape.lineTo(55, 30);    // z = -30
  floorShape.lineTo(35, 30);    // z = -30
  floorShape.lineTo(35, 14);    // z = -14
  floorShape.lineTo(0, 14);     // z = -14
  floorShape.lineTo(0, -50);    // z = 50
  floorShape.lineTo(-30, -50);  // z = 50
  floorShape.closePath();

  const floorGeo = new THREE.ShapeGeometry(floorShape);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xc47b38, // Warm honey oak timber
    roughness: 0.75,
    metalness: 0.05,
    flatShading: false,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.05; // Elevated slightly above grass
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
  disposables.push(floorGeo, floorMat, floorMesh);

  // 5. Architectural Low Boundary Walls with Red Top Cap Accent ("Garis Merah Dinding Pembatas")
  const wallH = 1.15;
  const wallThick = 0.32;
  const capH = 0.08;
  const capThick = 0.36;

  const wallBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Architectural clean smooth white
    roughness: 0.65,
    metalness: 0.05,
  });
  const wallCapMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Vibrant architectural red cap accent
    roughness: 0.45,
    metalness: 0.1,
  });
  disposables.push(wallBodyMat, wallCapMat);

  const addWallSegment = (x1, z1, x2, z2) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;
    const angle = Math.atan2(dx, dz);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;

    const bodyGeo = new THREE.BoxGeometry(wallThick, wallH, len);
    const bodyMesh = new THREE.Mesh(bodyGeo, wallBodyMat);
    bodyMesh.position.set(cx, wallH / 2 + 0.05, cz);
    bodyMesh.rotation.y = angle;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    scene.add(bodyMesh);

    const capGeo = new THREE.BoxGeometry(capThick, capH, len + 0.02);
    const capMesh = new THREE.Mesh(capGeo, wallCapMat);
    capMesh.position.set(cx, wallH + capH / 2 + 0.05, cz);
    capMesh.rotation.y = angle;
    capMesh.castShadow = true;
    scene.add(capMesh);

    disposables.push(bodyGeo, capGeo, bodyMesh, capMesh);
  };

  // Exterior Perimeter Walls
  addWallSegment(-30, -50, -30, 50);  // West corridor wall (full 100m)
  addWallSegment(-30, -50, 55, -50);  // North perimeter wall (from corridor to right wing)
  addWallSegment(55, -50, 55, -30);   // East right wing upper wall
  addWallSegment(55, -30, 35, -30);   // Horizontal notch cut wall
  addWallSegment(35, -30, 35, -14);   // Vertical notch cut wall

  // Dinding Bawah Ruang Kanan & Square 3 (Z = -14) dengan Lubang 5 di sudut L-Notch
  addWallSegment(32, -14, 0, -14);    // Dinding bawah dari X=0 ke X=32
  // Lubang 5 (Green Hole #5): Bukaan pintu di sudut L-Notch dari X=32 ke X=35 di Z=-14
  const holeMarkerMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Vibrant lime green
    roughness: 0.45,
    metalness: 0.1,
  });
  disposables.push(holeMarkerMat);

  const addHoleThreshold = (cx, cz, width, depth) => {
    const geo = new THREE.BoxGeometry(width, 0.02, depth);
    const mesh = new THREE.Mesh(geo, holeMarkerMat);
    mesh.position.set(cx, 0.06, cz);
    mesh.receiveShadow = true;
    scene.add(mesh);
    disposables.push(geo, mesh);
  };

  addHoleThreshold(33.5, -14, 3.0, 0.6);

  addWallSegment(0, -14, 0, 50);      // East wall of long corridor
  addWallSegment(-30, 50, 0, 50);     // South wall of corridor (behind Rak 3, 4, 5)

  // Interior Architectural Partitions (Sekat Ruang Dalam & 4 Lubang Hijau)
  // 1. Dinding Pemisah Koridor <-> 3 Bilik (X = 0, dari Z = -50 ke -14)
  // Sisi Square 1 & Square 2 tertutup penuh (Full Wall, Z: -50 ke -26)
  addWallSegment(0, -50, 0, -26);
  // Lubang 3 (Green Hole #3): Pintu masuk dari Koridor ke Square 3 di Z: [-26, -23]
  addHoleThreshold(0, -24.5, 0.6, 3.0);
  // Sisa dinding bawah Square 3 (Z: -23 ke -14)
  addWallSegment(0, -23, 0, -14);

  // 2. Sekat Horizontal Square 1 <-> Square 2 (Z = -38, X: 0 ke 15)
  // TERTUTUP PENUH (FULL WALL)
  addWallSegment(0, -38, 15, -38);

  // 3. Sekat Horizontal Square 2 <-> Square 3 (Z = -26, X: 0 ke 15)
  // TERTUTUP PENUH (FULL WALL)
  addWallSegment(0, -26, 15, -26);

  // 4. Dinding Pemisah 3 Bilik <-> Ruang Kanan (X = 15, dari Z = -50 ke -14)
  // Square 1: Dinding atas (Z: -50 ke -41)
  addWallSegment(15, -50, 15, -41);
  // Lubang 1 (Green Hole #1): Pintu Square 1 ke Ruang Kanan di Z: [-41, -38]
  addHoleThreshold(15, -39.5, 0.6, 3.0);

  // Square 2: Dinding atas (Z: -38 ke -29)
  addWallSegment(15, -38, 15, -29);
  // Lubang 2 (Green Hole #2): Pintu Square 2 ke Ruang Kanan di Z: [-29, -26]
  addHoleThreshold(15, -27.5, 0.6, 3.0);

  // Square 3: Dinding atas (Z: -26 ke -17)
  addWallSegment(15, -26, 15, -17);
  // Lubang 4 (Green Hole #4): Pintu Square 3 ke Ruang Kanan di Z: [-17, -14]
  addHoleThreshold(15, -15.5, 0.6, 3.0);

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
  singleButterflyGroup.position.set(-15, 1.5, 20);
  scene.add(singleButterflyGroup);
  disposables.push(singleButterflyGroup);

  // =========================================================================
  // 8. ANJING PENJAGA BERJALAN RANDOM & MENGEJAR KUPU-KUPU
  // =========================================================================
  const dogGroup = new THREE.Group();
  dogGroup.position.set(-15, 0.05, 22);

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

  // Helper ketinggian permukaan: lantai denah arsitektur (0.05) vs padang rumput hijau (0.0)
  const isInsideFloor = (x, z) => {
    // 1. Long corridor: x in [-30, 0] and z in [-50, 50]
    if (x >= -30 && x <= 0 && z >= -50 && z <= 50) return true;
    // 2. Middle squares 1-3: x in [0, 15] and z in [-50, -14]
    if (x >= 0 && x <= 15 && z >= -50 && z <= -14) return true;
    // 3. Right room upper part: x in [15, 55] and z in [-50, -30]
    if (x >= 15 && x <= 55 && z >= -50 && z <= -30) return true;
    // 4. Right room lower part: x in [15, 35] and z in [-30, -14]
    if (x >= 15 && x <= 35 && z >= -30 && z <= -14) return true;
    return false;
  };

  const getGroundHeightAt = (x, z) => {
    return isInsideFloor(x, z) ? 0.05 : 0.0;
  };

  // Helper pemilihan titik target di dalam dan luar denah
  const getRandomLocation = () => {
    const roll = Math.random();
    if (roll < 0.32) {
      // Koridor panjang (Long Corridor)
      return {
        x: -24 + Math.random() * 20,
        z: -42 + Math.random() * 84,
      };
    } else if (roll < 0.46) {
      // Ruang Kotak 1 / Top Square (Rak 1)
      return {
        x: 3 + Math.random() * 9,
        z: -47 + Math.random() * 8,
      };
    } else if (roll < 0.60) {
      // Ruang Kotak 2 / Middle Square (Jalan Akses)
      return {
        x: 3 + Math.random() * 9,
        z: -35 + Math.random() * 7,
      };
    } else if (roll < 0.74) {
      // Ruang Kotak 3 / Bottom Square (Rak 2)
      return {
        x: 3 + Math.random() * 9,
        z: -23 + Math.random() * 7,
      };
    } else if (roll < 0.88) {
      // Ruang Kanan (Right Wing Room)
      return {
        x: 20 + Math.random() * 28,
        z: -46 + Math.random() * 14,
      };
    } else {
      // Padang rumput hijau di luar denah
      const side = Math.random();
      if (side < 0.33) {
        return { x: -45 + Math.random() * 12, z: (Math.random() - 0.5) * 80 };
      } else if (side < 0.66) {
        return { x: 58 + Math.random() * 15, z: (Math.random() - 0.5) * 80 };
      } else {
        return { x: (Math.random() - 0.5) * 60, z: 53 + Math.random() * 15 };
      }
    }
  };

  // Kupu-kupu AI: Menjelajah Luas & Acak ke Denah & Padang Rumput
  const initialLoc = getRandomLocation();
  const butterflyAI = {
    x: -12.0,
    y: 1.5,
    z: 20.0,
    targetX: initialLoc.x,
    targetY: 1.6,
    targetZ: initialLoc.z,
    currentAngle: 0,
    rollAngle: 0,
    nextWaypointTime: 0,
  };

  const pickButterflyWaypoint = (elapsed) => {
    const loc = getRandomLocation();
    butterflyAI.targetX = loc.x;
    butterflyAI.targetZ = loc.z;
    butterflyAI.targetY = 0.8 + Math.random() * 1.8;
    butterflyAI.nextWaypointTime = elapsed + 4.5 + Math.random() * 4.5;
  };
  pickButterflyWaypoint(0);

  // Dog AI Chase, Jump & Playful Roaming State
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
    roamTargetX: -14.0,
    roamTargetZ: 10.0,
    currentBaseY: 0.05,
  };

  let lastElapsed = null;
  let currentIsDark = false;

  function applyMode(isDark) {
    currentIsDark = Boolean(isDark);
    if (isDark) {
      // Midnight Twilight Atmosphere
      scene.background.setHex(0x060d17);
      scene.fog = null;

      // Redupkan cahaya matahari menjadi pantulan sinar bulan yang lembut
      hemiLight.intensity = 0.12;
      hemiLight.color.setHex(0x60a5fa);
      hemiLight.groundColor.setHex(0x022c22);
      sunLight.intensity = 0.18;
      sunLight.color.setHex(0x93c5fd);
      fillLight.intensity = 0.05;

      starPoints.visible = true;
    } else {
      // Suasana Siang Bersih dengan Langit Putih (Tanpa Kabut)
      scene.background.setHex(0xffffff);
      scene.fog = null;

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

      // Pergantian mode bermain anjing di denah & padang rumput secara acak
      if (elapsed > dogAI.nextModeSwitchTime && !dogAI.isJumping) {
        if (dogAI.mode === 'CHASE') {
          // Kesempatan anjing menjelajah atau mengendus lantai/rumput secara mandiri
          dogAI.mode = 'ROAM';
          const rLoc = getRandomLocation();
          dogAI.roamTargetX = rLoc.x;
          dogAI.roamTargetZ = rLoc.z;
          dogAI.nextModeSwitchTime = elapsed + 3.5 + Math.random() * 4.0;
        } else {
          // Kembali mengejar kupu-kupu
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

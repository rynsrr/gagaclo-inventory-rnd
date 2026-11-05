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

  // 6. Animated Disney Companions: Horse and Dog Walking Around The Boxes
  // A. Low-Poly Horse
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3a, roughness: 0.75, flatShading: true }); // Chestnut coat
  const horseManeMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.85, flatShading: true }); // Dark mane
  const horseSnoutMat = new THREE.MeshStandardMaterial({ color: 0xecd9c6, roughness: 0.8, flatShading: true }); // Cream muzzle
  const horseHoofMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.7, flatShading: true }); // Dark hoof
  const darkEyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 });
  disposables.push(horseMat, horseManeMat, horseSnoutMat, horseHoofMat, darkEyeMat);

  const horseRoot = new THREE.Group();

  // Torso / Barrel
  const horseBodyGeo = new THREE.BoxGeometry(0.82, 0.88, 1.7);
  const horseBody = new THREE.Mesh(horseBodyGeo, horseMat);
  horseBody.position.y = 1.35;
  horseBody.castShadow = true;
  horseBody.receiveShadow = true;
  horseRoot.add(horseBody);
  disposables.push(horseBodyGeo, horseBody);

  // Neck and Head
  const horseNeckGroup = new THREE.Group();
  horseNeckGroup.position.set(0, 1.45, 0.65);
  horseNeckGroup.rotation.x = -0.52;

  const horseNeckGeo = new THREE.BoxGeometry(0.42, 0.85, 0.5);
  const horseNeck = new THREE.Mesh(horseNeckGeo, horseMat);
  horseNeck.position.y = 0.35;
  horseNeck.castShadow = true;
  horseNeckGroup.add(horseNeck);
  disposables.push(horseNeckGeo, horseNeck);

  // Mane behind neck
  const horseManeGeo = new THREE.BoxGeometry(0.12, 0.95, 0.28);
  const horseMane = new THREE.Mesh(horseManeGeo, horseManeMat);
  horseMane.position.set(0, 0.38, -0.26);
  horseNeckGroup.add(horseMane);
  disposables.push(horseManeGeo, horseMane);

  // Head
  const horseHeadGroup = new THREE.Group();
  horseHeadGroup.position.set(0, 0.7, 0.15);

  const horseHeadGeo = new THREE.BoxGeometry(0.44, 0.45, 0.65);
  const horseHead = new THREE.Mesh(horseHeadGeo, horseMat);
  horseHead.castShadow = true;
  horseHeadGroup.add(horseHead);
  disposables.push(horseHeadGeo, horseHead);

  // Muzzle / Snout
  const horseSnoutGeo = new THREE.BoxGeometry(0.36, 0.35, 0.42);
  const horseSnout = new THREE.Mesh(horseSnoutGeo, horseSnoutMat);
  horseSnout.position.set(0, -0.06, 0.42);
  horseSnout.castShadow = true;
  horseHeadGroup.add(horseSnout);
  disposables.push(horseSnoutGeo, horseSnout);

  // Ears
  const earGeo = new THREE.ConeGeometry(0.09, 0.26, 4);
  const earL = new THREE.Mesh(earGeo, horseMat);
  earL.position.set(-0.14, 0.28, -0.12);
  earL.rotation.x = -0.2;
  const earR = new THREE.Mesh(earGeo, horseMat);
  earR.position.set(0.14, 0.28, -0.12);
  earR.rotation.x = -0.2;
  horseHeadGroup.add(earL, earR);
  disposables.push(earGeo, earL, earR);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
  const eyeL = new THREE.Mesh(eyeGeo, darkEyeMat);
  eyeL.position.set(-0.23, 0.08, 0.1);
  const eyeR = new THREE.Mesh(eyeGeo, darkEyeMat);
  eyeR.position.set(0.23, 0.08, 0.1);
  horseHeadGroup.add(eyeL, eyeR);
  disposables.push(eyeGeo, eyeL, eyeR);

  horseNeckGroup.add(horseHeadGroup);
  horseRoot.add(horseNeckGroup);

  // Tail
  const horseTailGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.85, 5);
  const horseTail = new THREE.Mesh(horseTailGeo, horseManeMat);
  horseTail.position.set(0, 1.25, -0.85);
  horseTail.rotation.x = 0.4;
  horseTail.castShadow = true;
  horseRoot.add(horseTail);
  disposables.push(horseTailGeo, horseTail);

  // 4 Legs helper
  const createHorseLeg = (x, z) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 1.05, z);

    // Upper thigh
    const upperGeo = new THREE.BoxGeometry(0.22, 0.55, 0.24);
    const upper = new THREE.Mesh(upperGeo, horseMat);
    upper.position.y = -0.22;
    upper.castShadow = true;
    legGroup.add(upper);
    disposables.push(upperGeo, upper);

    // Lower shin
    const lowerGeo = new THREE.BoxGeometry(0.16, 0.5, 0.18);
    const lower = new THREE.Mesh(lowerGeo, horseMat);
    lower.position.y = -0.65;
    lower.castShadow = true;
    legGroup.add(lower);
    disposables.push(lowerGeo, lower);

    // Hoof
    const hoofGeo = new THREE.BoxGeometry(0.19, 0.15, 0.22);
    const hoof = new THREE.Mesh(hoofGeo, horseHoofMat);
    hoof.position.y = -0.95;
    hoof.castShadow = true;
    legGroup.add(hoof);
    disposables.push(hoofGeo, hoof);

    horseRoot.add(legGroup);
    return legGroup;
  };

  const horseLegFL = createHorseLeg(-0.28, 0.55);
  const horseLegFR = createHorseLeg(0.28, 0.55);
  const horseLegBL = createHorseLeg(-0.28, -0.55);
  const horseLegBR = createHorseLeg(0.28, -0.55);

  scene.add(horseRoot);
  disposables.push(horseRoot);

  // B. Low-Poly Dog (Cute Disney Retriever/Shiba companion)
  const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, flatShading: true }); // Golden coat
  const dogSnoutMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75, flatShading: true }); // Cream snout
  const dogCollarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }); // Red collar
  disposables.push(dogMat, dogSnoutMat, dogCollarMat);

  const dogRoot = new THREE.Group();

  // Torso
  const dogBodyGeo = new THREE.BoxGeometry(0.44, 0.4, 0.78);
  const dogBody = new THREE.Mesh(dogBodyGeo, dogMat);
  dogBody.position.y = 0.48;
  dogBody.castShadow = true;
  dogBody.receiveShadow = true;
  dogRoot.add(dogBody);
  disposables.push(dogBodyGeo, dogBody);

  // Head & Neck Group
  const dogHeadGroup = new THREE.Group();
  dogHeadGroup.position.set(0, 0.58, 0.35);

  const dogHeadGeo = new THREE.BoxGeometry(0.34, 0.32, 0.34);
  const dogHead = new THREE.Mesh(dogHeadGeo, dogMat);
  dogHead.castShadow = true;
  dogHeadGroup.add(dogHead);
  disposables.push(dogHeadGeo, dogHead);

  // Collar
  const collarGeo = new THREE.BoxGeometry(0.36, 0.08, 0.36);
  const collar = new THREE.Mesh(collarGeo, dogCollarMat);
  collar.position.y = -0.12;
  dogHeadGroup.add(collar);
  disposables.push(collarGeo, collar);

  // Snout
  const dogSnoutGeo = new THREE.BoxGeometry(0.2, 0.16, 0.22);
  const dogSnout = new THREE.Mesh(dogSnoutGeo, dogSnoutMat);
  dogSnout.position.set(0, -0.05, 0.22);
  dogSnout.castShadow = true;
  dogHeadGroup.add(dogSnout);
  disposables.push(dogSnoutGeo, dogSnout);

  // Black Nose Button
  const dogNoseGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
  const dogNose = new THREE.Mesh(dogNoseGeo, darkEyeMat);
  dogNose.position.set(0, 0.01, 0.34);
  dogHeadGroup.add(dogNose);
  disposables.push(dogNoseGeo, dogNose);

  // Perky triangular ears
  const dogEarGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
  const dogEarL = new THREE.Mesh(dogEarGeo, dogMat);
  dogEarL.position.set(-0.12, 0.2, -0.02);
  dogEarL.rotation.z = -0.18;
  const dogEarR = new THREE.Mesh(dogEarGeo, dogMat);
  dogEarR.position.set(0.12, 0.2, -0.02);
  dogEarR.rotation.z = 0.18;
  dogHeadGroup.add(dogEarL, dogEarR);
  disposables.push(dogEarGeo, dogEarL, dogEarR);

  // Eyes
  const dogEyeL = new THREE.Mesh(eyeGeo, darkEyeMat);
  dogEyeL.position.set(-0.13, 0.06, 0.14);
  const dogEyeR = new THREE.Mesh(eyeGeo, darkEyeMat);
  dogEyeR.position.set(0.13, 0.06, 0.14);
  dogHeadGroup.add(dogEyeL, dogEyeR);
  disposables.push(dogEyeL, dogEyeR);

  dogRoot.add(dogHeadGroup);

  // Wagging tail group
  const dogTailGroup = new THREE.Group();
  dogTailGroup.position.set(0, 0.52, -0.38);
  const dogTailGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.38, 4);
  const dogTail = new THREE.Mesh(dogTailGeo, dogMat);
  dogTail.position.y = 0.16;
  dogTail.rotation.x = -0.6;
  dogTail.castShadow = true;
  dogTailGroup.add(dogTail);
  dogRoot.add(dogTailGroup);
  disposables.push(dogTailGeo, dogTail);

  // 4 Dog legs
  const createDogLeg = (x, z) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 0.36, z);

    const legGeo = new THREE.BoxGeometry(0.11, 0.36, 0.13);
    const legMesh = new THREE.Mesh(legGeo, dogMat);
    legMesh.position.y = -0.18;
    legMesh.castShadow = true;
    legGroup.add(legMesh);
    disposables.push(legGeo, legMesh);

    dogRoot.add(legGroup);
    return legGroup;
  };

  const dogLegFL = createDogLeg(-0.15, 0.22);
  const dogLegFR = createDogLeg(0.15, 0.22);
  const dogLegBL = createDogLeg(-0.15, -0.22);
  const dogLegBR = createDogLeg(0.15, -0.22);

  scene.add(dogRoot);
  disposables.push(dogRoot);

  // C. Smooth Roaming Paths around the Warehouse Boxes (Catmull-Rom Closed Curves)
  const horsePoints = [
    new THREE.Vector3(deckCenterX - 8, 0, 7.5),
    new THREE.Vector3(deckCenterX + 6, 0, 7.5),
    new THREE.Vector3(maxX + 4.5, 0, 4.5),
    new THREE.Vector3(maxX + 5.5, 0, -1.0),
    new THREE.Vector3(maxX + 3.5, 0, -5.5),
    new THREE.Vector3(deckCenterX, 0, -6.0),
    new THREE.Vector3(minX - 3.5, 0, -5.5),
    new THREE.Vector3(minX - 5.5, 0, -1.0),
    new THREE.Vector3(minX - 4.5, 0, 4.5),
  ];
  const horseCurve = new THREE.CatmullRomCurve3(horsePoints, true, 'centripetal');

  const dogPoints = [
    new THREE.Vector3(deckCenterX - 3, 0, 5.8),
    new THREE.Vector3(deckCenterX + 4, 0, 5.5),
    new THREE.Vector3(maxX + 2.8, 0, 3.2),
    new THREE.Vector3(maxX + 3.2, 0, -1.5),
    new THREE.Vector3(maxX + 1.8, 0, -4.5),
    new THREE.Vector3(deckCenterX + 2, 0, -4.8),
    new THREE.Vector3(deckCenterX - 5, 0, -4.6),
    new THREE.Vector3(minX - 2.5, 0, -2.0),
    new THREE.Vector3(minX - 2.8, 0, 3.0),
    new THREE.Vector3(deckCenterX - 6, 0, 6.0),
  ];
  const dogCurve = new THREE.CatmullRomCurve3(dogPoints, true, 'centripetal');

  return {
    update(elapsed) {
      if (ecoModeRef && ecoModeRef.current) return;

      // 1. Horse stroll and trot gait around the perimeter
      const horseT = (elapsed * 0.015) % 1;
      const horsePos = horseCurve.getPointAt(horseT);
      const horseTangent = horseCurve.getTangentAt(horseT);

      horseRoot.position.x = horsePos.x;
      horseRoot.position.z = horsePos.z;
      horseRoot.rotation.y = Math.atan2(horseTangent.x, horseTangent.z);

      const horseWalkCycle = elapsed * 4.8;
      horseLegFL.rotation.x = Math.sin(horseWalkCycle) * 0.42;
      horseLegBR.rotation.x = Math.sin(horseWalkCycle) * 0.38;
      horseLegFR.rotation.x = -Math.sin(horseWalkCycle) * 0.42;
      horseLegBL.rotation.x = -Math.sin(horseWalkCycle) * 0.38;

      horseBody.position.y = 1.35 + Math.abs(Math.sin(horseWalkCycle * 2)) * 0.04;
      horseNeckGroup.rotation.x = -0.52 + Math.sin(horseWalkCycle) * 0.05;
      horseTail.rotation.z = Math.sin(horseWalkCycle) * 0.14;

      // 2. Dog playful trot and wagging tail
      const dogT = (elapsed * 0.024 + 0.38) % 1;
      const dogPos = dogCurve.getPointAt(dogT);
      const dogTangent = dogCurve.getTangentAt(dogT);

      dogRoot.position.x = dogPos.x;
      dogRoot.position.z = dogPos.z;
      dogRoot.position.y = Math.abs(Math.sin(elapsed * 7.5)) * 0.05;
      dogRoot.rotation.y = Math.atan2(dogTangent.x, dogTangent.z);

      const dogWalkCycle = elapsed * 7.5;
      dogLegFL.rotation.x = Math.sin(dogWalkCycle) * 0.48;
      dogLegBR.rotation.x = Math.sin(dogWalkCycle) * 0.44;
      dogLegFR.rotation.x = -Math.sin(dogWalkCycle) * 0.48;
      dogLegBL.rotation.x = -Math.sin(dogWalkCycle) * 0.44;

      dogTailGroup.rotation.y = Math.sin(elapsed * 16) * 0.55;
      dogHeadGroup.rotation.z = Math.sin(elapsed * 3.5) * 0.08;
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

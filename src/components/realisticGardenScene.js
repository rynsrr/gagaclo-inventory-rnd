import * as THREE from 'three';

/**
 * Creates high-detail procedural canvas textures for the realistic garden
 */
function createGrassTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base lush grass gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#365e23');
  grad.addColorStop(0.5, '#497732');
  grad.addColorStop(1, '#2f521f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft soil & moss tonal patches
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 9 + 3;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(80, 128, 54, 0.35)' : 'rgba(40, 68, 26, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Realistic directional grass blade strokes
  const bladeColors = ['#5e923e', '#70a84e', '#456f2d', '#7eb85b', '#365823'];
  for (const color of bladeColors) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let b = 0; b < 1800; b++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + (Math.random() * 4 - 2), gy - (Math.random() * 7 + 3));
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 28);
  if (renderer) {
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return texture;
}

function createTimberDeckTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base warm teak deck color
  ctx.fillStyle = '#9c6644';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal wood planks
  const plankHeight = 32;
  for (let y = 0; y < 512; y += plankHeight) {
    // Subtle plank color variation
    const tone = Math.sin(y * 11) * 14;
    const r = Math.min(255, Math.max(0, 166 + tone));
    const g = Math.min(255, Math.max(0, 115 + tone * 0.8));
    const b = Math.min(255, Math.max(0, 77 + tone * 0.6));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, y + 2, 512, plankHeight - 4);

    // Fine wood grain lines
    ctx.strokeStyle = 'rgba(74, 46, 27, 0.22)';
    ctx.lineWidth = 1;
    for (let line = 0; line < 4; line++) {
      ctx.beginPath();
      const ly = y + 4 + Math.random() * (plankHeight - 8);
      ctx.moveTo(0, ly);
      ctx.bezierCurveTo(150, ly + Math.random() * 3 - 1.5, 350, ly + Math.random() * 3 - 1.5, 512, ly);
      ctx.stroke();
    }

    // Plank gap groove
    ctx.fillStyle = '#3a2012';
    ctx.fillRect(0, y, 512, 2);

    // Nail marks
    ctx.fillStyle = 'rgba(40, 25, 15, 0.65)';
    ctx.fillRect(16, y + plankHeight / 2 - 1, 3, 3);
    ctx.fillRect(496, y + plankHeight / 2 - 1, 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 2);
  if (renderer) {
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return texture;
}

/**
 * Builds the complete realistic botanical garden environment around the racks
 */
export function buildRealisticGarden({ scene, minX = -18, maxX = 26, renderer, ecoModeRef }) {
  const disposables = [];
  const swayingTops = [];
  const swayingShrubs = [];

  // 1. Atmosphere: Sky, Fog & Natural Sun Lighting
  scene.background = new THREE.Color(0xaad3f5);
  scene.fog = new THREE.FogExp2(0xc4e0f7, 0.0065);

  // Soft natural hemisphere lighting (blue sky bounce + green lawn bounce)
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x4d7c3b, 0.85);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm directional sunlight
  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.45);
  sunLight.position.set(25, 36, 20);
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

  // Soft sky blue ambient fill
  const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.35);
  fillLight.position.set(-25, 20, -18);
  scene.add(fillLight);
  disposables.push(fillLight);

  // 2. Wide Natural Grass Lawn (Ground)
  const grassTex = createGrassTexture(renderer);
  disposables.push(grassTex);

  const lawnGeo = new THREE.PlaneGeometry(140, 140);
  const lawnMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.92,
    metalness: 0.05,
  });
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.02;
  lawn.receiveShadow = true;
  scene.add(lawn);
  disposables.push(lawnGeo, lawnMat, lawn);

  // 3. Contemporary Outdoor Teak Timber Deck under the racks
  const deckTex = createTimberDeckTexture(renderer);
  disposables.push(deckTex);

  const deckCenterX = (minX + maxX) / 2;
  const deckWidth = (maxX - minX) + 12;
  const deckDepth = 8.5;
  const deckHeight = 0.08;

  const deckGeo = new THREE.BoxGeometry(deckWidth, deckHeight, deckDepth);
  const deckMat = new THREE.MeshStandardMaterial({
    map: deckTex,
    roughness: 0.75,
    metalness: 0.1,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(deckCenterX, deckHeight / 2 - 0.01, 0);
  deck.receiveShadow = true;
  deck.castShadow = true;
  scene.add(deck);
  disposables.push(deckGeo, deckMat, deck);

  // Dark stone/wood terrace border trim
  const trimGeo = new THREE.BoxGeometry(deckWidth + 0.45, deckHeight + 0.02, deckDepth + 0.45);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x473322,
    roughness: 0.85,
  });
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(deckCenterX, (deckHeight + 0.02) / 2 - 0.02, 0);
  trim.receiveShadow = true;
  scene.add(trim);
  disposables.push(trimGeo, trimMat, trim);

  // 4. Stepping Stones (Natural Flagstone Pathway)
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.88,
  });
  disposables.push(stoneMat);

  const pathPoints = [
    { x: deckCenterX - 4, z: 5.5, s: 1.4 },
    { x: deckCenterX - 2, z: 7.2, s: 1.6 },
    { x: deckCenterX + 1, z: 9.0, s: 1.5 },
    { x: deckCenterX + 3.5, z: 11.2, s: 1.7 },
    { x: deckCenterX + 5, z: 13.5, s: 1.6 },
    { x: deckCenterX - 10, z: 5.2, s: 1.3 },
    { x: deckCenterX + 12, z: 5.2, s: 1.4 },
  ];

  pathPoints.forEach(({ x, z, s }) => {
    const stoneGeo = new THREE.CylinderGeometry(s * 0.7, s * 0.85, 0.06, 7);
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(x, 0.02, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
    disposables.push(stoneGeo, stone);
  });

  // 5. Dense Bamboo Grove Backdrop (Behind the Racks)
  const bambooStalkMat = new THREE.MeshStandardMaterial({
    color: 0x759c3e,
    roughness: 0.6,
  });
  const bambooFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x2e6922,
    roughness: 0.85,
  });
  disposables.push(bambooStalkMat, bambooFoliageMat);

  const stalkGeo = new THREE.CylinderGeometry(0.08, 0.1, 8.5, 6);
  const foliageGeo = new THREE.ConeGeometry(1.1, 2.5, 6);
  disposables.push(stalkGeo, foliageGeo);

  const bambooStartX = minX - 10;
  const bambooEndX = maxX + 14;
  for (let bx = bambooStartX; bx <= bambooEndX; bx += 1.3) {
    const bz = -5.8 - Math.random() * 3.5;
    const heightScale = 0.85 + Math.random() * 0.35;

    // Stalk
    const stalk = new THREE.Mesh(stalkGeo, bambooStalkMat);
    stalk.position.set(bx + (Math.random() * 0.5 - 0.25), 4.2 * heightScale, bz);
    stalk.scale.set(1, heightScale, 1);
    stalk.castShadow = true;
    stalk.receiveShadow = true;
    scene.add(stalk);
    disposables.push(stalk);

    // Leaf cluster top
    const leaf = new THREE.Mesh(foliageGeo, bambooFoliageMat);
    leaf.position.set(stalk.position.x, 8.2 * heightScale, bz);
    leaf.rotation.y = Math.random() * Math.PI;
    leaf.castShadow = true;
    leaf.userData = {
      baseRotZ: 0,
      swayOffset: Math.random() * 6.28,
      swaySpeed: 1.1 + Math.random() * 0.4,
    };
    scene.add(leaf);
    swayingTops.push(leaf);
    disposables.push(leaf);
  }

  // 6. Sculptural Japanese Garden Pine Trees (Sides & Accents)
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2b1f,
    roughness: 0.95,
  });
  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x1b431e,
    roughness: 0.8,
  });
  disposables.push(trunkMat, pineFoliageMat);

  const createPineTree = (px, pz, scale = 1) => {
    const group = new THREE.Group();

    // Curved Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35 * scale, 0.6 * scale, 6.5 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = (6.5 * scale) / 2;
    trunk.rotation.z = 0.08;
    trunk.rotation.x = -0.05;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    disposables.push(trunkGeo);

    // Layered Cloud Foliage Pads
    const foliageOffsets = [
      { y: 3.5 * scale, r: 2.2 * scale, x: 0.6, z: 0.2 },
      { y: 5.0 * scale, r: 2.8 * scale, x: -0.5, z: 0.3 },
      { y: 6.5 * scale, r: 2.3 * scale, x: 0.4, z: -0.3 },
      { y: 7.8 * scale, r: 1.6 * scale, x: 0.1, z: 0.1 },
    ];

    foliageOffsets.forEach(({ y, r, x, z }) => {
      const padGeo = new THREE.CylinderGeometry(r * 0.9, r, 0.7 * scale, 8);
      const pad = new THREE.Mesh(padGeo, pineFoliageMat);
      pad.position.set(x, y, z);
      pad.castShadow = true;
      pad.receiveShadow = true;
      group.add(pad);
      disposables.push(padGeo);
    });

    group.position.set(px, 0, pz);
    scene.add(group);
    disposables.push(group);
  };

  // Left flank pine
  createPineTree(minX - 8, 3.5, 1.15);
  createPineTree(minX - 14, -2, 0.9);

  // Right flank pine
  createPineTree(maxX + 9, 2.5, 1.2);
  createPineTree(maxX + 15, -3, 1.0);

  // 7. Zen Boulders & River Rocks
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.9,
  });
  disposables.push(rockMat);

  const rockConfigs = [
    { x: minX - 3.5, z: 4.8, r: 1.2, h: 0.9 },
    { x: minX - 2.0, z: 5.4, r: 0.8, h: 0.6 },
    { x: maxX + 3.8, z: 4.5, r: 1.4, h: 1.0 },
    { x: maxX + 5.2, z: 5.2, r: 0.9, h: 0.7 },
    { x: deckCenterX - 8, z: 4.5, r: 0.8, h: 0.5 },
    { x: deckCenterX + 7, z: 4.6, r: 0.9, h: 0.6 },
  ];

  rockConfigs.forEach(({ x, z, r, h }) => {
    const rockGeo = new THREE.DodecahedronGeometry(r, 1);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, h / 2 - 0.1, z);
    rock.scale.set(1.1, h / r, 0.9);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    disposables.push(rockGeo, rock);
  });

  // 8. Japanese Stone Lantern (Tōrō) at the edge of the path
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.85,
  });
  disposables.push(lanternMat);

  const lanternGroup = new THREE.Group();
  
  // Base
  const lBaseGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.25, 6);
  const lBase = new THREE.Mesh(lBaseGeo, lanternMat);
  lBase.position.y = 0.12;
  lanternGroup.add(lBase);

  // Post
  const lPostGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.9, 6);
  const lPost = new THREE.Mesh(lPostGeo, lanternMat);
  lPost.position.y = 0.7;
  lanternGroup.add(lPost);

  // Firebox shelf
  const lShelfGeo = new THREE.CylinderGeometry(0.55, 0.35, 0.15, 6);
  const lShelf = new THREE.Mesh(lShelfGeo, lanternMat);
  lShelf.position.y = 1.22;
  lanternGroup.add(lShelf);

  // Light chamber
  const lChamberGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.35, 6);
  const lChamberMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 0.6,
  });
  const lChamber = new THREE.Mesh(lChamberGeo, lChamberMat);
  lChamber.position.y = 1.48;
  lanternGroup.add(lChamber);

  // Roof cap
  const lRoofGeo = new THREE.ConeGeometry(0.75, 0.35, 6);
  const lRoof = new THREE.Mesh(lRoofGeo, lanternMat);
  lRoof.position.y = 1.82;
  lanternGroup.add(lRoof);

  // Warm gentle glow
  const lanternLight = new THREE.PointLight(0xfef08a, 0.8, 6);
  lanternLight.position.set(0, 1.5, 0);
  lanternGroup.add(lanternLight);

  lanternGroup.position.set(deckCenterX - 5.5, 0, 5.0);
  lanternGroup.castShadow = true;
  scene.add(lanternGroup);
  disposables.push(lBaseGeo, lPostGeo, lShelfGeo, lChamberGeo, lChamberMat, lRoofGeo, lanternLight, lanternGroup);

  // 9. Flower Shrub Clumps (Azaleas)
  const bushFoliageMat = new THREE.MeshStandardMaterial({ color: 0x275323, roughness: 0.9 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 });
  disposables.push(bushFoliageMat, flowerMat);

  const shrubSpots = [
    { x: minX - 2.5, z: 6.2, r: 0.65 },
    { x: maxX + 3.0, z: 5.8, r: 0.75 },
    { x: deckCenterX + 6.5, z: 5.5, r: 0.6 },
  ];

  shrubSpots.forEach(({ x, z, r }) => {
    const bushGeo = new THREE.SphereGeometry(r, 7, 6);
    const bush = new THREE.Mesh(bushGeo, bushFoliageMat);
    bush.position.set(x, r * 0.75, z);
    bush.scale.set(1.2, 0.75, 1.1);
    bush.castShadow = true;
    bush.userData = {
      baseRotZ: 0,
      swayOffset: Math.random() * 6.28,
      swaySpeed: 1.0 + Math.random() * 0.3,
    };
    scene.add(bush);
    swayingShrubs.push(bush);
    disposables.push(bushGeo, bush);

    // Flower buds
    for (let f = 0; f < 5; f++) {
      const fGeo = new THREE.SphereGeometry(0.12, 4, 4);
      const fl = new THREE.Mesh(fGeo, flowerMat);
      fl.position.set(
        x + (Math.random() * r * 1.3 - r * 0.65),
        r * 0.85 + Math.random() * 0.25,
        z + (Math.random() * r * 1.3 - r * 0.65)
      );
      scene.add(fl);
      disposables.push(fGeo, fl);
    }
  });

  return {
    update(elapsed) {
      if (ecoModeRef && ecoModeRef.current) return;
      for (let i = 0; i < swayingTops.length; i++) {
        const top = swayingTops[i];
        const { swaySpeed, swayOffset } = top.userData;
        top.rotation.z = Math.sin(elapsed * swaySpeed + swayOffset) * 0.04;
      }
      for (let j = 0; j < swayingShrubs.length; j++) {
        const shrub = swayingShrubs[j];
        const { swaySpeed, swayOffset } = shrub.userData;
        shrub.rotation.z = Math.sin(elapsed * swaySpeed + swayOffset) * 0.02;
      }
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

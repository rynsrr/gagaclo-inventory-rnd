import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Builds the serene Spring Meadow 3D environment using real 3D models from Poly Haven & Three.js.
 * Inspired by Digital Garden by Alicia (Spring meadow).
 */
export function buildSpringMeadowEnvironment({ scene, minX = -18, maxX = 26, ecoModeRef }) {
  const disposables = [];
  const loadedGroups = [];

  // 1. Atmosphere: Pale Dreamy Spring Sky & Soft Fog
  scene.background = new THREE.Color(0xdcebf8);
  scene.fog = new THREE.Fog(0xdcebf8, 35, 120);

  // 2. Soft Natural Spring Lighting
  // Hemisphere sky bounce & meadow green bounce
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x5b8a3c, 0.95);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  disposables.push(hemiLight);

  // Warm diffused spring sunlight
  const sunLight = new THREE.DirectionalLight(0xfffaec, 1.35);
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

  // Soft sky ambient fill
  const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.4);
  fillLight.position.set(-22, 20, -18);
  scene.add(fillLight);
  disposables.push(fillLight);

  // 3. Rolling Spring Meadow Ground (Wide green terrain plane)
  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x669a42,
    roughness: 0.88,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat, ground);

  // 4. Clean Natural Limestone Terrace under the racks
  const padCenterX = (minX + maxX) / 2;
  const padWidth = (maxX - minX) + 6.5;
  const padDepth = 6.8;
  const padGeo = new THREE.BoxGeometry(padWidth, 0.04, padDepth);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    roughness: 0.85,
    metalness: 0.06,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(padCenterX, 0.02, 0);
  pad.receiveShadow = true;
  scene.add(pad);
  disposables.push(padGeo, padMat, pad);

  // 5. Asynchronous Loading of Real 3D Nature Assets from Internet
  const loader = new GLTFLoader();
  const flowerRoot = new THREE.Group();
  scene.add(flowerRoot);
  disposables.push(flowerRoot);

  const enableShadows = (obj) => {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });
  };

  // Helper to place asset clusters with natural jitter
  const placeInstances = (baseMesh, coords, scaleRange = [0.8, 1.2]) => {
    coords.forEach(({ x, z, s = 1.0, rotY = 0 }) => {
      const clone = baseMesh.clone();
      const scale = (scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0])) * s;
      clone.scale.set(scale, scale, scale);
      clone.position.set(x, 0, z);
      clone.rotation.y = rotY || Math.random() * Math.PI * 2;
      flowerRoot.add(clone);
      loadedGroups.push(clone);
    });
  };

  // A. Ferns (fern_02)
  loader.load(
    '/models/fern_02/fern_02.gltf',
    (gltf) => {
      const fern = gltf.scene;
      enableShadows(fern);
      const fernSpots = [
        { x: minX - 3.2, z: 4.8, s: 1.1 },
        { x: minX - 4.8, z: 2.2, s: 1.3 },
        { x: minX - 2.8, z: -3.8, s: 1.0 },
        { x: maxX + 3.4, z: 4.6, s: 1.2 },
        { x: maxX + 4.8, z: 1.8, s: 1.3 },
        { x: maxX + 3.0, z: -3.5, s: 1.1 },
        { x: padCenterX - 5.5, z: 4.9, s: 0.9 },
        { x: padCenterX + 6.2, z: 4.9, s: 0.95 },
      ];
      placeInstances(fern, fernSpots, [0.85, 1.15]);
    },
    undefined,
    (err) => console.warn('Could not load fern_02:', err)
  );

  // B. Blue / Violet Spring Wildflowers (flower_heliophila)
  loader.load(
    '/models/flower_heliophila/flower_heliophila.gltf',
    (gltf) => {
      const flower = gltf.scene;
      enableShadows(flower);
      const spots = [
        { x: minX - 2.0, z: 4.4, s: 1.2 },
        { x: minX - 3.8, z: 4.0, s: 1.0 },
        { x: padCenterX - 8.5, z: 4.5, s: 1.1 },
        { x: padCenterX - 3.0, z: 4.7, s: 1.15 },
        { x: padCenterX + 3.5, z: 4.6, s: 1.1 },
        { x: padCenterX + 9.0, z: 4.4, s: 1.2 },
        { x: maxX + 2.2, z: 4.2, s: 1.15 },
        { x: maxX + 3.8, z: 3.5, s: 1.0 },
      ];
      placeInstances(flower, spots, [0.9, 1.25]);
    },
    undefined,
    (err) => console.warn('Could not load flower_heliophila:', err)
  );

  // C. Yellow / White Spring Meadow Daisies (flower_gazania)
  loader.load(
    '/models/flower_gazania/flower_gazania.gltf',
    (gltf) => {
      const gazania = gltf.scene;
      enableShadows(gazania);
      const spots = [
        { x: minX - 1.5, z: 5.2, s: 1.0 },
        { x: padCenterX - 6.0, z: 5.3, s: 0.9 },
        { x: padCenterX, z: 5.4, s: 1.1 },
        { x: padCenterX + 7.0, z: 5.2, s: 1.0 },
        { x: maxX + 1.8, z: 5.0, s: 1.05 },
      ];
      placeInstances(gazania, spots, [0.85, 1.15]);
    },
    undefined,
    (err) => console.warn('Could not load flower_gazania:', err)
  );

  // D. Lush Spring Meadow Grass Clumps (grass_medium_01)
  loader.load(
    '/models/grass_medium_01/grass_medium_01.gltf',
    (gltf) => {
      const grass = gltf.scene;
      enableShadows(grass);
      const spots = [
        { x: minX - 3.0, z: 3.8, s: 1.2 },
        { x: minX - 1.2, z: 4.8, s: 1.0 },
        { x: padCenterX - 4.5, z: 5.1, s: 1.1 },
        { x: padCenterX + 1.8, z: 5.2, s: 1.15 },
        { x: maxX + 2.5, z: 4.5, s: 1.2 },
        { x: maxX + 4.2, z: 3.2, s: 1.25 },
      ];
      placeInstances(grass, spots, [0.9, 1.3]);
    },
    undefined,
    (err) => console.warn('Could not load grass_medium_01:', err)
  );

  // E. Delicate White Spring Bell Flowers (flower_bell.glb)
  loader.load(
    '/models/flower_bell.glb',
    (gltf) => {
      const bell = gltf.scene;
      enableShadows(bell);
      const spots = [
        { x: minX - 2.2, z: 4.6, s: 0.4 },
        { x: minX - 3.5, z: 3.2, s: 0.42 },
        { x: padCenterX - 2.0, z: 4.8, s: 0.38 },
        { x: padCenterX + 5.0, z: 4.8, s: 0.4 },
        { x: maxX + 2.0, z: 4.4, s: 0.42 },
        { x: maxX + 3.2, z: 2.8, s: 0.38 },
      ];
      placeInstances(bell, spots, [0.35, 0.45]);
    },
    undefined,
    (err) => console.warn('Could not load flower_bell.glb:', err)
  );

  return {
    dispose() {
      disposables.forEach((item) => {
        if (!item) return;
        if (item.parent) item.parent.remove(item);
        if (item.dispose && typeof item.dispose === 'function') {
          item.dispose();
        }
      });
      loadedGroups.forEach((group) => {
        if (group.parent) group.parent.remove(group);
        group.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      });
    },
  };
}

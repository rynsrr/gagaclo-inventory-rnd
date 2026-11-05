import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { useInventory } from '../context/InventoryContext';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  Layers, 
  User, 
  Box as BoxIcon, 
  Sparkles, 
  Info,
  Search,
  ChevronRight,
  X,
  Pencil,
  Package,
  Zap,
} from 'lucide-react';

// Indigo, purple, emerald, amber, rose — the original five PPIC colors,
// followed by extra shades for PICs added at runtime.
const PPIC_COLOR_PALETTE = [
  0x4f46e5, 0x9333ea, 0x059669, 0xd97706, 0xe11d48,
  0x0891b2, 0x65a30d, 0xdb2777, 0x7c3aed, 0xea580c,
];

function matchesPic(picName, selectedPic) {
  return String(picName ?? '').trim().toLowerCase() === selectedPic.trim().toLowerCase();
}

export const Warehouse3DView = ({ 
  controlsHost, 
  highlightBoxNumbers = null, 
  searchQuery = '',
  onSearchQueryChange,
  searchResults = null,
  onClearSearch 
}) => {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const { 
    racks, 
    boxes, 
    items, 
    ppicMembers, 
    getItemsInBox, 
    setSelectedBoxNumber,
    setItemModalConfig
  } = useInventory();

  // Ctrl/Cmd + K shortcut for quick search focus
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        onClearSearch?.();
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClearSearch]);

  // Filter / view state
  const [highlightPpic, setHighlightPpic] = useState('ALL');
  const [hoveredBox, setHoveredBox] = useState(null);
  const [activeRackView, setActiveRackView] = useState('ALL');
  const activeRackRef = useRef('ALL');
  const fitCameraRef = useRef(null);
  const [webGlError, setWebGlError] = useState(false);

  // Mode Ringan / Cepat untuk menghemat daya dan mempercepat performa di laptop/PC kantor
  const [ecoMode, setEcoMode] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_3d_ecomode');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const ecoModeRef = useRef(ecoMode);
  const rendererRef = useRef(null);

  useEffect(() => {
    ecoModeRef.current = ecoMode;
    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(ecoMode ? 1.0 : Math.min(window.devicePixelRatio, 1.25));
      rendererRef.current.shadowMap.enabled = !ecoMode;
    }
  }, [ecoMode]);

  const toggleEcoMode = () => {
    const nextVal = !ecoMode;
    setEcoMode(nextVal);
    try {
      localStorage.setItem('gagaclo_3d_ecomode', String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  // A Set of box numbers matching the sidebar search (null = no active search).
  const searchActive = highlightBoxNumbers !== null;

  const occupancyGroups = [
    { label: 'Tanpa data', color: 'bg-slate-100 text-slate-800', boxes: [] },
    { label: 'Sedang diisi', color: 'bg-amber-100 text-amber-900', boxes: [] },
    { label: 'Penuh', color: 'bg-emerald-100 text-emerald-900', boxes: [] },
  ];
  for (const box of boxes) {
    if (activeRackView !== 'ALL' && Number(box.rackId) !== Number(activeRackView)) continue;
    if (highlightPpic !== 'ALL' && !matchesPic(box.picName, highlightPpic)) continue;
    if (searchActive && !highlightBoxNumbers.has(Number(box.boxNumber))) continue;
    const hasData = getItemsInBox(box.boxNumber).length > 0;
    const group = box.isFull ? 2 : hasData ? 1 : 0;
    occupancyGroups[group].boxes.push(box);
  }

  // References for Three.js scene objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const boxMeshesRef = useRef([]);
  const animationFrameIdRef = useRef(null);

  // PPIC color palette for 3D boxes body. Built from the live PPIC list so
  // people added at runtime get their own color instead of all being blue.
  const ppicColorMap = Object.fromEntries(
    ppicMembers.map((pic, index) => [
      pic.name,
      PPIC_COLOR_PALETTE[index % PPIC_COLOR_PALETTE.length],
    ])
  );

  /**
   * Generates high-res canvas texture matching the exact user Box Label:
   * Header: SAMPLE BOX / MATERIAL BOX
   * Center: Giant Box Number
   * Divider Line
   * Lavender bar (#c8d0ff) with PIC Name
   * Rack & Location Subtitle
   * Footer: INVENTORY MANAGEMENT RND
   */
  const createBoxFaceTexture = (boxNumber, picName, category, rackName, rackDescription) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384; // 4:3 aspect ratio
    const ctx = canvas.getContext('2d');

    // 1. Background White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 384);

    // 2. Thick Outer Black Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 370);

    // 3. Header: SAMPLE BOX or MATERIAL BOX
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const headerTitle = category === 'SAMPLE' ? 'SAMPLE BOX' : 'MATERIAL BOX';
    ctx.fillText(headerTitle, 256, 52);

    // 4. Giant Box Number
    ctx.fillStyle = '#000000';
    ctx.font = '900 150px system-ui, sans-serif';
    ctx.fillText(String(boxNumber), 256, 205);

    // 5. Black Divider Line
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(14, 230);
    ctx.lineTo(498, 230);
    ctx.stroke();

    // 6. Lavender Bar for PIC Name (matching user image #c8d0ff)
    ctx.fillStyle = '#c8d0ff';
    ctx.fillRect(14, 234, 484, 60);

    // PIC Name text
    ctx.fillStyle = '#000000';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.fillText(picName, 256, 278);

    // 7. Rack & Location Subtitle
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px system-ui, sans-serif';
    const locationText = `${rackName}  |  ${rackDescription || ''}`;
    ctx.fillText(locationText, 256, 326);

    // 8. Footer: INVENTORY MANAGEMENT RND
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('INVENTORY MANAGEMENT RND', 256, 356);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    // Scene - Tropical Island Ocean Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbbe8f8);
    scene.fog = new THREE.FogExp2(0xbbe8f8, 0.0055);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 200);
    cameraRef.current = camera;

    // Renderer with safe WebGL check
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL not supported:', e);
      setWebGlError(true);
      return;
    }
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(ecoModeRef.current ? 1.0 : Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = !ecoModeRef.current;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Keep camera above water level
    controls.minDistance = 6;
    controls.maxDistance = 85;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // Lighting - Warm Tropical Sunlight & Ocean Reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8eb, 1.45);
    dirLight.position.set(24, 35, 22);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    const d = 45;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const blueBackLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    blueBackLight.position.set(-25, 20, -20);
    scene.add(blueBackLight);

    // Build the 3D Physical Racks from current rack data.
    // Racks 1-5 keep their original warehouse layout; any newly added rack
    // is placed further to the right with a standard 4x3 shelf layout.
    const presetPositions = {
      1: { x: -16, cols: 4, rows: 4, beamColor: 0x1d4ed8 },
      2: { x: -6,  cols: 4, rows: 5, beamColor: 0xe2e8f0 },
      3: { x: 6,   cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      4: { x: 15,  cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      5: { x: 24,  cols: 4, rows: 3, beamColor: 0xe2e8f0 },
    };
    let nextExtraX = 33;
    const rackPositions = racks
      .filter((r) => Number(r.id) !== 0)
      .map((r) => {
        const preset = presetPositions[r.id];
        if (preset) {
          return { rackId: r.id, z: 0, ...preset };
        }
        const conf = { rackId: r.id, x: nextExtraX, z: 0, cols: 4, rows: 3, beamColor: 0xcbd5e1 };
        nextExtraX += 9;
        return conf;
      });

    // Grow a rack vertically when boxes are added beyond its original
    // capacity, so newly created boxes always sit on a real shelf.
    rackPositions.forEach((conf) => {
      const count = boxes.filter(b => Number(b.rackId) === Number(conf.rackId)).length;
      conf.rows = Math.max(conf.rows, Math.ceil(count / conf.cols));
    });

    // --- PULAU TROPIS DI TENGAH LAUT (TROPICAL ISLAND OCEAN ENVIRONMENT) ---
    const maxRackX = Math.max(28, nextExtraX - 4);
    const islandCenterX = (-18 + maxRackX) / 2; // Centers the island dynamically
    const islandCenterZ = 3.5;
    const islandRx = Math.max(38, (maxRackX - islandCenterX) + 12);
    const islandRz = 24;

    // Helper: Buat kurva pulau organik dengan lengkungan alami pantai tropis
    const createOrganicIslandShape = (radiusX, radiusZ) => {
      const shape = new THREE.Shape();
      const segments = 72;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const wobble = 1 + 
          0.06 * Math.sin(theta * 3 + 0.5) + 
          0.035 * Math.cos(theta * 5 + 1.2) + 
          0.02 * Math.sin(theta * 7);
        const px = Math.cos(theta) * radiusX * wobble;
        const pz = Math.sin(theta) * radiusZ * wobble;
        if (i === 0) shape.moveTo(px, pz);
        else shape.lineTo(px, pz);
      }
      return shape;
    };

    // 1. Laut Tropis Biru Berombak (Vast Tropical Ocean)
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = waterCanvas.height = 512;
    const wCtx = waterCanvas.getContext('2d');
    const wGrad = wCtx.createLinearGradient(0, 0, 512, 512);
    wGrad.addColorStop(0, '#0284c7');
    wGrad.addColorStop(0.35, '#0ea5e9');
    wGrad.addColorStop(0.7, '#06b6d4');
    wGrad.addColorStop(1, '#38bdf8');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 512, 512);

    // Caustics & ripples on water
    wCtx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    wCtx.lineWidth = 2.5;
    for (let i = 0; i < 50; i++) {
      wCtx.beginPath();
      const wx = Math.random() * 512;
      const wy = Math.random() * 512;
      wCtx.arc(wx, wy, 15 + Math.random() * 40, 0, Math.PI * (1.1 + Math.random() * 0.7));
      wCtx.stroke();
    }
    wCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    wCtx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      wCtx.beginPath();
      const wx = Math.random() * 512;
      const wy = Math.random() * 512;
      wCtx.arc(wx, wy, 8 + Math.random() * 20, 0, Math.PI * 1.5);
      wCtx.stroke();
    }

    const waterTexture = new THREE.CanvasTexture(waterCanvas);
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(16, 16);

    const waterGeo = new THREE.PlaneGeometry(380, 380, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTexture,
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.93,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(islandCenterX, -0.30, islandCenterZ);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // 2. Bibir Pantai Pasir Emas (Golden Sand Beach Coastline)
    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = sandCanvas.height = 256;
    const sCtx = sandCanvas.getContext('2d');
    sCtx.fillStyle = '#fde68a';
    sCtx.fillRect(0, 0, 256, 256);
    const sandColors = ['#fef08a', '#fde047', '#f59e0b', '#fef9c3', '#eab308'];
    for (const col of sandColors) {
      sCtx.fillStyle = col;
      for (let i = 0; i < 400; i++) {
        sCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    }
    const sandTexture = new THREE.CanvasTexture(sandCanvas);
    sandTexture.colorSpace = THREE.SRGBColorSpace;
    sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(14, 14);

    const sandShape = createOrganicIslandShape(islandRx, islandRz);
    const sandGeo = new THREE.ExtrudeGeometry(sandShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.45,
      bevelThickness: 0.15,
    });
    const sandMat = new THREE.MeshStandardMaterial({
      map: sandTexture,
      roughness: 0.95,
      metalness: 0.05,
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(islandCenterX, -0.32, islandCenterZ);
    sandMesh.receiveShadow = true;
    scene.add(sandMesh);

    // 3. Buih Ombak di Tepi Pantai (Shoreline Foam Ripple)
    const foamGeo = new THREE.RingGeometry(0.97, 1.03, 64);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const foamMesh = new THREE.Mesh(foamGeo, foamMat);
    foamMesh.rotation.x = -Math.PI / 2;
    foamMesh.scale.set(islandRx, islandRz, 1);
    foamMesh.position.set(islandCenterX, -0.27, islandCenterZ);
    scene.add(foamMesh);

    // 4. Dataran Rumput Hijau Segar Pulau (Lush Green Grass Plateau)
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = grassCanvas.height = 256;
    const grassContext = grassCanvas.getContext('2d');
    grassContext.fillStyle = '#417234';
    grassContext.fillRect(0, 0, 256, 256);

    const grassColors = ['#345929', '#4d833d', '#5fa24b', '#73bc5b'];
    for (const color of grassColors) {
      grassContext.strokeStyle = color;
      grassContext.beginPath();
      for (let blade = 0; blade < 700; blade++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        grassContext.moveTo(x, y);
        grassContext.lineTo(x + Math.random() * 4 - 2, y - 2 - Math.random() * 6);
      }
      grassContext.stroke();
    }

    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(18, 18);
    grassTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const grassShape = createOrganicIslandShape(islandRx - 4.2, islandRz - 3.8);
    const grassGeo = new THREE.ShapeGeometry(grassShape);
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 0.9,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(islandCenterX, 0.01, islandCenterZ);
    grassMesh.receiveShadow = true;
    scene.add(grassMesh);

    // --- BUNGA ESTETIK & DEKORASI ALAMI PULAU ---
    const islandDecorGroup = new THREE.Group();
    scene.add(islandDecorGroup);

    // Shared Geometries for Flowers (Pivot di dasar tangkai agar berayun alami)
    const flowerStemGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.55, 5);
    flowerStemGeo.translate(0, 0.275, 0);

    const flowerPetalGeo = new THREE.SphereGeometry(0.09, 6, 5);
    flowerPetalGeo.scale(1.3, 0.35, 0.7);

    const flowerCenterGeo = new THREE.SphereGeometry(0.075, 7, 6);
    const flowerLeafGeo = new THREE.ConeGeometry(0.06, 0.22, 4);
    flowerLeafGeo.rotateZ(Math.PI / 3);

    // Shared Materials for Flowers
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
    });

    const petalMaterials = {
      sakura: new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 }),
      daisy: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
      lavender: new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.35 }),
      buttercup: new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35 }),
      coral: new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.35 }),
      cyan: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 }),
    };

    const flowerPaletteKeys = ['sakura', 'daisy', 'lavender', 'buttercup', 'coral', 'cyan'];
    const swayingFlowers = [];

    const createFlower = (x, z, type = null, scale = 1.0) => {
      const chosenType = type || flowerPaletteKeys[Math.floor(Math.random() * flowerPaletteKeys.length)];
      const flowerGroup = new THREE.Group();

      // Tangkai
      const stem = new THREE.Mesh(flowerStemGeo, stemMat);
      flowerGroup.add(stem);

      // Daun tangkai
      const leaf1 = new THREE.Mesh(flowerLeafGeo, leafMat);
      leaf1.position.set(0.03, 0.18, 0);
      leaf1.rotation.y = Math.random() * Math.PI * 2;
      flowerGroup.add(leaf1);

      if (Math.random() > 0.45) {
        const leaf2 = new THREE.Mesh(flowerLeafGeo, leafMat);
        leaf2.position.set(-0.03, 0.32, 0);
        leaf2.rotation.y = leaf1.rotation.y + Math.PI + (Math.random() - 0.5);
        flowerGroup.add(leaf2);
      }

      // Kepala Bunga (Kelopak & Sari Kuning)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.55, 0);
      headGroup.rotation.x = 0.2 + (Math.random() - 0.5) * 0.3;
      headGroup.rotation.z = (Math.random() - 0.5) * 0.3;

      const numPetals = 5;
      const pMat = petalMaterials[chosenType] || petalMaterials.daisy;
      for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        const petal = new THREE.Mesh(flowerPetalGeo, pMat);
        petal.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
        petal.rotation.y = -angle;
        headGroup.add(petal);
      }

      const center = new THREE.Mesh(flowerCenterGeo, centerMat);
      center.position.set(0, 0.02, 0);
      headGroup.add(center);

      flowerGroup.add(headGroup);

      const s = scale * (0.85 + Math.random() * 0.35);
      flowerGroup.scale.set(s, s, s);
      flowerGroup.position.set(x, 0.01, z);

      flowerGroup.userData = {
        baseRotX: (Math.random() - 0.5) * 0.08,
        baseRotZ: (Math.random() - 0.5) * 0.08,
        swaySpeed: 1.6 + Math.random() * 0.9,
        swayOffset: Math.random() * Math.PI * 2,
      };

      return flowerGroup;
    };

    const plantFlowerCluster = (centerX, centerZ, radius, count, dominantType) => {
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(Math.random()) * radius;
        const theta = Math.random() * Math.PI * 2;
        const fx = centerX + Math.cos(theta) * r;
        const fz = centerZ + Math.sin(theta) * r;
        const type = Math.random() < 0.65 ? dominantType : null;
        const flower = createFlower(fx, fz, type);
        islandDecorGroup.add(flower);
        swayingFlowers.push(flower);
      }
    };

    // Tanam kelompok bunga estetik di area padang rumput dan tepi pulau
    plantFlowerCluster(-12, -7, 5.5, 8, 'sakura');     // Kebun sakura di belakang Rak 1-2
    plantFlowerCluster(6, -8, 6.0, 9, 'daisy');        // Padang daisy di belakang Rak 3
    plantFlowerCluster(22, -7, 5.5, 8, 'lavender');    // Padang lavender di belakang Rak 4-5
    plantFlowerCluster(-23, 2, 4.5, 6, 'coral');       // Taman coral di pesisir barat
    plantFlowerCluster(29, 3, 4.5, 6, 'buttercup');    // Bunga kuning cerah di pesisir timur
    plantFlowerCluster(-5, 15, 5.0, 6, 'sakura');      // Bunga di pesisir depan (dekat box lantai)
    plantFlowerCluster(15, 15, 5.5, 7, 'lavender');    // Bunga pesisir tenggara

    // Bunga liar tersebar di sepanjang jalur pantai
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rRatio = 0.82 + Math.random() * 0.1;
      const px = islandCenterX + Math.cos(angle) * (islandRx - 4.5) * rRatio;
      const pz = islandCenterZ + Math.sin(angle) * (islandRz - 4.0) * rRatio;
      const wildFlower = createFlower(px, pz, null, 0.9);
      islandDecorGroup.add(wildFlower);
      swayingFlowers.push(wildFlower);
    }

    // Batu Sungai & Kerikil Pantai Halus (Smooth River Pebbles)
    const pebbleGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const pebbleSpots = [
      [-13, -8], [-12.2, -8.3], [-13.6, -7.5],
      [7, -9], [7.8, -9.2], [6.4, -8.7],
      [-21, 6], [-21.7, 6.5],
      [28, 7], [28.6, 7.4],
      [-1, 15.5], [0.2, 15.8], [-1.8, 15.2],
      [14, 15.5], [14.8, 15.2]
    ];
    pebbleSpots.forEach(([px, pz]) => {
      const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
      const sx = 0.7 + Math.random() * 0.6;
      const sz = 0.7 + Math.random() * 0.6;
      const sy = 0.35 + Math.random() * 0.25;
      pebble.scale.set(sx, sy, sz);
      pebble.position.set(px, 0.05, pz);
      pebble.rotation.y = Math.random() * Math.PI;
      pebble.receiveShadow = true;
      islandDecorGroup.add(pebble);
    });

    // Pohon Kelapa Tropis di Sudut-sudut Pulau (Tropical Palm Trees)
    const swayingPalms = [];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45, side: THREE.DoubleSide });
    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

    const createPalmTree = (px, pz, scale = 1.0) => {
      const palmGroup = new THREE.Group();
      palmGroup.position.set(px, 0.01, pz);

      let currentY = 0;
      let currentX = 0;
      let currentZ = 0;
      const numSegs = 5;
      for (let i = 0; i < numSegs; i++) {
        const segHeight = 0.9;
        const rTop = 0.26 - (i * 0.025);
        const rBottom = 0.30 - (i * 0.025);
        const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight, 7);
        const seg = new THREE.Mesh(segGeo, trunkMat);
        seg.position.set(currentX, currentY + segHeight / 2, currentZ);
        seg.rotation.z = -0.07 * (i + 1);
        seg.rotation.x = 0.035 * (i + 1);
        seg.receiveShadow = true;
        palmGroup.add(seg);

        currentY += segHeight * 0.95;
        currentX -= 0.06;
        currentZ += 0.03;
      }

      const crownGroup = new THREE.Group();
      crownGroup.position.set(currentX, currentY, currentZ);
      crownGroup.userData = { offset: Math.random() * Math.PI };

      const numFronds = 6;
      for (let f = 0; f < numFronds; f++) {
        const angle = (f / numFronds) * Math.PI * 2;
        const frondLeafGeo = new THREE.BoxGeometry(0.35, 0.04, 2.4);
        frondLeafGeo.translate(0, 0, 1.2);
        const frond = new THREE.Mesh(frondLeafGeo, frondMat);
        frond.rotation.y = angle;
        frond.rotation.x = -0.45;
        crownGroup.add(frond);
      }

      for (let c = 0; c < 3; c++) {
        const cGeo = new THREE.SphereGeometry(0.16, 6, 6);
        const coconut = new THREE.Mesh(cGeo, coconutMat);
        const cAng = c * (Math.PI * 2 / 3);
        coconut.position.set(Math.cos(cAng) * 0.2, -0.15, Math.sin(cAng) * 0.2);
        crownGroup.add(coconut);
      }

      palmGroup.add(crownGroup);
      swayingPalms.push(crownGroup);

      palmGroup.scale.set(scale, scale, scale);
      return palmGroup;
    };

    // Tiga pohon kelapa tropis di sudut terluar pulau
    islandDecorGroup.add(createPalmTree(-24, -11, 1.1));
    islandDecorGroup.add(createPalmTree(31, 15, 1.05));
    islandDecorGroup.add(createPalmTree(32, -10, 0.95));

    const boxMeshes = [];

    rackPositions.forEach((rackConf) => {
      const rackData = racks.find((r) => Number(r.id) === Number(rackConf.rackId));
      if (!rackData) return;

      const { x: rx, z: rz, cols, rows, beamColor } = rackConf;
      const rackWidth = cols * 1.8 + 0.4;
      const shelfHeight = 1.9;
      const rackDepth = 1.6;
      const totalRackHeight = rows * shelfHeight + 0.5;
      const hasTopCover = rackConf.rackId !== 1 && rackConf.rackId !== 2;
      const firstShelfY = 0.2;
      const pillarHeight = hasTopCover
        ? totalRackHeight
        : firstShelfY + (rows - 1) * shelfHeight + 0.08;

      // 1. Upright Steel Pillars (4 vertical posts)
      const pillarGeo = new THREE.BoxGeometry(0.15, pillarHeight, 0.15);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: beamColor,
        metalness: 0.6,
        roughness: 0.3,
      });

      const halfW = rackWidth / 2;
      const halfD = rackDepth / 2;

      const postPositions = [
        [-halfW, halfD],
        [halfW, halfD],
        [-halfW, -halfD],
        [halfW, -halfD],
      ];

      postPositions.forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(rx + px, pillarHeight / 2, rz + pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
      });

      // 2. Horizontal Beam Shelves
      const shelfCount = hasTopCover ? rows + 1 : rows;
      for (let r = 0; r < shelfCount; r++) {
        const sy = firstShelfY + r * shelfHeight;
        
        // Front beam
        const beamGeo = new THREE.BoxGeometry(rackWidth, 0.12, 0.12);
        const frontBeam = new THREE.Mesh(beamGeo, pillarMat);
        frontBeam.position.set(rx, sy, rz + halfD);
        frontBeam.castShadow = true;
        scene.add(frontBeam);

        // Back beam
        const backBeam = new THREE.Mesh(beamGeo, pillarMat);
        backBeam.position.set(rx, sy, rz - halfD);
        backBeam.castShadow = true;
        scene.add(backBeam);

        // Wooden/wire deck plank
        const deckGeo = new THREE.BoxGeometry(rackWidth - 0.1, 0.06, rackDepth - 0.2);
        const deckMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.2,
          roughness: 0.7,
        });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(rx, sy + 0.05, rz);
        deck.receiveShadow = true;
        scene.add(deck);
      }

      // 3. Rack Top Sign Plate
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const lctx = labelCanvas.getContext('2d');
      lctx.fillStyle = rackData.category === 'SAMPLE' ? '#f59e0b' : '#10b981';
      lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#000000';
      lctx.font = 'bold 30px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(rackData.name, 128, 44);

      const labelTex = new THREE.CanvasTexture(labelCanvas);
      const signGeo = new THREE.PlaneGeometry(2.4, 0.6);
      const signMat = new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(rx, totalRackHeight + 0.45, rz + halfD + 0.05);
      scene.add(sign);

      // 4. Place 3D Boxes with the Official GAGACLO Label on Front Face
      const rackBoxes = boxes.filter((b) => Number(b.rackId) === Number(rackConf.rackId));

      rackBoxes.forEach((boxObj, index) => {
        const colIdx = index % cols;
        const rowIdx = Math.floor(index / cols);

        // Position coordinates
        const bx = rx - halfW + 0.9 + colIdx * 1.8;
        const by = 0.2 + rowIdx * shelfHeight + 0.48;
        const bz = rz;

        // Box geometry: 1.35m wide, 0.75m high, 1.1m deep
        const boxGeo = new THREE.BoxGeometry(1.35, 0.75, 1.1);

        // Exact front label texture matching user uploaded image
        const frontTexture = createBoxFaceTexture(
          boxObj.boxNumber, 
          boxObj.picName, 
          boxObj.category,
          boxObj.rackName,
          boxObj.rackDescription
        );
        const baseColor = ppicColorMap[boxObj.picName] || 0x3b82f6;

        const sideMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.6,
          metalness: 0.05,
        });

        const frontMat = new THREE.MeshStandardMaterial({
          map: frontTexture,
          roughness: 0.3,
          metalness: 0.05,
        });

        // Materials: [right, left, top, bottom, front, back]
        const materials = [
          sideMat,
          sideMat,
          sideMat,
          sideMat,
          frontMat, // Front face has the official label
          sideMat,
        ];

        const boxMesh = new THREE.Mesh(boxGeo, materials);
        boxMesh.position.set(bx, by, bz);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;

        // Metadata
        boxMesh.userData = {
          boxNumber: boxObj.boxNumber,
          code: boxObj.code,
          rackId: boxObj.rackId,
          rackName: boxObj.rackName,
          category: boxObj.category,
          picName: boxObj.picName,
          baseColor: baseColor,
          initialY: by,
        };

        scene.add(boxMesh);
        boxMeshes.push(boxMesh);
      });
    });

    // 5. Floor boxes (rackId 0 / "LANTAI") — boxes without a rack sit on the ground
    // in front of the racks so they stay visible and clickable.
    const floorBoxes = boxes.filter((b) => Number(b.rackId) === 0);
    const floorCols = 6;
    floorBoxes.forEach((boxObj, index) => {
      const colIdx = index % floorCols;
      const rowIdx = Math.floor(index / floorCols);
      const fx = -12 + colIdx * 2.0;
      const fy = 0.4; // sits on the floor
      const fz = 5 + rowIdx * 2.0;

      const boxGeo = new THREE.BoxGeometry(1.35, 0.75, 1.1);
      const frontTexture = createBoxFaceTexture(
        boxObj.boxNumber,
        boxObj.picName,
        boxObj.category,
        boxObj.rackName,
        boxObj.rackDescription
      );
      const baseColor = ppicColorMap[boxObj.picName] || 0x3b82f6;
      const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.05 });
      const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.3, metalness: 0.05 });

      const boxMesh = new THREE.Mesh(boxGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);
      boxMesh.position.set(fx, fy, fz);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      boxMesh.userData = {
        boxNumber: boxObj.boxNumber,
        code: boxObj.code,
        rackId: boxObj.rackId,
        rackName: boxObj.rackName,
        category: boxObj.category,
        picName: boxObj.picName,
        baseColor: baseColor,
        initialY: fy,
      };
      scene.add(boxMesh);
      boxMeshes.push(boxMesh);
    });

    boxMeshesRef.current = boxMeshes;

    // Raycasting for Mouse Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentHoveredMesh = null;

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(boxMeshesRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (currentHoveredMesh !== hit) {
          if (currentHoveredMesh) {
            currentHoveredMesh.position.y = currentHoveredMesh.userData.initialY;
          }
          currentHoveredMesh = hit;
          currentHoveredMesh.position.y = currentHoveredMesh.userData.initialY + 0.12;

          const boxData = boxes.find(b => b.boxNumber === hit.userData.boxNumber);
          setHoveredBox(boxData);
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        if (currentHoveredMesh) {
          currentHoveredMesh.position.y = currentHoveredMesh.userData.initialY;
          currentHoveredMesh = null;
          setHoveredBox(null);
          renderer.domElement.style.cursor = 'default';
        }
      }
    };

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(boxMeshesRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        setSelectedBoxNumber(hit.userData.boxNumber);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // Animation Loop
    const clock = new THREE.Clock();
    let lastRenderTime = 0;
    const animate = (timestamp) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Skip render if tab is in background
      if (document.hidden) return;

      // Skip render while any modal/dialog is open (ensures 100% lag-free typing & form interaction)
      if (document.querySelector('[role="dialog"]') || document.querySelector('.inventory-dialog-heading')) {
        return;
      }

      // Throttle render rate: ~35 FPS in ecoMode, 60 FPS in normal mode
      const targetDelta = ecoModeRef.current ? 28 : 16;
      if (timestamp && timestamp - lastRenderTime < targetDelta) {
        return;
      }
      lastRenderTime = timestamp || 0;

      const elapsed = clock.getElapsedTime();

      // Animasi aliran ombak air laut & ketinggian air
      if (waterTexture) {
        waterTexture.offset.x = (elapsed * 0.012) % 1;
        waterTexture.offset.y = (elapsed * 0.008) % 1;
      }
      if (waterMesh) {
        waterMesh.position.y = -0.30 + Math.sin(elapsed * 1.5) * 0.022;
      }
      if (foamMesh && foamMat) {
        const pulse = 1 + 0.015 * Math.sin(elapsed * 2.2);
        foamMesh.scale.set(islandRx * pulse, islandRz * pulse, 1);
        foamMat.opacity = 0.42 + Math.sin(elapsed * 2.2) * 0.16;
      }

      // Animasi bunga estetik (dilewati saat Mode Ringan aktif untuk performa maksimal)
      if (!ecoModeRef.current) {
        for (let i = 0; i < swayingFlowers.length; i++) {
          const flower = swayingFlowers[i];
          const { baseRotX, baseRotZ, swaySpeed, swayOffset } = flower.userData;
          flower.rotation.z = baseRotZ + Math.sin(elapsed * swaySpeed + swayOffset) * 0.07;
          flower.rotation.x = baseRotX + Math.cos(elapsed * (swaySpeed * 0.85) + swayOffset) * 0.045;
        }

        for (let i = 0; i < swayingPalms.length; i++) {
          const crown = swayingPalms[i];
          crown.rotation.z = Math.sin(elapsed * 1.1 + crown.userData.offset) * 0.035;
          crown.rotation.x = Math.cos(elapsed * 0.9 + crown.userData.offset) * 0.025;
        }
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const fitFrontView = () => {
      const bounds = new THREE.Box3();
      for (const mesh of boxMeshes) {
        if (activeRackRef.current === 'ALL' || Number(mesh.userData.rackId) === Number(activeRackRef.current)) {
          bounds.expandByObject(mesh);
        }
      }
      if (bounds.isEmpty()) return;

      // Include room for the frame and rack sign above the boxes.
      bounds.min.x -= 1;
      bounds.max.x += 1;
      bounds.min.y -= 1;
      bounds.max.y += 2;
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const verticalSlope = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = 1.12 * Math.max(
        size.y / (2 * verticalSlope),
        size.x / (2 * verticalSlope * camera.aspect),
      ) + size.z / 2;

      controls.maxDistance = Math.max(75, distance * 1.5);
      camera.far = Math.max(200, distance * 3);
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      camera.position.set(center.x, center.y, center.z + distance);
      controls.update();
    };
    fitCameraRef.current = fitFrontView;

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (!newWidth || !newHeight) return;
      camera.aspect = newWidth / newHeight;
      renderer.setSize(newWidth, newHeight, false);
      fitFrontView();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // Cleanup
    return () => {
      rendererRef.current = null;
      resizeObserver.disconnect();
      fitCameraRef.current = null;
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Textures
      grassTexture.dispose();
      sandTexture.dispose();
      waterTexture.dispose();

      // Materials & Geometries
      waterGeo.dispose();
      waterMat.dispose();
      sandGeo.dispose();
      sandMat.dispose();
      grassGeo.dispose();
      grassMat.dispose();
      foamGeo.dispose();
      foamMat.dispose();

      flowerStemGeo.dispose();
      flowerPetalGeo.dispose();
      flowerCenterGeo.dispose();
      flowerLeafGeo.dispose();
      stemMat.dispose();
      leafMat.dispose();
      centerMat.dispose();
      Object.values(petalMaterials).forEach((m) => m.dispose());

      pebbleGeo.dispose();
      pebbleMat.dispose();

      trunkMat.dispose();
      frondMat.dispose();
      coconutMat.dispose();

      islandDecorGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [boxes, racks, ppicMembers]);

  // Reapply PIC/search selection whenever filters change or cloud sync rebuilds
  // the scene. A box stays solid only when it satisfies every active filter.
  useEffect(() => {
    const picFilterActive = highlightPpic !== 'ALL';

    for (const mesh of boxMeshesRef.current) {
      const picMatches = !picFilterActive || matchesPic(mesh.userData.picName, highlightPpic);
      const searchMatches = !searchActive || highlightBoxNumbers.has(Number(mesh.userData.boxNumber));
      const dimmed = !picMatches || !searchMatches;
      const highlighted = !dimmed && (picFilterActive || searchActive);
      mesh.castShadow = !dimmed;

      for (const material of new Set(mesh.material)) {
        material.transparent = dimmed;
        material.depthWrite = !dimmed;
        material.opacity = dimmed ? 0.12 : 1;
        material.color.setHex(highlighted && !material.map ? mesh.userData.baseColor : 0xffffff);
        material.needsUpdate = true;
      }
    }
  }, [highlightPpic, highlightBoxNumbers, searchActive, boxes, racks, ppicMembers]);

  // Camera presets
  const focusOnRack = (rackId) => {
    activeRackRef.current = rackId;
    setActiveRackView(rackId);
    fitCameraRef.current?.();
  };

  if (webGlError) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
        <BoxIcon className="w-12 h-12 text-blue-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Akselerasi 3D (WebGL) Tidak Aktif</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Browser atau perangkat Anda tidak mengaktifkan WebGL. Anda tetap dapat menggunakan fitur <strong>Input Kartu & Cetak</strong> dan <strong>Denah Rak 2D</strong> secara normal.
        </p>
      </div>
    );
  }

  return (
    <div className="warehouse-layout space-y-4">
      
      {controlsHost && createPortal(
        <div className="inventory-header-filters">
          <div role="group" aria-label="Filter PIC PPIC" className="flex items-center gap-2">
            <div className="inventory-filter-group">
              <button onClick={() => setHighlightPpic('ALL')} aria-pressed={highlightPpic === 'ALL'}>
                Semua
              </button>
              {ppicMembers.map((pic) => (
                <button
                  key={pic.id}
                  onClick={() => setHighlightPpic(highlightPpic === pic.name ? 'ALL' : pic.name)}
                  aria-pressed={highlightPpic === pic.name}
                >
                  <span className={`h-2 w-2 rounded-full ${pic.avatarBg}`} />
                  {pic.name}
                </button>
              ))}
            </div>
          </div>
        </div>,
        controlsHost,
      )}

      {/* Pencarian Cepat di Halaman Depan */}
      <section className="inventory-panel p-4 sm:p-5 bg-white/95 backdrop-blur-md shadow-sm border border-slate-200/80 rounded-2xl" aria-label="Pencarian halaman depan">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
          <label htmlFor="frontpage-search" className="text-xs font-black text-slate-800 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-600">
              <Search className="h-3 w-3" aria-hidden="true" />
            </span>
            <span>Pencarian Pintar Box &amp; Barang</span>
          </label>
          <span className="text-[11px] font-medium text-slate-400">
            Tekan <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] text-slate-600 shadow-2xs font-bold">Ctrl + K</kbd> untuk cari cepat
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="frontpage-search"
            ref={searchInputRef}
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            placeholder="Cari nomor box, kode sampel, buyer, style, warna, PIC, atau rak..."
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/60 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onClearSearch?.();
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills when not searching */}
        {!searchQuery && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
            <span className="text-slate-400 font-medium">Saran cepat:</span>
            {['#1', '#17', 'LANTAI', 'DEVELOP', 'SAMPLE'].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => onSearchQueryChange?.(sug)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition font-medium border border-slate-200/60 shadow-2xs"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Live Search Results on Front Page */}
        {searchResults?.active && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>
                  {searchResults.matchedBoxNumbers.size} box cocok ditemukan &amp; disorot di rak 3D
                </span>
              </div>
              <button
                type="button"
                onClick={onClearSearch}
                className="text-xs text-slate-500 hover:text-rose-600 underline font-semibold transition"
              >
                Reset Pencarian
              </button>
            </div>

            {/* Matched Boxes Chips */}
            {searchResults.boxMatches.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Box Ditemukan ({searchResults.boxMatches.length}) — Klik untuk langsung buka:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {searchResults.boxMatches.map((box) => (
                    <button
                      key={`front-box-${box.boxNumber}`}
                      type="button"
                      onClick={() => setSelectedBoxNumber(box.boxNumber)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition shadow-2xs hover:-translate-y-0.5 active:scale-95"
                      title={`Klik untuk buka BOX #${box.boxNumber} (${box.rackName})`}
                    >
                      <BoxIcon className="h-3 w-3 text-amber-600" aria-hidden="true" />
                      <span>BOX #{box.boxNumber}</span>
                      <span className="text-[10px] font-normal text-amber-700">({box.rackName || 'LANTAI'})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Items List */}
            {searchResults.itemMatches.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Barang / Sampel Cocok ({searchResults.itemMatches.length}) — Klik nama untuk buka box, klik pensil untuk edit:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {searchResults.itemMatches.slice(0, 10).map((item, idx) => (
                    <div
                      key={item.id || `front-item-${idx}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/90 hover:bg-blue-50/80 border border-slate-200/80 transition-all text-xs group shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedBoxNumber(Number(item.boxNumber))}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        title={`Buka BOX #${item.boxNumber} tempat barang ini disimpan`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">
                          #{item.boxNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate text-xs group-hover:text-blue-700">
                            {item.kode || item.sku || item.style || item.name || 'Sample'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.style && item.style !== (item.kode || item.sku) ? `${item.style} • ` : ''}
                            Buyer: {item.buyerNo || '-'} • PIC: {item.picName || '-'}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemModalConfig({
                          isOpen: true,
                          item,
                          targetBoxNumber: Number(item.boxNumber)
                        })}
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                        title="Edit rincian barang ini"
                        aria-label={`Edit ${item.kode || item.sku || item.name || 'barang'}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                {searchResults.itemMatches.length > 10 && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    +{searchResults.itemMatches.length - 10} barang lainnya cocok. Persempit kata kunci pencarian.
                  </p>
                )}
              </div>
            )}

            {searchResults.matchedBoxNumbers.size === 0 && (
              <p className="text-center py-3 text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                Tidak ada box atau sampel yang cocok dengan kata kunci <strong>"{searchQuery}"</strong>.
              </p>
            )}
          </div>
        )}
      </section>

      <PpicMissingMentionBar activePic={highlightPpic} onSelectPic={setHighlightPpic} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
          <Layers className="h-3.5 w-3.5 text-blue-600" />
          <span>Fokus Rak:</span>
        </span>
        <div role="group" aria-label="Pilihan rak" className="inventory-filter-group w-fit max-w-full flex-wrap shadow-2xs">
          <button onClick={() => focusOnRack('ALL')} aria-pressed={activeRackView === 'ALL'}>
            Semua Rak
          </button>
          {racks.filter((r) => Number(r.id) !== 0).map((r) => (
            <button key={r.id} onClick={() => focusOnRack(r.id)} aria-pressed={activeRackView === r.id}>
              {r.name}
            </button>
          ))}
          {boxes.some((b) => Number(b.rackId) === 0) && (
            <button onClick={() => focusOnRack(0)} aria-pressed={activeRackView === 0}>
              Lantai ({boxes.filter((b) => Number(b.rackId) === 0).length})
            </button>
          )}
        </div>
      </div>

      <section aria-label="Status pengisian box" className="grid gap-3 sm:grid-cols-3">
        {occupancyGroups.map(group => (
          <div key={group.label} className="inventory-panel px-4 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <h2 className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{group.label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black shadow-2xs ${group.color}`}>{group.boxes.length} Box</span>
            </h2>
            <div className="flex flex-wrap gap-1 p-0.5 max-h-24 overflow-y-auto">
              {group.boxes.map(box => (
                <button key={box.boxNumber} type="button"
                  aria-label={`Box ${box.boxNumber}, ${group.label}`}
                  onClick={() => setSelectedBoxNumber(box.boxNumber)}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-black tabular-nums transition-all shadow-2xs hover:scale-105 hover:ring-2 hover:ring-blue-400 active:scale-95 ${group.color}`}>
                  {box.boxNumber}
                </button>
              ))}
              {group.boxes.length === 0 && <span className="text-xs text-slate-400 italic py-1">Tidak ada box</span>}
            </div>
          </div>
        ))}
      </section>

      {/* Main 3D Canvas Container */}
      <div className="warehouse-viewport inventory-panel relative w-full h-[380px] sm:h-[480px] lg:h-[580px] overflow-hidden rounded-3xl border border-slate-200/80 shadow-xl ring-1 ring-slate-900/5 bg-gradient-to-b from-sky-300 via-sky-100 to-cyan-50">
        
        {/* Three.js viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Mode Ringan / Cepat Toggle (Top Right) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleEcoMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md border cursor-pointer ${
              ecoMode
                ? 'bg-emerald-600/95 hover:bg-emerald-700 text-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/90'
            }`}
            title={ecoMode ? 'Mode Ringan aktif (super enteng & baterai awet). Klik untuk aktifkan Grafis Penuh.' : 'Klik untuk aktifkan Mode Ringan (sangat ringan untuk laptop/PC kantor).'}
          >
            <Zap className={`h-3.5 w-3.5 ${ecoMode ? 'text-yellow-200 fill-yellow-200' : 'text-amber-500'}`} />
            <span>{ecoMode ? '⚡ Mode Ringan: ON' : '⚡ Mode Ringan'}</span>
          </button>
        </div>

        {/* Active search indicator (top left) */}
        {searchActive && (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-blue-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-blue-700 shadow-sm backdrop-blur-xs">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {highlightBoxNumbers.size} box cocok &amp; disorot
            </span>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="rounded px-1.5 py-0.5 text-blue-600 underline underline-offset-2 transition hover:bg-blue-50 hover:text-blue-800"
                title="Hapus pencarian"
              >
                Hapus
              </button>
            )}
          </div>
        )}

        {/* Hovered Box HUD Card (Bottom Left) */}
        {hoveredBox && (
          <div className="absolute bottom-5 left-5 z-10 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white text-xs max-w-sm shadow-2xl animate-fade-in pointer-events-none">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-white">
                #{hoveredBox.boxNumber}
              </span>
              <span className="font-mono text-xs text-slate-600">
                {hoveredBox.code}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                hoveredBox.category === 'SAMPLE' ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'
              }`}>
                {hoveredBox.category} BOX
              </span>
            </div>

            <div className="mt-2 space-y-1 text-slate-300">
              <p>📍 <strong>{hoveredBox.rackName}</strong> • {hoveredBox.rackDescription}</p>
              <p>👤 PIC PPIC: <strong className="text-white font-bold">{hoveredBox.picName}</strong></p>
              <p>📦 Tersimpan: <strong className="text-emerald-400">{getItemsInBox(hoveredBox.boxNumber).length} item</strong></p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-700/80 text-[11px] text-blue-400 font-bold flex items-center space-x-1">
              <span>Klik box ini untuk melihat isi & print kartu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Controls Hint & Island Badge (Bottom Right) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 bg-black/60 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-[10px] sm:text-[11px] text-slate-200 pointer-events-none flex flex-wrap items-center gap-2">
          <span className="text-cyan-300 font-medium">🏝️ Pulau Laut</span>
          <span className="text-pink-300 font-medium">🌸 Bunga Estetik</span>
          <span className="text-slate-400">|</span>
          <span>🖱️ Putar: Klik Kiri</span>
          <span>🔍 Zoom: Scroll</span>
          <span>✋ Geser: Klik Kanan</span>
        </div>

      </div>

    </div>
  );
};

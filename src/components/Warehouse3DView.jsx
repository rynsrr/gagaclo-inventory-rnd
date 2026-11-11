import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildLowPolyForestScene } from './lowPolyForestScene';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { useInventory } from '../context/InventoryContext';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  Box as BoxIcon, 
  Sparkles, 
  Info, 
  Search, 
  ChevronRight, 
  X, 
  Pencil, 
  Package,
  AlertTriangle,
  RefreshCw,
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
    selectedBoxNumber,
    setSelectedBoxNumber,
    setItemModalConfig
  } = useInventory();

  // Cinematic fly-to-box interpolation targets
  const flyCameraTargetRef = useRef(null);
  const flyControlsTargetRef = useRef(null);
  const isUserInteractingRef = useRef(false);
  const selectedBoxNumberRef = useRef(selectedBoxNumber);

  useEffect(() => {
    selectedBoxNumberRef.current = selectedBoxNumber;
    if (selectedBoxNumber !== null && boxMeshesRef.current.length > 0) {
      const mesh = boxMeshesRef.current.find(m => Number(m.userData.boxNumber) === Number(selectedBoxNumber));
      if (mesh) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(
          mesh.getWorldQuaternion(new THREE.Quaternion())
        );

        flyControlsTargetRef.current = worldPos.clone().add(new THREE.Vector3(0, 0.1, 0));
        flyCameraTargetRef.current = worldPos.clone()
          .add(forwardDir.clone().multiplyScalar(3.4))
          .add(new THREE.Vector3(0, 0.35, 0));
      }
    }
  }, [selectedBoxNumber]);

  // Ctrl/Cmd + K shortcut for quick search focus
  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === 'f' || key === 'k')) {
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
  const activeRackRef = useRef('ALL');
  const fitCameraRef = useRef(null);
  const [webGlError, setWebGlError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetryWebGl = () => {
    setWebGlError(false);
    setRetryKey(k => k + 1);
  };

  const [dogReminderActive, setDogReminderActive] = useState(false);
  const lastInputTimeRef = useRef(Date.now());
  const lastUserInteractionTimeRef = useRef(Date.now());
  const forestRef = useRef(null);
  const rendererRef = useRef(null);

  // Stable key untuk mencegah rebuild scene 3D yang merusak memori GPU jika data box tidak berubah
  const boxesStructureKey = useMemo(() => {
    return boxes.map(b => `${b.boxNumber}:${b.rackId}:${b.picName}:${b.isFull}`).join('|');
  }, [boxes]);

  // A Set of box numbers matching the sidebar search (null = no active search).
  const searchActive = highlightBoxNumbers !== null;

  const occupancyGroups = [
    { label: 'Tanpa data', color: 'bg-slate-100 text-slate-800', boxes: [] },
    { label: 'Sedang diisi', color: 'bg-amber-100 text-amber-900', boxes: [] },
    { label: 'Penuh', color: 'bg-emerald-100 text-emerald-900', boxes: [] },
  ];
  for (const box of boxes) {
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
  const interactiveRackMeshesRef = useRef([]);
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
  const createBoxFaceTexture = (boxNumber, picName, category, rackName, rackDescription, itemCount = 0, isFull = false) => {
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

    // 3. Header: SAMPLE BOX or MATERIAL BOX (left-aligned)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const headerTitle = category === 'SAMPLE' ? 'SAMPLE BOX' : 'MATERIAL BOX';
    ctx.fillText(headerTitle, 26, 48);

    // Occupancy Status Pill at top-right of label
    let badgeBg = '#64748b';
    let badgeText = 'KOSONG';
    if (isFull) {
      badgeBg = '#059669';
      badgeText = 'PENUH';
    } else if (itemCount > 0) {
      badgeBg = '#d97706';
      badgeText = `${itemCount} ITEM`;
    }

    ctx.fillStyle = badgeBg;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(330, 18, 154, 38, 8);
      ctx.fill();
    } else {
      ctx.fillRect(330, 18, 154, 38);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, 407, 43);

    // 4. Giant Box Number
    ctx.fillStyle = '#000000';
    ctx.font = '900 150px system-ui, sans-serif';
    ctx.textAlign = 'center';
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

    // Scene - Clean Studio / Warehouse Environment (Tanpa Kabut / No Fog)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = null;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 200);
    cameraRef.current = camera;

    // Renderer with multi-tier resilient WebGL check
    let renderer = null;
    const rendererConfigs = [
      { antialias: true, alpha: true, powerPreference: 'default' },
      { antialias: false, alpha: true, failIfMajorPerformanceCaveat: false },
      { antialias: false, alpha: false, failIfMajorPerformanceCaveat: false, powerPreference: 'low-power' }
    ];
    for (const cfg of rendererConfigs) {
      try {
        renderer = new THREE.WebGLRenderer(cfg);
        if (renderer) break;
      } catch (e) {
        console.warn('WebGL config failed, trying next fallback:', cfg, e);
      }
    }

    if (!renderer) {
      console.warn('All WebGL renderer options failed');
      setWebGlError(true);
      return;
    }
    setWebGlError(false);

    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn('WebGL context lost');
      setWebGlError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Keep camera above ground level
    controls.minDistance = 4;
    controls.maxDistance = 240;
    controls.target.set(10, 2, 0);
    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
      flyCameraTargetRef.current = null;
      flyControlsTargetRef.current = null;
    });
    controls.addEventListener('end', () => {
      isUserInteractingRef.current = false;
    });
    controlsRef.current = controls;

    // Build the 3D Physical Racks from current rack data.
    // Racks 1-5 keep their original warehouse layout; any newly added rack
    // is placed further to the right with a standard 4x3 shelf layout.
    // Build the 3D Physical Racks from current rack data according to the Architectural Floor Plan.
    // - Rak 1: Bilik 1 (Top Square), facing West (-X) into the room.
    // - Rak 2: Bilik 3 (Bottom Square), facing North (-Z) into the room.
    // - Rak 3, 4, 5: South wall of Long Corridor, facing North (-Z) side-by-side.
    const presetPositions = {
      1: { x: 13.5, z: -45.5, rotationY: -Math.PI / 2, cols: 4, rows: 4, beamColor: 0x1d4ed8 },
      2: { x: 5.5,  z: -15.5, rotationY: Math.PI, cols: 5, rows: 4, beamColor: 0xe2e8f0 },
      3: { x: -22.5, z: 46.5, rotationY: Math.PI, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      4: { x: -14.0, z: 46.5, rotationY: Math.PI, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      5: { x: -5.5,  z: 46.5, rotationY: Math.PI, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
    };
    let nextExtraX = 22;
    const rackPositions = racks
      .filter((r) => Number(r.id) !== 0)
      .map((r) => {
        const preset = presetPositions[r.id];
        if (preset) {
          return { rackId: r.id, ...preset };
        }
        const conf = { rackId: r.id, x: nextExtraX, z: -42, rotationY: 0, cols: 4, rows: 3, beamColor: 0xcbd5e1 };
        nextExtraX += 10;
        return conf;
      });

    // Grow a rack vertically when boxes are added beyond its original
    // capacity, so newly created boxes always sit on a real shelf.
    rackPositions.forEach((conf) => {
      const count = boxes.filter(b => Number(b.rackId) === Number(conf.rackId)).length;
      conf.rows = Math.max(conf.rows, Math.ceil(count / conf.cols));
    });

    // --- LOW POLY MEADOW & ARCHITECTURAL FLOOR PLAN 3D ENVIRONMENT ---
    const forest = buildLowPolyForestScene({
      scene,
      isDarkMode: false,
    });
    forestRef.current = forest;

    const boxMeshes = [];
    const interactiveRackMeshes = [];

    rackPositions.forEach((rackConf) => {
      const rackData = racks.find((r) => Number(r.id) === Number(rackConf.rackId));
      if (!rackData) return;

      const { x: rx, z: rz, rotationY = 0, cols, rows, beamColor } = rackConf;
      const rackWidth = cols * 1.8 + 0.4;
      const shelfHeight = 1.9;
      const rackDepth = 1.6;
      const totalRackHeight = rows * shelfHeight + 0.5;
      const hasTopCover = rackConf.rackId !== 1 && rackConf.rackId !== 2;
      const firstShelfY = 0.2;
      const pillarHeight = hasTopCover
        ? totalRackHeight
        : firstShelfY + (rows - 1) * shelfHeight + 0.08;

      const rackGroup = new THREE.Group();
      rackGroup.position.set(rx, 0, rz);
      rackGroup.rotation.y = rotationY;
      scene.add(rackGroup);

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
        pillar.position.set(px, pillarHeight / 2, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pillar.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(pillar);
        interactiveRackMeshes.push(pillar);
      });

      // 2. Horizontal Beam Shelves
      const shelfCount = hasTopCover ? rows + 1 : rows;
      for (let r = 0; r < shelfCount; r++) {
        const sy = firstShelfY + r * shelfHeight;
        
        // Front beam
        const beamGeo = new THREE.BoxGeometry(rackWidth, 0.12, 0.12);
        const frontBeam = new THREE.Mesh(beamGeo, pillarMat);
        frontBeam.position.set(0, sy, halfD);
        frontBeam.castShadow = true;
        frontBeam.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(frontBeam);
        interactiveRackMeshes.push(frontBeam);

        // Back beam
        const backBeam = new THREE.Mesh(beamGeo, pillarMat);
        backBeam.position.set(0, sy, -halfD);
        backBeam.castShadow = true;
        backBeam.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(backBeam);
        interactiveRackMeshes.push(backBeam);

        // Wooden/wire deck plank
        const deckGeo = new THREE.BoxGeometry(rackWidth - 0.1, 0.06, rackDepth - 0.2);
        const deckMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.2,
          roughness: 0.7,
        });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(0, sy + 0.05, 0);
        deck.receiveShadow = true;
        deck.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(deck);
        interactiveRackMeshes.push(deck);
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
      sign.position.set(0, totalRackHeight + 0.45, halfD + 0.05);
      sign.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
      rackGroup.add(sign);
      interactiveRackMeshes.push(sign);

      // 4. Place 3D Boxes with the Official GAGACLO Label on Front Face
      const rackBoxes = boxes.filter((b) => Number(b.rackId) === Number(rackConf.rackId));

      rackBoxes.forEach((boxObj, index) => {
        const colIdx = index % cols;
        const rowIdx = Math.floor(index / cols);

        // Position coordinates in rackGroup local space
        const localX = -halfW + 0.9 + colIdx * 1.8;
        const localY = 0.2 + rowIdx * shelfHeight + 0.48;
        const localZ = 0;

        // Box geometry: 1.35m wide, 0.75m high, 1.1m deep
        const boxGeo = new THREE.BoxGeometry(1.35, 0.75, 1.1);

        const boxItems = getItemsInBox(boxObj.boxNumber);
        const frontTexture = createBoxFaceTexture(
          boxObj.boxNumber, 
          boxObj.picName, 
          boxObj.category,
          boxObj.rackName,
          boxObj.rackDescription,
          boxItems.length,
          boxObj.isFull
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
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
        });

        // Materials: [right, left, top, bottom, front, back]
        const materials = [
          sideMat,
          sideMat,
          sideMat,
          sideMat,
          frontMat, // Front face (+Z local) has the official label
          sideMat,
        ];

        const boxMesh = new THREE.Mesh(boxGeo, materials);
        boxMesh.position.set(localX, localY, localZ);
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
          initialLocalX: localX,
          initialLocalY: localY,
          initialLocalZ: localZ,
          initialX: rx,
          initialY: localY,
          initialZ: rz,
        };

        rackGroup.add(boxMesh);
        boxMeshes.push(boxMesh);
      });
    });

    // 5. Floor boxes (rackId 0 / "LANTAI") sitting in the long corridor
    const floorBoxes = boxes.filter((b) => Number(b.rackId) === 0);
    const floorCols = 4;
    floorBoxes.forEach((boxObj, index) => {
      const colIdx = index % floorCols;
      const rowIdx = Math.floor(index / floorCols);
      const fx = -22 + colIdx * 2.0;
      const fy = 0.42;
      const fz = 36 + rowIdx * 2.0;

      const floorItems = getItemsInBox(boxObj.boxNumber);
      const boxGeo = new THREE.BoxGeometry(1.35, 0.75, 1.1);
      const frontTexture = createBoxFaceTexture(
        boxObj.boxNumber,
        boxObj.picName,
        boxObj.category,
        boxObj.rackName,
        boxObj.rackDescription,
        floorItems.length,
        boxObj.isFull
      );
      const baseColor = ppicColorMap[boxObj.picName] || 0x3b82f6;
      const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.05 });
      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTexture,
        roughness: 0.3,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });

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
        initialLocalX: fx,
        initialLocalY: fy,
        initialLocalZ: fz,
        initialX: fx,
        initialY: fy,
        initialZ: fz,
      };
      scene.add(boxMesh);
      boxMeshes.push(boxMesh);
    });

    boxMeshesRef.current = boxMeshes;
    interactiveRackMeshesRef.current = interactiveRackMeshes;

    // Helper: Fokus kamera close view tegak lurus menghadap muka rak (face side fit)
    const focusRackFaceSide = (rackId) => {
      const rId = Number(rackId);
      const conf = rackPositions.find(r => Number(r.rackId) === rId);
      if (!conf) return;

      const { x: rx, z: rz, rotationY = 0, cols, rows } = conf;
      const rackWidth = cols * 1.8 + 0.4;
      const shelfHeight = 1.9;
      const totalRackHeight = rows * shelfHeight + 0.5;
      const midY = totalRackHeight / 2;

      const verticalSlope = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fitDistance = 1.15 * Math.max(
        totalRackHeight / (2 * verticalSlope),
        rackWidth / (2 * verticalSlope * camera.aspect)
      ) + 1.2;

      // Vektor hadap muka depan rak (+Z lokal) di dunia 3D
      const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

      const centerTarget = new THREE.Vector3(rx, midY, rz);
      const camTarget = centerTarget.clone()
        .add(forwardDir.clone().multiplyScalar(fitDistance))
        .add(new THREE.Vector3(0, 0.15, 0));

      flyControlsTargetRef.current = centerTarget;
      flyCameraTargetRef.current = camTarget;
    };

    // Raycasting for Mouse Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentHoveredMesh = null;
    let pointerDownPos = { x: 0, y: 0 };
    let lastClickTime = 0;
    let lastClickedBoxNumber = null;

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allClickable = [...boxMeshesRef.current, ...interactiveRackMeshesRef.current];
      const intersects = raycaster.intersectObjects(allClickable);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        renderer.domElement.style.cursor = 'pointer';
        if (hit.userData?.boxNumber) {
          if (currentHoveredMesh !== hit) {
            currentHoveredMesh = hit;
            const boxData = boxes.find(b => b.boxNumber === hit.userData.boxNumber);
            setHoveredBox(boxData);
          }
        } else {
          if (currentHoveredMesh) {
            currentHoveredMesh = null;
            setHoveredBox(null);
          }
        }
      } else {
        renderer.domElement.style.cursor = 'default';
        if (currentHoveredMesh) {
          currentHoveredMesh = null;
          setHoveredBox(null);
        }
      }
    };

    const onClick = (e) => {
      // Abaikan jika pointer bergeser > 6px (pengguna sedang drag/rotate kamera 3D)
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allClickable = [...boxMeshesRef.current, ...interactiveRackMeshesRef.current];
      const intersects = raycaster.intersectObjects(allClickable);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const boxNum = hit.userData?.boxNumber;
        const targetRackId = hit.userData?.rackId;
        const now = Date.now();

        // Cek jika pengguna mengklik 2 kali berturut-turut pada box yang sama (< 450ms)
        if (boxNum && lastClickedBoxNumber === boxNum && (now - lastClickTime) < 450) {
          // Klik 2 kali: Buka popup jendela detail box
          setSelectedBoxNumber(boxNum);
          lastClickTime = 0;
          lastClickedBoxNumber = null;
        } else {
          lastClickTime = now;
          lastClickedBoxNumber = boxNum || null;

          if (targetRackId && Number(targetRackId) !== 0) {
            // Close view face side fit per nomor rak yang diklik
            focusRackFaceSide(targetRackId);
          } else if (boxNum) {
            // Box di lantai (rackId 0)
            const worldPos = new THREE.Vector3();
            hit.getWorldPosition(worldPos);
            const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(
              hit.getWorldQuaternion(new THREE.Quaternion())
            );

            flyControlsTargetRef.current = worldPos.clone().add(new THREE.Vector3(0, 0.1, 0));
            flyCameraTargetRef.current = worldPos.clone()
              .add(forwardDir.clone().multiplyScalar(3.4))
              .add(new THREE.Vector3(0, 0.35, 0));
          }
        }
      } else {
        lastClickTime = 0;
        lastClickedBoxNumber = null;
      }
    };

    const onDblClick = (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;

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

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDblClick);

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

      // Adaptive idle throttling: hemat GPU & CPU saat user sedang tidak aktif/meninggalkan komputer
      const idleMs = Date.now() - lastUserInteractionTimeRef.current;
      const isActivelyMoving = Boolean(
        flyCameraTargetRef.current || 
        isUserInteractingRef.current || 
        selectedBoxNumberRef.current !== null ||
        currentHoveredMesh !== null
      );

      if (!isActivelyMoving) {
        if (idleMs > 300000) {
          // Idle > 5 menit: batasi render ke 2 FPS (hampir 0% beban GPU & baterai)
          if (timestamp - lastRenderTime < 500) return;
        } else if (idleMs > 60000) {
          // Idle > 1 menit: batasi ke 15 FPS
          if (timestamp - lastRenderTime < 66) return;
        } else if (idleMs > 20000) {
          // Idle > 20 detik: batasi ke 30 FPS
          if (timestamp - lastRenderTime < 33) return;
        }
      }
      lastRenderTime = timestamp;

      const elapsed = clock.getElapsedTime();
      forest?.update(elapsed);

      // 1. Cinematic camera flight interpolation
      if (flyCameraTargetRef.current && flyControlsTargetRef.current && !isUserInteractingRef.current) {
        camera.position.lerp(flyCameraTargetRef.current, 0.08);
        controls.target.lerp(flyControlsTargetRef.current, 0.08);
        if (
          camera.position.distanceTo(flyCameraTargetRef.current) < 0.03 &&
          controls.target.distanceTo(flyControlsTargetRef.current) < 0.03
        ) {
          flyCameraTargetRef.current = null;
          flyControlsTargetRef.current = null;
        }
      }

      // 2. Tactile box drawer slide-out animation (smooth physical spring lerp)
      const curSelectedNum = selectedBoxNumberRef.current;
      for (let i = 0; i < boxMeshesRef.current.length; i++) {
        const mesh = boxMeshesRef.current[i];
        const isSelected = curSelectedNum !== null && Number(curSelectedNum) === Number(mesh.userData.boxNumber);
        const isHovered = currentHoveredMesh === mesh;

        let targetZ = mesh.userData.initialLocalZ;
        let targetY = mesh.userData.initialLocalY;

        if (isSelected) {
          targetZ += 0.42; // Smooth drawer slide-out
          targetY += 0.08;
        } else if (isHovered) {
          targetZ += 0.28; // Tactile pull-out on hover
          targetY += 0.04;
        }

        mesh.position.z += (targetZ - mesh.position.z) * 0.18;
        mesh.position.y += (targetY - mesh.position.y) * 0.18;

        // Subtle emissive glow on front label face
        if (mesh.material && mesh.material[4]) {
          const frontMat = mesh.material[4];
          if (isSelected) {
            frontMat.emissive.setHex(0x38bdf8);
            frontMat.emissiveIntensity = 0.35;
          } else if (isHovered) {
            frontMat.emissive.setHex(0x60a5fa);
            frontMat.emissiveIntensity = 0.2;
          } else {
            frontMat.emissive.setHex(0x000000);
            frontMat.emissiveIntensity = 0;
          }
        }
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const fitFrontView = (smooth = true) => {
      const isAll = activeRackRef.current === 'ALL';
      const bounds = new THREE.Box3();
      for (const mesh of boxMeshes) {
        if (isAll || Number(mesh.userData.rackId) === Number(activeRackRef.current)) {
          bounds.expandByObject(mesh);
        }
      }
      if (bounds.isEmpty()) return;

      if (isAll) {
        // Expand bounds to cover the entire architectural floor slab & all rooms
        bounds.expandByPoint(new THREE.Vector3(-30, 0, -50));
        bounds.expandByPoint(new THREE.Vector3(55, 0, -50));
        bounds.expandByPoint(new THREE.Vector3(55, 0, -30));
        bounds.expandByPoint(new THREE.Vector3(0, 0, 50));
        bounds.expandByPoint(new THREE.Vector3(-30, 0, 50));
      } else {
        // Include room for the frame and rack sign above the boxes.
        bounds.min.x -= 1;
        bounds.max.x += 1;
        bounds.min.y -= 1;
        bounds.max.y += 2;
      }

      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const verticalSlope = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = 1.15 * Math.max(
        size.y / (2 * verticalSlope),
        size.x / (2 * verticalSlope * camera.aspect),
        size.z / (2 * verticalSlope)
      );

      controls.maxDistance = Math.max(220, distance * 2.5);
      camera.far = Math.max(450, distance * 4);
      camera.updateProjectionMatrix();

      let targetPos;
      if (isAll) {
        // Elevate camera for a clean 3D isometric architectural overview of the full floor plan
        targetPos = new THREE.Vector3(
          center.x + distance * 0.45,
          center.y + distance * 1.1,
          center.z + distance * 0.85
        );
      } else {
        const curRackId = Number(activeRackRef.current);
        if (curRackId === 1) {
          // Rak 1 faces West (-X)
          targetPos = new THREE.Vector3(center.x - distance, center.y + 0.5, center.z);
        } else if (curRackId >= 2 && curRackId <= 5) {
          // Rak 2, 3, 4, 5 face North (-Z)
          targetPos = new THREE.Vector3(center.x, center.y + 0.5, center.z - distance);
        } else {
          targetPos = new THREE.Vector3(center.x, center.y, center.z + distance);
        }
      }

      if (smooth) {
        flyControlsTargetRef.current = center.clone();
        flyCameraTargetRef.current = targetPos;
      } else {
        controls.target.copy(center);
        camera.position.copy(targetPos);
        controls.update();
      }
    };
    fitCameraRef.current = fitFrontView;

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (!newWidth || !newHeight) return;
      camera.aspect = newWidth / newHeight;
      renderer.setSize(newWidth, newHeight, false);
      fitFrontView(false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // Cleanup
    return () => {
      rendererRef.current = null;
      resizeObserver.disconnect();
      fitCameraRef.current = null;
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Bersihkan seluruh geometri, material, dan tekstur Three.js dari memori GPU
      scene.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => {
              if (mat.map && typeof mat.map.dispose === 'function') mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (obj.material.map && typeof obj.material.map.dispose === 'function') {
              obj.material.map.dispose();
            }
            obj.material.dispose();
          }
        }
      });
      scene.clear();

      forest?.dispose();
      renderer.dispose();
    };
  }, [boxesStructureKey, racks, ppicMembers, retryKey]);

  // Pantau aktivitas input data untuk pengingat 15 menit dari anjing penjaga
  useEffect(() => {
    lastInputTimeRef.current = Date.now();
    lastUserInteractionTimeRef.current = Date.now();
    setDogReminderActive(false);
  }, [items]);

  useEffect(() => {
    const markActivity = () => {
      lastInputTimeRef.current = Date.now();
      lastUserInteractionTimeRef.current = Date.now();
    };
    window.addEventListener('input', markActivity);
    window.addEventListener('change', markActivity);
    window.addEventListener('pointermove', markActivity, { passive: true });
    window.addEventListener('pointerdown', markActivity, { passive: true });
    window.addEventListener('keydown', markActivity, { passive: true });
    window.addEventListener('wheel', markActivity, { passive: true });
    window.addEventListener('touchstart', markActivity, { passive: true });
    return () => {
      window.removeEventListener('input', markActivity);
      window.removeEventListener('change', markActivity);
      window.removeEventListener('pointermove', markActivity);
      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('wheel', markActivity);
      window.removeEventListener('touchstart', markActivity);
    };
  }, []);

  const triggerDogReminder = () => {
    setDogReminderActive(true);
    const dogPos = forestRef.current?.getDogPosition?.();
    if (dogPos) {
      flyControlsTargetRef.current = new THREE.Vector3(dogPos.x, dogPos.y + 0.45, dogPos.z);
      flyCameraTargetRef.current = new THREE.Vector3(dogPos.x, dogPos.y + 1.1, dogPos.z + 2.4);
    }
  };

  useEffect(() => {
    const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 menit batas inaktivitas input data
    const interval = setInterval(() => {
      if (document.hidden) return;
      const elapsed = Date.now() - lastInputTimeRef.current;
      if (elapsed >= IDLE_LIMIT_MS && !dogReminderActive) {
        triggerDogReminder();
      }
    }, 30000); // Cek tiap 30 detik (bukan 4 detik) untuk efisiensi CPU
    return () => clearInterval(interval);
  }, [dogReminderActive]);

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

  return (
    <div className="warehouse-layout space-y-4">
      {/* Pencarian Cepat di Halaman Depan */}
      <section className="inventory-panel p-3 sm:p-3.5 bg-white/95 backdrop-blur-md shadow-sm border border-slate-200/80 rounded-2xl" aria-label="Pencarian halaman depan">
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
                  Box Ditemukan ({searchResults.boxMatches.length}). Klik untuk langsung buka:
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
                  Barang / Sampel Cocok ({searchResults.itemMatches.length}). Klik nama untuk buka box, klik pensil untuk edit:
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
      <div className="warehouse-viewport inventory-panel relative w-full h-[380px] sm:h-[480px] lg:h-[580px] overflow-hidden rounded-3xl border shadow-xl ring-1 ring-slate-900/5 transition-all duration-500 bg-gradient-to-b from-emerald-200 via-teal-100 to-amber-50 border-slate-200/80">
        
        {/* Three.js viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* WebGL Fallback Overlay if GPU context is unavailable */}
        {webGlError && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3.5 animate-fade-in">
            <div className="h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
              <BoxIcon className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Akselerasi 3D (WebGL) Diperlukan
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Browser atau perangkat Anda belum mengaktifkan WebGL. Buka <strong>Settings &gt; System</strong> di browser Chrome/Edge, aktifkan <strong>"Use graphics acceleration when available"</strong> (Gunakan akselerasi grafis), lalu restart browser.
            </p>
            <button
              type="button"
              onClick={handleRetryWebGl}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Coba Muat Ulang 3D</span>
            </button>
          </div>
        )}

        {/* Controls (Top Right): Fit View Face Side */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fitCameraRef.current?.(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md border cursor-pointer active:scale-95 bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100 shadow-slate-900/10"
            title="Posisikan kamera tepat lurus menghadap depan rak (Fit View Face Side)"
          >
            <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
            <span>Fit View Face Side</span>
          </button>
        </div>

        {/* Anjing Penjaga 15-Menit Inactivity Reminder Banner */}
        {dogReminderActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%] sm:w-auto bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-slate-950 px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-white ring-4 ring-amber-400/50 animate-bounce">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-black text-slate-950 leading-snug">
                "Woof woof! 🐾 Hey, please fill data on the box!"
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDogReminderActive(false);
                    lastInputTimeRef.current = Date.now();
                  }}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold transition shadow-md cursor-pointer active:scale-95"
                >
                  OK, Siap! 🐾
                </button>
              </div>
            </div>
          </div>
        )}

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
              <span className="font-mono text-xs text-slate-400">
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
              <span>Klik 1x fokus • Klik 2x buka popup jendela</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Controls Hint & Meadow Badge (Bottom Right) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] sm:text-[11px] text-slate-200 pointer-events-none flex flex-wrap items-center gap-2 shadow-md">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span>🌱</span> Padang Rumput 3D
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-300 font-bold">🖱️ Klik 2x: Buka Popup</span>
          <span className="text-slate-600">•</span>
          <span>🖱️ Putar: Klik Kiri</span>
          <span className="text-slate-600">•</span>
          <span>🔍 Zoom: Scroll</span>
          <span className="text-slate-600">•</span>
          <span>✋ Geser: Klik Kanan</span>
        </div>

      </div>

    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildLowPolyForestScene } from './lowPolyForestScene';
import { useInventory } from '../context/InventoryContext';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  Info, 
  Search, 
  ChevronRight, 
  Package,
  AlertTriangle,
  RefreshCw,
  Boxes,
  ChevronDown,
  X,
} from 'lucide-react';

// Indigo, purple, emerald, amber, rose: the original five PPIC colors,
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
  onClearSearch,
  highlightPpic: propHighlightPpic,
  onSelectPic: propOnSelectPic,
  previewFocusBoxNumber = null,
}) => {
  const containerRef = useRef(null);
  const { 
    racks, 
    boxes, 
    items, 
    ppicMembers, 
    getItemsInBox, 
    selectedBoxNumber,
    setSelectedBoxNumber
  } = useInventory();

  // Cinematic fly-to-box interpolation targets
  const flyCameraTargetRef = useRef(null);
  const flyControlsTargetRef = useRef(null);
  const isUserInteractingRef = useRef(false);
  const selectedBoxNumberRef = useRef(selectedBoxNumber);
  const focusRackRef = useRef(null);

  useEffect(() => {
    selectedBoxNumberRef.current = selectedBoxNumber;
    // Setelah klik 2 kali box atau pilih box: tidak perlu closeup kamera ke box
    // Posisi kamera tetap nyaman pada sudut pandang rak/lokasi saat ini
  }, [selectedBoxNumber]);

  // Filter / view state
  const [internalHighlightPpic, setInternalHighlightPpic] = useState('ALL');
  const highlightPpic = propHighlightPpic !== undefined ? propHighlightPpic : internalHighlightPpic;
  const setHighlightPpic = propOnSelectPic !== undefined ? propOnSelectPic : setInternalHighlightPpic;
  const [hoveredBox, setHoveredBox] = useState(null);
  const [isHudExpanded, setIsHudExpanded] = useState(false);
  const isHudExpandedRef = useRef(false);
  useEffect(() => {
    isHudExpandedRef.current = isHudExpanded;
  }, [isHudExpanded]);
  const hudRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hudRef.current && !hudRef.current.contains(e.target)) {
        setIsHudExpanded(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isHudExpanded) {
        setIsHudExpanded(false);
      }
    };
    const handleToggleHud = () => {
      setIsHudExpanded((prev) => !prev);
    };
    window.addEventListener('gagaclo_toggle_box_hud', handleToggleHud);
    if (isHudExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('gagaclo_toggle_box_hud', handleToggleHud);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHudExpanded]);

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

  const totalKurang = useMemo(() => {
    return boxes.filter(b => {
      const boxItems = getItemsInBox(b.boxNumber);
      return (!boxItems || boxItems.length === 0) && !b.isFull;
    }).length;
  }, [boxes, getItemsInBox]);

  const occupancyGroups = useMemo(() => {
    const groups = [
      {
        label: 'Tanpa data',
        badgeClass: 'bg-black/[0.05] text-[#86868b] border border-black/[0.06]',
        boxClass: 'bg-black/[0.03] hover:bg-black/[0.08] text-[#1d1d1f] border-black/[0.06]',
        boxes: []
      },
      {
        label: 'Sedang diisi',
        badgeClass: 'bg-[#ff9500]/15 text-[#c96700] border border-[#ff9500]/25',
        boxClass: 'bg-[#ff9500]/10 hover:bg-[#ff9500]/25 text-[#c96700] border-[#ff9500]/20',
        boxes: []
      },
      {
        label: 'Penuh',
        badgeClass: 'bg-[#34c759]/15 text-[#30d158] border border-[#34c759]/25',
        boxClass: 'bg-[#34c759]/10 hover:bg-[#34c759]/25 text-[#30d158] border-[#34c759]/20',
        boxes: []
      },
    ];

    for (const box of boxes) {
      if (highlightPpic !== 'ALL' && !matchesPic(box.picName, highlightPpic)) continue;
      if (searchActive && !highlightBoxNumbers.has(Number(box.boxNumber))) continue;
      const hasData = getItemsInBox(box.boxNumber).length > 0;
      const group = box.isFull ? 2 : hasData ? 1 : 0;
      groups[group].boxes.push(box);
    }

    return groups;
  }, [boxes, highlightPpic, searchActive, highlightBoxNumbers, getItemsInBox]);

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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(-80.0, 42.2, -77.3);
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
    controls.target.set(-25.1, 1.5, -34.4);
    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
      flyCameraTargetRef.current = null;
      flyControlsTargetRef.current = null;
      setIsHudExpanded(false); // Auto-close HUD when user starts orbiting / interacting with 3D
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

      // 3. High-Visibility All-Angle Billboard Sprite (Papan Nama Rak Terapung)
      const isSample = rackData.category === 'SAMPLE';
      const badgeAccent = isSample ? '#f59e0b' : '#10b981';

      // Floating Billboard Sprite (Selalu Menghadap Kamera dari Segala Sudut / All-Angle View)
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 1024;
      spriteCanvas.height = 320;
      const spCtx = spriteCanvas.getContext('2d');

      // Rounded container pill
      spCtx.beginPath();
      spCtx.roundRect(16, 16, 992, 288, 56);
      spCtx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      spCtx.fill();
      spCtx.lineWidth = 14;
      spCtx.strokeStyle = badgeAccent;
      spCtx.stroke();

      // Glowing dot
      spCtx.beginPath();
      spCtx.arc(110, 160, 32, 0, Math.PI * 2);
      spCtx.fillStyle = badgeAccent;
      spCtx.fill();

      // Large bold rack name
      spCtx.fillStyle = '#ffffff';
      spCtx.font = '900 120px system-ui, -apple-system, sans-serif';
      spCtx.textAlign = 'left';
      spCtx.textBaseline = 'middle';
      spCtx.fillText(rackData.name.toUpperCase(), 175, 125);

      // Subtitle info
      spCtx.fillStyle = '#cbd5e1';
      spCtx.font = 'bold 46px system-ui, -apple-system, sans-serif';
      const subInfo = `${isSample ? 'SAMPLE R&D' : 'FABRIC/MATERIAL'} • ${cols * rows} BOX`;
      spCtx.fillText(subInfo, 178, 225);

      const spriteTex = new THREE.CanvasTexture(spriteCanvas);
      spriteTex.colorSpace = THREE.SRGBColorSpace;

      const spriteMat = new THREE.SpriteMaterial({
        map: spriteTex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });
      const rackSprite = new THREE.Sprite(spriteMat);
      const spriteW = Math.max(5.5, rackWidth * 0.78);
      const spriteH = spriteW * (320 / 1024);
      rackSprite.scale.set(spriteW, spriteH, 1.0);
      rackSprite.position.set(rackConf.x, totalRackHeight + 1.85, rackConf.z);
      rackSprite.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
      scene.add(rackSprite);
      interactiveRackMeshes.push(rackSprite);

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

      // Hitung dimensi & posisi plang judul rak (rack sign sprite) di atas rak
      const spriteW = Math.max(5.5, rackWidth * 0.78);
      const spriteH = spriteW * (320 / 1024);
      const signTopY = totalRackHeight + 1.85 + (spriteH / 2) + 0.9; // Headroom nyaman di atas sign
      const floorBottomY = -0.2; // Level lantai kaki rak
      const totalSpanY = signTopY - floorBottomY;
      const midY = (signTopY + floorBottomY) / 2;

      const verticalSlope = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fitDistance = 1.15 * Math.max(
        totalSpanY / (2 * verticalSlope),
        (rackWidth * 1.12) / (2 * verticalSlope * camera.aspect)
      ) + 0.8;

      // Vektor hadap muka depan rak (+Z lokal) di dunia 3D
      const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

      const centerTarget = new THREE.Vector3(rx, midY, rz);
      const camTarget = centerTarget.clone()
        .add(forwardDir.clone().multiplyScalar(fitDistance));

      flyControlsTargetRef.current = centerTarget;
      flyCameraTargetRef.current = camTarget;
    };
    focusRackRef.current = focusRackFaceSide;

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

    const fitFrontView = (smooth = true, hudOffset = isHudExpandedRef.current) => {
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
        bounds.min.x -= 1.2;
        bounds.max.x += 1.2;
        bounds.min.y -= 0.5;
        bounds.max.y += 4.2; // Pastikan seluruh plang / sign rak terlihat utuh
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

      let lookTarget;
      let targetPos;

      if (isAll) {
        if (hudOffset) {
          // Sudut pandang offset saat dropdown dibuka: geser gudang ke area kanan agar Rak 1 tidak terhalang
          lookTarget = new THREE.Vector3(-11.0, 1.5, -52.0);
          targetPos = new THREE.Vector3(-70.0, 46.0, -96.0);
        } else {
          // Sudut pandang default persis referensi visual pengguna (overview denah arsitektur & seluruh rak)
          lookTarget = new THREE.Vector3(-25.1, 1.5, -34.4);
          targetPos = new THREE.Vector3(-80.0, 42.2, -77.3);
        }
      } else {
        const curRackId = Number(activeRackRef.current);
        lookTarget = center.clone();
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
        flyControlsTargetRef.current = lookTarget.clone();
        flyCameraTargetRef.current = targetPos;
      } else {
        controls.target.copy(lookTarget);
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
      fitFrontView(false, isHudExpanded);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    const onCanvasWheel = () => {
      setIsHudExpanded(false);
    };
    renderer.domElement.addEventListener('wheel', onCanvasWheel, { passive: true });

    // Cleanup
    return () => {
      rendererRef.current = null;
      resizeObserver.disconnect();
      fitCameraRef.current = null;
      renderer.domElement.removeEventListener('wheel', onCanvasWheel);
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
      focusRackRef.current = null;
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

  // Smooth flight kamera ke rak/box saat mouse meng-hover sampel pada fitur search
  useEffect(() => {
    if (!previewFocusBoxNumber) return;
    lastUserInteractionTimeRef.current = Date.now();
    const boxNum = Number(previewFocusBoxNumber);
    const boxData = boxes.find(b => Number(b.boxNumber) === boxNum);
    if (!boxData) return;

    setHoveredBox(boxData);

    const targetRackId = Number(boxData.rackId);
    if (targetRackId && targetRackId !== 0 && focusRackRef.current) {
      focusRackRef.current(targetRackId);
    } else {
      // Box di lantai (rackId 0)
      const mesh = boxMeshesRef.current.find(m => Number(m.userData?.boxNumber) === boxNum);
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
  }, [previewFocusBoxNumber, boxes]);

  // Listener untuk klik logo brand header atau tab BOX: kembali ke sudut pandang home default 3D
  useEffect(() => {
    const handleResetHome = () => {
      lastUserInteractionTimeRef.current = Date.now();
      activeRackRef.current = 'ALL';
      setIsHudExpanded(false);
      fitCameraRef.current?.(true, false);
      setHoveredBox(null);
    };
    window.addEventListener('gagaclo_reset_3d_home_view', handleResetHome);
    return () => window.removeEventListener('gagaclo_reset_3d_home_view', handleResetHome);
  }, []);

  // Saat dropdown status box dibuka, geser kamera 3D agar Rak 1-5 tidak terhalang dropdown.
  // Saat dropdown ditutup, kembalikan kamera ke sudut pandang default.
  useEffect(() => {
    if (activeRackRef.current === 'ALL' && fitCameraRef.current) {
      fitCameraRef.current(true, isHudExpanded);
    }
  }, [isHudExpanded]);

  // Reapply PIC/search selection whenever filters change or cloud sync rebuilds
  // the scene. A box stays solid only when it satisfies every active filter.
  useEffect(() => {
    const picFilterActive = highlightPpic !== 'ALL';
    const targetHoverNum = previewFocusBoxNumber ? Number(previewFocusBoxNumber) : null;

    for (const mesh of boxMeshesRef.current) {
      const meshBoxNum = Number(mesh.userData.boxNumber);
      const isTargetHover = targetHoverNum !== null && meshBoxNum === targetHoverNum;
      const picMatches = !picFilterActive || matchesPic(mesh.userData.picName, highlightPpic);
      const searchMatches = !searchActive || highlightBoxNumbers.has(meshBoxNum);
      const dimmed = !isTargetHover && (!picMatches || !searchMatches);
      const highlighted = isTargetHover || (!dimmed && (picFilterActive || searchActive));
      mesh.castShadow = !dimmed;

      for (const material of new Set(mesh.material)) {
        material.transparent = dimmed;
        material.depthWrite = !dimmed;
        material.opacity = isTargetHover ? 1 : dimmed ? 0.12 : 1;
        if (isTargetHover) {
          // Box yang di-hover: sorot dengan warna emas/kuning menyala
          material.color.setHex(0xffd700);
        } else {
          material.color.setHex(highlighted && !material.map ? mesh.userData.baseColor : 0xffffff);
        }
        material.needsUpdate = true;
      }
    }
  }, [highlightPpic, highlightBoxNumbers, searchActive, boxes, racks, ppicMembers, previewFocusBoxNumber]);

  return (
    <div className="warehouse-layout space-y-4 font-apple">
      {/* Main 3D Canvas Container */}
      <div className="warehouse-viewport inventory-panel relative w-full h-[380px] sm:h-[480px] lg:h-[580px] overflow-hidden rounded-[24px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-500 bg-gradient-to-b from-emerald-200 via-teal-100 to-amber-50">
        
        {/* Three.js viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* WebGL Fallback Overlay if GPU context is unavailable */}
        {webGlError && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3.5 animate-fade-in font-apple">
            <div className="h-14 w-14 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
              <Boxes className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Akselerasi 3D (WebGL) Diperlukan
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Browser atau perangkat Anda belum mengaktifkan WebGL. Buka <strong>Settings &gt; System</strong> di browser Chrome/Edge, aktifkan <strong>"Use graphics acceleration when available"</strong> (Gunakan akselerasi grafis), lalu restart browser.
            </p>
            <button
              type="button"
              onClick={handleRetryWebGl}
              className="mt-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Coba Muat Ulang 3D</span>
            </button>
          </div>
        )}

        {/* Controls (Top Right): Fit View Default (Apple Floating Pill) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2 font-apple">
          <button
            type="button"
            onClick={() => {
              activeRackRef.current = 'ALL';
              fitCameraRef.current?.(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md backdrop-blur-2xl border border-black/[0.08] cursor-pointer active:scale-95 bg-white/85 text-[#1d1d1f] hover:bg-white"
            title="Kembalikan sudut pandang kamera ke posisi default (Fit View Default)"
          >
            <Maximize2 className="h-3.5 w-3.5 text-[#0071e3]" />
            <span>Fit View Default</span>
          </button>
        </div>

        {/* Anjing Penjaga 15-Menit Inactivity Reminder Banner */}
        {dogReminderActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%] sm:w-auto bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-slate-950 px-5 py-3.5 rounded-[20px] shadow-xl border-2 border-white ring-4 ring-amber-400/50 animate-bounce font-apple">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug">
                "Woof woof! 🐾 Hey, please fill data on the box!"
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDogReminderActive(false);
                    lastInputTimeRef.current = Date.now();
                  }}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-full text-xs font-bold transition shadow-md cursor-pointer active:scale-95"
                >
                  OK, Siap! 🐾
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Glass HUD: Status Box & Rekap PIC (Pojok Kiri Atas Viewport 3D - Opsi 1) */}
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4 z-20 flex flex-col items-start gap-2 font-apple" ref={hudRef}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Kapsul Utama HUD (Collapsible Pill) */}
            <button
              type="button"
              onClick={() => setIsHudExpanded((prev) => !prev)}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-2xl border transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
                isHudExpanded
                  ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-md'
                  : 'bg-white/90 hover:bg-white text-[#1d1d1f] border-black/[0.08]'
              }`}
              title="Buka / tutup panel rekap box & PIC"
            >
              <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-[5px] ${isHudExpanded ? 'bg-white/20 text-white' : 'bg-[#0071e3]/10 text-[#0071e3]'}`}>
                <Boxes className="h-3 w-3 stroke-[2.2]" />
              </div>
              <span>Status Box &amp; PIC</span>
              <span className={`flex items-center gap-1 text-[11px] font-medium pl-1 border-l ${isHudExpanded ? 'border-white/20 text-white/80' : 'border-black/[0.08] text-[#86868b]'}`}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff3b30]"></span>
                <span className="tabular-nums font-semibold">{totalKurang}</span> Kurang
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isHudExpanded ? 'rotate-180 text-white' : 'text-[#86868b]'}`} />
            </button>

            {/* Active search pill */}
            {searchActive && (
              <div className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0071e3] shadow-sm backdrop-blur-xl">
                <Search className="h-3 w-3" aria-hidden="true" />
                <span>{highlightBoxNumbers.size} cocok</span>
                {onClearSearch && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="rounded-full px-1 text-[#0071e3] hover:text-[#ff3b30] underline cursor-pointer"
                    title="Hapus pencarian"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {/* Active PIC filter pill */}
            {highlightPpic !== 'ALL' && (
              <div className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0071e3] shadow-sm backdrop-blur-xl">
                <span>PIC: @{highlightPpic}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightPpic('ALL');
                    activeRackRef.current = 'ALL';
                    fitCameraRef.current?.(true, isHudExpanded);
                  }}
                  className="rounded-full px-1 text-[#0071e3] hover:text-[#ff3b30] underline cursor-pointer"
                  title="Reset filter PIC & kembali ke Fit View Default"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Expanded Floating Glass HUD Card */}
          {isHudExpanded && (
            <div className="w-[320px] sm:w-[480px] md:w-[560px] max-w-[92vw] max-h-[72vh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-[22px] border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-4 animate-in fade-in zoom-in-95 duration-150 font-apple whitespace-normal select-none">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#0071e3]/10 text-[#0071e3]">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] leading-none">Status &amp; Rekap Pengisian Box</h3>
                    <p className="text-[10px] text-[#86868b] mt-0.5">72 Box • 5 Rak • 5 PIC PPIC</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHudExpanded(false)}
                  className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition cursor-pointer"
                  title="Ciutkan panel (ESC)"
                  aria-label="Ciutkan panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Rekap Box Kurang per PIC */}
              <div className="mb-3">
                <PpicMissingMentionBar activePic={highlightPpic} onSelectPic={setHighlightPpic} compact={true} />
              </div>

              {/* Status Pengisian Box (3 Kolom Apple Cards) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#86868b] uppercase tracking-wider px-0.5">
                  <span>Status Pengisian Box ({boxes.length} Box)</span>
                  {highlightPpic !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightPpic('ALL');
                        activeRackRef.current = 'ALL';
                        fitCameraRef.current?.(true, isHudExpanded);
                      }}
                      className="text-[#0071e3] hover:underline font-semibold lowercase cursor-pointer"
                    >
                      difilter: @{highlightPpic} (reset)
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {occupancyGroups.map((group) => (
                    <div key={group.label} className="p-2.5 bg-black/[0.02] rounded-[16px] border border-black/[0.06] transition-all flex flex-col">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#1d1d1f]">
                        <span>{group.label}</span>
                        <span className={`rounded-full px-2 py-0.2 text-[10px] font-semibold tabular-nums ${group.badgeClass}`}>{group.boxes.length} Box</span>
                      </div>
                      <div className="flex flex-wrap gap-1 p-0.5 max-h-40 overflow-y-auto pr-1">
                        {group.boxes.map((box) => (
                          <button
                            key={box.boxNumber}
                            type="button"
                            aria-label={`Box ${box.boxNumber}, ${group.label}`}
                            onMouseEnter={() => {
                              const targetRackId = Number(box.rackId);
                              if (targetRackId && targetRackId !== 0 && focusRackRef.current) {
                                focusRackRef.current(targetRackId);
                              }
                              setHoveredBox(box);
                              lastUserInteractionTimeRef.current = Date.now();
                            }}
                            onClick={() => {
                              setSelectedBoxNumber(box.boxNumber);
                              setIsHudExpanded(false);
                            }}
                            className={`inline-flex h-6.5 min-w-6.5 items-center justify-center rounded-[7px] px-1 text-xs font-semibold tabular-nums transition-all border active:scale-95 cursor-pointer ${group.boxClass}`}
                            title={`Klik untuk buka BOX #${box.boxNumber} (${box.rackName || 'Rak'}, PIC: ${box.picName || '-'})`}
                          >
                            {box.boxNumber}
                          </button>
                        ))}
                        {group.boxes.length === 0 && <span className="text-[11px] text-[#86868b] italic py-1">Tidak ada box</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Info */}
              <div className="mt-3 pt-2 border-t border-black/[0.05] flex items-center justify-between text-[10px] text-[#86868b]">
                <span>Hover nomor box untuk intip rak 3D • Klik nomor untuk buka</span>
                <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] text-[9px] font-mono text-[#86868b]">ESC</kbd>
              </div>
            </div>
          )}
        </div>

        {/* Hovered Box HUD Card (Bottom Right - Apple VisionOS / macOS Glass Card) */}
        {hoveredBox && (
          <div className="absolute bottom-13 right-3 sm:bottom-14 sm:right-4 z-20 bg-black/85 backdrop-blur-2xl p-4 rounded-[20px] border border-white/[0.12] text-white text-xs max-w-sm shadow-2xl animate-fade-in pointer-events-none font-apple">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white tabular-nums">
                #{hoveredBox.boxNumber}
              </span>
              <span className="font-mono text-xs text-white/60">
                {hoveredBox.code}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                hoveredBox.category === 'SAMPLE' ? 'bg-[#ff9500]/20 text-[#ff9f0a] border border-[#ff9500]/30' : 'bg-[#34c759]/20 text-[#30d158] border border-[#34c759]/30'
              }`}>
                {hoveredBox.category} BOX
              </span>
            </div>

            <div className="mt-2.5 space-y-1 text-white/80">
              <p>📍 <strong>{hoveredBox.rackName}</strong> • {hoveredBox.rackDescription}</p>
              <p>👤 PIC PPIC: <strong className="text-white font-semibold">{hoveredBox.picName}</strong></p>
              <p>📦 Tersimpan: <strong className="text-[#30d158] font-semibold">{getItemsInBox(hoveredBox.boxNumber).length} item</strong></p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/[0.1] text-xs text-[#2997ff] font-semibold flex items-center space-x-1">
              <span>Klik 1x fokus • Klik 2x buka popup jendela</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Controls Hint (Bottom Right - Apple Floating Capsule) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 bg-black/75 backdrop-blur-2xl px-3.5 py-1.5 rounded-full border border-white/[0.1] text-xs text-white/90 pointer-events-none flex flex-wrap items-center gap-2 shadow-lg font-apple">
          <span className="text-[#ff9f0a] font-medium">Klik 2x: Buka Popup</span>
          <span className="text-white/20">•</span>
          <span className="text-white/70">Putar: Klik Kiri</span>
          <span className="text-white/20">•</span>
          <span className="text-white/70">Zoom: Scroll</span>
          <span className="text-white/20">•</span>
          <span className="text-white/70">Geser: Klik Kanan</span>
        </div>

      </div>

    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildLowPolyForestScene } from './lowPolyForestScene';
import { useInventory } from '../context/InventoryContext';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { getBoxDisplayNumber } from '../utils/boxDisplayUtils';
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
  Crosshair,
  Move,
  RotateCw,
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
  const [showFloorCoords, setShowFloorCoords] = useState(true);
  const showFloorCoordsRef = useRef(true);
  const floorCoordsGroupRef = useRef(null);
  const cursorMarkerRef = useRef(null);
  const [cursorFloorCoord, setCursorFloorCoord] = useState(null);
  const [pinnedFloorCoord, setPinnedFloorCoord] = useState(null);
  const lastCursorCoordRef = useRef({ x: null, z: null });

  const LEMARI_POS_MAP_KEY = 'gagaclo_lemari_positions_v1';
  const LEGACY_LEMARI1_KEY = 'gagaclo_lemari1_pos_v1';
  const DEFAULT_LEMARI_POSITIONS = {
    6:  { x: 13.5, z: -33.5, rotationY: -Math.PI / 2 },
    7:  { x: 20.0, z: -48.2, rotationY: 0 },
    8:  { x: 25.5, z: -48.2, rotationY: 0 },
    9:  { x: 31.0, z: -48.2, rotationY: 0 },
    10: { x: 36.5, z: -48.2, rotationY: 0 },
    11: { x: 42.0, z: -48.2, rotationY: 0 },
    12: { x: 47.5, z: -48.2, rotationY: 0 },
    13: { x: 53.0, z: -42.5, rotationY: -Math.PI / 2 },
    14: { x: 53.0, z: -36.5, rotationY: -Math.PI / 2 },
    15: { x: 45.0, z: -31.8, rotationY: Math.PI },
    16: { x: 39.5, z: -31.8, rotationY: Math.PI },
    17: { x: 25.0, z: -15.8, rotationY: Math.PI },
  };
  const [lemariPositions, setLemariPositions] = useState(() => {
    const merged = { ...DEFAULT_LEMARI_POSITIONS };
    try {
      const legacy = localStorage.getItem(LEGACY_LEMARI1_KEY);
      if (legacy) {
        const p = JSON.parse(legacy);
        if (Number.isFinite(p?.x) && Number.isFinite(p?.z)) {
          merged[6] = { x: Number(p.x), z: Number(p.z), rotationY: Number.isFinite(p.rotationY) ? Number(p.rotationY) : -Math.PI / 2 };
        }
      }
      const saved = localStorage.getItem(LEMARI_POS_MAP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([idKey, val]) => {
            if (Number.isFinite(val?.x) && Number.isFinite(val?.z)) {
              merged[Number(idKey)] = {
                x: Number(val.x),
                z: Number(val.z),
                rotationY: Number.isFinite(val.rotationY) ? Number(val.rotationY) : 0,
              };
            }
          });
        }
      }
    } catch {}
    return merged;
  });
  const lemariPositionsRef = useRef(lemariPositions);
  const [movingLemariId, setMovingLemariId] = useState(6);
  const movingLemariIdRef = useRef(6);
  const [isMovingLemari, setIsMovingLemari] = useState(false);
  const isMovingLemariRef = useRef(false);
  const lemariGroupsRef = useRef(new Map());
  const lemariSpritesRef = useRef(new Map());
  const lemariConfsRef = useRef(new Map());

  const applyLemariTransform = (targetRackId, nextPos) => {
    const rId = Number(targetRackId);
    const updatedMap = { ...lemariPositionsRef.current, [rId]: nextPos };
    lemariPositionsRef.current = updatedMap;
    setLemariPositions(updatedMap);
    try {
      localStorage.setItem(LEMARI_POS_MAP_KEY, JSON.stringify(updatedMap));
    } catch {}
    const grp = lemariGroupsRef.current.get(rId);
    if (grp) {
      grp.position.set(nextPos.x, 0, nextPos.z);
      grp.rotation.y = nextPos.rotationY;
    }
    const spr = lemariSpritesRef.current.get(rId);
    if (spr) {
      spr.position.x = nextPos.x;
      spr.position.z = nextPos.z;
    }
    const conf = lemariConfsRef.current.get(rId);
    if (conf) {
      conf.x = nextPos.x;
      conf.z = nextPos.z;
      conf.rotationY = nextPos.rotationY;
    }
  };

  useEffect(() => {
    isMovingLemariRef.current = isMovingLemari;
  }, [isMovingLemari]);

  useEffect(() => {
    movingLemariIdRef.current = movingLemariId;
  }, [movingLemariId]);

  useEffect(() => {
    showFloorCoordsRef.current = showFloorCoords;
    if (floorCoordsGroupRef.current) {
      floorCoordsGroupRef.current.visible = showFloorCoords;
    }
    if (!showFloorCoords) {
      if (cursorMarkerRef.current) cursorMarkerRef.current.visible = false;
      setCursorFloorCoord(null);
    }
  }, [showFloorCoords]);
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
  const previewFocusBoxNumberRef = useRef(previewFocusBoxNumber);
  useEffect(() => {
    previewFocusBoxNumberRef.current = previewFocusBoxNumber;
  }, [previewFocusBoxNumber]);
  const hoveredBoxRef = useRef(hoveredBox);
  useEffect(() => {
    hoveredBoxRef.current = hoveredBox;
  }, [hoveredBox]);

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
  const createBoxFaceTexture = (boxNumber, picName, category, rackName, rackDescription, itemCount = 0, isFull = false, isCarton = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384; // 4:3 aspect ratio
    const ctx = canvas.getContext('2d');

    if (isCarton) {
      // Kraft brown carton face with pasted white official label
      ctx.fillStyle = '#b5835a';
      ctx.fillRect(0, 0, 512, 384);

      // Subtle cardboard corrugated grain stripes
      ctx.fillStyle = 'rgba(92, 58, 33, 0.08)';
      for (let y = 0; y < 384; y += 12) {
        ctx.fillRect(0, y, 512, 4);
      }

      // Packing tape strip along top edge
      ctx.fillStyle = '#cfa378';
      ctx.fillRect(0, 0, 512, 22);

      // Inner white sticker label pasted on carton
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, 24, 468, 338);
      ctx.strokeStyle = '#3b2414';
      ctx.lineWidth = 10;
      ctx.strokeRect(22, 24, 468, 338);
    } else {
      // 1. Background White
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 384);

      // 2. Thick Outer Black Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 498, 370);
    }

    // 3. Header: CARTON BOX, SAMPLE BOX, or MATERIAL BOX (left-aligned)
    ctx.fillStyle = isCarton ? '#5c3317' : '#000000';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const headerTitle = isCarton ? 'CARTON BOX' : (category === 'SAMPLE' ? 'SAMPLE BOX' : 'MATERIAL BOX');
    ctx.fillText(headerTitle, isCarton ? 38 : 26, isCarton ? 58 : 48);

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

    // 4. Giant Box Number (1-72 atau 1A-10A untuk Lemari 1)
    const displayNum = getBoxDisplayNumber(boxNumber);
    ctx.fillStyle = '#000000';
    ctx.font = displayNum.length >= 3 ? '900 128px system-ui, sans-serif' : '900 150px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(displayNum, 256, 205);

    // 5. Black Divider Line
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(14, 230);
    ctx.lineTo(498, 230);
    ctx.stroke();

    // 6. Lavender Bar for PIC Name (matching user image #c8d0ff)
    ctx.fillStyle = '#c8d0ff';
    ctx.fillRect(14, 234, 484, 60);

    // PIC Name text (kosongkan jika box campur tanpa PIC)
    ctx.fillStyle = '#000000';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.fillText(picName || '', 256, 278);

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
      ...Object.fromEntries(
        Array.from({ length: 12 }, (_, idx) => {
          const rId = 6 + idx;
          const pos = lemariPositionsRef.current[rId] || DEFAULT_LEMARI_POSITIONS[rId];
          return [
            rId,
            {
              x: pos.x,
              z: pos.z,
              rotationY: pos.rotationY,
              cols: 2,
              rows: 5,
              beamColor: 0x6b4f3b,
              isCabinet: true,
              shelfHeight: 1.32,
            },
          ];
        })
      ),
    };
    lemariGroupsRef.current.clear();
    lemariSpritesRef.current.clear();
    lemariConfsRef.current.clear();
    let nextExtraX = 22;
    const rackPositions = racks
      .filter((r) => Number(r.id) !== 0)
      .map((r) => {
        const preset = presetPositions[r.id];
        if (preset) {
          return { rackId: r.id, ...preset };
        }
        const isLemari = String(r.rackType || r.name || '').toLowerCase().includes('lemari');
        const conf = {
          rackId: r.id,
          x: nextExtraX,
          z: -42,
          rotationY: 0,
          cols: isLemari ? 2 : 4,
          rows: isLemari ? 5 : 3,
          beamColor: isLemari ? 0x6b4f3b : 0xcbd5e1,
          isCabinet: isLemari,
          shelfHeight: isLemari ? 1.32 : 1.9,
        };
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

    // --- FLOOR COORDINATE GRID OVERLAY (UNTUK MEMUDAHKAN PEMINDAHAN LEMARI / RAK) ---
    const isPointInsideFloor = (px, pz) => {
      if (px >= -30 && px <= 0 && pz >= -50 && pz <= 50) return true;
      if (px >= 0 && px <= 15 && pz >= -50 && pz <= -14) return true;
      if (px >= 15 && px <= 55 && pz >= -50 && pz <= -30) return true;
      if (px >= 15 && px <= 35 && pz >= -30 && pz <= -14) return true;
      return false;
    };

    const floorCoordsGroup = new THREE.Group();
    floorCoordsGroup.visible = showFloorCoordsRef.current;
    scene.add(floorCoordsGroup);
    floorCoordsGroupRef.current = floorCoordsGroup;

    // 1. Grid Lines (tiap 5m minor, tiap 10m major) tepat di atas lantai putih (y = 0.075)
    const minorLinePoints = [];
    const majorLinePoints = [];
    const gridY = 0.075;

    // Vertical lines (constant X, varying Z)
    for (let x = -30; x <= 55; x += 5) {
      const targetArr = x % 10 === 0 ? majorLinePoints : minorLinePoints;
      for (let z = -50; z < 50; z += 1) {
        const midZ = z + 0.5;
        if (isPointInsideFloor(x, midZ)) {
          targetArr.push(x, gridY, z, x, gridY, z + 1);
        }
      }
    }
    // Horizontal lines (constant Z, varying X)
    for (let z = -50; z <= 50; z += 5) {
      const targetArr = z % 10 === 0 ? majorLinePoints : minorLinePoints;
      for (let x = -30; x < 55; x += 1) {
        const midX = x + 0.5;
        if (isPointInsideFloor(midX, z)) {
          targetArr.push(x, gridY, z, x + 1, gridY, z);
        }
      }
    }

    if (minorLinePoints.length > 0) {
      const minorGeo = new THREE.BufferGeometry();
      minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorLinePoints, 3));
      const minorMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.4 });
      floorCoordsGroup.add(new THREE.LineSegments(minorGeo, minorMat));
    }
    if (majorLinePoints.length > 0) {
      const majorGeo = new THREE.BufferGeometry();
      majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorLinePoints, 3));
      const majorMat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.55 });
      floorCoordsGroup.add(new THREE.LineSegments(majorGeo, majorMat));
    }

    // 2. Flat Coordinate Labels di persimpangan grid tiap 10m (plus titik tengah Bilik 1-3)
    const createFloorCoordLabel = (text, bgColor = 'rgba(255,255,255,0.88)', textColor = '#1d4ed8') => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 72, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = 'bold 34px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 42);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), mat);
      plane.rotation.x = -Math.PI / 2;
      return plane;
    };

    for (let x = -25; x <= 50; x += 10) {
      for (let z = -45; z <= 45; z += 10) {
        if (isPointInsideFloor(x, z)) {
          const label = createFloorCoordLabel(`${x},${z}`);
          label.position.set(x, 0.085, z);
          floorCoordsGroup.add(label);
        }
      }
    }

    // 3. Live Mouse Cursor Target Ring di Lantai
    const cursorMarker = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 24),
      new THREE.MeshBasicMaterial({ color: 0x0071e3, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    outerRing.rotation.x = -Math.PI / 2;
    const centerDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    centerDot.rotation.x = -Math.PI / 2;
    cursorMarker.add(outerRing, centerDot);
    cursorMarker.visible = false;
    scene.add(cursorMarker);
    cursorMarkerRef.current = cursorMarker;
    const floorHitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06);
    const floorHitPoint = new THREE.Vector3();

    const boxMeshes = [];
    const interactiveRackMeshes = [];

    rackPositions.forEach((rackConf) => {
      const rackData = racks.find((r) => Number(r.id) === Number(rackConf.rackId));
      if (!rackData) return;

      const { x: rx, z: rz, rotationY = 0, cols, rows, beamColor, isCabinet = false } = rackConf;
      const isLemari = isCabinet || String(rackData.rackType || rackData.name || '').toLowerCase().includes('lemari');
      const rackWidth = cols * 1.8 + (isLemari ? 0.5 : 0.4);
      const shelfHeight = rackConf.shelfHeight || (isLemari ? 1.32 : 1.9);
      const rackDepth = isLemari ? 1.65 : 1.6;
      const totalRackHeight = rows * shelfHeight + 0.5;
      const hasTopCover = isLemari || (rackConf.rackId !== 1 && rackConf.rackId !== 2);
      const firstShelfY = 0.2;
      const pillarHeight = hasTopCover
        ? totalRackHeight
        : firstShelfY + (rows - 1) * shelfHeight + 0.08;

      const rackGroup = new THREE.Group();
      rackGroup.position.set(rx, 0, rz);
      rackGroup.rotation.y = rotationY;
      scene.add(rackGroup);
      if (isLemari) {
        lemariGroupsRef.current.set(Number(rackConf.rackId), rackGroup);
        lemariConfsRef.current.set(Number(rackConf.rackId), rackConf);
      }

      const halfW = rackWidth / 2;
      const halfD = rackDepth / 2;

      if (isLemari) {
        // --- 3D LEMARI PENYIMPANAN (OPEN-FRONT WOODEN CABINET WITHOUT DOORS) ---
        const cabinetBodyMat = new THREE.MeshStandardMaterial({
          color: 0x5c4033, // Rich walnut / dark oak cabinet exterior
          roughness: 0.62,
          metalness: 0.08,
        });
        const cabinetShelfMat = new THREE.MeshStandardMaterial({
          color: 0x8b6b52, // Warm wood interior shelves
          roughness: 0.72,
          metalness: 0.05,
        });

        // Left & Right Side Walls
        const sideWallGeo = new THREE.BoxGeometry(0.16, totalRackHeight, rackDepth);
        [-halfW, halfW].forEach((sx) => {
          const wall = new THREE.Mesh(sideWallGeo, cabinetBodyMat);
          wall.position.set(sx, totalRackHeight / 2, 0);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
          rackGroup.add(wall);
          interactiveRackMeshes.push(wall);
        });

        // Solid Back Panel
        const backPanelGeo = new THREE.BoxGeometry(rackWidth + 0.16, totalRackHeight, 0.12);
        const backPanel = new THREE.Mesh(backPanelGeo, cabinetBodyMat);
        backPanel.position.set(0, totalRackHeight / 2, -halfD + 0.02);
        backPanel.castShadow = true;
        backPanel.receiveShadow = true;
        backPanel.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(backPanel);
        interactiveRackMeshes.push(backPanel);

        // Top Roof Crown
        const topPanelGeo = new THREE.BoxGeometry(rackWidth + 0.32, 0.18, rackDepth + 0.16);
        const topPanel = new THREE.Mesh(topPanelGeo, cabinetBodyMat);
        topPanel.position.set(0, totalRackHeight + 0.08, 0.04);
        topPanel.castShadow = true;
        topPanel.receiveShadow = true;
        topPanel.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(topPanel);
        interactiveRackMeshes.push(topPanel);

        // Base Plinth
        const baseGeo = new THREE.BoxGeometry(rackWidth + 0.12, 0.22, rackDepth);
        const baseMesh = new THREE.Mesh(baseGeo, cabinetBodyMat);
        baseMesh.position.set(0, 0.11, 0);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
        rackGroup.add(baseMesh);
        interactiveRackMeshes.push(baseMesh);

        // Center Vertical Divider (between 2 columns of carton boxes)
        if (cols === 2) {
          const divGeo = new THREE.BoxGeometry(0.10, totalRackHeight - 0.22, rackDepth - 0.18);
          const divMesh = new THREE.Mesh(divGeo, cabinetShelfMat);
          divMesh.position.set(0, totalRackHeight / 2 + 0.08, -0.02);
          divMesh.castShadow = true;
          divMesh.receiveShadow = true;
          divMesh.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
          rackGroup.add(divMesh);
          interactiveRackMeshes.push(divMesh);
        }

        // Horizontal Wooden Shelves
        for (let r = 0; r < rows; r++) {
          const sy = firstShelfY + r * shelfHeight;
          const shelfGeo = new THREE.BoxGeometry(rackWidth - 0.08, 0.09, rackDepth - 0.16);
          const shelf = new THREE.Mesh(shelfGeo, cabinetShelfMat);
          shelf.position.set(0, sy + 0.04, 0);
          shelf.castShadow = true;
          shelf.receiveShadow = true;
          shelf.userData = { rackId: rackConf.rackId, type: 'rack-structure' };
          rackGroup.add(shelf);
          interactiveRackMeshes.push(shelf);
        }
      } else {
        // 1. Upright Steel Pillars (4 vertical posts)
        const pillarGeo = new THREE.BoxGeometry(0.15, pillarHeight, 0.15);
        const pillarMat = new THREE.MeshStandardMaterial({
          color: beamColor,
          metalness: 0.6,
          roughness: 0.3,
        });

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
      }

      // 3. High-Visibility All-Angle Billboard Sprite (Papan Nama Rak / Lemari Terapung)
      const isSample = rackData.category === 'SAMPLE';
      const badgeAccent = isLemari ? '#d97706' : (isSample ? '#f59e0b' : '#10b981');

      // Floating Billboard Sprite (Selalu Menghadap Kamera dari Segala Sudut / All-Angle View)
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 1024;
      spriteCanvas.height = 320;
      const spCtx = spriteCanvas.getContext('2d');

      // Rounded container pill
      spCtx.beginPath();
      spCtx.roundRect(16, 16, 992, 288, 56);
      spCtx.fillStyle = isLemari ? 'rgba(69, 39, 18, 0.95)' : 'rgba(15, 23, 42, 0.94)';
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
      spCtx.fillStyle = isLemari ? '#fde68a' : '#cbd5e1';
      spCtx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      const rackBoxes = boxes.filter((b) => Number(b.rackId) === Number(rackConf.rackId));
      const subInfo = isLemari
        ? `BOX CARTON COKLAT • ${rackBoxes.length || cols * rows} BOX`
        : `${isSample ? 'SAMPLE R&D' : 'FABRIC/MATERIAL'} • ${cols * rows} BOX`;
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
      if (isLemari) {
        lemariSpritesRef.current.set(Number(rackConf.rackId), rackSprite);
      }

      // 4. Place 3D Boxes with the Official GAGACLO Label on Front Face
      const sortedRackBoxes = [...rackBoxes].sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));
      sortedRackBoxes.forEach((boxObj, index) => {
        const colIdx = index % cols;
        const rawRowIdx = Math.floor(index / cols);
        // Untuk Lemari, urutan box dimulai dari rak paling ATAS (1A, 1B di atas -> 1I, 1J di bawah)
        const rowIdx = isLemari ? Math.max(0, (rows - 1) - rawRowIdx) : rawRowIdx;

        // Position coordinates in rackGroup local space
        const localX = isLemari
          ? -halfW + 0.95 + colIdx * 1.85
          : -halfW + 0.9 + colIdx * 1.8;
        const localY = 0.2 + rowIdx * shelfHeight + 0.48;
        const localZ = 0;

        const isCarton = isLemari || boxObj.boxType === 'CARTON' || String(boxObj.code || '').toUpperCase().startsWith('CARTON');

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
          boxObj.isFull,
          isCarton
        );
        const baseColor = isCarton ? 0xb5835a : (ppicColorMap[boxObj.picName] || 0x3b82f6);

        const sideMat = new THREE.MeshStandardMaterial({
          color: isCarton ? 0xb5835a : 0xffffff,
          roughness: isCarton ? 0.88 : 0.6,
          metalness: isCarton ? 0.02 : 0.05,
        });

        const frontMat = new THREE.MeshStandardMaterial({
          map: frontTexture,
          roughness: isCarton ? 0.55 : 0.3,
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
          isCarton,
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

    // --- FLOATING 3D BEACON PIN & NEON WIREFRAME HALO (The Precision Beacon) ---
    const beaconGroup = new THREE.Group();
    beaconGroup.visible = false;

    // Pointer Pin (kerucut terbalik mengarah persis ke atas muka box tanpa ada jarak)
    const coneHeight = 0.65;
    const coneGeo = new THREE.ConeGeometry(0.28, coneHeight, 16);
    coneGeo.rotateX(Math.PI);
    coneGeo.translate(0, coneHeight / 2, 0); // Apex / ujung runcing pointer berada tepat di y = 0
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.6,
    });
    const pinMesh = new THREE.Mesh(coneGeo, pinMat);
    beaconGroup.add(pinMesh);

    // Glowing Orb / Diamond di puncak pin pointer
    const orbGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.2,
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.y = coneHeight + 0.12;
    beaconGroup.add(orbMesh);

    // Pulsing Horizontal Ring mengitari pin
    const ringGeo = new THREE.TorusGeometry(0.38, 0.03, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = coneHeight * 0.65;
    beaconGroup.add(ringMesh);

    scene.add(beaconGroup);

    // Glowing Wireframe Halo di sekeliling box yang sedang di-hover
    const wireframeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.36, 0.76, 1.12));
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const wireframeHelper = new THREE.LineSegments(wireframeGeo, wireframeMat);
    wireframeHelper.visible = false;
    scene.add(wireframeHelper);

    // Helper: Fokus kamera close view tegak lurus menghadap muka rak (face side fit)
    const focusRackFaceSide = (rackId) => {
      const rId = Number(rackId);
      const conf = rackPositions.find(r => Number(r.rackId) === rId);
      if (!conf) return;

      const { x: rx, z: rz, rotationY = 0, cols, rows, isCabinet = false } = conf;
      const rackWidth = cols * 1.8 + (isCabinet ? 0.5 : 0.4);
      const shelfHeight = conf.shelfHeight || (isCabinet ? 1.32 : 1.9);
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

      // Update live floor coordinate tracker saat fitur Koordinat Lantai aktif
      if (showFloorCoordsRef.current && raycaster.ray.intersectPlane(floorHitPlane, floorHitPoint)) {
        if (isPointInsideFloor(floorHitPoint.x, floorHitPoint.z)) {
          cursorMarker.position.set(floorHitPoint.x, 0.095, floorHitPoint.z);
          cursorMarker.visible = true;
          const rx = Math.round(floorHitPoint.x * 2) / 2;
          const rz = Math.round(floorHitPoint.z * 2) / 2;
          if (lastCursorCoordRef.current.x !== rx || lastCursorCoordRef.current.z !== rz) {
            lastCursorCoordRef.current = { x: rx, z: rz };
            setCursorFloorCoord({ x: rx, z: rz });
          }
        } else {
          cursorMarker.visible = false;
          if (lastCursorCoordRef.current.x !== null) {
            lastCursorCoordRef.current = { x: null, z: null };
            setCursorFloorCoord(null);
          }
        }
      } else {
        cursorMarker.visible = false;
      }

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

      // Mode Pindah Lemari: klik titik mana saja di lantai langsung memindahkan Lemari terpilih ke titik kursor!
      if (isMovingLemariRef.current && raycaster.ray.intersectPlane(floorHitPlane, floorHitPoint)) {
        if (isPointInsideFloor(floorHitPoint.x, floorHitPoint.z)) {
          const nx = Math.round(floorHitPoint.x * 2) / 2;
          const nz = Math.round(floorHitPoint.z * 2) / 2;
          const targetId = movingLemariIdRef.current;
          const curPos = lemariPositionsRef.current[targetId] || { x: nx, z: nz, rotationY: 0 };
          applyLemariTransform(targetId, { ...curPos, x: nx, z: nz });
          setPinnedFloorCoord({ x: nx, z: nz });
          return;
        }
      }

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
        // Jika Koordinat Lantai aktif & klik area lantai kosong, kunci titik koordinat agar mudah dibaca/disalin
        if (showFloorCoordsRef.current && raycaster.ray.intersectPlane(floorHitPlane, floorHitPoint)) {
          if (isPointInsideFloor(floorHitPoint.x, floorHitPoint.z)) {
            setPinnedFloorCoord({
              x: Math.round(floorHitPoint.x * 2) / 2,
              z: Math.round(floorHitPoint.z * 2) / 2,
            });
          }
        }
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
      const curSelectedNum = selectedBoxNumberRef.current;
      const activeHoverNum = previewFocusBoxNumberRef.current !== null && previewFocusBoxNumberRef.current !== undefined
        ? Number(previewFocusBoxNumberRef.current)
        : (hoveredBoxRef.current ? Number(hoveredBoxRef.current.boxNumber) : null);

      const idleMs = Date.now() - lastUserInteractionTimeRef.current;
      const isActivelyMoving = Boolean(
        flyCameraTargetRef.current || 
        isUserInteractingRef.current || 
        curSelectedNum !== null ||
        currentHoveredMesh !== null ||
        activeHoverNum !== null
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

      // 2. Tactile box drawer slide-out animation & Pop-Out on Hover (Smooth Spring Lerp)
      let activeHoveredMesh = null;
      for (let i = 0; i < boxMeshesRef.current.length; i++) {
        const mesh = boxMeshesRef.current[i];
        const meshNum = Number(mesh.userData.boxNumber);
        const isSelected = curSelectedNum !== null && Number(curSelectedNum) === meshNum;
        const isHovered = activeHoverNum !== null && activeHoverNum === meshNum;

        if (isHovered) {
          activeHoveredMesh = mesh;
        }

        let targetZ = mesh.userData.initialLocalZ;
        let targetY = mesh.userData.initialLocalY;
        let targetScale = 1.0;

        if (isSelected) {
          targetZ += 0.42; // Drawer slide-out
          targetY += 0.08;
          targetScale = 1.05;
        } else if (isHovered) {
          targetZ += 0.32; // Box maju keluar rak saat di-hover (tactile pull-out)
          targetY += 0.05;
          targetScale = 1.04;
        }

        mesh.position.z += (targetZ - mesh.position.z) * 0.18;
        mesh.position.y += (targetY - mesh.position.y) * 0.18;

        const curScale = mesh.scale.x;
        const nextScale = curScale + (targetScale - curScale) * 0.18;
        mesh.scale.set(nextScale, nextScale, nextScale);

        // Subtle emissive glow on front label face
        if (mesh.material && mesh.material[4]) {
          const frontMat = mesh.material[4];
          if (isSelected) {
            frontMat.emissive.setHex(0x38bdf8);
            frontMat.emissiveIntensity = 0.35;
          } else if (isHovered) {
            frontMat.emissive.setHex(0x00f0ff);
            frontMat.emissiveIntensity = 0.4;
          } else {
            frontMat.emissive.setHex(0x000000);
            frontMat.emissiveIntensity = 0;
          }
        }
      }

      // 3. Floating 3D Animated Pin Pointer & Neon Wireframe Halo (The Precision Beacon)
      if (activeHoveredMesh) {
        beaconGroup.visible = true;
        const worldPos = new THREE.Vector3();
        activeHoveredMesh.getWorldPosition(worldPos);

        // Ujung bawah kerucut berada tepat di atas permukaan box persis tanpa ada jarak
        const boxTopY = worldPos.y + (0.75 * activeHoveredMesh.scale.y) / 2;
        beaconGroup.position.set(worldPos.x, boxTopY, worldPos.z);
        beaconGroup.rotation.y = elapsed * 2.5;

        // Cincin halo berdenyut
        const ringScale = 1.0 + Math.sin(elapsed * 6.0) * 0.15;
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        ringMat.opacity = 0.65 + Math.sin(elapsed * 6.0) * 0.3;

        // Garis tepi wireframe neon menyala di sekeliling box
        wireframeHelper.visible = true;
        wireframeHelper.position.copy(worldPos);
        activeHoveredMesh.getWorldQuaternion(wireframeHelper.quaternion);
        wireframeHelper.scale.copy(activeHoveredMesh.scale).multiplyScalar(1.02);
        const neonPulse = 0.75 + Math.sin(elapsed * 7.0) * 0.25;
        wireframeMat.color.setRGB(0, neonPulse, 1.0);
      } else {
        beaconGroup.visible = false;
        wireframeHelper.visible = false;
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
          // Geser posisi 3D persis referensi visual pengguna:
          // Berada di sisi kanan dengan ruang lapang di kiri untuk dropdown, serta CENTERED atas-bawah
          lookTarget = new THREE.Vector3(4.4, 5.4, -68.5);
          targetPos = new THREE.Vector3(-65.9, 57.5, -123.4);
        } else {
          // Sudut pandang default persis referensi visual pengguna (overview denah arsitektur & seluruh rak)
          lookTarget = new THREE.Vector3(-25.1, 1.5, -34.4);
          targetPos = new THREE.Vector3(-80.0, 42.2, -77.3);
        }
      } else {
        const curRackId = Number(activeRackRef.current);
        lookTarget = center.clone();
        if (curRackId === 1 || curRackId === 6) {
          // Rak 1 & Lemari 1 face West (-X)
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
      fitFrontView(false, isHudExpandedRef.current);
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

  // Reapply PIC/search/hover selection whenever filters change, cloud sync rebuilds
  // the scene, or user hovers a box in the dropdown / search list.
  // Aturan pengguna:
  // 1. "jika difilter nama keep boxnya": Seluruh box tetap solid di rak (tidak transparan/hantu).
  //    Box milik PIC aktif ditandai warna PIC, box PIC lain tetap berbentuk box solid dengan warna netral.
  // 2. "jika hover keep box juga hanya tandai dengan warna beda": Seluruh box tetap utuh solid (tidak meredup/transparan),
  //    hanya box yang di-hover yang ditandai dengan warna highlight mencolok (emas / amber glowing).
  useEffect(() => {
    const picFilterActive = highlightPpic !== 'ALL';
    const targetHoverNum = previewFocusBoxNumber
      ? Number(previewFocusBoxNumber)
      : (hoveredBox ? Number(hoveredBox.boxNumber) : null);

    for (const mesh of boxMeshesRef.current) {
      const meshBoxNum = Number(mesh.userData.boxNumber);
      const isTargetHover = targetHoverNum !== null && meshBoxNum === targetHoverNum;
      const picMatches = !picFilterActive || matchesPic(mesh.userData.picName, highlightPpic);
      const searchMatches = !searchActive || highlightBoxNumbers.has(meshBoxNum);
      const isFilterSelected = (picFilterActive || searchActive) && picMatches && searchMatches;

      mesh.castShadow = true;

      for (const material of new Set(mesh.material)) {
        // SELURUH BOX TETAP SOLID & KEEPS (tidak ada ghosting / transparan)
        material.transparent = false;
        material.depthWrite = true;
        material.opacity = 1;

        if (isTargetHover) {
          // Box yang di-hover: ditandai dengan warna berbeda yang mencolok (emas / amber glowing)
          if (material.map) {
            material.color.setHex(0xffffff);
            material.emissive.setHex(0xff9f0a);
            material.emissiveIntensity = 0.7;
          } else {
            material.color.setHex(0xff9f0a);
            material.emissive.setHex(0xff9f0a);
            material.emissiveIntensity = 0.45;
          }
        } else if (picFilterActive || searchActive) {
          if (isFilterSelected) {
            // Box yang cocok dengan filter PIC / Search: warna PIC aktif bersinar
            if (material.map) {
              material.color.setHex(0xffffff);
              material.emissive.setHex(0x0071e3);
              material.emissiveIntensity = 0.25;
            } else {
              material.color.setHex(mesh.userData.baseColor);
              material.emissive.setHex(0x000000);
              material.emissiveIntensity = 0;
            }
          } else {
            // Box lain saat ada filter: tetap keep box solid dengan warna netral bersih (tidak transparan)
            if (material.map) {
              material.color.setHex(0xffffff);
              material.emissive.setHex(0x000000);
              material.emissiveIntensity = 0;
            } else {
              material.color.setHex(0xd1d5db); // Solid muted clean gray cardboard
              material.emissive.setHex(0x000000);
              material.emissiveIntensity = 0;
            }
          }
        } else {
          // Kondisi normal tanpa filter & tanpa hover: warna natural tiap box
          if (material.map) {
            material.color.setHex(0xffffff);
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          } else {
            material.color.setHex(mesh.userData.baseColor);
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        }
        material.needsUpdate = true;
      }
    }
  }, [highlightPpic, highlightBoxNumbers, searchActive, boxes, racks, ppicMembers, previewFocusBoxNumber, hoveredBox]);

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

        {/* Controls (Top Right): Pindah Lemari + Koordinat Lantai + Fit View Default (Apple Floating Pills) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-wrap items-center justify-end gap-2 font-apple">
          <button
            type="button"
            onClick={() => {
              setIsMovingLemari((prev) => {
                const next = !prev;
                if (next) setShowFloorCoords(true);
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md backdrop-blur-2xl border cursor-pointer active:scale-95 ${
              isMovingLemari
                ? 'bg-[#0071e3] text-white border-[#0071e3] ring-2 ring-[#0071e3]/30'
                : 'bg-white/85 text-[#1d1d1f] hover:bg-white border-black/[0.08]'
            }`}
            title="Aktifkan mode pindah lemari lalu klik titik lantai tujuan"
          >
            <Move className={`h-3.5 w-3.5 ${isMovingLemari ? 'text-white' : 'text-[#0071e3]'}`} />
            <span>{isMovingLemari ? 'Selesai Pindah' : 'Pindah Lemari'}</span>
          </button>
          {isMovingLemari && (
            <>
              <select
                value={movingLemariId}
                onChange={(e) => setMovingLemariId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 text-[#1d1d1f] border border-[#0071e3]/40 shadow-md focus:outline-hidden cursor-pointer"
                title="Pilih Lemari (1 - 12) yang ingin dipindahkan"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={6 + idx} value={6 + idx}>
                    LEMARI {idx + 1} ({idx + 1}A - {idx + 1}J)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const curPos = lemariPositionsRef.current[movingLemariId] || DEFAULT_LEMARI_POSITIONS[movingLemariId];
                  const nextRot = ((curPos?.rotationY || 0) + Math.PI / 2) % (Math.PI * 2);
                  applyLemariTransform(movingLemariId, { ...curPos, rotationY: nextRot });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md backdrop-blur-2xl border border-amber-400/50 bg-amber-500 text-white hover:bg-amber-600 cursor-pointer active:scale-95"
                title="Putar arah hadap Lemari terpilih sebesar 90 derajat"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Putar 90°</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowFloorCoords((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md backdrop-blur-2xl border cursor-pointer active:scale-95 ${
              showFloorCoords
                ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]'
                : 'bg-white/85 text-[#1d1d1f] hover:bg-white border-black/[0.08]'
            }`}
            title="Tampilkan / sembunyikan grid koordinat lantai (X, Z) untuk pemindahan lemari atau rak"
          >
            <Crosshair className={`h-3.5 w-3.5 ${showFloorCoords ? 'text-[#38bdf8]' : 'text-[#0071e3]'}`} />
            <span>Koordinat Lantai</span>
          </button>
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

        {/* Live Floor Coordinate Readout Pill (Bottom Left) */}
        {showFloorCoords && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 bg-white/92 backdrop-blur-2xl px-3.5 py-2 rounded-[16px] border border-black/[0.08] shadow-lg font-apple text-[11px] text-[#1d1d1f] flex flex-col gap-1 max-w-[90vw]">
            {isMovingLemari && (
              <div className="text-[11px] font-bold text-[#0071e3] flex items-center gap-1.5 pb-1 border-b border-black/[0.06]">
                <Move className="w-3.5 h-3.5 animate-pulse" />
                <span>Klik titik lantai untuk memindahkan LEMARI {movingLemariId - 5} ke kursor</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 font-bold text-[#0071e3]">
                <Crosshair className="w-3.5 h-3.5" />
                <span>Koordinat Lantai</span>
              </span>
              <span className="text-black/20">•</span>
              <span className="font-mono font-semibold text-[#92400e] bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/70">
                Lemari {movingLemariId - 5}: X {(lemariPositions[movingLemariId] || DEFAULT_LEMARI_POSITIONS[6]).x}, Z {(lemariPositions[movingLemariId] || DEFAULT_LEMARI_POSITIONS[6]).z}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[#1d1d1f]">
              <span className="font-mono font-semibold">
                {cursorFloorCoord
                  ? `Kursor: X ${cursorFloorCoord.x}, Z ${cursorFloorCoord.z}`
                  : 'Arahkan kursor ke lantai untuk cek titik X, Z'}
              </span>
              {pinnedFloorCoord && (
                <>
                  <span className="text-black/20">•</span>
                  <span className="font-mono font-bold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md border border-[#0071e3]/25">
                    Titik Klik: X {pinnedFloorCoord.x}, Z {pinnedFloorCoord.z}
                  </span>
                  {!isMovingLemari && (
                    <button
                      type="button"
                      onClick={() => {
                        const curPos = lemariPositionsRef.current[movingLemariId] || DEFAULT_LEMARI_POSITIONS[movingLemariId];
                        applyLemariTransform(movingLemariId, { ...curPos, x: pinnedFloorCoord.x, z: pinnedFloorCoord.z });
                      }}
                      className="px-2 py-0.5 rounded-md bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-[10px] transition cursor-pointer active:scale-95"
                    >
                      Pindah Lemari {movingLemariId - 5} ke Sini
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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
            <div className="w-[320px] sm:w-[440px] md:w-[480px] max-w-[92vw] max-h-[72vh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-[22px] border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-3.5 sm:p-4 animate-in fade-in zoom-in-95 duration-150 font-apple whitespace-normal select-none">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#0071e3]/10 text-[#0071e3]">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] leading-none">Status &amp; Rekap Pengisian Box</h3>
                    <p className="text-[10px] text-[#86868b] mt-0.5">{boxes.length} Box • {racks.length} Penyimpanan • {ppicMembers.length} PIC PPIC</p>
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
                            onMouseLeave={() => {
                              setHoveredBox(null);
                            }}
                            onClick={() => {
                              setSelectedBoxNumber(box.boxNumber);
                              setIsHudExpanded(false);
                            }}
                            className={`inline-flex h-6.5 min-w-6.5 items-center justify-center rounded-[7px] px-1 text-xs font-semibold tabular-nums transition-all border active:scale-95 cursor-pointer ${group.boxClass}`}
                            title={`Klik untuk buka BOX #${getBoxDisplayNumber(box)} (${box.rackName || 'Rak'}, PIC: ${box.picName || '-'})`}
                          >
                            {getBoxDisplayNumber(box)}
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
                #{getBoxDisplayNumber(hoveredBox)}
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
              <p>👤 PIC PPIC: <strong className="text-white font-semibold">{hoveredBox.picName || '- (Campur)'}</strong></p>
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

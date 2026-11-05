import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
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
        flyControlsTargetRef.current = new THREE.Vector3(
          mesh.userData.initialX,
          mesh.userData.initialY + 0.1,
          mesh.userData.initialZ
        );
        flyCameraTargetRef.current = new THREE.Vector3(
          mesh.userData.initialX,
          mesh.userData.initialY + 0.35,
          mesh.userData.initialZ + 3.4
        );
      }
    }
  }, [selectedBoxNumber]);

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
  const rendererRef = useRef(null);

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

    // Scene - Clean Studio / Warehouse Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.Fog(0xf1f5f9, 40, 110);
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
    controls.minDistance = 6;
    controls.maxDistance = 85;
    controls.target.set(0, 4, 0);
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
    const presetPositions = {
      1: { x: -16, cols: 4, rows: 4, beamColor: 0x1d4ed8 },
      2: { x: -5.5, cols: 5, rows: 4, beamColor: 0xe2e8f0 },
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

    // --- LOW POLY DISNEY FOREST 3D ENVIRONMENT ---
    const allRackX = rackPositions.map((r) => r.x);
    const minX = allRackX.length > 0 ? Math.min(...allRackX) - 4 : -20;
    const maxX = allRackX.length > 0 ? Math.max(...allRackX) + 4 : 28;

    const forest = buildLowPolyForestScene({
      scene,
      minX,
      maxX,
    });

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

        // Exact front label texture matching user uploaded image with status indicator
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
          initialX: bx,
          initialY: by,
          initialZ: bz,
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
        initialX: fx,
        initialY: fy,
        initialZ: fz,
      };
      scene.add(boxMesh);
      boxMeshes.push(boxMesh);
    });

    boxMeshesRef.current = boxMeshes;

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
      const intersects = raycaster.intersectObjects(boxMeshesRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (currentHoveredMesh !== hit) {
          currentHoveredMesh = hit;
          const boxData = boxes.find(b => b.boxNumber === hit.userData.boxNumber);
          setHoveredBox(boxData);
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        if (currentHoveredMesh) {
          currentHoveredMesh = null;
          setHoveredBox(null);
          renderer.domElement.style.cursor = 'default';
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
      const intersects = raycaster.intersectObjects(boxMeshesRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const boxNum = hit.userData.boxNumber;
        const now = Date.now();

        // Cek jika pengguna mengklik 2 kali berturut-turut pada box yang sama (< 450ms)
        if (lastClickedBoxNumber === boxNum && (now - lastClickTime) < 450) {
          // Klik 2 kali: Buka popup jendela detail box
          setSelectedBoxNumber(boxNum);
          lastClickTime = 0;
          lastClickedBoxNumber = null;
        } else {
          // Klik 1 kali: Fokuskan kamera mendekat ke box tanpa membuka popup
          lastClickTime = now;
          lastClickedBoxNumber = boxNum;

          flyControlsTargetRef.current = new THREE.Vector3(
            hit.userData.initialX,
            hit.userData.initialY + 0.1,
            hit.userData.initialZ
          );
          flyCameraTargetRef.current = new THREE.Vector3(
            hit.userData.initialX,
            hit.userData.initialY + 0.35,
            hit.userData.initialZ + 3.4
          );
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

        let targetZ = mesh.userData.initialZ;
        let targetY = mesh.userData.initialY;

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

      if (smooth) {
        flyControlsTargetRef.current = center.clone();
        flyCameraTargetRef.current = new THREE.Vector3(center.x, center.y, center.z + distance);
      } else {
        controls.target.copy(center);
        camera.position.set(center.x, center.y, center.z + distance);
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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      forest?.dispose();
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
      <div className="warehouse-viewport inventory-panel relative w-full h-[380px] sm:h-[480px] lg:h-[580px] overflow-hidden rounded-3xl border border-slate-200/80 shadow-xl ring-1 ring-slate-900/5 bg-gradient-to-b from-emerald-200 via-teal-100 to-amber-50">
        
        {/* Three.js viewport */}
        <div ref={containerRef} className="w-full h-full" />

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

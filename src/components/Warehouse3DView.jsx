import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  Printer, 
  Sparkles, 
  Info,
  ChevronRight
} from 'lucide-react';

export const Warehouse3DView = ({ onOpenLabelPrintModal }) => {
  const containerRef = useRef(null);
  const { 
    racks, 
    boxes, 
    items, 
    ppicMembers, 
    getItemsInBox, 
    setSelectedBoxNumber 
  } = useInventory();

  // Filter / view state
  const [highlightPpic, setHighlightPpic] = useState('ALL');
  const [highlightCategory, setHighlightCategory] = useState('ALL');
  const [hoveredBox, setHoveredBox] = useState(null);
  const [activeRackView, setActiveRackView] = useState('ALL');
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  // References for Three.js scene objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const boxMeshesRef = useRef([]);
  const animationFrameIdRef = useRef(null);

  // PPIC color palette for 3D boxes body
  const ppicColorMap = {
    'Royan': 0x4f46e5,   // Indigo
    'Cynara': 0x9333ea,  // Purple
    'Ami': 0x059669,     // Emerald
    'Ryan': 0xd97706,    // Amber
    'Hanami': 0xe11d48,  // Rose
  };

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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19); // Dark modern warehouse navy
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 200);
    camera.position.set(0, 18, 38);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controls.minDistance = 6;
    controls.maxDistance = 75;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 80;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const blueBackLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    blueBackLight.position.set(-25, 20, -20);
    scene.add(blueBackLight);

    // Floor (Polished Concrete with Grid)
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.4,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Grid lines
    const grid = new THREE.GridHelper(100, 50, 0x3b82f6, 0x1e293b);
    grid.position.y = 0.02;
    scene.add(grid);

    // Yellow warehouse aisle markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const lineGeoX = new THREE.PlaneGeometry(80, 0.25);
    const aisleLine1 = new THREE.Mesh(lineGeoX, lineMat);
    aisleLine1.rotation.x = -Math.PI / 2;
    aisleLine1.position.set(0, 0.03, 8);
    scene.add(aisleLine1);

    const aisleLine2 = new THREE.Mesh(lineGeoX, lineMat);
    aisleLine2.rotation.x = -Math.PI / 2;
    aisleLine2.position.set(0, 0.03, -8);
    scene.add(aisleLine2);

    // Build the 5 3D Physical Racks
    // Rack 1: Blue rack (16 boxes)
    // Rack 2: White rack (20 boxes)
    // Rack 3, 4, 5: White rack (12 boxes each)
    const rackPositions = [
      { rackId: 1, x: -16, z: 0, cols: 4, rows: 4, beamColor: 0x1d4ed8 },
      { rackId: 2, x: -6,  z: 0, cols: 4, rows: 5, beamColor: 0xe2e8f0 },
      { rackId: 3, x: 6,   z: 0, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      { rackId: 4, x: 15,  z: 0, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
      { rackId: 5, x: 24,  z: 0, cols: 4, rows: 3, beamColor: 0xe2e8f0 },
    ];

    const boxMeshes = [];

    rackPositions.forEach((rackConf) => {
      const rackData = racks.find((r) => r.id === rackConf.rackId);
      if (!rackData) return;

      const { x: rx, z: rz, cols, rows, beamColor } = rackConf;
      const rackWidth = cols * 1.8 + 0.4;
      const shelfHeight = 1.9;
      const rackDepth = 1.6;
      const totalRackHeight = rows * shelfHeight + 0.5;

      // 1. Upright Steel Pillars (4 vertical posts)
      const pillarGeo = new THREE.BoxGeometry(0.15, totalRackHeight, 0.15);
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
        pillar.position.set(rx + px, totalRackHeight / 2, rz + pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
      });

      // 2. Horizontal Beam Shelves
      for (let r = 0; r <= rows; r++) {
        const sy = 0.2 + r * shelfHeight;
        
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
      const rackBoxes = boxes.filter((b) => b.rackId === rackConf.rackId);

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
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isAutoRotate;
        controlsRef.current.autoRotateSpeed = 1.0;
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 580;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [boxes, racks]);

  // Update box visual highlight opacity when filter changes
  useEffect(() => {
    boxMeshesRef.current.forEach((mesh) => {
      const { picName, category } = mesh.userData;
      let visibleMatch = true;

      if (highlightPpic !== 'ALL' && picName.toLowerCase() !== highlightPpic.toLowerCase()) {
        visibleMatch = false;
      }
      if (highlightCategory !== 'ALL' && category !== highlightCategory) {
        visibleMatch = false;
      }

      mesh.materials = mesh.material;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          mat.transparent = true;
          mat.opacity = visibleMatch ? 1.0 : 0.18;
        });
      }
    });
  }, [highlightPpic, highlightCategory]);

  // Camera presets
  const focusOnRack = (rackId) => {
    setActiveRackView(rackId);
    if (!controlsRef.current || !cameraRef.current) return;

    if (rackId === 'ALL') {
      cameraRef.current.position.set(0, 18, 38);
      controlsRef.current.target.set(0, 4, 0);
    } else {
      const rackConfMap = {
        1: { x: -16, z: 0, y: 4 },
        2: { x: -6,  z: 0, y: 5 },
        3: { x: 6,   z: 0, y: 3.5 },
        4: { x: 15,  z: 0, y: 3.5 },
        5: { x: 24,  z: 0, y: 3.5 },
      };
      const t = rackConfMap[rackId];
      if (t) {
        cameraRef.current.position.set(t.x, t.y + 4, t.z + 14);
        controlsRef.current.target.set(t.x, t.y, t.z);
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 3D Visualizer Top Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Interactive 3D Warehouse
            </span>
            <span className="text-xs text-slate-400">WebGL 3D Engine • Label Box Sesuai Format Asli</span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Visualisasi 3D Rak Fisik & Label Box (1 - 72)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Setiap box 3D menampilkan <strong>Label Box resmi</strong> dengan nomor raksasa dan nama PIC PPIC. Klik box untuk melihat isi & print.
          </p>
        </div>

        {/* Camera Quick Buttons & Print All Labels */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={() => onOpenLabelPrintModal && onOpenLabelPrintModal()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Stiker Label Box</span>
          </button>

          <button
            onClick={() => focusOnRack('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeRackView === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Rak
          </button>
          {[1, 2, 3, 4, 5].map((id) => (
            <button
              key={id}
              onClick={() => focusOnRack(id)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                activeRackView === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Rak {id}
            </button>
          ))}
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`px-2.5 py-1.5 rounded-lg font-bold border transition ${
              isAutoRotate
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Auto Putar 360°"
          >
            {isAutoRotate ? 'Stop Putar' : 'Auto Putar'}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        
        {/* Three.js viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* 3D Overlays: Filter Bar on Top Left */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-xs">
          
          {/* PPIC Person Highlight Filter */}
          <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs shadow-lg space-y-2">
            <span className="font-bold text-slate-300 text-[11px] block uppercase tracking-wider">
              Highlight PIC PPIC:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setHighlightPpic('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  highlightPpic === 'ALL'
                    ? 'bg-white text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Semua
              </button>
              {ppicMembers.map((pic) => (
                <button
                  key={pic.id}
                  onClick={() => setHighlightPpic(highlightPpic === pic.name ? 'ALL' : pic.name)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center space-x-1 ${
                    highlightPpic === pic.name
                      ? 'bg-blue-600 text-white ring-2 ring-white/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${pic.avatarBg}`}></span>
                  <span>{pic.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Highlight */}
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-xs shadow-lg flex items-center space-x-2">
            <span className="text-slate-400 font-bold text-[11px]">Kategori:</span>
            <button
              onClick={() => setHighlightCategory('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                highlightCategory === 'ALL' ? 'bg-white text-slate-900' : 'text-slate-400'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setHighlightCategory('SAMPLE')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                highlightCategory === 'SAMPLE' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
              }`}
            >
              SAMPLE
            </button>
            <button
              onClick={() => setHighlightCategory('MATERIAL')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                highlightCategory === 'MATERIAL' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400'
              }`}
            >
              MATERIAL
            </button>
          </div>

        </div>

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
              <span>Klik box ini untuk melihat isi & print kartu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Controls Hint (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-400 pointer-events-none flex items-center space-x-3">
          <span>🖱️ Putar: Klik Kiri</span>
          <span>🔍 Zoom: Scroll</span>
          <span>✋ Geser: Klik Kanan</span>
        </div>

      </div>

    </div>
  );
};

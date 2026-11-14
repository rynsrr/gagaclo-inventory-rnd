// GAGACLO - Storage - 20261102
// INVENTORY MANAGEMENT RND

export const RACKS_DATA = [
  {
    id: 1,
    name: 'RACK 1',
    category: 'SAMPLE',
    rackType: 'Blue rack',
    location: 'Sample warehouse',
    fullDescription: 'Blue rack, sample warehouse',
    boxRange: 'BOX 1 - 16',
    boxStart: 1,
    boxEnd: 16,
    totalBoxes: 16,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    accentColor: 'blue',
  },
  {
    id: 2,
    name: 'RACK 2',
    category: 'SAMPLE',
    rackType: 'White rack',
    location: 'Sample warehouse, way to the new building',
    fullDescription: 'White rack, sample warehouse, way to the new building',
    boxRange: 'BOX 17 - 36',
    boxStart: 17,
    boxEnd: 36,
    totalBoxes: 20,
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    accentColor: 'sky',
  },
  {
    id: 3,
    name: 'RACK 3',
    category: 'MATERIAL',
    rackType: 'White rack',
    location: 'New building',
    fullDescription: 'White rack, new building',
    boxRange: 'BOX 37 - 48',
    boxStart: 37,
    boxEnd: 48,
    totalBoxes: 12,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentColor: 'emerald',
  },
  {
    id: 4,
    name: 'RACK 4',
    category: 'MATERIAL',
    rackType: 'White rack',
    location: 'New building',
    fullDescription: 'White rack, new building',
    boxRange: 'BOX 49 - 60',
    boxStart: 49,
    boxEnd: 60,
    totalBoxes: 12,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    accentColor: 'teal',
  },
  {
    id: 5,
    name: 'RACK 5',
    category: 'MATERIAL',
    rackType: 'White rack',
    location: 'New building',
    fullDescription: 'White rack, new building',
    boxRange: 'BOX 61 - 72',
    boxStart: 61,
    boxEnd: 72,
    totalBoxes: 12,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    accentColor: 'indigo',
  },
];

export const PPIC_MEMBERS = [
  {
    id: 'royan',
    ppicNumber: 1,
    name: 'Royan',
    role: 'PPIC Lead',
    isSuperuser: false,
    email: 'royan@gagaclo.internal',
    totalBoxes: 16,
    color: 'indigo',
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeClass: 'bg-indigo-600 text-white',
    avatarBg: 'bg-indigo-600',
  },
  {
    id: 'cynara',
    ppicNumber: 2,
    name: 'Cynara',
    role: 'PPIC Material & Trims',
    email: 'cynara@gagaclo.internal',
    totalBoxes: 14,
    color: 'purple',
    tagBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeClass: 'bg-purple-600 text-white',
    avatarBg: 'bg-purple-600',
  },
  {
    id: 'ami',
    ppicNumber: 3,
    name: 'Ami',
    role: 'PPIC Fabric Specialist',
    email: 'ami@gagaclo.internal',
    totalBoxes: 14,
    color: 'emerald',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeClass: 'bg-emerald-600 text-white',
    avatarBg: 'bg-emerald-600',
  },
  {
    id: 'ryan',
    ppicNumber: 4,
    name: 'Ryan',
    role: 'PPIC Accessories & QC',
    email: 'ryan@gagaclo.internal',
    totalBoxes: 14,
    color: 'amber',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeClass: 'bg-amber-600 text-white',
    avatarBg: 'bg-amber-600',
  },
  {
    id: 'hanami',
    ppicNumber: 5,
    name: 'Hanami',
    role: 'PPIC Sample Development',
    email: 'hanami@gagaclo.internal',
    totalBoxes: 14,
    color: 'rose',
    tagBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeClass: 'bg-rose-600 text-white',
    avatarBg: 'bg-rose-600',
  },
];

export const SUPPORT_MEMBERS = [
  {
    id: 'support-1',
    ppicNumber: 'S1',
    name: 'Sheva',
    role: 'Tim Support',
    isHelper: true,
    isSupport: true,
    email: 'sheva@gagaclo.internal',
    password: 'Sheva',
    totalBoxes: 0,
    color: 'teal',
    tagBg: 'bg-teal-50 text-teal-700 border-teal-200',
    badgeClass: 'bg-teal-600 text-white',
    avatarBg: 'bg-teal-600',
  },
  {
    id: 'support-2',
    ppicNumber: 'S2',
    name: 'Ade',
    role: 'Tim Support',
    isHelper: true,
    isSupport: true,
    email: 'ade@gagaclo.internal',
    password: 'Ade',
    totalBoxes: 0,
    color: 'cyan',
    tagBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    badgeClass: 'bg-cyan-600 text-white',
    avatarBg: 'bg-cyan-600',
  },
  {
    id: 'support-3',
    ppicNumber: 'S3',
    name: 'Tri',
    role: 'Tim Support',
    isHelper: true,
    isSupport: true,
    email: 'tri@gagaclo.internal',
    password: 'Tri',
    totalBoxes: 0,
    color: 'sky',
    tagBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeClass: 'bg-sky-600 text-white',
    avatarBg: 'bg-sky-600',
  },
];

export const HELPER_MEMBERS = SUPPORT_MEMBERS;

export const ALL_INITIAL_USERS = [
  ...PPIC_MEMBERS,
  ...SUPPORT_MEMBERS,
];

// Mapping helper to build all 72 boxes accurately
export const generateInitialBoxes = () => {
  // Mapping rules from PDF:
  // Rack 1 (1-16): Royan (1,2,3,16), Cynara (4,5,6), Ami (7,8,9), Ryan (10,11,12), Hanami (13,14,15)
  // Rack 2 (17-36): Royan (17-20), Cynara (21-24), Ami (25-28), Ryan (29-32), Hanami (33-36)
  // Rack 3 (37-48): Royan (37,38,47), Cynara (39,40,48), Ami (41,42), Ryan (43,44), Hanami (45,46)
  // Rack 4 (49-60): Royan (49,50), Cynara (51,52), Ami (53,54,59), Ryan (55,56,60), Hanami (57,58)
  // Rack 5 (61-72): Royan (61,62,72), Cynara (63,64), Ami (65,66), Ryan (67,68), Hanami (69,70,71)

  const ppicByBoxNumber = {};

  // Rack 1
  [1, 2, 3, 16].forEach(b => { ppicByBoxNumber[b] = 'Royan'; });
  [4, 5, 6].forEach(b => { ppicByBoxNumber[b] = 'Cynara'; });
  [7, 8, 9].forEach(b => { ppicByBoxNumber[b] = 'Ami'; });
  [10, 11, 12].forEach(b => { ppicByBoxNumber[b] = 'Ryan'; });
  [13, 14, 15].forEach(b => { ppicByBoxNumber[b] = 'Hanami'; });

  // Rack 2
  [17, 18, 19, 20].forEach(b => { ppicByBoxNumber[b] = 'Royan'; });
  [21, 22, 23, 24].forEach(b => { ppicByBoxNumber[b] = 'Cynara'; });
  [25, 26, 27, 28].forEach(b => { ppicByBoxNumber[b] = 'Ami'; });
  [29, 30, 31, 32].forEach(b => { ppicByBoxNumber[b] = 'Ryan'; });
  [33, 34, 35, 36].forEach(b => { ppicByBoxNumber[b] = 'Hanami'; });

  // Rack 3
  [37, 38, 47].forEach(b => { ppicByBoxNumber[b] = 'Royan'; });
  [39, 40, 48].forEach(b => { ppicByBoxNumber[b] = 'Cynara'; });
  [41, 42].forEach(b => { ppicByBoxNumber[b] = 'Ami'; });
  [43, 44].forEach(b => { ppicByBoxNumber[b] = 'Ryan'; });
  [45, 46].forEach(b => { ppicByBoxNumber[b] = 'Hanami'; });

  // Rack 4
  [49, 50].forEach(b => { ppicByBoxNumber[b] = 'Royan'; });
  [51, 52].forEach(b => { ppicByBoxNumber[b] = 'Cynara'; });
  [53, 54, 59].forEach(b => { ppicByBoxNumber[b] = 'Ami'; });
  [55, 56, 60].forEach(b => { ppicByBoxNumber[b] = 'Ryan'; });
  [57, 58].forEach(b => { ppicByBoxNumber[b] = 'Hanami'; });

  // Rack 5
  [61, 62, 72].forEach(b => { ppicByBoxNumber[b] = 'Royan'; });
  [63, 64].forEach(b => { ppicByBoxNumber[b] = 'Cynara'; });
  [65, 66].forEach(b => { ppicByBoxNumber[b] = 'Ami'; });
  [67, 68].forEach(b => { ppicByBoxNumber[b] = 'Ryan'; });
  [69, 70, 71].forEach(b => { ppicByBoxNumber[b] = 'Hanami'; });

  const boxes = [];
  for (let boxNum = 1; boxNum <= 72; boxNum++) {
    let rackId = 1;
    if (boxNum >= 1 && boxNum <= 16) rackId = 1;
    else if (boxNum >= 17 && boxNum <= 36) rackId = 2;
    else if (boxNum >= 37 && boxNum <= 48) rackId = 3;
    else if (boxNum >= 49 && boxNum <= 60) rackId = 4;
    else if (boxNum >= 61 && boxNum <= 72) rackId = 5;

    const rack = RACKS_DATA.find(r => r.id === rackId);
    const picName = ppicByBoxNumber[boxNum] || 'Royan';
    const ppicObj = PPIC_MEMBERS.find(p => p.name === picName);

    boxes.push({
      boxNumber: boxNum,
      code: `BOX-${String(boxNum).padStart(2, '0')}`,
      rackId: rack.id,
      rackName: rack.name,
      category: rack.category,
      location: rack.location,
      rackDescription: rack.fullDescription,
      picName: picName,
      ppicId: ppicObj ? ppicObj.id : 'royan',
      ppicNumber: ppicObj ? ppicObj.ppicNumber : 1,
      capacityLimit: 20, // default nominal max items
      notes: '',
    });
  }
  return boxes;
};

// Realistic initial sample and material inventory items
export const INITIAL_ITEMS = [
  // Box 1 (Royan, Rack 1 - SAMPLE)
  {
    id: 'item-101',
    sku: 'SMP-2026-001',
    name: 'Sample Polo Shirt Pique Solid - Navy (Size L)',
    category: 'SAMPLE',
    boxNumber: 1,
    rackId: 1,
    picName: 'Royan',
    qty: 2,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-11-01',
    description: 'Proto sample for Spring 2027 collection. Pique cotton 24s.',
    tags: ['Polo', 'Proto', 'SS27'],
  },
  {
    id: 'item-102',
    sku: 'SMP-2026-002',
    name: 'Sample Heavyweight Oversize Tee - Vintage Black',
    category: 'SAMPLE',
    boxNumber: 1,
    rackId: 1,
    picName: 'Royan',
    qty: 3,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-11-02',
    description: 'Cotton combed 16s 230gsm, wash sample test.',
    tags: ['Tee', 'Wash Test'],
  },

  // Box 2 (Royan, Rack 1 - SAMPLE)
  {
    id: 'item-103',
    sku: 'SMP-2026-003',
    name: 'Sample Cargo Pants Ripstop - Olive Green',
    category: 'SAMPLE',
    boxNumber: 2,
    rackId: 1,
    picName: 'Royan',
    qty: 1,
    unit: 'pcs',
    status: 'In Review',
    dateIn: '2026-10-28',
    description: 'Fitting review with designer team, 6-pocket cargo.',
    tags: ['Bottoms', 'Fit Review'],
  },

  // Box 4 (Cynara, Rack 1 - SAMPLE)
  {
    id: 'item-104',
    sku: 'SMP-2026-004',
    name: 'Sample Knit Cardigan Chunky Wool Blend - Beige',
    category: 'SAMPLE',
    boxNumber: 4,
    rackId: 1,
    picName: 'Cynara',
    qty: 2,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-10-30',
    description: '7-gauge knit sample from vendor Alpha.',
    tags: ['Knitwear', 'Outer'],
  },

  // Box 7 (Ami, Rack 1 - SAMPLE)
  {
    id: 'item-105',
    sku: 'SMP-2026-005',
    name: 'Sample Windbreaker Jacket Water Repellent - Charcoal',
    category: 'SAMPLE',
    boxNumber: 7,
    rackId: 1,
    picName: 'Ami',
    qty: 2,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-11-01',
    description: 'Taslan micro coated, taped seam prototype.',
    tags: ['Jacket', 'Technical'],
  },

  // Box 10 (Ryan, Rack 1 - SAMPLE)
  {
    id: 'item-106',
    sku: 'SMP-2026-006',
    name: 'Sample Embroidered Cap 6-Panel Twill - Khaki',
    category: 'SAMPLE',
    boxNumber: 10,
    rackId: 1,
    picName: 'Ryan',
    qty: 4,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-10-29',
    description: 'Direct embroidery 3D front & flat side embroidery.',
    tags: ['Headwear', 'Accessories'],
  },

  // Box 13 (Hanami, Rack 1 - SAMPLE)
  {
    id: 'item-107',
    sku: 'SMP-2026-007',
    name: 'Sample Denim Jacket 14oz Selvedge - Indigo Rigid',
    category: 'SAMPLE',
    boxNumber: 13,
    rackId: 1,
    picName: 'Hanami',
    qty: 1,
    unit: 'pcs',
    status: 'Borrowed',
    dateIn: '2026-10-25',
    description: 'Borrowed by QC team for shrinkage and crocking test.',
    tags: ['Denim', 'Outerwear'],
  },

  // Box 17 (Royan, Rack 2 - SAMPLE)
  {
    id: 'item-108',
    sku: 'SMP-2026-008',
    name: 'Sample French Terry Hoodie Zip-Up - Grey Melange',
    category: 'SAMPLE',
    boxNumber: 17,
    rackId: 2,
    picName: 'Royan',
    qty: 2,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-11-02',
    description: 'French terry 330gsm, double layer hood.',
    tags: ['Hoodie', 'Fleece'],
  },

  // Box 21 (Cynara, Rack 2 - SAMPLE)
  {
    id: 'item-109',
    sku: 'SMP-2026-009',
    name: 'Sample Chino Shorts Slim Fit - Navy',
    category: 'SAMPLE',
    boxNumber: 21,
    rackId: 2,
    picName: 'Cynara',
    qty: 3,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-10-31',
    description: 'Cotton twill stretch 98/2 with custom inner waistband.',
    tags: ['Shorts', 'Bottoms'],
  },

  // Box 25 (Ami, Rack 2 - SAMPLE)
  {
    id: 'item-110',
    sku: 'SMP-2026-010',
    name: 'Sample Rayon Camp Collar Shirt - Botanical Print',
    category: 'SAMPLE',
    boxNumber: 25,
    rackId: 2,
    picName: 'Ami',
    qty: 2,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-11-01',
    description: 'Digital print on Rayon twill 30s. Drape test approved.',
    tags: ['Printed', 'Resort'],
  },

  // Box 37 (Royan, Rack 3 - MATERIAL)
  {
    id: 'item-111',
    sku: 'MAT-2026-001',
    name: 'Fabric Swatch Card Cotton Combed 24s & 30s (24 Colors)',
    category: 'MATERIAL',
    boxNumber: 37,
    rackId: 3,
    picName: 'Royan',
    qty: 5,
    unit: 'cards',
    status: 'In Storage',
    dateIn: '2026-10-20',
    description: 'Standard shade library batch Q4-2026 from Mill PT Indo.',
    tags: ['Fabric Swatch', 'Cotton'],
  },
  {
    id: 'item-112',
    sku: 'MAT-2026-002',
    name: 'Rib Collar Knit 1x1 Spandex - Assorted Black & White',
    category: 'MATERIAL',
    boxNumber: 37,
    rackId: 3,
    picName: 'Royan',
    qty: 8,
    unit: 'rolls',
    status: 'In Storage',
    dateIn: '2026-10-22',
    description: 'Neckband ribbing material sample for T-shirts.',
    tags: ['Ribbing', 'Trims'],
  },

  // Box 39 (Cynara, Rack 3 - MATERIAL)
  {
    id: 'item-113',
    sku: 'MAT-2026-003',
    name: 'Button Sample Book - Resin & Natural Corozo (18L - 32L)',
    category: 'MATERIAL',
    boxNumber: 39,
    rackId: 3,
    picName: 'Cynara',
    qty: 4,
    unit: 'sets',
    status: 'In Storage',
    dateIn: '2026-10-26',
    description: 'Engraved logo samples & matt horn effect.',
    tags: ['Buttons', 'Accessories'],
  },

  // Box 41 (Ami, Rack 3 - MATERIAL)
  {
    id: 'item-114',
    sku: 'MAT-2026-004',
    name: 'Lining Fabric Taffeta & Twill Polyester Sample Hanger',
    category: 'MATERIAL',
    boxNumber: 41,
    rackId: 3,
    picName: 'Ami',
    qty: 6,
    unit: 'hangers',
    status: 'In Storage',
    dateIn: '2026-10-27',
    description: 'Anti-static coated lining fabric for outerwear.',
    tags: ['Lining', 'Hanger'],
  },

  // Box 49 (Royan, Rack 4 - MATERIAL)
  {
    id: 'item-115',
    sku: 'MAT-2026-005',
    name: 'YKK Metal Zipper #5 Antique Silver & Gunmetal (15-60cm)',
    category: 'MATERIAL',
    boxNumber: 49,
    rackId: 4,
    picName: 'Royan',
    qty: 25,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-10-28',
    description: 'Development zip samples for jackets & heavy hoodies.',
    tags: ['Zipper', 'YKK', 'Trims'],
  },

  // Box 53 (Ami, Rack 4 - MATERIAL)
  {
    id: 'item-116',
    sku: 'MAT-2026-006',
    name: 'Elastic Webbing Jacquard Logo 3.5cm (Assorted colors)',
    category: 'MATERIAL',
    boxNumber: 53,
    rackId: 4,
    picName: 'Ami',
    qty: 12,
    unit: 'meters',
    status: 'In Storage',
    dateIn: '2026-10-29',
    description: 'Custom woven waistband elastic for boxer & sport pants.',
    tags: ['Elastic', 'Trims'],
  },

  // Box 61 (Royan, Rack 5 - MATERIAL)
  {
    id: 'item-117',
    sku: 'MAT-2026-007',
    name: 'Woven Label & Satin Care Label Brand Gagaclo Test Batch',
    category: 'MATERIAL',
    boxNumber: 61,
    rackId: 5,
    picName: 'Royan',
    qty: 50,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: '2026-10-31',
    description: 'High-density damask woven neck label + TPU wash care labels.',
    tags: ['Labels', 'Branding'],
  },

  // Box 69 (Hanami, Rack 5 - MATERIAL)
  {
    id: 'item-118',
    sku: 'MAT-2026-008',
    name: 'Interlining Fusible Non-Woven & Woven (Light to Medium)',
    category: 'MATERIAL',
    boxNumber: 69,
    rackId: 5,
    picName: 'Hanami',
    qty: 10,
    unit: 'meters',
    status: 'In Storage',
    dateIn: '2026-11-01',
    description: 'Testing shrinkage and adhesion on collar and placket.',
    tags: ['Interlining', 'Testing'],
  },
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'trx-1',
    date: '2026-11-02 14:10',
    type: 'IN', // 'IN', 'OUT', 'BORROW', 'RETURN', 'RELOCATE'
    itemId: 'item-102',
    itemName: 'Sample Heavyweight Oversize Tee - Vintage Black',
    boxNumber: 1,
    rackName: 'RACK 1',
    qty: 3,
    unit: 'pcs',
    picName: 'Royan',
    recipientOrSource: 'Vendor Alpha Wash Lab',
    notes: 'Initial check-in from sampling workshop',
  },
  {
    id: 'trx-2',
    date: '2026-11-02 11:30',
    type: 'BORROW',
    itemId: 'item-107',
    itemName: 'Sample Denim Jacket 14oz Selvedge - Indigo Rigid',
    boxNumber: 13,
    rackName: 'RACK 1',
    qty: 1,
    unit: 'pcs',
    picName: 'Hanami',
    recipientOrSource: 'QC Laboratory Team',
    notes: 'Shrinkage & crocking test batch A',
  },
  {
    id: 'trx-3',
    date: '2026-11-01 09:45',
    type: 'IN',
    itemId: 'item-117',
    itemName: 'Woven Label & Satin Care Label Brand Gagaclo Test Batch',
    boxNumber: 61,
    rackName: 'RACK 5',
    qty: 50,
    unit: 'pcs',
    picName: 'Royan',
    recipientOrSource: 'Trims Supplier PT Labelindo',
    notes: 'Received proof test tags',
  },
];

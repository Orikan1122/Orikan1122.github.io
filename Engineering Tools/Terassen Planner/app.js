// state object
const state = {
  // Input settings (in meters, cm or mm)
  terraceWidth: 4.00, // m
  terraceLength: 3.00, // m
  tileWidth: 0.60,    // m (after conv)
  tileLength: 0.60,   // m (after conv)
  jointWidth: 0.004,  // m (after conv)
  subWidth: 0.40,     // m (after conv)
  subLength: 0.40,    // m (after conv)
  pedestalDiameter: 0.12, // m (after conv)
  layoutPattern: 'corner', // 'corner' | 'centered'
  layoutOrientation: 0, // 0 | 90
  cutSubEdges: true,
  cutSubOverlaps: true,

  // Zoom/Pan State
  zoomScale: 1.0,
  zoomOffsetX: 0,
  zoomOffsetY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,

  // Layers Toggles
  showUpperSlabs: true,
  showPedestals: true,
  showLowerSlabs: true,
  showDimensions: true,

  // Calculation Results
  upperSlabs: [],
  pedestals: [],
  lowerSlabs: [],
  warnings: []
};

// SVG Elements
const svg = document.getElementById('visualizerSvg');
const zoomGroup = document.getElementById('zoomGroup');
const upperSlabsGroup = document.getElementById('upperSlabsGroup');
const pedestalsGroup = document.getElementById('pedestalsGroup');
const lowerSlabsGroup = document.getElementById('lowerSlabsGroup');
const dimensionsGroup = document.getElementById('dimensionsGroup');
const terraceBoundaryGroup = document.getElementById('terraceBoundaryGroup');
const canvasWrapper = document.getElementById('canvasWrapper');

// Details Panel
const detailPanel = document.getElementById('detailPanel');
const detailTitle = document.getElementById('detailTitle');
const detailContent = document.getElementById('detailContent');
const detailClose = document.getElementById('detailClose');

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Attach Input Listeners
  const inputIds = [
    'terraceWidth', 'terraceLength', 'tileWidth', 'tileLength', 
    'jointWidth', 'subWidth', 'subLength', 'pedestalDiameter', 
    'layoutPattern', 'layoutOrientation'
  ];
  
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        readInputs();
        calculateLayout();
        render();
        updateMaterialList();
      });
    }
  });

  // Checkbox Settings Listeners
  const settingsCheckboxes = ['cutSubEdges', 'cutSubOverlaps'];
  settingsCheckboxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        readInputs();
        calculateLayout();
        render();
        updateMaterialList();
      });
    }
  });

  // Toggle Layer Listeners
  const toggles = [
    { id: 'toggleUpperSlabs', prop: 'showUpperSlabs' },
    { id: 'togglePedestals', prop: 'showPedestals' },
    { id: 'toggleLowerSlabs', prop: 'showLowerSlabs' },
    { id: 'toggleDimensions', prop: 'showDimensions' }
  ];

  toggles.forEach(t => {
    const el = document.getElementById(t.id);
    if (el) {
      el.addEventListener('change', (e) => {
        state[t.prop] = e.target.checked;
        render();
      });
    }
  });

  // Zoom buttons
  document.getElementById('btnZoomIn').addEventListener('click', () => adjustZoom(1.2));
  document.getElementById('btnZoomOut').addEventListener('click', () => adjustZoom(0.8));
  document.getElementById('btnZoomReset').addEventListener('click', () => resetZoom());

  // Dragging / Panning on SVG
  canvasWrapper.addEventListener('mousedown', dragStart);
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
  canvasWrapper.addEventListener('wheel', handleWheel);

  // Close details panel
  detailClose.addEventListener('click', () => {
    detailPanel.classList.add('hidden');
  });

  // Print button
  document.getElementById('btnPrint').addEventListener('click', preparePrint);

  // Accordion Logic
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      
      // Open if not previously active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // Dark/Light Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
      icon.setAttribute('data-lucide', 'moon');
    } else {
      icon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
  });

  // Initial read and render
  readInputs();
  calculateLayout();
  // Fit view initially
  resetZoom();
});

// Read and parse input values
function readInputs() {
  state.terraceWidth = parseFloat(document.getElementById('terraceWidth').value) || 4.00;
  state.terraceLength = parseFloat(document.getElementById('terraceLength').value) || 3.00;
  
  // Upper Tiles (convert from cm to m, or mm to m)
  const tw = parseFloat(document.getElementById('tileWidth').value) || 60;
  const tl = parseFloat(document.getElementById('tileLength').value) || 60;
  
  // Handing orientation swap
  state.layoutOrientation = parseInt(document.getElementById('layoutOrientation').value) || 0;
  if (state.layoutOrientation === 90) {
    state.tileWidth = tl / 100;
    state.tileLength = tw / 100;
  } else {
    state.tileWidth = tw / 100;
    state.tileLength = tl / 100;
  }
  
  state.jointWidth = (parseFloat(document.getElementById('jointWidth').value) || 4) / 1000;
  
  // Lower Slabs (convert from cm to m)
  state.subWidth = (parseFloat(document.getElementById('subWidth').value) || 40) / 100;
  state.subLength = (parseFloat(document.getElementById('subLength').value) || 40) / 100;
  state.pedestalDiameter = (parseFloat(document.getElementById('pedestalDiameter').value) || 12) / 100;
  
  state.layoutPattern = document.getElementById('layoutPattern').value;
  
  // Cutting options
  state.cutSubEdges = document.getElementById('cutSubEdges') ? document.getElementById('cutSubEdges').checked : true;
  state.cutSubOverlaps = document.getElementById('cutSubOverlaps') ? document.getElementById('cutSubOverlaps').checked : true;
}

// Coordinate Snapping to align pedestals with grid lines
function snapCoordinate(val, maxVal, offset, spacing, gap) {
  if (Math.abs(val) < 0.015) return 0;
  if (Math.abs(val - maxVal) < 0.015) return maxVal;

  const c = Math.round((val - offset) / spacing);
  const jointCenter = offset + c * spacing - gap / 2;
  if (Math.abs(val - jointCenter) < 0.05) {
    return jointCenter;
  }
  
  const tileEdge = offset + c * spacing;
  if (Math.abs(val - tileEdge) < 0.05) {
    return tileEdge;
  }
  
  return val;
}

// Calculate the structural layout
function calculateLayout() {
  state.upperSlabs = [];
  state.pedestals = [];
  state.lowerSlabs = [];
  state.warnings = [];
  state.error = null;

  const W = state.terraceWidth;
  const L = state.terraceLength;
  const wu = state.tileWidth;
  const lu = state.tileLength;
  const g = state.jointWidth;

  // 1. Validation Checks to prevent infinite loop or performance crash
  if (isNaN(W) || W <= 0 || isNaN(L) || L <= 0) {
    state.error = 'Die Terrassenmaße müssen größere Werte als 0 sein.';
    return;
  }
  if (isNaN(wu) || wu <= 0 || isNaN(lu) || lu <= 0) {
    state.error = 'Die Plattenmaße müssen größere Werte als 0 sein.';
    return;
  }
  if (isNaN(g) || g < 0) {
    state.error = 'Die Fugenbreite darf nicht negativ sein.';
    return;
  }
  if (isNaN(state.subWidth) || state.subWidth <= 0 || isNaN(state.subLength) || state.subLength <= 0) {
    state.error = 'Die Betonplattenmaße müssen größere Werte als 0 sein.';
    return;
  }
  if (isNaN(state.pedestalDiameter) || state.pedestalDiameter <= 0) {
    state.error = 'Der Stelzenlager-Durchmesser muss größer als 0 sein.';
    return;
  }

  const spacingX = wu + g;
  const spacingY = lu + g;

  if (spacingX <= 0.01 || spacingY <= 0.01) {
    state.error = 'Die Summe aus Plattenlänge/breite und Fugenbreite ist zu klein (mind. 1 cm erforderlich).';
    return;
  }

  // Estimate grid count to prevent performance crash
  let estCols = 0;
  let estRows = 0;
  if (state.layoutPattern === 'corner') {
    estCols = Math.ceil(W / spacingX);
    estRows = Math.ceil(L / spacingY);
  } else {
    const offsetX = (W / 2) - (wu / 2);
    const offsetY = (L / 2) - (lu / 2);
    const colStart = Math.floor((0 - offsetX) / spacingX) - 1;
    const colEnd = Math.ceil((W - offsetX) / spacingX) + 1;
    const rowStart = Math.floor((0 - offsetY) / spacingY) - 1;
    const rowEnd = Math.ceil((L - offsetY) / spacingY) + 1;
    estCols = colEnd - colStart + 1;
    estRows = rowEnd - rowStart + 1;
  }

  const estTiles = estCols * estRows;
  if (estTiles > 2500) {
    state.error = `Zu viele Platten (${estTiles}). Bitte größere Platten oder kleinere Terrasse wählen (Limit: 2500 Platten).`;
    return;
  }

  let offsetX = 0;
  let offsetY = 0;
  
  let colStart = 0;
  let colEnd = 0;
  let rowStart = 0;
  let rowEnd = 0;

  if (state.layoutPattern === 'corner') {
    colStart = 0;
    colEnd = Math.ceil(W / spacingX);
    rowStart = 0;
    rowEnd = Math.ceil(L / spacingY);
  } else if (state.layoutPattern === 'centered') {
    // Determine center alignment of slabs
    offsetX = (W / 2) - (wu / 2);
    offsetY = (L / 2) - (lu / 2);
    
    // Find min and max indices to cover [0, W]
    colStart = Math.floor((0 - offsetX) / spacingX) - 1;
    colEnd = Math.ceil((W - offsetX) / spacingX) + 1;
    rowStart = Math.floor((0 - offsetY) / spacingY) - 1;
    rowEnd = Math.ceil((L - offsetY) / spacingY) + 1;
  }

  // 1. Generate Upper Slabs
  let tileIndex = 1;
  for (let c = colStart; c <= colEnd; c++) {
    for (let r = rowStart; r <= rowEnd; r++) {
      const x1 = offsetX + c * spacingX;
      const x2 = x1 + wu;
      const y1 = offsetY + r * spacingY;
      const y2 = y1 + lu;

      // Intersect with terrace boundaries
      const rx1 = Math.max(0, x1);
      const rx2 = Math.min(W, x2);
      const ry1 = Math.max(0, y1);
      const ry2 = Math.min(L, y2);

      if (rx2 > rx1 + 0.001 && ry2 > ry1 + 0.001) {
        // This is a visible tile piece
        const pieceW = rx2 - rx1;
        const pieceL = ry2 - ry1;
        
        // Tolerances for full tile definition
        const isCutX = (rx1 - x1 > 0.001) || (x2 - rx2 > 0.001);
        const isCutY = (ry1 - y1 > 0.001) || (y2 - ry2 > 0.001);
        const isCut = isCutX || isCutY;

        state.upperSlabs.push({
          id: `tile-${c}-${r}`,
          index: tileIndex++,
          col: c,
          row: r,
          x1: rx1,
          x2: rx2,
          y1: ry1,
          y2: ry2,
          origX1: x1,
          origX2: x2,
          origY1: y1,
          origY2: y2,
          w: pieceW,
          l: pieceL,
          isCut: isCut,
          cutDetails: isCut 
            ? `${Math.round(pieceW * 1000) / 10} × ${Math.round(pieceL * 1000) / 10} cm` 
            : 'Unbearbeitet'
        });
      }
    }
  }

  // 2. Identify Pedestal Locations from Clipped Tile Corners
  const rawCorners = [];
  state.upperSlabs.forEach(tile => {
    // Add all 4 corners of each clipped tile
    rawCorners.push({ x: tile.x1, y: tile.y1, tileId: tile.id, cornerType: 'top-left' });
    rawCorners.push({ x: tile.x2, y: tile.y1, tileId: tile.id, cornerType: 'top-right' });
    rawCorners.push({ x: tile.x1, y: tile.y2, tileId: tile.id, cornerType: 'bottom-left' });
    rawCorners.push({ x: tile.x2, y: tile.y2, tileId: tile.id, cornerType: 'bottom-right' });
  });

  // Group raw corner points into clustered pedestals (threshold of 3cm)
  const pedestalMergeThreshold = g + 0.015;
  const clusteredPoints = [];

  rawCorners.forEach(pt => {
    let found = false;
    for (let cp of clusteredPoints) {
      const dist = Math.hypot(pt.x - cp.rawX, pt.y - cp.rawY);
      if (dist < pedestalMergeThreshold) {
        cp.tiles.push({ tileId: pt.tileId, cornerType: pt.cornerType });
        found = true;
        break;
      }
    }
    if (!found) {
      clusteredPoints.push({
        rawX: pt.x,
        rawY: pt.y,
        tiles: [{ tileId: pt.tileId, cornerType: pt.cornerType }]
      });
    }
  });

  // Create Pedestals & Snap coordinates
  clusteredPoints.forEach((cp, idx) => {
    // Snap CP coordinates to the ideal grid intersections
    let sx = snapCoordinate(cp.rawX, W, offsetX, spacingX, g);
    let sy = snapCoordinate(cp.rawY, L, offsetY, spacingY, g);

    // Determine type: Corner, Edge or Inner
    let type = 'inner';
    const isBoundaryX = (sx === 0 || Math.abs(sx - W) < 0.001);
    const isBoundaryY = (sy === 0 || Math.abs(sy - L) < 0.001);
    
    if (isBoundaryX && isBoundaryY) {
      type = 'corner';
    } else if (isBoundaryX || isBoundaryY) {
      type = 'edge';
    } else {
      // Not on terrace boundary, but might be at the edge of the tile grid
      if (cp.tiles.length === 1) {
        type = 'corner';
      } else if (cp.tiles.length === 2) {
        type = 'edge';
      } else {
        type = 'inner';
      }
    }

    state.pedestals.push({
      id: `pedestal-${idx + 1}`,
      x: sx,
      y: sy,
      rawX: cp.rawX,
      rawY: cp.rawY,
      tilesSupported: cp.tiles,
      type: type // 'corner' | 'edge' | 'inner'
    });
  });

  // 3. Generate Lower Concrete Slabs for each pedestal
  const wl = state.subWidth;
  const ll = state.subLength;
  const rp = state.pedestalDiameter / 2;

  // Initialize lower slabs at pedestal locations
  state.pedestals.forEach(ped => {
    let lx1 = ped.x - wl / 2;
    let lx2 = ped.x + wl / 2;
    let ly1 = ped.y - ll / 2;
    let ly2 = ped.y + ll / 2;

    // Clip initially to Terrace Boundary (if cutSubEdges is enabled)
    if (state.cutSubEdges) {
      lx1 = Math.max(0, lx1);
      lx2 = Math.min(W, lx2);
      ly1 = Math.max(0, ly1);
      ly2 = Math.min(L, ly2);
    }

    state.lowerSlabs.push({
      id: `sub-${ped.id}`,
      pedestalId: ped.id,
      x: ped.x,
      y: ped.y,
      x1: lx1,
      x2: lx2,
      y1: ly1,
      y2: ly2,
      w: lx2 - lx1,
      l: ly2 - ly1,
      isCut: false,
      isOverlapCut: false,
      isValid: true,
      reason: ''
    });
  });

  // Resolve overlaps between adjacent lower slabs (cut at midpoint)
  for (let i = 0; i < state.lowerSlabs.length; i++) {
    const s1 = state.lowerSlabs[i];
    const p1 = state.pedestals.find(p => p.id === s1.pedestalId);

    if (state.cutSubOverlaps) {
      for (let j = 0; j < state.lowerSlabs.length; j++) {
        if (i === j) continue;
        const s2 = state.lowerSlabs[j];
        const p2 = state.pedestals.find(p => p.id === s2.pedestalId);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Overlap occurs if the distance between pedestal centers is smaller than sub-slab dimensions
        const overlapsX = Math.abs(dx) < wl - 0.001;
        const overlapsY = Math.abs(dy) < ll - 0.001;

        if (overlapsX && overlapsY) {
          // They overlap. Cut along the axis of dominant separation
          if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0.005) {
            // Horizontal separation. Cut along X midpoint
            const midX = (p1.x + p2.x) / 2;
            if (p1.x < p2.x) {
              if (s1.x2 > midX) {
                s1.x2 = midX;
                s1.isOverlapCut = true;
              }
            } else {
              if (s1.x1 < midX) {
                s1.x1 = midX;
                s1.isOverlapCut = true;
              }
            }
          } else if (Math.abs(dy) > 0.005) {
            // Vertical separation. Cut along Y midpoint
            const midY = (p1.y + p2.y) / 2;
            if (p1.y < p2.y) {
              if (s1.y2 > midY) {
                s1.y2 = midY;
                s1.isOverlapCut = true;
              }
            } else {
              if (s1.y1 < midY) {
                s1.y1 = midY;
                s1.isOverlapCut = true;
              }
            }
          }
        }
      }
    }

    // Recalculate dimensions of the lower slab
    s1.w = s1.x2 - s1.x1;
    s1.l = s1.y2 - s1.y1;

    // Check if it is cut at boundaries
    const dxCenter = Math.abs((s1.x1 + s1.x2)/2 - p1.x);
    const dyCenter = Math.abs((s1.y1 + s1.y2)/2 - p1.y);
    const isBoundaryCut = (s1.w < wl - 0.002) || (s1.l < ll - 0.002);
    s1.isCut = isBoundaryCut || s1.isOverlapCut;

    // Verify stability (Does the concrete slab cover the pedestal footprint?)
    // The pedestal has diameter D_p. Center is at (px, py).
    // The pedestal boundary is [px - rp, px + rp] x [py - rp, py + rp]
    // However, if the pedestal is on the boundary of the terrace, the physical base is trimmed.
    // So the footprint only extends inwards.
    const requiredRpLeft = p1.x > 0.005 ? rp : 0;
    const requiredRpRight = Math.abs(p1.x - W) > 0.005 ? rp : 0;
    const requiredRpTop = p1.y > 0.005 ? rp : 0;
    const requiredRpBottom = Math.abs(p1.y - L) > 0.005 ? rp : 0;

    const leftSupported = s1.x1 <= p1.x - requiredRpLeft + 0.002;
    const rightSupported = s1.x2 >= p1.x + requiredRpRight - 0.002;
    const topSupported = s1.y1 <= p1.y - requiredRpTop + 0.002;
    const bottomSupported = s1.y2 >= p1.y + requiredRpBottom - 0.002;

    if (!leftSupported || !rightSupported || !topSupported || !bottomSupported) {
      s1.isValid = false;
      s1.reason = 'Unterplatte stützt Stelzenlager nicht vollständig aus (zu schmal durch Zuschnitt).';
      state.warnings.push({
        type: 'pedestal-instable',
        pedestalId: p1.id,
        slabId: s1.id,
        text: `Stelzenlager ${p1.id.replace('pedestal-', '')} ist instabil. Die Betonplatte (${Math.round(s1.w*100)}x${Math.round(s1.l*100)} cm) ist zu klein für den Fuß (Ø ${Math.round(state.pedestalDiameter*100)} cm).`
      });
    }
  }
}

// Render SVG drawing
function render() {
  // Clear previous rendering
  upperSlabsGroup.innerHTML = '';
  pedestalsGroup.innerHTML = '';
  lowerSlabsGroup.innerHTML = '';
  dimensionsGroup.innerHTML = '';
  terraceBoundaryGroup.innerHTML = '';

  const scale = 100; // 1m = 100px in SVG space
  const W = state.terraceWidth * scale;
  const L = state.terraceLength * scale;

  if (state.error) {
    const boundary = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boundary.setAttribute('x', '0');
    boundary.setAttribute('y', '0');
    boundary.setAttribute('width', isNaN(W) || W <= 0 ? 400 : W);
    boundary.setAttribute('height', isNaN(L) || L <= 0 ? 300 : L);
    boundary.setAttribute('class', 'svg-boundary');
    boundary.style.stroke = 'var(--accent-red)';
    boundary.style.fill = 'rgba(239, 68, 68, 0.02)';
    terraceBoundaryGroup.appendChild(boundary);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (isNaN(W) || W <= 0 ? 400 : W) / 2);
    text.setAttribute('y', (isNaN(L) || L <= 0 ? 300 : L) / 2);
    text.setAttribute('fill', 'var(--accent-red)');
    text.setAttribute('font-size', '14px');
    text.setAttribute('font-weight', '700');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = state.error;
    terraceBoundaryGroup.appendChild(text);

    zoomGroup.setAttribute('transform', `translate(${state.zoomOffsetX}, ${state.zoomOffsetY}) scale(${state.zoomScale})`);
    return;
  }

  // Set up markers for dimension arrows
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
  }
  
  if (!document.getElementById('arrow')) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
    path.setAttribute('fill', 'var(--text-muted)');
    
    marker.appendChild(path);
    defs.appendChild(marker);
  }

  // Draw Terrace Boundary Box
  const boundary = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  boundary.setAttribute('x', '0');
  boundary.setAttribute('y', '0');
  boundary.setAttribute('width', W);
  boundary.setAttribute('height', L);
  boundary.setAttribute('class', 'svg-boundary');
  boundary.style.stroke = 'var(--text-primary)';
  boundary.style.fill = 'rgba(255,255,255,0.01)';
  terraceBoundaryGroup.appendChild(boundary);

  // Draw 1. Lower Concrete Slabs
  if (state.showLowerSlabs) {
    state.lowerSlabs.forEach(slab => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', slab.x1 * scale);
      rect.setAttribute('y', slab.y1 * scale);
      rect.setAttribute('width', slab.w * scale);
      rect.setAttribute('height', slab.l * scale);
      
      let classes = 'svg-lower-slab';
      if (slab.isCut) classes += ' cut';
      if (!slab.isValid) classes += ' invalid';
      rect.setAttribute('class', classes);

      // Event Listeners for details panel
      rect.addEventListener('mouseenter', (e) => showElementDetail('lower', slab, e));
      rect.addEventListener('mouseleave', hideElementDetail);

      lowerSlabsGroup.appendChild(rect);
    });
  }

  // Draw 2. Upper Belagplatten
  if (state.showUpperSlabs) {
    state.upperSlabs.forEach(tile => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', tile.x1 * scale);
      rect.setAttribute('y', tile.y1 * scale);
      rect.setAttribute('width', tile.w * scale);
      rect.setAttribute('height', tile.l * scale);
      
      let classes = 'svg-upper-slab';
      if (tile.isCut) classes += ' cut';
      rect.setAttribute('class', classes);

      // Event Listeners
      rect.addEventListener('mouseenter', (e) => showElementDetail('upper', tile, e));
      rect.addEventListener('mouseleave', hideElementDetail);

      upperSlabsGroup.appendChild(rect);

      // Label showing index inside tiles if big enough
      if (tile.w * scale > 24 && tile.l * scale > 24) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (tile.x1 + tile.w/2) * scale);
        text.setAttribute('y', (tile.y1 + tile.l/2) * scale + 4);
        text.setAttribute('fill', 'var(--text-secondary)');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.style.pointerEvents = 'none';
        text.textContent = tile.index;
        upperSlabsGroup.appendChild(text);
      }
    });
  }

  // Draw 3. Pedestals
  if (state.showPedestals) {
    state.pedestals.forEach(ped => {
      const rad = (state.pedestalDiameter / 2) * scale;
      
      // Circle representing foot of pedestal
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', ped.x * scale);
      circle.setAttribute('cy', ped.y * scale);
      circle.setAttribute('r', rad);
      circle.setAttribute('class', 'svg-pedestal');
      
      // Color-coding pedestal types
      if (ped.type === 'corner') {
        circle.style.stroke = 'var(--accent-red)';
      } else if (ped.type === 'edge') {
        circle.style.stroke = 'var(--accent-orange)';
      }

      circle.addEventListener('mouseenter', (e) => showElementDetail('pedestal', ped, e));
      circle.addEventListener('mouseleave', hideElementDetail);
      pedestalsGroup.appendChild(circle);

      // Draw cross inside circle to show spacer layout
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', ped.x * scale - rad * 0.7);
      line1.setAttribute('y1', ped.y * scale);
      line1.setAttribute('x2', ped.x * scale + rad * 0.7);
      line1.setAttribute('y2', ped.y * scale);
      line1.setAttribute('class', 'svg-pedestal-cross');
      
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', ped.x * scale);
      line2.setAttribute('y1', ped.y * scale - rad * 0.7);
      line2.setAttribute('x2', ped.x * scale);
      line2.setAttribute('y2', ped.y * scale + rad * 0.7);
      line2.setAttribute('class', 'svg-pedestal-cross');

      // Customize cross styling based on spacers broken off
      if (ped.type === 'corner') {
        // Corner supports 1 tile. Only draw 1 spacer line sector
        // Keep it simple, just make the cross dashed or faded
        line1.style.stroke = 'var(--text-muted)';
        line2.style.stroke = 'var(--text-muted)';
      } else if (ped.type === 'edge') {
        // Edge supports 2 tiles.
        line1.style.stroke = 'var(--text-muted)';
      }

      pedestalsGroup.appendChild(line1);
      pedestalsGroup.appendChild(line2);
    });
  }

  // Draw 4. Dimension Lines
  if (state.showDimensions) {
    const dimOffset = 30; // pixels away from terrace
    
    // Width Dimension (Top)
    const lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineX.setAttribute('x1', '0');
    lineX.setAttribute('y1', -dimOffset);
    lineX.setAttribute('x2', W);
    lineX.setAttribute('y2', -dimOffset);
    lineX.setAttribute('class', 'svg-dimension-line');
    dimensionsGroup.appendChild(lineX);

    const textX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textX.setAttribute('x', W / 2);
    textX.setAttribute('y', -dimOffset - 8);
    textX.setAttribute('class', 'svg-dimension-text');
    textX.textContent = `Breite (W): ${state.terraceWidth.toFixed(2)} m`;
    dimensionsGroup.appendChild(textX);

    // Length Dimension (Left)
    const lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineY.setAttribute('x1', -dimOffset);
    lineY.setAttribute('y1', '0');
    lineY.setAttribute('x2', -dimOffset);
    lineY.setAttribute('y2', L);
    lineY.setAttribute('class', 'svg-dimension-line');
    dimensionsGroup.appendChild(lineY);

    const textY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textY.setAttribute('x', -dimOffset - 8);
    textY.setAttribute('y', L / 2);
    textY.setAttribute('class', 'svg-dimension-text');
    textY.setAttribute('transform', `rotate(-90, ${-dimOffset - 8}, ${L / 2})`);
    textY.textContent = `Länge (L): ${state.terraceLength.toFixed(2)} m`;
    dimensionsGroup.appendChild(textY);

    // Intermediate Grid Dimensions (Spacing between concrete slabs / pedestals)
    const xs = [...new Set(state.pedestals.map(p => p.x))].sort((a, b) => a - b);
    const ys = [...new Set(state.pedestals.map(p => p.y))].sort((a, b) => a - b);
    const subOffset = 15; // closer to terrace than main labels

    // Horizontal Spacings (XS)
    for (let i = 0; i < xs.length - 1; i++) {
      const xStart = xs[i] * scale;
      const xEnd = xs[i+1] * scale;
      const xMid = (xStart + xEnd) / 2;
      const distCm = Math.round((xs[i+1] - xs[i]) * 1000) / 10;
      
      const subLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      subLine.setAttribute('x1', xStart);
      subLine.setAttribute('y1', -subOffset);
      subLine.setAttribute('x2', xEnd);
      subLine.setAttribute('y2', -subOffset);
      subLine.setAttribute('class', 'svg-dimension-line');
      subLine.style.stroke = 'var(--accent-purple)';
      dimensionsGroup.appendChild(subLine);

      const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subText.setAttribute('x', xMid);
      subText.setAttribute('y', -subOffset - 4);
      subText.setAttribute('class', 'svg-dimension-text');
      subText.style.fill = 'var(--accent-purple)';
      subText.style.fontSize = '8px';
      subText.textContent = `${distCm} cm`;
      dimensionsGroup.appendChild(subText);
    }

    // Vertical Spacings (YS)
    for (let j = 0; j < ys.length - 1; j++) {
      const yStart = ys[j] * scale;
      const yEnd = ys[j+1] * scale;
      const yMid = (yStart + yEnd) / 2;
      const distCm = Math.round((ys[j+1] - ys[j]) * 1000) / 10;
      
      const subLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      subLine.setAttribute('x1', -subOffset);
      subLine.setAttribute('y1', yStart);
      subLine.setAttribute('x2', -subOffset);
      subLine.setAttribute('y2', yEnd);
      subLine.setAttribute('class', 'svg-dimension-line');
      subLine.style.stroke = 'var(--accent-purple)';
      dimensionsGroup.appendChild(subLine);

      const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subText.setAttribute('x', -subOffset - 4);
      subText.setAttribute('y', yMid + 3);
      subText.setAttribute('class', 'svg-dimension-text');
      subText.setAttribute('transform', `rotate(-90, ${-subOffset - 4}, ${yMid})`);
      subText.style.fill = 'var(--accent-purple)';
      subText.style.fontSize = '8px';
      subText.textContent = `${distCm} cm`;
      dimensionsGroup.appendChild(subText);
    }
  }

  // Apply matrix transformations for pan and zoom
  zoomGroup.setAttribute('transform', `translate(${state.zoomOffsetX}, ${state.zoomOffsetY}) scale(${state.zoomScale})`);
}

// Zoom adjustment
function adjustZoom(factor) {
  const oldScale = state.zoomScale;
  state.zoomScale = Math.min(Math.max(state.zoomScale * factor, 0.1), 10);
  
  // Center zoom on canvas center
  const rect = svg.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  state.zoomOffsetX = cx - (cx - state.zoomOffsetX) * (state.zoomScale / oldScale);
  state.zoomOffsetY = cy - (cy - state.zoomOffsetY) * (state.zoomScale / oldScale);

  render();
}

// Reset zoom to fit terrace nicely
function resetZoom() {
  const rect = canvasWrapper.getBoundingClientRect();
  const margin = 80;
  
  const wScale = (rect.width - margin * 2) / (state.terraceWidth * 100);
  const lScale = (rect.height - margin * 2) / (state.terraceLength * 100);
  
  state.zoomScale = Math.min(wScale, lScale, 2.5); // cap zoom reset at 2.5x
  
  // Center
  state.zoomOffsetX = (rect.width - (state.terraceWidth * 100 * state.zoomScale)) / 2;
  state.zoomOffsetY = (rect.height - (state.terraceLength * 100 * state.zoomScale)) / 2;

  render();
}

// Pan event handling
function dragStart(e) {
  state.isDragging = true;
  state.dragStartX = e.clientX - state.zoomOffsetX;
  state.dragStartY = e.clientY - state.zoomOffsetY;
  canvasWrapper.style.cursor = 'grabbing';
}

function dragMove(e) {
  if (!state.isDragging) return;
  state.zoomOffsetX = e.clientX - state.dragStartX;
  state.zoomOffsetY = e.clientY - state.dragStartY;
  render();
}

function dragEnd() {
  state.isDragging = false;
  canvasWrapper.style.cursor = 'grab';
}

function handleWheel(e) {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  
  // Zoom on cursor position
  const rect = svg.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const oldScale = state.zoomScale;
  state.zoomScale = Math.min(Math.max(state.zoomScale * zoomFactor, 0.15), 8);

  state.zoomOffsetX = cursorX - (cursorX - state.zoomOffsetX) * (state.zoomScale / oldScale);
  state.zoomOffsetY = cursorY - (cursorY - state.zoomOffsetY) * (state.zoomScale / oldScale);

  render();
}

// Show Element Details in Panel on Hover
// Helper to get distances and gaps to next neighbors
function getNeighborSpacingsHtml(x, y) {
  const xs = [...new Set(state.pedestals.map(p => p.x))].sort((a,b) => a-b);
  const ys = [...new Set(state.pedestals.map(p => p.y))].sort((a,b) => a-b);
  
  const idxX = xs.indexOf(x);
  const idxY = ys.indexOf(y);
  
  let html = '';
  if (idxX < xs.length - 1) {
    const dist = xs[idxX+1] - x;
    const gap = dist - state.subWidth;
    html += `
      <div class="detail-line" style="border-top: 1px dashed var(--card-border); margin-top: 6px; padding-top: 6px;">
        <span class="detail-label">Distanz rechts (Achse):</span>
        <span class="detail-value">${Math.round(dist * 1000) / 10} cm</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Lichter Spalt rechts:</span>
        <span class="detail-value" style="color: ${gap < 0.001 ? 'var(--accent-orange)' : 'var(--text-secondary)'}">
          ${gap < 0.001 ? 'Überlappt' : (Math.round(gap * 1000) / 10) + ' cm'}
        </span>
      </div>
    `;
  }
  if (idxY < ys.length - 1) {
    const dist = ys[idxY+1] - y;
    const gap = dist - state.subLength;
    html += `
      <div class="detail-line" style="border-top: 1px dashed var(--card-border); margin-top: 6px; padding-top: 6px;">
        <span class="detail-label">Distanz unten (Achse):</span>
        <span class="detail-value">${Math.round(dist * 1000) / 10} cm</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Lichter Spalt unten:</span>
        <span class="detail-value" style="color: ${gap < 0.001 ? 'var(--accent-orange)' : 'var(--text-secondary)'}">
          ${gap < 0.001 ? 'Überlappt' : (Math.round(gap * 1000) / 10) + ' cm'}
        </span>
      </div>
    `;
  }
  return html;
}

// Show Element Details in Panel on Hover
function showElementDetail(type, data, event) {
  detailPanel.classList.remove('hidden');

  let titleText = '';
  let contentHtml = '';

  if (type === 'upper') {
    titleText = `Belagplatte #${data.index}`;
    contentHtml = `
      <div class="detail-line">
        <span class="detail-label">Status:</span>
        <span class="detail-value" style="color: ${data.isCut ? 'var(--accent-orange)' : 'var(--accent-green)'}">
          ${data.isCut ? 'Geschnitten' : 'Ganze Platte'}
        </span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Breite:</span>
        <span class="detail-value">${Math.round(data.w * 1000) / 10} cm</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Länge:</span>
        <span class="detail-value">${Math.round(data.l * 1000) / 10} cm</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Position (Zentrum):</span>
        <span class="detail-value">X: ${((data.x1 + data.x2)/2).toFixed(2)}m, Y: ${((data.y1 + data.y2)/2).toFixed(2)}m</span>
      </div>
    `;
  } else if (type === 'lower') {
    titleText = `Betonplatte (Sub)`;
    contentHtml = `
      <div class="detail-line">
        <span class="detail-label">Gehört zu Stelzenlager:</span>
        <span class="detail-value">#${data.pedestalId.replace('pedestal-', '')}</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Status:</span>
        <span class="detail-value" style="color: ${!data.isValid ? 'var(--accent-red)' : data.isCut ? 'var(--accent-orange)' : 'var(--text-secondary)'}">
          ${!data.isValid ? 'Zu klein (Instabil!)' : data.isOverlapCut ? 'Zuschnitt (Überlappung)' : data.isCut ? 'Zuschnitt (Rand)' : 'Ganze Platte'}
        </span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Größe:</span>
        <span class="detail-value">${Math.round(data.w * 100)} × ${Math.round(data.l * 100)} cm</span>
      </div>
      ${!data.isValid ? `
        <div class="detail-line" style="grid-column: span 2; margin-top: 5px; color: var(--accent-red); font-size: 0.75rem;">
          <strong>Warnung:</strong> ${data.reason}
        </div>
      ` : ''}
      ${getNeighborSpacingsHtml(data.x, data.y)}
    `;
  } else if (type === 'pedestal') {
    titleText = `Stelzenlager #${data.id.replace('pedestal-', '')}`;
    let typeName = 'Kreuzlager (Innen)';
    let color = 'var(--accent-purple)';
    if (data.type === 'corner') {
      typeName = 'Ecklager (Ecke)';
      color = 'var(--accent-red)';
    } else if (data.type === 'edge') {
      typeName = 'Randlager (Rand)';
      color = 'var(--accent-orange)';
    }

    contentHtml = `
      <div class="detail-line">
        <span class="detail-label">Typ:</span>
        <span class="detail-value" style="color: ${color}">${typeName}</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Position:</span>
        <span class="detail-value">X: ${data.x.toFixed(2)}m, Y: ${data.y.toFixed(2)}m</span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Fugenstege entfernen:</span>
        <span class="detail-value">
          ${data.type === 'corner' ? '3 Stege abbrechen' : data.type === 'edge' ? '2 Stege abbrechen' : 'Keine'}
        </span>
      </div>
      <div class="detail-line">
        <span class="detail-label">Stützt:</span>
        <span class="detail-value">${data.tilesSupported.length} Platte(n)</span>
      </div>
      ${getNeighborSpacingsHtml(data.x, data.y)}
    `;
  }

  detailTitle.textContent = titleText;
  detailContent.innerHTML = contentHtml;
}

function hideElementDetail() {
  // We keep it visible or hide on mouse leave if we want.
  // Actually, keeping it visible until hover of next item is nicer, 
  // but let's hide it if we hover out of the canvas completely.
}

// Compute statistics and update Sidebar list items
function updateMaterialList() {
  const errorAlert = document.getElementById('errorAlert');
  if (state.error) {
    if (errorAlert) {
      errorAlert.style.display = 'flex';
      document.getElementById('errorText').textContent = state.error;
    }
    
    // Reset stats
    document.getElementById('statUpperSlabsCount').textContent = '-';
    document.getElementById('statUpperSlabsWaste').textContent = 'Fehlerhafte Maße';
    document.getElementById('summaryUpperFull').textContent = '-';
    document.getElementById('summaryUpperCut').textContent = '-';
    document.getElementById('summaryUpperWastePercent').textContent = '-';
    document.getElementById('upperCutList').innerHTML = '<li>Fehler bei der Berechnung</li>';

    document.getElementById('statPedestalsCount').textContent = '-';
    document.getElementById('statPedestalsSub').textContent = 'Fehlerhafte Maße';
    document.getElementById('summaryPedestalsInner').textContent = '-';
    document.getElementById('summaryPedestalsEdge').textContent = '-';
    document.getElementById('summaryPedestalsCorner').textContent = '-';
    document.getElementById('pedestalWarning').style.display = 'none';

    document.getElementById('statLowerSlabsCount').textContent = '-';
    document.getElementById('summaryLowerFull').textContent = '-';
    document.getElementById('summaryLowerCut').textContent = '-';
    document.getElementById('summaryLowerOverlapCut').textContent = '-';
    document.getElementById('lowerCutList').innerHTML = '<li>Fehler bei der Berechnung</li>';
    return;
  }

  if (errorAlert) {
    errorAlert.style.display = 'none';
  }

  // Area calculations
  const totalArea = state.terraceWidth * state.terraceLength;
  const upperTileArea = (parseFloat(document.getElementById('tileWidth').value) / 100) * (parseFloat(document.getElementById('tileLength').value) / 100);

  // 1. Upper Slabs Statistics
  const fullUpper = state.upperSlabs.filter(s => !s.isCut).length;
  const cutUpper = state.upperSlabs.filter(s => s.isCut).length;
  const totalUpper = state.upperSlabs.length;
  
  // Waste percentage estimation:
  // Usually, a cut tile can sometimes be reused. A basic estimation is:
  // total area of tiles used - terrace area.
  // Or: (Total Tiles * Tile Area - Terrace Area) / (Total Tiles * Tile Area)
  const theoreticalTotalArea = totalUpper * upperTileArea;
  const wastePercent = Math.max(0, Math.round(((theoreticalTotalArea - totalArea) / theoreticalTotalArea) * 100));

  document.getElementById('statUpperSlabsCount').textContent = totalUpper;
  document.getElementById('statUpperSlabsWaste').textContent = `${totalArea.toFixed(2)} m² Terrassenfläche`;
  
  document.getElementById('summaryUpperFull').textContent = fullUpper;
  document.getElementById('summaryUpperCut').textContent = cutUpper;
  document.getElementById('summaryUpperWastePercent').textContent = `${wastePercent}%`;

  // Aggregate cut details for Upper Slabs
  const upperCutList = document.getElementById('upperCutList');
  upperCutList.innerHTML = '';
  
  const upperCuts = state.upperSlabs.filter(s => s.isCut);
  if (upperCuts.length === 0) {
    upperCutList.innerHTML = '<li>Keine Zuschnitte erforderlich</li>';
  } else {
    // Group similar cuts
    const groupedCuts = {};
    upperCuts.forEach(c => {
      const key = `${Math.round(c.w * 1000) / 10} × ${Math.round(c.l * 1000) / 10} cm`;
      groupedCuts[key] = (groupedCuts[key] || 0) + 1;
    });

    for (let [size, qty] of Object.entries(groupedCuts)) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${size}</span><span class="cut-qty">${qty} Stk.</span>`;
      upperCutList.appendChild(li);
    }
  }

  // 2. Pedestals Statistics
  const totalPedestals = state.pedestals.length;
  const innerPedestals = state.pedestals.filter(p => p.type === 'inner').length;
  const edgePedestals = state.pedestals.filter(p => p.type === 'edge').length;
  const cornerPedestals = state.pedestals.filter(p => p.type === 'corner').length;

  document.getElementById('statPedestalsCount').textContent = totalPedestals;
  document.getElementById('statPedestalsSub').textContent = `Davon ${cornerPedestals} Ecken, ${edgePedestals} Ränder`;

  document.getElementById('summaryPedestalsInner').textContent = innerPedestals;
  document.getElementById('summaryPedestalsEdge').textContent = edgePedestals;
  document.getElementById('summaryPedestalsCorner').textContent = cornerPedestals;

  // 3. Lower Concrete Slabs Statistics
  const totalLower = state.lowerSlabs.length;
  const fullLower = state.lowerSlabs.filter(s => !s.isCut).length;
  const cutLower = state.lowerSlabs.filter(s => s.isCut && !s.isOverlapCut).length;
  const overlapCutLower = state.lowerSlabs.filter(s => s.isOverlapCut).length;

  document.getElementById('statLowerSlabsCount').textContent = totalLower;
  
  document.getElementById('summaryLowerFull').textContent = fullLower;
  document.getElementById('summaryLowerCut').textContent = cutLower;
  document.getElementById('summaryLowerOverlapCut').textContent = overlapCutLower;

  // Warning check
  const warningAlert = document.getElementById('pedestalWarning');
  if (state.warnings.length > 0) {
    warningAlert.style.display = 'flex';
    warningAlert.querySelector('p').textContent = `${state.warnings.length} Stelzenlager stehen instabil über die Unterplatten hinaus!`;
  } else {
    warningAlert.style.display = 'none';
  }

  // Aggregate cut details for Lower Slabs
  const lowerCutList = document.getElementById('lowerCutList');
  lowerCutList.innerHTML = '';

  const lowerCuts = state.lowerSlabs.filter(s => s.isCut);
  if (lowerCuts.length === 0) {
    lowerCutList.innerHTML = '<li>Keine Zuschnitte erforderlich</li>';
  } else {
    const groupedLowerCuts = {};
    lowerCuts.forEach(c => {
      const key = `${Math.round(c.w * 100)} × ${Math.round(c.l * 100)} cm`;
      groupedLowerCuts[key] = (groupedLowerCuts[key] || 0) + 1;
    });

    for (let [size, qty] of Object.entries(groupedLowerCuts)) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${size}</span><span class="cut-qty">${qty} Stk.</span>`;
      lowerCutList.appendChild(li);
    }
  }
}

// Prepare Print View of the Plan
function preparePrint() {
  const printContainer = document.getElementById('printContainer');
  printContainer.innerHTML = '';

  // Title
  const header = document.createElement('div');
  header.className = 'print-header';
  header.innerHTML = `
    <div>
      <h1>Verlegeplan & Materialbedarf</h1>
      <p>Erstellt mit TerrassenPlaner SPA</p>
    </div>
    <div style="text-align: right">
      <p>Datum: ${new Date().toLocaleDateString()}</p>
      <p>Fläche: ${(state.terraceWidth * state.terraceLength).toFixed(2)} m² (${state.terraceWidth.toFixed(2)} x ${state.terraceLength.toFixed(2)} m)</p>
    </div>
  `;
  printContainer.appendChild(header);

  // SVG Clone (without grid patterns, and optimized styles for printing)
  const printCanvas = document.createElement('div');
  printCanvas.className = 'print-canvas-wrapper';
  
  const svgClone = svg.cloneNode(true);
  svgClone.setAttribute('width', '100%');
  svgClone.setAttribute('height', '100%');
  
  // Reset clone's zoom transformation to fit page nicely
  const zGrp = svgClone.querySelector('#zoomGroup');
  
  // Calculate print scale and center drawing, leaving margins for dimension labels
  const drawMargin = 45; // px (representing 45cm for labels)
  const drawW = state.terraceWidth * 100 + drawMargin;
  const drawH = state.terraceLength * 100 + drawMargin;
  
  const targetW = 800 - 40; // Fit inside the 800px viewBox width
  const targetH = 600 - 40; // Fit inside the 600px viewBox height
  const scale = Math.min(targetW / drawW, targetH / drawH);
  
  const offX = 20 + (targetW - drawW * scale) / 2 + drawMargin * scale;
  const offY = 20 + (targetH - drawH * scale) / 2 + drawMargin * scale;
  zGrp.setAttribute('transform', `translate(${offX}, ${offY}) scale(${scale})`);
  
  // Remove background grid rect from print clone
  const bgGrid = svgClone.querySelector('rect');
  if (bgGrid) bgGrid.remove();

  printCanvas.appendChild(svgClone);
  printContainer.appendChild(printCanvas);

  // Content Details Grid
  const detailsGrid = document.createElement('div');
  detailsGrid.className = 'print-grid';

  // 1. Inputs Section
  const inputsSec = document.createElement('div');
  inputsSec.className = 'print-section';
  inputsSec.innerHTML = `
    <h2>1. Eingestellte Parameter</h2>
    <table class="print-table">
      <tr><td>Terrassenbreite / -länge</td><td>${state.terraceWidth.toFixed(2)} m × ${state.terraceLength.toFixed(2)} m</td></tr>
      <tr><td>Obere Platten (Belag)</td><td>${document.getElementById('tileWidth').value} cm × ${document.getElementById('tileLength').value} cm (Fuge: ${document.getElementById('jointWidth').value} mm)</td></tr>
      <tr><td>Untere Platten (Beton)</td><td>${document.getElementById('subWidth').value} cm × ${document.getElementById('subLength').value} cm</td></tr>
      <tr><td>Stelzenlager-Ø</td><td>${document.getElementById('pedestalDiameter').value} cm</td></tr>
      <tr><td>Ausrichtung</td><td>${document.getElementById('layoutPattern').options[document.getElementById('layoutPattern').selectedIndex].text}</td></tr>
      <tr><td>Platten am Rand schneiden</td><td>${state.cutSubEdges ? 'Ja' : 'Nein'}</td></tr>
      <tr><td>Überlappende Platten schneiden</td><td>${state.cutSubOverlaps ? 'Ja' : 'Nein'}</td></tr>
    </table>
  `;
  detailsGrid.appendChild(inputsSec);

  // 2. Material Summary Section
  const matSec = document.createElement('div');
  matSec.className = 'print-section';
  matSec.innerHTML = `
    <h2>2. Benötigtes Material</h2>
    <table class="print-table">
      <tr><th>Material</th><th>Menge</th><th>Info</th></tr>
      <tr><td>Belagplatten (Oben)</td><td><strong>${state.upperSlabs.length} Stk.</strong></td><td>${state.upperSlabs.filter(s => !s.isCut).length} Ganze, ${state.upperSlabs.filter(s => s.isCut).length} Schnitte</td></tr>
      <tr><td>Stelzenlager</td><td><strong>${state.pedestals.length} Stk.</strong></td><td>Davon ${state.pedestals.filter(p => p.type === 'inner').length} Kreuz, ${state.pedestals.filter(p => p.type === 'edge').length} Rand, ${state.pedestals.filter(p => p.type === 'corner').length} Eck</td></tr>
      <tr><td>Betonplatten (Unten)</td><td><strong>${state.lowerSlabs.length} Stk.</strong></td><td>${state.lowerSlabs.filter(s => !s.isCut).length} Ganze, ${state.lowerSlabs.filter(s => s.isCut).length} Schnitte</td></tr>
    </table>
  `;
  detailsGrid.appendChild(matSec);

  // 3. Upper Cuts
  const upCutSec = document.createElement('div');
  upCutSec.className = 'print-section';
  let upCutRows = '';
  const upperCuts = state.upperSlabs.filter(s => s.isCut);
  if (upperCuts.length === 0) {
    upCutRows = '<tr><td colspan="2">Keine Zuschnitte notwendig</td></tr>';
  } else {
    const grouped = {};
    upperCuts.forEach(c => {
      const key = `${Math.round(c.w * 1000) / 10} × ${Math.round(c.l * 1000) / 10} cm`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    for (let [size, qty] of Object.entries(grouped)) {
      upCutRows += `<tr><td>${size}</td><td><strong>${qty} Stk.</strong></td></tr>`;
    }
  }
  upCutSec.innerHTML = `
    <h2>3. Zuschnitte Belagplatten</h2>
    <table class="print-table">
      <thead><tr><th>Abmessung</th><th>Stückzahl</th></tr></thead>
      <tbody>${upCutRows}</tbody>
    </table>
  `;
  detailsGrid.appendChild(upCutSec);

  // 4. Lower Cuts
  const lowCutSec = document.createElement('div');
  lowCutSec.className = 'print-section';
  let lowCutRows = '';
  const lowerCuts = state.lowerSlabs.filter(s => s.isCut);
  if (lowerCuts.length === 0) {
    lowCutRows = '<tr><td colspan="2">Keine Zuschnitte notwendig</td></tr>';
  } else {
    const grouped = {};
    lowerCuts.forEach(c => {
      const key = `${Math.round(c.w * 100)} × ${Math.round(c.l * 100)} cm`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    for (let [size, qty] of Object.entries(grouped)) {
      lowCutRows += `<tr><td>${size}</td><td><strong>${qty} Stk.</strong></td></tr>`;
    }
  }
  lowCutSec.innerHTML = `
    <h2>4. Zuschnitte Betonplatten (Unterkonstruktion)</h2>
    <table class="print-table">
      <thead><tr><th>Abmessung</th><th>Stückzahl</th></tr></thead>
      <tbody>${lowCutRows}</tbody>
    </table>
  `;
  detailsGrid.appendChild(lowCutSec);

  printContainer.appendChild(detailsGrid);

  // Trigger print dialog
  window.print();
}

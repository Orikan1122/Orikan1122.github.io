/* VARIABLES */
let currentPoints = [];
let allPaths = [];
let isDrawing = false;
let isPreviewing = false;
let naturalWidth = 0, naturalHeight = 0;
let loadedImageSrc = "";
let myChart = null;

// Interaction State
let selectedPathIdx = -1;
let selectedPtIdx = -1;
let dragTarget = null; 
let isRelocating = false;
/* 1. NEW VARIABLES (Add to top) */
let scale = 1;
let pX = 0;
let pY = 0;
let isPanning = false;
let startPanX = 0, startPanY = 0;
// We need to track if we actually moved, to distinguish Pan vs Click
let hasPanned = false;

/* ELEMENTS */
const img = document.getElementById('map-image');
const svg = document.getElementById('marker-layer');
const editContainer = document.getElementById('edit-container');
const btnStart = document.getElementById('btnStart');
const btnUndo = document.getElementById('btnUndo');
const btnFinish = document.getElementById('btnFinish');

/* --- 1. SETUP --- */
document.getElementById('imgLoader').addEventListener('change', function(e) {
    if(!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(evt) { loadedImageSrc = evt.target.result; loadImage(); };
    reader.readAsDataURL(e.target.files[0]);
});

function loadImage() {
    img.src = loadedImageSrc;
    img.onload = function() {
        naturalWidth = img.naturalWidth;
        naturalHeight = img.naturalHeight;
        svg.setAttribute('viewBox', `0 0 ${naturalWidth} ${naturalHeight}`);
        
        editContainer.style.width = naturalWidth + "px";
        editContainer.style.height = naturalHeight + "px";
        
        document.getElementById('btnStart').disabled = false;
        document.getElementById('btnPreview').disabled = false;
        document.getElementById('btnRecord').disabled = false;
        
        // CENTER THE IMAGE INITIALLY
        const wrapper = document.getElementById('edit-scroll-wrapper');
        scale = Math.min(
            (wrapper.offsetWidth - 40) / naturalWidth, 
            (wrapper.offsetHeight - 40) / naturalHeight
        );
        // Ensure scale is reasonable (e.g., between 10% and 100%)
        if(scale > 1) scale = 1; 
        
        // Calculate center position
        pX = (wrapper.offsetWidth - (naturalWidth * scale)) / 2;
        pY = (wrapper.offsetHeight - (naturalHeight * scale)) / 2;
        
        // Update Slider UI
        document.getElementById('zoomSlider').value = Math.floor(scale * 100);
        document.getElementById('zoomVal').innerText = Math.floor(scale * 100) + "%";

        updateTransform();
    }
}
function updateTransform() {
    // Apply translation (Pan) and Scale (Zoom)
    editContainer.style.transform = `translate(${pX}px, ${pY}px) scale(${scale})`;
}
function fitToScreen() {
    const scale = (document.getElementById('main-area').offsetWidth - 50) / naturalWidth;
    document.getElementById('zoomSlider').value = Math.min(Math.floor(scale * 100), 100);
    applyZoom();
}

document.getElementById('zoomSlider').addEventListener('input', function() {
    const oldScale = scale;
    scale = this.value / 100;
    
    // Optional: Zoom towards center of screen (simple approach)
    // We adjust pX/pY slightly so the image doesn't jump away
    const wrapper = document.getElementById('edit-scroll-wrapper');
    const cx = wrapper.offsetWidth / 2;
    const cy = wrapper.offsetHeight / 2;
    
    // Math to keep the image centered while zooming
    pX = cx - (cx - pX) * (scale / oldScale);
    pY = cy - (cy - pY) * (scale / oldScale);

    document.getElementById('zoomVal').innerText = this.value + "%";
    updateTransform();
});

function rotateImage() {
    if(!loadedImageSrc) return;
    if(allPaths.length > 0 && !confirm("Rotating clears current paths. Continue?")) return;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const i = new Image();
    i.onload = function() {
        c.width = i.height; c.height = i.width;
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(i, -i.width/2, -i.height/2);
        loadedImageSrc = c.toDataURL();
        allPaths = []; currentPoints = []; updatePathList(); drawVisuals();
        loadImage();
    };
    i.src = loadedImageSrc;
}
/* --- PANNING LOGIC --- */
const scrollWrapper = document.getElementById('edit-scroll-wrapper');

scrollWrapper.addEventListener('mousedown', function(e) {
    // Don't pan if clicking a dot or if interacting with the inspector
    if(e.target.tagName === 'CIRCLE' || e.target.closest('.inspector-box')) return;
    
    isPanning = true;
    hasPanned = false; // Reset status
    startPanX = e.clientX - pX;
    startPanY = e.clientY - pY;
});

window.addEventListener('mousemove', function(e) {
    if(!isPanning) return;
    e.preventDefault();
    
    const newX = e.clientX - startPanX;
    const newY = e.clientY - startPanY;

    // Check if we moved enough to consider it a "Pan" (prevents accidental tiny drags)
    if(Math.abs(newX - pX) > 2 || Math.abs(newY - pY) > 2) {
        hasPanned = true;
    }

    pX = newX;
    pY = newY;
    updateTransform();
});

window.addEventListener('mouseup', function() {
    isPanning = false;
});
/* --- 2. INTERACTION ENGINE --- */

function getImgCoords(e) {
    const rect = img.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * naturalWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * naturalHeight);
    return [x, y];
}

// DRAG START
// REPLACE your editContainer event listener with this:
editContainer.addEventListener('click', function(e) {
    // 1. If we just finished Panning, DO NOT treat this as a click.
    if(hasPanned) {
        hasPanned = false;
        return;
    }

    // 2. Logic for Relocating
    if(isRelocating && selectedPathIdx !== -1) {
        if(allPaths[selectedPathIdx]) {
            const coords = getImgCoords(e);
            movePointWithWobbles(selectedPathIdx, selectedPtIdx, coords);
        }
        isRelocating = false;
        img.classList.remove('relocating-cursor');
        document.getElementById('relocateMsg').style.display = 'none';
        document.getElementById('btnRelocate').disabled = false;
        drawVisuals();
        return;
    }

    // 3. Logic for Drawing
    if(isDrawing && !dragTarget) {
        const coords = getImgCoords(e);
        currentPoints.push(coords);
        drawVisuals();
    } 
    
    // 4. Logic for Deselecting
    else if(!isDrawing && !dragTarget && !isRelocating) {
        closeInspector();
    }
});
// DRAG MOVE
window.addEventListener('mousemove', function(e) {
    if(!dragTarget) return;

    const dist = Math.abs(e.clientX - dragTarget.initialX) + Math.abs(e.clientY - dragTarget.initialY);
    if(dist > 3) dragTarget.isDragging = true;

    if(dragTarget.isDragging) {
        const coords = getImgCoords(e);
        if(coords[0] < 0 || coords[1] < 0) return; // Bounds check

        // CASE A: Drawing New Path (index -1)
        if(dragTarget.pathIdx === -1) {
            if (currentPoints[dragTarget.ptIdx]) {
                currentPoints[dragTarget.ptIdx] = coords;
            }
        } 
        // CASE B: Editing Saved Path
        else {
            // SAFETY CHECK: Ensure path still exists
            if (allPaths[dragTarget.pathIdx]) {
                movePointWithWobbles(dragTarget.pathIdx, dragTarget.ptIdx, coords);
            }
        }
        drawVisuals();
    }
});

// DRAG END
window.addEventListener('mouseup', function(e) {
    if(dragTarget) {
        // We only handle cleanup here. 
        // Selection is now handled by onDotClick()
        
        // Just remove the dragging class
        document.querySelectorAll('circle').forEach(c => c.classList.remove('dragging'));
        dragTarget = null;
    }
});
// REPLACE the existing img.addEventListener('click'...) block with this:

// Replace the old img.addEventListener with this:
editContainer.addEventListener('click', function(e) {
    // If the click target was a DOT, the event propagation is stopped in onDotClick.
    // So if we reach here, the user clicked the Map/Background.

    // CASE 1: RELOCATING
    if(isRelocating && selectedPathIdx !== -1) {
        if(allPaths[selectedPathIdx]) {
            const coords = getImgCoords(e);
            movePointWithWobbles(selectedPathIdx, selectedPtIdx, coords);
        }
        isRelocating = false;
        img.classList.remove('relocating-cursor');
        document.getElementById('relocateMsg').style.display = 'none';
        document.getElementById('btnRelocate').disabled = false;
        drawVisuals();
        return;
    }

    // CASE 2: DRAWING NEW PATH
    // We check if the target is NOT a circle (dragTarget check handles dragging conflict)
    if(isDrawing && !dragTarget) {
        const coords = getImgCoords(e);
        currentPoints.push(coords);
        drawVisuals();
    } 
    
    // CASE 3: DESELECT
    // If we are not drawing, not relocating, and not dragging...
    // And we clicked the background (not a dot)...
    else if(!isDrawing && !dragTarget && !isRelocating) {
        // Close the menu
        closeInspector();
    }
});

// Helper: Safely moves a point and its wait-wobbles
function movePointWithWobbles(pIdx, ptIdx, newCoords) {
    // SAFETY CHECK
    if (!allPaths[pIdx] || !allPaths[pIdx].coords) return;

    const pathArr = allPaths[pIdx].coords;
    if (!pathArr[ptIdx]) return;

    // 1. Calculate how much we are moving
    const oldCoord = pathArr[ptIdx];
    const diffX = newCoords[0] - oldCoord[0];
    const diffY = newCoords[1] - oldCoord[1];

    // 2. Update the main clicked point
    pathArr[ptIdx] = newCoords;

    // 3. Update any subsequent points that were "waiting" at this same spot
    // We look forward from the clicked point
    for(let i = ptIdx + 1; i < pathArr.length; i++) {
        const p = pathArr[i];
        
        // If the next point is at the OLD location (within tolerance), move it too
        // We compare against the coordinates BEFORE the move, so we check distance to (newCoords - diff)
        // Actually, simpler logic: check if it's close to the *original* oldCoord.
        // However, since we overwrote pathArr[ptIdx], we rely on the diff.
        
        // Check if this point is part of the stack (distance to previous point is effectively 0)
        // Since we just moved the previous point (or the one before it), checking relative distance is tricky.
        // Instead, we assume wait points are effectively clones.
        
        // Heuristic: If the point was within 1 pixel of the OLD coordinate, move it.
        // Since we don't have the original value of p easily without cloning, 
        // we calculate "Where p is now" vs "Where oldCoord was".
        
        // Easier approach for your specific app:
        // Any point immediately following that is basically identical is part of the wait cycle.
        const prevInStack = pathArr[i-1]; // This has already been moved
        
        // If this point is physically far from the moved point (minus diff), it's a new movement leg.
        // We use the diff to calculate where the previous point WAS.
        const prevWasX = prevInStack[0] - diffX;
        const prevWasY = prevInStack[1] - diffY;

        if(Math.abs(p[0] - prevWasX) < 2 && Math.abs(p[1] - prevWasY) < 2) {
             pathArr[i] = [p[0] + diffX, p[1] + diffY];
        } else {
            // Found a point that moves away, stop updating
            break;
        }
    }
}


/* --- 3. DRAWING & VISUALS --- */
btnStart.onclick = () => { isDrawing = true; currentPoints = []; toggleControls(true); };
btnUndo.onclick = () => { currentPoints.pop(); drawVisuals(); };
btnFinish.onclick = () => {
    if(currentPoints.length < 2) return alert("Path too short");
    allPaths.push({ name: "Path " + (allPaths.length+1), coords: [...currentPoints] });
    isDrawing = false; currentPoints = []; toggleControls(false);
    updatePathList(); drawVisuals();
};

function toggleControls(drawing) {
    btnStart.disabled = drawing;
    btnUndo.disabled = !drawing;
    btnFinish.disabled = !drawing;
    btnPreview.disabled = drawing;
    if(drawing) closeInspector();
}

function drawVisuals() {
    let html = '';
    
    // 1. Draw Lines (With pointer-events="none" to prevent blocking)
    allPaths.forEach((path, pIdx) => {
        if (!path.coords || path.coords.length === 0) return;
        const pts = path.coords.map(p => p.join(',')).join(' ');
        // CRITICAL: pointer-events="none" ensures clicks pass through the line to the dots/map
        html += `<polyline points="${pts}" fill="none" stroke="#0d6efd" stroke-width="4" opacity="0.5" pointer-events="none" />`;
    });

    // 2. Draw Active Drawing Line
    if(currentPoints.length > 0) {
        const pts = currentPoints.map(p => p.join(',')).join(' ');
        html += `<polyline points="${pts}" fill="none" stroke="#dc3545" stroke-width="4" pointer-events="none" />`;
    }

    // 3. Draw Dots (On top of everything)
    // Helper to render a dot with direct CLICK handler
    const renderDot = (x, y, pIdx, ptIdx, color, isSel) => {
        const r = isSel ? 9 : 6; 
        // We add onclick="onDotClick(...)" directly here
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="1" 
                class="${isSel ? 'selected-dot' : ''}" 
                onclick="onDotClick(event, ${pIdx}, ${ptIdx})"
                data-pIdx="${pIdx}" data-ptIdx="${ptIdx}" />`;
    };

    allPaths.forEach((path, pIdx) => {
        if (!path.coords) return;
        path.coords.forEach((p, i) => {
            // Visibility logic: Show start, show significant moves, or show if selected
            let isVisible = (i === 0);
            if(i > 0) {
                const prev = path.coords[i-1];
                if(Math.abs(p[0]-prev[0]) > 2 || Math.abs(p[1]-prev[1]) > 2) isVisible = true;
            }
            if(pIdx === selectedPathIdx && i === selectedPtIdx) isVisible = true;

            if(isVisible) {
                const isSelected = (pIdx === selectedPathIdx && i === selectedPtIdx);
                html += renderDot(p[0], p[1], pIdx, i, '#0d6efd', isSelected);
            }
        });
    });

    if(currentPoints.length > 0) {
        currentPoints.forEach((p, i) => html += renderDot(p[0], p[1], -1, i, '#dc3545', false));
    }
    
    svg.innerHTML = html;
}

function updatePathList() {
    const ul = document.getElementById('pathList');
    ul.innerHTML = '';
    allPaths.forEach((p, i) => {
        ul.innerHTML += `<li><span>${p.name}</span> <button onclick="deletePath(${i})" style="width:auto;padding:2px 5px;color:red">x</button></li>`;
    });
}
function deletePath(i) { 
    allPaths.splice(i,1); 
    closeInspector(); 
    updatePathList(); 
    drawVisuals(); 
}


/* --- 4. INSPECTOR & RELOCATE LOGIC --- */

function selectPoint(pIdx, ptIdx) {
    if (!allPaths[pIdx] || !allPaths[pIdx].coords) return;

    selectedPathIdx = pIdx;
    selectedPtIdx = ptIdx;
    
    // ... (Your existing Wait Time calculation logic) ...
    const coords = allPaths[pIdx].coords;
    let ticks = 0;
    for(let i = ptIdx + 1; i < coords.length; i++) {
        const curr = coords[i];
        const prev = coords[i-1];
        if(Math.abs(curr[0]-prev[0]) <= 2 && Math.abs(curr[1]-prev[1]) <= 2) ticks++;
        else break;
    }
    const seconds = (ticks / 60).toFixed(1);

    // DISPLAY THE INSPECTOR
    document.getElementById('point-inspector').style.display = 'block';
    
    // Update the button visibility (Optional: you can hide it if you only want it on the last point)
    // For now, we always show it:
    document.getElementById('btnContinue').style.display = 'block';

    document.getElementById('insp-current-wait').innerText = (seconds > 0) ? seconds + "s" : "Moving";
    document.getElementById('insp-seconds').value = seconds;
    
    drawVisuals();
}

window.closeInspector = function() {
    document.getElementById('point-inspector').style.display = 'none';
    selectedPathIdx = -1; selectedPtIdx = -1;
    isRelocating = false;
    img.classList.remove('relocating-cursor');
    document.getElementById('relocateMsg').style.display = 'none';
    document.getElementById('btnRelocate').disabled = false;
    drawVisuals();
};

window.startRelocate = function() {
    if(selectedPathIdx === -1) return;
    isRelocating = true;
    img.classList.add('relocating-cursor');
    document.getElementById('relocateMsg').style.display = 'block';
    document.getElementById('btnRelocate').disabled = true;
}

window.updateWaitTime = function() {
    // ... (keep the checks at the top)
    if(selectedPathIdx === -1 || selectedPtIdx === -1) return;
    if (!allPaths[selectedPathIdx]) return;

    const seconds = parseFloat(document.getElementById('insp-seconds').value);
    const targetTicks = Math.round(seconds * 60);
    const path = allPaths[selectedPathIdx].coords;
    
    // 1. Remove OLD wait points
    let existingTicks = 0;
    for(let i = selectedPtIdx + 1; i < path.length; i++) {
        const curr = path[i];
        const prev = path[i-1];
        // Check for identical (or very close) points
        if(Math.abs(curr[0]-prev[0]) < 0.5 && Math.abs(curr[1]-prev[1]) < 0.5) {
            existingTicks++;
        } else {
            break;
        }
    }
    if(existingTicks > 0) path.splice(selectedPtIdx + 1, existingTicks);

    // 2. Add NEW wait points
    if(targetTicks > 0) {
        const anchor = path[selectedPtIdx];
        const newPts = [];
        for(let i = 0; i < targetTicks; i++) {
            // CHANGE: We push the EXACT same coordinate (no +1 offset)
            // This ensures the dot is perfectly still
            newPts.push([anchor[0], anchor[1]]);
        }
        path.splice(selectedPtIdx + 1, 0, ...newPts);
    }
    
    // Refresh view
    document.getElementById('insp-current-wait').innerText = seconds + "s";
    drawVisuals();
};

window.deleteSelectedPoint = function() {
    if(selectedPathIdx === -1) return;
    if (!allPaths[selectedPathIdx]) return;

    const path = allPaths[selectedPathIdx].coords;
    if(path.length <= 2) return alert("Path needs 2+ points");

    let ticks = 0;
    for(let i = selectedPtIdx + 1; i < path.length; i++) {
        const curr = path[i];
        const prev = path[i-1];
        if(Math.abs(curr[0]-prev[0]) <= 2 && Math.abs(curr[1]-prev[1]) <= 2) ticks++;
        else break;
    }
    path.splice(selectedPtIdx, 1 + ticks);
    closeInspector();
    drawVisuals();
};

/* --- 5. PREVIEW & RECORDING --- */
const btnPreview = document.getElementById('btnPreview');
const btnRecord = document.getElementById('btnRecord');

btnPreview.onclick = () => {
    isPreviewing = !isPreviewing;
    if(isPreviewing) {
        document.getElementById('edit-scroll-wrapper').style.display = 'none';
        document.getElementById('preview-container').style.display = 'block';
        btnPreview.innerText = "✖ STOP";
        
        // NEW FUNCTION CALL
        startPreviewAnimation();
        
    } else {
        document.getElementById('edit-scroll-wrapper').style.display = 'block'; // Changed to block/flex
        document.getElementById('preview-container').style.display = 'none';
        btnPreview.innerText = "▶ PREVIEW";
        cancelAnimationFrame(animationId);
    }
};
/* CONTINUE PATH LOGIC */
window.continuePath = function() {
    if(selectedPathIdx === -1) return;

    // 1. Get the path data
    const pathData = allPaths[selectedPathIdx];
    
    // 2. Move existing points into the drawing buffer
    // We use [... ] to create a fresh copy of the array
    currentPoints = [...pathData.coords];

    // 3. Remove the path from the "Finished" list
    allPaths.splice(selectedPathIdx, 1);

    // 4. Reset the UI
    closeInspector();
    updatePathList();

    // 5. Activate Drawing Mode
    isDrawing = true;
    
    // Enable the "Finish" and "Undo" buttons
    toggleControls(true); 
    
    // Redraw (The path will turn Red to indicate it is being edited)
    drawVisuals();
};
/* --- UPDATED PREVIEW ANIMATION ENGINE --- */
/* --- FIXED PREVIEW ENGINE (With Path Smoothing) --- */
let animationId = null;


/* --- ECHARTS PREVIEW ENGINE (Professional Smoothness) --- */
/* --- FIXED PREVIEW ENGINE (Aligned & Smooth) --- */
// Ensure we use the global variable defined at the top of your script
// (Do not declare 'let animationId' here if it is already at the top)

/* --- FIXED PREVIEW ENGINE (Aligned & Smooth) --- */
/* --- FIXED PREVIEW ENGINE (Solves "Stuck" Dot) --- */
function startPreviewAnimation() {
    const container = document.getElementById('preview-chart');
    const wrapper = document.getElementById('preview-container');
    
    // 1. EXACT SIZING (Matches your Map)
    const cw = wrapper.clientWidth;
    const ch = wrapper.clientHeight;
    
    // Safety check
    if(!naturalWidth || !naturalHeight) return;

    const imgRatio = naturalWidth / naturalHeight;
    const screenRatio = cw / ch;
    
    let finalW, finalH;
    
    // Fit image to screen while maintaining aspect ratio
    if (imgRatio > screenRatio) {
        finalW = cw;
        finalH = cw / imgRatio;
    } else {
        finalH = ch;
        finalW = ch * imgRatio;
    }
    
    container.style.width = finalW + 'px';
    container.style.height = finalH + 'px';
    container.style.position = 'absolute';
    container.style.left = ((cw - finalW) / 2) + 'px';
    container.style.top = ((ch - finalH) / 2) + 'px';

    // 2. SETUP ECHARTS
    if (myChart) { myChart.dispose(); }
    myChart = echarts.init(container, null, { renderer: 'canvas' });

    // Static Lines Data
    const staticLines = allPaths.map(p => ({ coords: p.coords }));

    const option = {
        animation: false, // We drive animation manually
        grid: { top: 0, left: 0, right: 0, bottom: 0 },
        xAxis: { min: 0, max: naturalWidth, show: false },
        yAxis: { min: 0, max: naturalHeight, show: false, inverse: true },
        
        graphic: [
            {
                type: 'image',
                id: 'bg',
                left: 0, top: 0,
                style: {
                    image: img.src,
                    width: finalW, 
                    height: finalH
                }
            }
        ],
        series: [
            // The Paths (Static)
            {
                type: 'lines',
                coordinateSystem: 'cartesian2d',
                polyline: true,
                lineStyle: {
                    color: document.getElementById('pathColor').value,
                    width: 4, opacity: 0.6
                },
                data: staticLines
            },
            // The Dot (Dynamic)
            {
                name: 'dot',
                type: 'scatter',
                coordinateSystem: 'cartesian2d',
                symbol: 'circle',
                symbolSize: 15,
                itemStyle: {
                    color: document.getElementById('objColor').value,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                data: [] 
            }
        ]
    };
    
    myChart.setOption(option);

    // 3. GENERATE MOTION FRAMES
    const speedSlider = parseInt(document.getElementById('speedSlider').value);
    
    // Speed: How many pixels we move per frame during 'Movement' segments
    // Higher slider = Larger jumps per frame = Faster movement
    const pixelsPerFrame = speedSlider * 0.8; 
    
    const frames = [];
    
    allPaths.forEach(path => {
        const coords = path.coords;
        if(coords.length < 2) return;

        for(let i=0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i+1];
            
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const dist = Math.sqrt(dx*dx + dy*dy);

            // --- THE FIX IS HERE ---
            // Condition: Is this a "Wait Point" (Duplicate)?
            if(dist < 0.5) {
                // OLD BUGGY LOGIC: Added a loop here (multiplied wait time).
                // NEW FIXED LOGIC: Just add the point ONCE.
                // Since 'updateWaitTime' adds 60 duplicates for 1 second,
                // adding them 1-by-1 here results in exactly 1 second of wait.
                frames.push(p1);
            } 
            // Condition: Is this Movement?
            else {
                // Interpolate (Create smooth steps between points)
                const stepCount = Math.max(1, Math.floor(dist / pixelsPerFrame));
                for(let f=1; f<=stepCount; f++) {
                    const t = f / stepCount;
                    frames.push([
                        p1[0] + dx * t,
                        p1[1] + dy * t
                    ]);
                }
            }
        }
    });

    // 4. ANIMATION LOOP
    let frameIndex = 0;
    const loopMode = document.getElementById('loopMode').value;
    const loopCount = parseInt(document.getElementById('loopCount').value) || 1;
    let currentLoop = 0;

    function animate() {
        if(!isPreviewing) return;

        if (frameIndex >= frames.length) {
            currentLoop++;
            if (loopMode !== 'infinite' && currentLoop >= loopCount) {
                return; // Stop
            }
            frameIndex = 0;
        }

        const p = frames[frameIndex];

        // Move the dot
        myChart.setOption({
            series: [
                { name: 'paths' }, // Ignore
                {
                    name: 'dot',
                    data: [ p ] // Update position
                }
            ]
        });

        frameIndex++;
        animationId = requestAnimationFrame(animate);
    }

    cancelAnimationFrame(animationId);
    animate();
}

// --- NEW HELPER: THE SMOOTH RESAMPLER ---
// This turns the path into tiny 1px slices. 
// Moves become: [1, 1.1, 1.2...] 
// Waits become: [2, 2, 2, 2...]
// This ensures constant speed and no jumping.
function resamplePath(coords) {
    if(!coords || coords.length < 2) return coords;

    const newCoords = [];
    newCoords.push(coords[0]); 

    for(let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i+1];

        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.sqrt(dx*dx + dy*dy);

        // IS IT A WAIT POINT? (Distance close to 0)
        // We replicate it to create "Time" in the array
        if(dist < 0.5) {
            // We treat 1 wait point as roughly equivalent to moving 30 pixels
            // This makes the wait felt in the animation
            const waitWeight = 30; 
            for(let w=0; w<waitWeight; w++) {
                newCoords.push(p2);
            }
            continue;
        }

        // IS IT A MOVE?
        // Subdivide into 1px steps for fluid motion
        const steps = Math.floor(dist); // 1 step per pixel
        
        for(let s = 1; s <= steps; s++) {
            const t = s / (steps + 1);
            newCoords.push([
                p1[0] + dx * t,
                p1[1] + dy * t
            ]);
        }
        newCoords.push(p2);
    }
    return newCoords;
}

// --- NEW HELPER FUNCTION: Adds dots between long jumps ---
function preprocessPath(coords) {
    if(!coords || coords.length < 2) return coords;

    const newCoords = [];
    newCoords.push(coords[0]); // Start point

    for(let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i+1];

        // Calculate distance
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.sqrt(dx*dx + dy*dy);

        // If distance is effectively 0, it's a "Wait Point". 
        // Just add it directly (preserves the wait timing).
        if(dist < 1) {
            newCoords.push(p2);
            continue;
        }

        // If it's a Move, subdivide it!
        // We add 1 point roughly every 5 pixels.
        // This ensures 500px of movement takes 5x longer than 100px.
        const stepSize = 5; 
        const steps = Math.floor(dist / stepSize);

        if(steps > 0) {
            for(let s = 1; s <= steps; s++) {
                const t = s / (steps + 1);
                newCoords.push([
                    p1[0] + dx * t,
                    p1[1] + dy * t
                ]);
            }
        }
        
        // Add the actual target point
        newCoords.push(p2);
    }

    return newCoords;
}

/* --- UPDATED SLIDER LISTENER --- */
document.getElementById('speedSlider').oninput = function() { 
    document.getElementById('speedLabel').innerText = "Lv " + this.value; 
    if(isPreviewing) {
        startPreviewAnimation();
    }
};
document.getElementById('loopMode').onchange = function() { document.getElementById('loopCount').style.display = (this.value==='finite')?'block':'none'; };

/* --- UPDATED RECORDING FUNCTION --- */
/* --- ROBUST VIDEO RECORDER --- */
/* --- ECHARTS VIDEO RECORDER --- */
/* --- ROBUST VIDEO RECORDER --- */
/* --- FIXED RECORDER --- */
/* --- FIXED RECORDER --- */
btnRecord.onclick = async () => {
    if(allPaths.length === 0) return alert("Nothing to record.");

    // Ensure we are in preview mode
    if(!isPreviewing) btnPreview.click();

    const btnText = btnRecord.innerText;
    btnRecord.disabled = true;
    btnRecord.innerText = "● Initializing...";
    document.getElementById('recStatus').style.display = 'block';

    // 1. Wait for DOM alignment
    await new Promise(r => setTimeout(r, 800));

    // 2. Restart animation to sync from start
    cancelAnimationFrame(animationId);
    startPreviewAnimation();

    // 3. Find the Canvas
    const canvas = document.querySelector('#preview-chart canvas');
    if(!canvas) { 
        alert("Canvas error. Please click Preview first."); 
        btnRecord.disabled = false;
        return; 
    }

    // 4. Start Capture
    const stream = canvas.captureStream(60);
    
    // Prefer VP9 (Chrome/Edge), fallback to default
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
    }

    const recorder = new MediaRecorder(stream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 4000000 // 4 Mbps
    });
    
    const chunks = [];
    recorder.ondataavailable = e => { if(e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        btnRecord.disabled = false;
        btnRecord.innerText = btnText;
        document.getElementById('recStatus').style.display = 'none';
    };

    recorder.start();
    
    // 5. Auto-Stop Logic
    // Record for 10 seconds * loop count (safe buffer)
    const loops = parseInt(document.getElementById('loopCount').value) || 1;
    setTimeout(() => {
        if(recorder.state !== 'inactive') recorder.stop();
    }, 10000 * loops);
};
// NEW FUNCTION: Handles dot clicking reliably
window.onDotClick = function(e, pIdx, ptIdx) {
    // 1. Stop the event from bubbling to the map (prevents instant deselect)
    e.stopPropagation(); 

    // 2. If we are Relocating, don't select (let the map click handler handle placement)
    if(isRelocating) return;

    // 3. If we are currently Drawing a new path, don't select existing paths
    if(isDrawing) return;

    // 4. Select the point
    selectPoint(pIdx, ptIdx);
};
/* RESIZER */
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('resizer');
resizer.addEventListener('mousedown', (e) => { e.preventDefault(); document.addEventListener('mousemove', resize); document.addEventListener('mouseup', stopResize); });
function resize(e) { if(e.pageX > 200 && e.pageX < window.innerWidth-100) { sidebar.style.width = e.pageX + 'px'; if(myChart) myChart.resize(); }}
function stopResize() { document.removeEventListener('mousemove', resize); document.removeEventListener('mouseup', stopResize); }

/* EXPORT/IMPORT */
window.exportProject = function() {
    const data = { image: loadedImageSrc, paths: allPaths, settings: { 
        obj: document.getElementById('objColor').value, 
        path: document.getElementById('pathColor').value, 
        speed: document.getElementById('speedSlider').value 
    }};
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    a.download = "project.json";
    a.click();
};
document.getElementById('jsonLoader').onchange = function(e) {
    const r = new FileReader();
    r.onload = function(evt) {
        const d = JSON.parse(evt.target.result);
        loadedImageSrc = d.image;
        allPaths = d.paths;
        document.getElementById('objColor').value = d.settings.obj;
        document.getElementById('pathColor').value = d.settings.path;
        document.getElementById('speedSlider').value = d.settings.speed;
        loadImage(); 
    };
    r.readAsText(e.target.files[0]);
};
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const svg = document.getElementById('drawing-board');
    const dOutput = document.getElementById('d-output');
    const newPathBtn = document.getElementById('new-path-btn');
    const closePathBtn = document.getElementById('close-path-btn');
    const copyBtn = document.getElementById('copy-btn');
    const undoBtn = document.getElementById('undo-btn');
    const snapToggle = document.getElementById('snap-toggle');
    const pointControlsContainer = document.getElementById('point-controls');
    const svgNS = "http://www.w3.org/2000/svg";

    // --- State Management ---
    let points = [];
    let isPathClosed = false;
    let selectedPointIndex = null;
    let draggedElement = null; 
    let offset = { x: 0, y: 0 };
    let history = [];
    let historyIndex = -1;

    // --- NEW: Grid ---
    const gridSize = 20;

    function init() {
        reset();
        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);
        newPathBtn.addEventListener('click', reset);
        closePathBtn.addEventListener('click', () => {
            toggleClosePath();
            saveState();
        });
        copyBtn.addEventListener('click', copyDToClipboard);
        undoBtn.addEventListener('click', undo);
        snapToggle.addEventListener('change', render); // Re-render to show/hide grid
    }

    function reset() {
        points = [];
        isPathClosed = false;
        selectedPointIndex = null;
        draggedElement = null;
        history = [];
        historyIndex = -1;
        saveState(); // Save initial empty state
        render();
    }
    
    // --- NEW: History (Undo) ---
    function saveState() {
        // Clear redo stack
        history.splice(historyIndex + 1);
        
        // Deep copy state to avoid reference issues
        const state = {
            points: JSON.parse(JSON.stringify(points)),
            isPathClosed: isPathClosed,
        };
        history.push(state);
        historyIndex++;
        updateUndoButton();
    }
    
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            const state = history[historyIndex];
            points = JSON.parse(JSON.stringify(state.points));
            isPathClosed = state.isPathClosed;
            selectedPointIndex = null; // Deselect on undo
            render();
            updateUndoButton();
        }
    }
    
    function updateUndoButton() {
        undoBtn.disabled = historyIndex <= 0;
    }

    function toggleClosePath() {
        if (points.length > 1) {
            isPathClosed = !isPathClosed;
            render();
        }
    }

    // --- NEW: Grid Snapping ---
    function snapToGrid(value) {
        return Math.round(value / gridSize) * gridSize;
    }

    function getMousePos(evt) {
        const CTM = svg.getScreenCTM();
        let x = (evt.clientX - CTM.e) / CTM.a;
        let y = (evt.clientY - CTM.f) / CTM.d;

        if (snapToggle.checked) {
            x = snapToGrid(x);
            y = snapToGrid(y);
        }
        return { x, y };
    }

    function handleMouseDown(e) {
        const mousePos = getMousePos(e);
        
        if (e.target.dataset.index) {
            selectedPointIndex = parseInt(e.target.dataset.index);
            draggedElement = {
                type: e.target.dataset.type, // 'anchor', 'cp1', 'cp2'
                index: selectedPointIndex
            };
            const point = points[selectedPointIndex];
            let targetX, targetY;
            
            if (draggedElement.type === 'anchor') {
                targetX = point.x;
                targetY = point.y;
            } else if (draggedElement.type === 'cp1') {
                targetX = point.cp1.x;
                targetY = point.cp1.y;
            } else { // cp2
                const prevPoint = points[selectedPointIndex];
                targetX = prevPoint.cp2.x;
                targetY = prevPoint.cp2.y;
            }
            offset.x = mousePos.x - targetX;
            offset.y = mousePos.y - targetY;

        } else {
            addPoint(mousePos);
            saveState();
        }
        render();
    }

    function handleMouseMove(e) {
        if (!draggedElement) return;

        e.preventDefault();
        let mousePos = getMousePos(e);
        const point = points[draggedElement.index];
        const newX = mousePos.x - offset.x;
        const newY = mousePos.y - offset.y;
        
        if (draggedElement.type === 'anchor') {
            const dx = newX - point.x;
            const dy = newY - point.y;
            point.x = newX;
            point.y = newY;
            point.cp1.x += dx;
            point.cp1.y += dy;
            point.cp2.x += dx;
            point.cp2.y += dy;
        } else if (draggedElement.type === 'cp1') {
            point.cp1.x = newX;
            point.cp1.y = newY;
        } else if (draggedElement.type === 'cp2') {
            point.cp2.x = newX;
            point.cp2.y = newY;
        }
        render();
    }

    function handleMouseUp() {
        if (draggedElement) {
            draggedElement = null;
            saveState();
        }
    }
    
    function handleKeyDown(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== null) {
            points.splice(selectedPointIndex, 1);
            selectedPointIndex = null;
            saveState();
            render();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }
    }

    function addPoint(pos) {
        const newPoint = {
            x: pos.x,
            y: pos.y,
            type: 'curve', // NEW: Point type for straight lines
            cp1: { x: pos.x - 50, y: pos.y },
            cp2: { x: pos.x + 50, y: pos.y }
        };
        points.push(newPoint);
        selectedPointIndex = points.length - 1;
    }
    
    // --- NEW: Convert Point Type ---
    function togglePointType() {
        if (selectedPointIndex !== null && selectedPointIndex > 0) {
            const point = points[selectedPointIndex];
            point.type = point.type === 'curve' ? 'line' : 'curve';
            saveState();
            render();
        }
    }

    function generateD() {
        if (points.length === 0) return "";

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            
            // --- UPDATED: Generate L or C command ---
            if (p2.type === 'line') {
                d += ` L ${p2.x} ${p2.y}`;
            } else {
                d += ` C ${p1.cp2.x} ${p1.cp2.y}, ${p2.cp1.x} ${p2.cp1.y}, ${p2.x} ${p2.y}`;
            }
        }

        if (isPathClosed) d += ' Z';
        return d;
    }

    function render() {
        svg.innerHTML = '';
        
        if (snapToggle.checked) drawGrid();
        
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', generateD());
        path.setAttribute('class', 'main-path');
        svg.appendChild(path);

        points.forEach((p, i) => {
            const prevPoint = i > 0 ? points[i - 1] : null;

            // --- UPDATED: Only draw handles for curve segments ---
            if (prevPoint && p.type === 'curve') {
                svg.appendChild(createControlLine(prevPoint.x, prevPoint.y, prevPoint.cp2.x, prevPoint.cp2.y));
                svg.appendChild(createControlPoint(prevPoint.cp2.x, prevPoint.cp2.y, i - 1, 'cp2'));
            }
            if (p.type === 'curve') {
                const nextPoint = i < points.length - 1 ? points[i + 1] : null;
                if (nextPoint && nextPoint.type === 'curve') {
                    // This logic is slightly adjusted to handle control points correctly
                }
                 svg.appendChild(createControlLine(p.x, p.y, p.cp1.x, p.cp1.y));
                 svg.appendChild(createControlPoint(p.cp1.x, p.cp1.y, i, 'cp1'));
            }
            // For the outgoing curve from point `i`
            if (i < points.length - 1 && points[i+1].type === 'curve') {
                 svg.appendChild(createControlLine(p.x, p.y, p.cp2.x, p.cp2.y));
                 svg.appendChild(createControlPoint(p.cp2.x, p.cp2.y, i, 'cp2'));
            }


            svg.appendChild(createAnchorPoint(p.x, p.y, i));
        });
        
        renderPointControls();
        dOutput.value = generateD();
        updateUndoButton();
    }
    
    // --- NEW: Render contextual controls ---
    function renderPointControls() {
        pointControlsContainer.innerHTML = '';
        if (selectedPointIndex !== null && selectedPointIndex > 0) {
            const button = document.createElement('button');
            const currentType = points[selectedPointIndex].type;
            button.textContent = `Convert to ${currentType === 'curve' ? 'Line' : 'Curve'}`;
            button.addEventListener('click', togglePointType);
            pointControlsContainer.appendChild(button);
        }
    }
    
    // --- NEW: Draw grid ---
    function drawGrid() {
        const gridGroup = document.createElementNS(svgNS, 'g');
        gridGroup.setAttribute('id', 'grid');

        const width = svg.getAttribute('width');
        const height = svg.getAttribute('height');

        for (let x = 0; x <= width; x += gridSize) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', height);
            line.setAttribute('class', 'grid-line');
            gridGroup.appendChild(line);
        }
        for (let y = 0; y <= height; y += gridSize) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            line.setAttribute('class', 'grid-line');
            gridGroup.appendChild(line);
        }
        svg.prepend(gridGroup); // Use prepend to draw it behind other elements
    }
    
    function createAnchorPoint(x, y, index) { /* ... (no changes) ... */
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 6);
        circle.setAttribute('class', 'anchor-point');
        if(index === selectedPointIndex) {
            circle.classList.add('selected');
        }
        circle.dataset.index = index;
        circle.dataset.type = 'anchor';
        return circle;
    }
    
    function createControlPoint(x, y, index, type) { /* ... (no changes) ... */
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 4);
        circle.setAttribute('class', 'control-point');
        circle.dataset.index = index;
        circle.dataset.type = type;
        return circle;
    }
    
    function createControlLine(x1, y1, x2, y2) { /* ... (no changes) ... */
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', 'control-line');
        return line;
    }

    function copyDToClipboard() { /* ... (no changes) ... */
        dOutput.select();
        document.execCommand('copy');
    }

    init();
});
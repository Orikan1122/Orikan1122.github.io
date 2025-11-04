window.addEventListener('DOMContentLoaded', () => {
    const $ = go.GraphObject.make;

    // 1. HAUPT-DIAGRAMM INITIALISIEREN
    const myDiagram =
        $(go.Diagram, "myDiagramDiv", {
            grid: $(go.Panel, "Grid",
                $(go.Shape, "LineH", { stroke: "lightgray", strokeWidth: 0.5 }),
                $(go.Shape, "LineV", { stroke: "lightgray", strokeWidth: 0.5 })
            ),
            "grid.visible": true, "undoManager.isEnabled": true, "allowDrop": true,
            "ChangedSelection": updateUI
        });

    function port(name, align, spot, output, input) { return $(go.Shape, "Circle", { fill: "transparent", stroke: null, desiredSize: new go.Size(8, 8), portId: name, alignment: align, fromLinkable: output, toLinkable: input, cursor: "pointer" }); }
    
    // 2. KNOTEN-VORLAGEN (mit mehrzeiligem Text)
    myDiagram.nodeTemplate =
        $(go.Node, "Spot", { 
                locationSpot: go.Spot.Center,
                resizable: true, // allow the node to be resized
                resizeObjectName: "SHAPE" // the object to be resized is the one named "SHAPE"
            },
            new go.Binding("angle").makeTwoWay(),
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            $(go.Panel, "Auto",
                $(go.Shape, { 
                        name: "SHAPE", // give the Shape a name
                        strokeWidth: 2 
                    },
                    new go.Binding("figure", "category"),
                    new go.Binding("geometryString", "svgPath"),
                    new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
                    new go.Binding("fill", "fill"),
                    new go.Binding("stroke", "stroke")),
                $(go.TextBlock, {
                        name: "TEXTBLOCK", margin: 10, font: "bold 12px sans-serif",
                        isMultiline: true,  // Erlaubt Zeilenumbrüche
                        editable: true      // Macht den Text bearbeitbar
                    },
                    new go.Binding("text", "text").makeTwoWay(),
                    new go.Binding("stroke", "color"),
                    // *** CHANGED BINDING to use a separate "textAngle" property ***
                    new go.Binding("angle", "textAngle").makeTwoWay()) 
            ),
            port("T", go.Spot.Top, go.Spot.Top, true, true), port("L", go.Spot.Left, go.Spot.Left, true, true),
            port("R", go.Spot.Right, go.Spot.Right, true, true), port("B", go.Spot.Bottom, go.Spot.Bottom, true, true)
        );
        
    myDiagram.nodeTemplateMap.add("Label",
        $(go.Node, "Auto", { locationSpot: go.Spot.Center, fromLinkable: false, toLinkable: false },
            new go.Binding("angle").makeTwoWay(),
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            $(go.TextBlock,
                { name: "TEXTBLOCK", margin: 5, font: "14px sans-serif", editable: true },
                new go.Binding("text", "text").makeTwoWay(),
                // *** CHANGED BINDING to use a separate "textAngle" property ***
                new go.Binding("angle", "textAngle").makeTwoWay())
        ));

    // 3. VERBINDUNGS-VORLAGEN (mit Option ohne Pfeil)
    myDiagram.linkTemplateMap.add("", // Default template with arrow
        $(go.Link, { reshapable: true, resegmentable: true, routing: go.Link.Orthogonal, corner: 5, curve: go.Link.JumpGap },
            $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color")),
            $(go.Shape, { toArrow: "Standard" }, new go.Binding("stroke", "color"), new go.Binding("fill", "color"))
        ));
    myDiagram.linkTemplateMap.add("Plain", // Template without arrow
        $(go.Link, { reshapable: true, resegmentable: true, routing: go.Link.Orthogonal, corner: 5, curve: go.Link.JumpGap },
            $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color"))
        ));

    // 4. DATEN & PALETTE INITIALISIEREN
    const myPalette = $(go.Palette, "myPaletteDiv", {
        layout: $(go.GridLayout, { wrappingColumn: 2, alignment: go.GridLayout.Location }),
        nodeTemplateMap: myDiagram.nodeTemplateMap
    });
    
    const defaultPaletteData = [
        { text: "Start", category: "Terminator", size: "120 50", fill: "#f1c232", stroke: "#b45f06", color: "black" },
        { text: "Schritt\nmit\nZeilenumbruch", category: "Rectangle", size: "120 80", fill: "#4a86e8", stroke: "#2a4d80", color: "white" },
        { text: "Label Text", category: "Label", text: "Ein Label" }
    ];
    let defaultArrowCategories = { "Standard": "#555555", "Wichtig": "#ff0000", "Info": "#0055ff" };

    let currentPaletteData = JSON.parse(localStorage.getItem("myPaletteData")) || defaultPaletteData;
    let arrowCategories = JSON.parse(localStorage.getItem("myArrowCategories")) || defaultArrowCategories;
    
    myPalette.model = new go.GraphLinksModel(currentPaletteData);
    myDiagram.model = new go.GraphLinksModel([], []);
    
    // =========================================================================
    // 5. FUNKTIONEN & EVENT HANDLER
    // =========================================================================
    
    // --- UI-Updates bei Selektionsänderung ---
    function updateUI() {
        const sel = myDiagram.selection;
        const arrowCategorySelect = document.getElementById('arrowCategorySelect');
        const rotateTextBtn = document.getElementById('rotateTextBtn');
        const rotateNodeBtn = document.getElementById('rotateNodeBtn');
        const toggleArrowBtn = document.getElementById('toggleArrowBtn');
        
        const hasNode = sel.any(part => part instanceof go.Node);
        const hasLink = sel.any(part => part instanceof go.Link);
        
        arrowCategorySelect.disabled = !hasLink;
        toggleArrowBtn.disabled = !hasLink;
        rotateTextBtn.disabled = !hasNode;
        rotateNodeBtn.disabled = !hasNode;

        if (hasLink && sel.count === 1) {
            arrowCategorySelect.value = sel.first().data.categoryName || "";
        } else {
            arrowCategorySelect.value = "";
        }
    }

    // --- Kernfunktionen ---
    function exportSvg() { const svg = myDiagram.makeSvg({ scale: 1, background: "white" }); const serializer = new XMLSerializer(); const svgString = serializer.serializeToString(svg); const svgBlob = new Blob([svgString], { type: "image/svg+xml" }); const url = URL.createObjectURL(svgBlob); const a = document.createElement("a"); a.href = url; a.download = "diagramm.svg"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function saveDiagram() { const json = myDiagram.model.toJson(); const jsonBlob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(jsonBlob); const a = document.createElement("a"); a.href = url; a.download = "diagramm.json"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function loadDiagram(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { myDiagram.model = go.Model.fromJson(e.target.result); }; reader.readAsText(file); }
    
    // *** UPDATED FUNCTION to rotate text in 90 degree steps ***
    function rotateText() {
        myDiagram.commit(d => {
            d.selection.each(node => {
                if (node instanceof go.Node) {
                    const currentAngle = node.data.textAngle || 0;
                    const newAngle = (currentAngle + 90) % 360;
                    d.model.setDataProperty(node.data, "textAngle", newAngle);
                }
            });
        }, "rotate text");
    }

    function rotateNode() { myDiagram.commit(d => { d.selection.each(node => { if (node instanceof go.Node) { const currentAngle = node.angle || 0; node.angle = (currentAngle + 90) % 360; } }); }, "rotate node"); }
    function assignArrowCategory(event) { const categoryName = event.target.value; const color = arrowCategories[categoryName] || arrowCategories["Standard"]; myDiagram.commit(d => { d.selection.each(link => { if (link instanceof go.Link) { d.model.setDataProperty(link.data, "color", color); d.model.setDataProperty(link.data, "categoryName", categoryName); } }); }, "assign arrow category"); }

    // --- Neue Funktion: Pfeil umschalten ---
    function toggleArrow() {
        myDiagram.commit(d => {
            d.selection.each(part => {
                if (part instanceof go.Link) {
                    const currentCategory = part.data.category;
                    d.model.setDataProperty(part.data, "category", currentCategory === "Plain" ? "" : "Plain");
                }
            });
        }, "toggle arrow");
    }

    // --- Palette Resizer Logik ---
    const resizer = document.getElementById('resizer');
    const paletteDiv = document.getElementById('myPaletteDiv');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        
        const mouseMoveHandler = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth > 100 && newWidth < 500) { // Min/Max Breite
                paletteDiv.style.width = newWidth + 'px';
            }
        };

        const mouseUpHandler = () => {
            isResizing = false;
            document.body.style.cursor = 'default';
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
        };

        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
    });

    // --- Palette-Editor Logik ---
    const paletteModal = document.getElementById('paletteEditorModal');
    const paletteItemsList = document.getElementById('paletteItemsList');
    const paletteItemForm = document.getElementById('paletteItemForm');
    const newItemCategorySelect = document.getElementById('newItemCategory');
    const availableShapes = ["Rectangle", "Terminator", "Decision", "Database", "Document", "Label", "CustomSVG"];
    availableShapes.forEach(shape => newItemCategorySelect.innerHTML += `<option value="${shape}">${shape}</option>`);
    let editingIndex = null;

    function openPaletteEditor() {
        paletteItemsList.innerHTML = '';
        currentPaletteData.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span>${item.text.replace(/\n/g, ' ')} (${item.category})</span>
                <div class="item-controls">
                    <button class="edit-btn" data-index="${index}">Bearbeiten</button>
                    <button class="remove-btn" data-index="${index}">Entfernen</button>
                </div>`;
            paletteItemsList.appendChild(div);
        });
        resetPaletteForm();
        paletteModal.style.display = 'flex';
    }

    function resetPaletteForm() {
        paletteItemForm.reset();
        editingIndex = null;
        document.getElementById('paletteFormTitle').textContent = "Neues Element hinzufügen";
        document.getElementById('paletteFormSubmitBtn').textContent = "Hinzufügen";
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('customSvgInput').style.display = 'none';
    }

    function startEditingPaletteItem(index) {
        editingIndex = index;
        const item = currentPaletteData[index];
        
        document.getElementById('newItemText').value = item.text || '';
        document.getElementById('newItemCategory').value = item.svgPath ? 'CustomSVG' : item.category;
        const [width, height] = (item.size || "120 80").split(" ");
        document.getElementById('newItemWidth').value = width;
        document.getElementById('newItemHeight').value = height;
        document.getElementById('newItemFill').value = item.fill || '#ffffff';
        document.getElementById('newItemStroke').value = item.stroke || '#000000';
        document.getElementById('newItemSvgPath').value = item.svgPath || '';
        
        document.getElementById('customSvgInput').style.display = item.svgPath ? 'block' : 'none';
        
        document.getElementById('paletteFormTitle').textContent = `Element "${item.text.replace(/\n/g, ' ')}" bearbeiten`;
        document.getElementById('paletteFormSubmitBtn').textContent = "Änderungen speichern";
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        paletteItemForm.scrollIntoView({ behavior: 'smooth' });
    }

    function closePaletteEditor() { paletteModal.style.display = 'none'; }
    function savePaletteChanges() { localStorage.setItem("myPaletteData", JSON.stringify(currentPaletteData)); myPalette.model = new go.GraphLinksModel(currentPaletteData); closePaletteEditor(); }
    
    document.getElementById('editPaletteBtn').addEventListener('click', openPaletteEditor);
    document.getElementById('savePaletteBtn').addEventListener('click', savePaletteChanges);
    document.getElementById('cancelPaletteBtn').addEventListener('click', closePaletteEditor);
    document.getElementById('cancelEditBtn').addEventListener('click', resetPaletteForm);

    paletteItemsList.addEventListener('click', e => {
        const target = e.target;
        if (target.tagName !== 'BUTTON') return;
        const index = parseInt(target.dataset.index, 10);
        if (target.classList.contains('edit-btn')) { startEditingPaletteItem(index); } 
        else if (target.classList.contains('remove-btn')) { currentPaletteData.splice(index, 1); openPaletteEditor(); }
    });

    paletteItemForm.addEventListener('submit', e => {
        e.preventDefault();
        const category = newItemCategorySelect.value;
        const newItem = {
            text: document.getElementById('newItemText').value,
            category: category === 'CustomSVG' ? 'Rectangle' : category,
            svgPath: category === 'CustomSVG' ? document.getElementById('newItemSvgPath').value : undefined,
            size: `${document.getElementById('newItemWidth').value} ${document.getElementById('newItemHeight').value}`,
            fill: document.getElementById('newItemFill').value,
            stroke: document.getElementById('newItemStroke').value,
            color: isColorDark(document.getElementById('newItemFill').value) ? 'white' : 'black'
        };
        if (category === "Label") { delete newItem.size; delete newItem.fill; delete newItem.stroke; delete newItem.color; }

        if (editingIndex !== null) {
            currentPaletteData[editingIndex] = newItem;
        } else {
            currentPaletteData.push(newItem);
        }
        openPaletteEditor();
    });

    newItemCategorySelect.addEventListener('change', () => { document.getElementById('customSvgInput').style.display = newItemCategorySelect.value === 'CustomSVG' ? 'block' : 'none'; });
    function isColorDark(hex) { const rgb = parseInt(hex.substring(1), 16); const r = (rgb >> 16) & 0xff; const g = (rgb >> 8) & 0xff; const b = (rgb >> 0) & 0xff; const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; return luma < 128; }

    // --- Pfeil-Kategorien-Editor Logik ---
    const arrowModal = document.getElementById('arrowCategoryModal');
    const arrowCategoryList = document.getElementById('arrowCategoryList');
    const arrowCategorySelect = document.getElementById('arrowCategorySelect');

    function populateArrowCategoryUI() { arrowCategorySelect.innerHTML = '<option value="">-- Keine --</option>'; Object.keys(arrowCategories).forEach(name => { arrowCategorySelect.innerHTML += `<option value="${name}">${name}</option>`; }); arrowCategoryList.innerHTML = ''; Object.entries(arrowCategories).forEach(([name, color]) => { const div = document.createElement('div'); div.className = 'list-item'; div.innerHTML = `<span><span class="color-swatch" style="background-color: ${color};"></span>${name}</span><div><input type="color" value="${color}" data-name="${name}">${name !== "Standard" ? `<button data-name="${name}" class="remove-btn">Entfernen</button>` : ''}</div>`; arrowCategoryList.appendChild(div); }); }
    function openArrowCategoryEditor() { arrowModal.style.display = 'flex'; }
    function closeArrowCategoryEditor() { localStorage.setItem("myArrowCategories", JSON.stringify(arrowCategories)); populateArrowCategoryUI(); arrowModal.style.display = 'none'; }
    
    document.getElementById('editArrowCategoriesBtn').addEventListener('click', openArrowCategoryEditor);
    document.getElementById('closeArrowCategoryBtn').addEventListener('click', closeArrowCategoryEditor);
    document.getElementById('addArrowCategoryForm').addEventListener('submit', e => { e.preventDefault(); const name = document.getElementById('newCategoryName').value; const color = document.getElementById('newCategoryColor').value; if (name && !arrowCategories[name]) { arrowCategories[name] = color; populateArrowCategoryUI(); } e.target.reset(); });
    arrowCategoryList.addEventListener('click', e => { if (e.target.classList.contains('remove-btn')) { const name = e.target.dataset.name; delete arrowCategories[name]; populateArrowCategoryUI(); } });
    arrowCategoryList.addEventListener('input', e => { if (e.target.type === 'color') { const name = e.target.dataset.name; arrowCategories[name] = e.target.value; populateArrowCategoryUI(); } });
    
    // --- Alle Event Listener verbinden ---
    document.getElementById('exportSvgBtn').addEventListener('click', exportSvg);
    document.getElementById('saveBtn').addEventListener('click', saveDiagram);
    document.getElementById('loadInput').addEventListener('change', loadDiagram);
    document.getElementById('rotateTextBtn').addEventListener('click', rotateText);
    document.getElementById('rotateNodeBtn').addEventListener('click', rotateNode);
    document.getElementById('toggleArrowBtn').addEventListener('click', toggleArrow);
    document.getElementById('arrowCategorySelect').addEventListener('change', assignArrowCategory);
    
    // Initiales Laden
    populateArrowCategoryUI();
    updateUI();
});
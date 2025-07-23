document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const imageUpload = document.getElementById('imageUpload');
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');
    const markerLayer = document.getElementById('markerLayer');
    const authorInput = document.getElementById('authorInput');
    const lastUpdatedInput = document.getElementById('lastUpdatedInput');
    const markerTableBody = document.getElementById('markerTableBody');
    const addSymbolButton = document.getElementById('addSymbolButton');
    const saveMapButton = document.getElementById('saveMapButton');
    const loadMapTriggerButton = document.getElementById('loadMapTriggerButton');
    const loadMapInput = document.getElementById('loadMapInput');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const newSymbolSizeInput = document.getElementById('newSymbolSizeInput');
    const newSymbolRotationInput = document.getElementById('newSymbolRotationInput');

    // Modal References
    const editModal = document.getElementById('editModal');
    const modalCloseButton = document.getElementById('modalCloseButton');
    const modalSaveButton = document.getElementById('modalSaveButton');
    const modalCancelButton = document.getElementById('modalCancelButton');
    const modalForm = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    const editMarkerIdInput = document.getElementById('editMarkerId');

    // Modal Form Field References
    const modalShapeInput = document.getElementById('modalShapeInput'); // New
    const modalNumberInput = document.getElementById('modalNumberInput');
    const modalColorInput = document.getElementById('modalColorInput');
    const modalSizeInput = document.getElementById('modalSizeInput');
    const modalSizeNumberInput = document.getElementById('modalSizeNumberInput');
    const modalSizeValue = document.getElementById('modalSizeValue');
    const modalRotationInput = document.getElementById('modalRotationInput');
    const modalRotationNumberInput = document.getElementById('modalRotationNumberInput');
    const modalRotationValue = document.getElementById('modalRotationValue');
    const modalDescriptionInput = document.getElementById('modalDescriptionInput');

    // --- Global State ---
    let symbols = []; // Array to hold symbol data objects
    let nextSymbolNumber = 1;
    let selectedSymbolId = null;
    let backgroundImageData = null;
    let isImageLoaded = false;
    // Drag state
    let isDragging = false;
    let dragTarget = null;
    let dragOffsetX, dragOffsetY;

    // --- Core Functions ---

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    // Renders a single symbol div on the map
    function renderSymbol(symbolData) {
        let symbolDiv = markerLayer.querySelector(`.symbol-marker[data-id="${symbolData.id}"]`);
        if (!symbolDiv) {
            symbolDiv = document.createElement('div');
            symbolDiv.classList.add('symbol-marker');
            symbolDiv.dataset.id = symbolData.id;

            symbolDiv.addEventListener('mousedown', startDrag);
            symbolDiv.addEventListener('click', (event) => {
                event.stopPropagation();
                if (!isDragging) {
                    selectSymbol(symbolData.id);
                    scrollToTableRow(symbolData.id);
                }
            });
            markerLayer.appendChild(symbolDiv);
        }

        const size = symbolData.size || 80;
        symbolDiv.style.width = `${size}px`;
        symbolDiv.style.height = `${size}px`;
        symbolDiv.style.left = `${symbolData.x}px`;
        symbolDiv.style.top = `${symbolData.y}px`;
        symbolDiv.style.transform = `translate(-50%, -50%)`;

        const textColor = getContrastingTextColor(symbolData.color);
        let shapeSvg = '';

        switch (symbolData.shape) {
            case 'circle':
                shapeSvg = `<circle cx="50" cy="50" r="45" fill="${symbolData.color}" />`;
                break;
            case 'rectangle':
                shapeSvg = `<rect x="5" y="5" width="90" height="90" rx="10" fill="${symbolData.color}" />`;
                break;
            case 'arrow':
            default:
                shapeSvg = `<path d="M50 0 L100 50 L75 50 L75 100 L25 100 L25 50 L0 50 Z" fill="${symbolData.color}" />`;
                break;
        }

        // The text is vertically centered using dominant-baseline. y="65" for arrow, y="55" for others is a good compromise.
        const textYPosition = symbolData.shape === 'arrow' ? 65 : 55;

        symbolDiv.innerHTML = `
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <g transform="rotate(${symbolData.rotation || 0} 50 50)">
                    ${shapeSvg}
                </g>
                <text x="50" y="${textYPosition}" font-family="sans-serif" font-size="40" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="${textColor}">
                    ${symbolData.number}
                </text>
            </svg>
        `;

        if (symbolData.id === selectedSymbolId) {
            symbolDiv.classList.add('selected');
        } else {
            symbolDiv.classList.remove('selected');
        }
    }


    function getContrastingTextColor(hexcolor) {
        if (hexcolor.slice(0, 1) === '#') {
            hexcolor = hexcolor.slice(1);
        }
        const r = parseInt(hexcolor.substr(0, 2), 16);
        const g = parseInt(hexcolor.substr(2, 2), 16);
        const b = parseInt(hexcolor.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#333' : 'white';
    }

    function renderAllSymbolsOnMap() {
        markerLayer.innerHTML = '';
        symbols.forEach(symbol => renderSymbol(symbol));
    }

    // Render the entire table content
    function renderSymbolTable() {
        markerTableBody.innerHTML = '';

        if (symbols.length === 0) {
            markerTableBody.innerHTML = '<tr><td colspan="8" class="empty-message">Karte laden oder Symbol hinzufügen.</td></tr>';
            return;
        }

        symbols.sort((a, b) => (a.number || 0) - (b.number || 0));

        symbols.forEach(symbol => {
            const tr = document.createElement('tr');
            tr.dataset.id = symbol.id;

            if (symbol.id === selectedSymbolId) {
                tr.classList.add('selected-row');
            }

            td(tr, `...${symbol.id.slice(-6)}`);
            td(tr, symbol.number);
            td(tr, symbol.shape || 'arrow'); // New column for shape
            tdColor(tr, symbol.color);
            td(tr, `${symbol.size}px`);
            td(tr, `${symbol.rotation}°`);
            td(tr, symbol.description || '-', true);
            tdActions(tr, symbol.id);

            tr.addEventListener('click', () => {
                selectSymbol(symbol.id);
            });
            markerTableBody.appendChild(tr);
        });
    }

    function td(parent, text, addTooltip = false) {
        const cell = document.createElement('td');
        cell.textContent = text;
        if (addTooltip && typeof text === 'string' && text.length > 30) {
            cell.title = text;
        }
        parent.appendChild(cell);
    }

    function tdColor(parent, color) {
        const cell = document.createElement('td');
        const swatch = document.createElement('span');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        cell.appendChild(swatch);
        cell.appendChild(document.createTextNode(color));
        parent.appendChild(cell);
    }

    function tdActions(parent, symbolId) {
        const cell = document.createElement('td');
        cell.style.whiteSpace = 'nowrap';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✎';
        editBtn.title = 'Details bearbeiten';
        editBtn.className = 'action-button edit-button';
        editBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openEditModal(symbolId);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Symbol löschen';
        deleteBtn.className = 'action-button delete-button';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            handleDeleteSymbol(symbolId);
        });

        cell.appendChild(editBtn);
        cell.appendChild(deleteBtn);
        parent.appendChild(cell);
    }

    function selectSymbol(symbolId) {
        if (!symbolId) return;
        if (selectedSymbolId === symbolId) return;

        deselectAll();

        selectedSymbolId = symbolId;

        const symbolToSelect = markerLayer.querySelector(`.symbol-marker[data-id="${symbolId}"]`);
        if (symbolToSelect) {
            symbolToSelect.classList.add('selected');
        }

        const rowToSelect = markerTableBody.querySelector(`tr[data-id="${symbolId}"]`);
        if (rowToSelect) {
            rowToSelect.classList.add('selected-row');
        }
    }

    function deselectAll() {
        if (selectedSymbolId) {
            const lastSelected = markerLayer.querySelector(`.symbol-marker.selected`);
            if (lastSelected) lastSelected.classList.remove('selected');
            const lastSelectedRow = markerTableBody.querySelector(`tr.selected-row`);
            if (lastSelectedRow) lastSelectedRow.classList.remove('selected-row');
        }
        selectedSymbolId = null;
    }

    function scrollToTableRow(symbolId) {
        const row = markerTableBody.querySelector(`tr[data-id="${symbolId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        dragTarget = e.currentTarget;
        const symbolId = dragTarget.dataset.id;
        selectSymbol(symbolId);

        const symbol = symbols.find(a => a.id === symbolId);
        if (symbol) {
            const rect = mapContainer.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left - symbol.x;
            dragOffsetY = e.clientY - rect.top - symbol.y;
            dragTarget.classList.add('dragging');
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag, { once: true });
        }
    }

    function onDrag(e) {
        if (!isDragging || !dragTarget) return;
        const symbolId = dragTarget.dataset.id;
        const symbol = symbols.find(a => a.id === symbolId);
        if (symbol) {
            const rect = mapContainer.getBoundingClientRect();
            symbol.x = e.clientX - rect.left - dragOffsetX;
            symbol.y = e.clientY - rect.top - dragOffsetY;
            
            const size = symbol.size / 2;
            const mapRect = mapImage.getBoundingClientRect();
            symbol.x = Math.max(size, Math.min(symbol.x, mapRect.width - size));
            symbol.y = Math.max(size, Math.min(symbol.y, mapRect.height - size));

            dragTarget.style.left = `${symbol.x}px`;
            dragTarget.style.top = `${symbol.y}px`;
        }
    }

    function endDrag() {
        if (dragTarget) {
            dragTarget.classList.remove('dragging');
        }
        isDragging = false;
        dragTarget = null;
        document.removeEventListener('mousemove', onDrag);
    }

    function openEditModal(symbolId) {
        const symbolData = symbols.find(a => a.id === symbolId);
        if (!symbolData) return;

        modalTitle.textContent = `Symbol Details bearbeiten (Nr. ${symbolData.number})`;
        editMarkerIdInput.value = symbolId;

        modalShapeInput.value = symbolData.shape || 'arrow'; // Populate shape
        modalNumberInput.value = symbolData.number;
        modalColorInput.value = symbolData.color;
        modalSizeInput.value = symbolData.size;
        modalSizeNumberInput.value = symbolData.size;
        modalSizeValue.textContent = `${symbolData.size}px`;
        modalRotationInput.value = symbolData.rotation;
        modalRotationNumberInput.value = symbolData.rotation;
        modalRotationValue.textContent = `${symbolData.rotation}°`;
        modalDescriptionInput.value = symbolData.description || '';

        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    function handleSaveChangesFromModal() {
        const symbolId = editMarkerIdInput.value;
        if (!symbolId) return;

        const symbolIndex = symbols.findIndex(a => a.id === symbolId);
        if (symbolIndex > -1) {
            symbols[symbolIndex] = {
                ...symbols[symbolIndex],
                shape: modalShapeInput.value, // Save shape
                number: parseInt(modalNumberInput.value, 10),
                color: modalColorInput.value,
                size: parseInt(modalSizeNumberInput.value, 10),
                rotation: parseInt(modalRotationNumberInput.value, 10),
                description: modalDescriptionInput.value,
            };

            renderSymbol(symbols[symbolIndex]);
            renderSymbolTable();
            closeEditModal();
        }
    }

    function handleDeleteSymbol(symbolId) {
        if (!symbolId) return;
        const symbolIndex = symbols.findIndex(a => a.id === symbolId);
        if (symbolIndex === -1) return;

        const symbolNumber = symbols[symbolIndex].number;
        if (confirm(`Möchten Sie das Symbol Nr. ${symbolNumber} wirklich löschen?`)) {
            symbols.splice(symbolIndex, 1);
            const symbolDiv = markerLayer.querySelector(`.symbol-marker[data-id="${symbolId}"]`);
            if (symbolDiv) symbolDiv.remove();
            renderSymbolTable();
            if (selectedSymbolId === symbolId) {
                deselectAll();
            }
        }
    }

    function saveMap() {
        if (!isImageLoaded && symbols.length === 0) {
            alert("Es gibt nichts zu speichern.");
            return;
        }
        const saveData = {
            lastUpdated: lastUpdatedInput.value,
            author: authorInput.value,
            backgroundImageData: backgroundImageData,
            nextSymbolNumber: nextSymbolNumber,
            symbols: symbols // Save symbols array
        };

        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeAuthor = authorInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unbekannt';
        a.download = `process-symbol-map_${safeAuthor}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadMap(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const loadedData = JSON.parse(event.target.result);
                const dataIsOldFormat = loadedData.arrows; // Check for old format
                const symbolData = dataIsOldFormat ? loadedData.arrows : loadedData.symbols;

                if (!loadedData || !symbolData) {
                    throw new Error("Ungültiges Dateiformat oder fehlende Symboldaten.");
                }

                lastUpdatedInput.value = loadedData.lastUpdated || '';
                authorInput.value = loadedData.author || '';

                if (loadedData.backgroundImageData) {
                    backgroundImageData = loadedData.backgroundImageData;
                    mapImage.src = backgroundImageData;
                    mapImage.alt = 'Geladene Karte';
                    isImageLoaded = true;
                } else {
                    // ... (rest of image loading logic is fine)
                }

                symbols = (symbolData || []).map(a => ({
                    id: a.id || generateId(),
                    shape: a.shape || 'arrow', // Add shape, default to arrow for old files
                    x: a.x || 100,
                    y: a.y || 100,
                    color: a.color || '#FF0000',
                    number: a.number || 1,
                    size: a.size || 80,
                    rotation: a.rotation || 0,
                    description: a.description || ''
                }));
                nextSymbolNumber = loadedData.nextSymbolNumber || loadedData.nextArrowNumber || (symbols.length > 0 ? Math.max(...symbols.map(a => a.number)) + 1 : 1);

                deselectAll();
                renderAllSymbolsOnMap();
                renderSymbolTable();

                alert(`Karte "${file.name}" erfolgreich geladen.`);
            } catch (error) {
                // ... (error handling is fine)
            } finally {
                loadMapInput.value = '';
            }
        };
        reader.readAsText(file);
    }
    
    // PDF Export function remains largely the same, but we update the table part
    async function exportToPdf() {
        const jsPDF = window.jspdf?.jsPDF;
        const html2canvas = window.html2canvas;

        if (!window.jspdf || !jsPDF || !html2canvas || !jsPDF.API?.autoTable) {
            alert("PDF Export-Bibliotheken konnten nicht geladen werden.");
            return;
        }
        if (!isImageLoaded) {
            alert("Bitte laden Sie zuerst ein Hintergrundbild für den PDF-Export.");
            return;
        }

        loadingIndicator.style.display = 'flex';
        deselectAll();

        const originalOverflow = mapContainer.style.overflow;
        const originalMaxHeight = mapContainer.style.maxHeight;

        try {
            mapContainer.style.overflow = 'visible';
            mapContainer.style.maxHeight = 'none';
            await new Promise(resolve => setTimeout(resolve, 50));

            const canvas = await html2canvas(mapContainer, {
                useCORS: true, scale: 2, backgroundColor: '#ffffff',
                width: mapImage.scrollWidth, height: mapImage.scrollHeight,
                windowWidth: mapImage.scrollWidth, windowHeight: mapImage.scrollHeight
            });
            
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            const margin = 40;
            const pageWidth = doc.internal.pageSize.getWidth();
            const availableWidth = pageWidth - 2 * margin;
            let currentY = margin;

            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text("Prozessübersicht", pageWidth / 2, currentY, { align: 'center' });
            currentY += 25;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Autor: ${authorInput.value || 'N/A'}`, margin, currentY);
            doc.text(`Zuletzt aktualisiert: ${lastUpdatedInput.value || 'N/A'}`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 25;

            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgProps = doc.getImageProperties(imgData);
            let imgHeight = availableWidth / (imgProps.width / imgProps.height);
            const availableHeight = doc.internal.pageSize.getHeight() - currentY - margin;

            if (imgHeight > availableHeight) {
                imgHeight = availableHeight;
            }
            doc.addImage(imgData, 'PNG', margin, currentY, availableWidth, imgHeight);
            currentY += imgHeight + 20;

            // --- ADJUSTMENT 1: Table head and body now exclude the 'Typ' column.
            const headPDF = [['Nr.', 'Beschreibung']];
            const bodyPDF = symbols.map(s => [
                s.number,
                s.description || '-'
            ]);

            const estimatedRowHeight = 20;
            const estimatedTableHeight = (bodyPDF.length + 1) * estimatedRowHeight;
            if (currentY + estimatedTableHeight > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                currentY = margin;
            }

            doc.autoTable({
                head: headPDF,
                body: bodyPDF,
                startY: currentY,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: [74, 85, 104] },

                // --- ADJUSTMENT 2: Fix for the double number issue.
                // We prevent autoTable from drawing the text in the first column...
                willDrawCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0) {
                        data.cell.text = []; // Suppress default text rendering
                    }
                },
                // ...and then we manually draw the swatch and the number ourselves.
                didDrawCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0) {
                        const symbolIndex = data.row.index;
                        const color = symbols[symbolIndex]?.color;

                        // Draw the color swatch
                        if (color && color.startsWith('#')) {
                            doc.setFillColor(color);
                            const swatchSize = 12;
                            const x = data.cell.x + 3;
                            const y = data.cell.y + (data.cell.height - swatchSize) / 2;
                            doc.rect(x, y, swatchSize, swatchSize, 'F');
                        }
                        
                        // Manually draw the number text once, next to the swatch
                        doc.setTextColor(0, 0, 0);
                        doc.text(
                            String(data.cell.raw), 
                            data.cell.x + 18,
                            data.cell.y + data.cell.height / 2, 
                            { baseline: 'middle' }
                        );
                    }
                },
                // --- ADJUSTMENT 3: Column styles are updated for the new two-column layout.
                columnStyles: {
                    0: { cellWidth: 50 },      // 'Nr.' column
                    1: { cellWidth: 'auto' }   // 'Beschreibung' column
                },
                margin: { left: margin, right: margin }
            });

            const safeAuthor = authorInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export';
            doc.save(`process-map_${safeAuthor}_${new Date().toISOString().slice(0,10)}.pdf`);
        } catch (error) {
            console.error("Fehler beim Erstellen des PDFs:", error);
            alert("Beim Erstellen des PDFs ist ein Fehler aufgetreten.");
        } finally {
            mapContainer.style.overflow = originalOverflow;
            mapContainer.style.maxHeight = originalMaxHeight;
            loadingIndicator.style.display = 'none';
        }
    }


    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                mapImage.src = e.target.result;
                backgroundImageData = e.target.result;
                isImageLoaded = true;
                symbols = [];
                nextSymbolNumber = 1;
                deselectAll();
                renderAllSymbolsOnMap();
                renderSymbolTable();
            };
            reader.readAsDataURL(file);
        }
    });
    
    addSymbolButton.addEventListener('click', () => {
        if (!isImageLoaded) {
            alert("Bitte laden Sie zuerst ein Hintergrundbild.");
            return;
        }

        const initialSize = parseInt(newSymbolSizeInput.value, 10) || 80;
        const initialRotation = parseInt(newSymbolRotationInput.value, 10) || 0;

        const newSymbol = {
            id: generateId(),
            shape: 'arrow', // Default shape
            x: mapContainer.scrollLeft + mapContainer.clientWidth / 2,
            y: mapContainer.scrollTop + mapContainer.clientHeight / 2,
            color: '#3182CE',
            number: nextSymbolNumber++,
            size: initialSize,
            rotation: initialRotation,
            description: ''
        };
        symbols.push(newSymbol);
        renderSymbol(newSymbol);
        renderSymbolTable();
        selectSymbol(newSymbol.id);
        scrollToTableRow(newSymbol.id);
        openEditModal(newSymbol.id);
    });

    modalSaveButton.addEventListener('click', handleSaveChangesFromModal);
    modalCancelButton.addEventListener('click', closeEditModal);
    modalCloseButton.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => {
        if (event.target === editModal) closeEditModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && editModal.style.display === 'flex') {
            closeEditModal();
        }
    });

    modalSizeInput.addEventListener('input', () => {
        const size = modalSizeInput.value;
        modalSizeValue.textContent = `${size}px`;
        modalSizeNumberInput.value = size;
    });
    modalSizeNumberInput.addEventListener('input', () => {
        const size = modalSizeNumberInput.value;
        modalSizeValue.textContent = `${size}px`;
        modalSizeInput.value = size;
    });

    modalRotationInput.addEventListener('input', () => {
        const rotation = modalRotationInput.value;
        modalRotationValue.textContent = `${rotation}°`;
        modalRotationNumberInput.value = rotation;
    });
    modalRotationNumberInput.addEventListener('input', () => {
        const rotation = modalRotationNumberInput.value;
        modalRotationValue.textContent = `${rotation}°`;
        modalRotationInput.value = rotation;
    });

    saveMapButton.addEventListener('click', saveMap);
    loadMapTriggerButton.addEventListener('click', () => loadMapInput.click());
    loadMapInput.addEventListener('change', (event) => {
        if (event.target.files[0]) loadMap(event.target.files[0]);
    });
    exportPdfButton.addEventListener('click', exportToPdf);

    renderSymbolTable();

    // The library check logic is fine as is.
    const libraryCheckInterval = setInterval(() => {
        if (window.jspdf?.jsPDF && window.html2canvas && window.jspdf.jsPDF.API?.autoTable) {
            exportPdfButton.disabled = false;
            exportPdfButton.title = "Als PDF exportieren";
            clearInterval(libraryCheckInterval);
        }
    }, 500);
    exportPdfButton.disabled = true;
    exportPdfButton.title = "PDF Bibliotheken werden geladen...";
});
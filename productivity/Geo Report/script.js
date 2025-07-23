// --- Global Variables & Data Structures ---
let map;
let markersData = []; // Holds the core data for each marker (serializable)
let leafletMarkers = {}; // Maps markerData ID to Leaflet layer instance (non-serializable)
let nextMarkerId = 0;
// Explicitly access jsPDF from window, though destructuring should work
const jsPDF = window.jspdf.jsPDF; 

// --- DOM Elements ---
const legendElement = document.getElementById('legend');
const contentAreaElement = document.getElementById('content-area');
const reportButton = document.getElementById('report-button');
const exportButton = document.getElementById('export-button');
const importInput = document.getElementById('import-input');
const importButtonLabel = document.querySelector('.button-label[for="import-input-button"]'); // Get the label

// --- Initialization ---
function initializeMap() {
    map = L.map('map-container').setView([51.505, -0.09], 13); // Default view

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // --- Map Event Listeners ---
    map.on('click', handleMapClick);

    // --- Button Event Listeners ---
    reportButton.addEventListener('click', generateReport);
    exportButton.addEventListener('click', exportData);
    importInput.addEventListener('change', handleImport);
    // The label already triggers the hidden input via its 'for' attribute
}

// --- Core Functions ---

function handleMapClick(e) {
    const label = prompt("Enter a label for this location:");
    if (label) {
        const newMarkerData = {
            id: nextMarkerId++,
            label: label,
            latlng: { lat: e.latlng.lat, lng: e.latlng.lng }, // Store plain object
            locationNote: "",
            images: [] // Initialize empty array for images
        };

        markersData.push(newMarkerData);

        // Create and store the Leaflet marker instance separately
        const leafletMarker = L.marker([newMarkerData.latlng.lat, newMarkerData.latlng.lng])
            .addTo(map)
            .bindPopup(label); // Simple popup with label

        leafletMarkers[newMarkerData.id] = leafletMarker; // Link data ID to Leaflet marker

        // Add click listener to the Leaflet marker itself
        leafletMarker.on('click', () => {
            displayMarkerContent(newMarkerData.id);
        });

        updateLegend();
        displayMarkerContent(newMarkerData.id); // Show content area for the new marker
    }
}

function updateLegend() {
    legendElement.innerHTML = ''; // Clear existing legend
    markersData.forEach(marker => {
        const li = document.createElement('li');
        li.textContent = marker.label;
        li.dataset.markerId = marker.id; // Store ID for easy retrieval
        li.addEventListener('click', () => {
            displayMarkerContent(marker.id);
            // Optional: Pan map to the marker
            map.panTo([marker.latlng.lat, marker.latlng.lng]);
        });
        legendElement.appendChild(li);
    });
}

// --- Phase 3: Content Display & Interaction ---

function displayMarkerContent(markerId) {
    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) {
        contentAreaElement.innerHTML = '<p>Select a marker to see details.</p>';
        return;
    }
    const marker = markersData[markerIndex];

    contentAreaElement.innerHTML = ''; // Clear previous content

    // 1. Label
    const labelElement = document.createElement('h2');
    labelElement.textContent = marker.label;
    contentAreaElement.appendChild(labelElement);

    // 2. Location Note
    const noteLabel = document.createElement('label');
    noteLabel.textContent = 'Location Note:';
    noteLabel.style.display = 'block';
    noteLabel.style.marginBottom = '5px';
    contentAreaElement.appendChild(noteLabel);

    const locationNoteTextarea = document.createElement('textarea');
    locationNoteTextarea.id = `location-note-${markerId}`;
    locationNoteTextarea.value = marker.locationNote;
    locationNoteTextarea.placeholder = 'Add general notes for this location...';
    locationNoteTextarea.addEventListener('input', (event) => {
        markersData[markerIndex].locationNote = event.target.value;
        // console.log("Updated location note:", markersData[markerIndex].locationNote); // For debugging
    });
    contentAreaElement.appendChild(locationNoteTextarea);

    // 3. Image Upload Section
    const imageUploadLabel = document.createElement('label');
    imageUploadLabel.textContent = 'Add Images:';
    imageUploadLabel.style.display = 'block';
    imageUploadLabel.style.marginTop = '15px';
    imageUploadLabel.style.marginBottom = '5px';
    contentAreaElement.appendChild(imageUploadLabel);

    const imageUploadInput = document.createElement('input');
    imageUploadInput.type = 'file';
    imageUploadInput.multiple = true;
    imageUploadInput.accept = 'image/*'; // Accept only image files
    imageUploadInput.id = `image-upload-${markerId}`;
    imageUploadInput.addEventListener('change', (event) => handleImageUpload(event, markerId));
    contentAreaElement.appendChild(imageUploadInput);

    // 4. Image List Area
    const imageListArea = document.createElement('div');
    imageListArea.id = `image-list-${markerId}`;
    imageListArea.style.marginTop = '15px';
    contentAreaElement.appendChild(imageListArea);

    // 5. Populate Image List
    renderImageList(markerId);

    // 6. Add Delete Marker Button
    const deleteMarkerButton = document.createElement('button');
    deleteMarkerButton.textContent = 'Delete This Marker';
    deleteMarkerButton.className = 'delete-marker-button'; // For styling
    deleteMarkerButton.addEventListener('click', () => deleteMarker(markerId));
    contentAreaElement.appendChild(deleteMarkerButton);
}

function renderImageList(markerId) {
    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) return; // Should not happen if called from displayMarkerContent

    const marker = markersData[markerIndex];
    const imageListArea = document.getElementById(`image-list-${markerId}`);
    if (!imageListArea) return; // Element might not be ready yet

    imageListArea.innerHTML = ''; // Clear current list

    if (marker.images.length === 0) {
        imageListArea.innerHTML = '<p>No images uploaded for this location yet.</p>';
        return;
    }

    marker.images.forEach((imageObj, index) => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'image-item'; // Apply styling

        // Image Element
        const imgElement = document.createElement('img');
        imgElement.src = imageObj.imageData; // Base64 data URL
        itemContainer.appendChild(imgElement);

        // Image Note Textarea
        const noteTextarea = document.createElement('textarea');
        noteTextarea.value = imageObj.note;
        noteTextarea.placeholder = `Add note for image ${index + 1}...`;
        noteTextarea.dataset.markerId = markerId; // Link to marker
        noteTextarea.dataset.imageIndex = index; // Link to image index
        noteTextarea.addEventListener('input', (event) => {
            const mId = parseInt(event.target.dataset.markerId);
            const imgIdx = parseInt(event.target.dataset.imageIndex);
            const mIndex = markersData.findIndex(m => m.id === mId);
            if (mIndex !== -1 && markersData[mIndex].images[imgIdx]) {
                markersData[mIndex].images[imgIdx].note = event.target.value;
                // console.log(`Updated note for marker ${mId}, image ${imgIdx}:`, event.target.value); // Debugging
            }
        });
        itemContainer.appendChild(noteTextarea);

        // Delete Image Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Image';
        deleteButton.dataset.markerId = markerId;
        deleteButton.dataset.imageIndex = index;
        deleteButton.addEventListener('click', (event) => {
            const mId = parseInt(event.target.dataset.markerId);
            const imgIdx = parseInt(event.target.dataset.imageIndex);
            const mIndex = markersData.findIndex(m => m.id === mId);
            if (mIndex !== -1) {
                markersData[mIndex].images.splice(imgIdx, 1); // Remove image from data
                renderImageList(mId); // Re-render the list for this marker
            }
        });
        itemContainer.appendChild(deleteButton);

        imageListArea.appendChild(itemContainer);
    });
}

function handleImageUpload(event, markerId) {
    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    const promises = []; // To track all file reading operations

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue; // Skip non-image files

        const promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64ImageData = e.target.result;
                const newImageObj = {
                    imageData: base64ImageData,
                    note: "" // Initialize with an empty note
                };
                markersData[markerIndex].images.push(newImageObj);
                resolve(); // Signal completion for this file
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", file.name, error);
                reject(error); // Signal error
            };
            reader.readAsDataURL(file); // Read file as Base64
        });
        promises.push(promise);
    }

    // Wait for all files to be processed before updating the UI
    Promise.all(promises)
        .then(() => {
            renderImageList(markerId); // Update the UI with new images
            console.log(`Added ${promises.length} images for marker ${markerId}`);
        })
        .catch((error) => {
            console.error("Error processing one or more files:", error);
            alert("An error occurred while uploading some images. Please check the console.");
            // Still try to render what might have succeeded
            renderImageList(markerId);
        })
        .finally(() => {
             // Clear the file input value to allow re-uploading the same file(s)
             event.target.value = '';
        });
}

// --- Phase 3.5: Marker Deletion ---
function deleteMarker(markerId) {
    if (!confirm("Are you sure you want to delete this marker and all its associated data?")) {
        return;
    }

    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) {
        console.error("Marker not found for deletion:", markerId);
        return;
    }

    // Remove from map
    if (leafletMarkers[markerId]) {
        map.removeLayer(leafletMarkers[markerId]);
        delete leafletMarkers[markerId]; // Remove reference
    }

    // Remove from data array
    markersData.splice(markerIndex, 1);

    // Update UI
    updateLegend();
    contentAreaElement.innerHTML = '<p>Marker deleted. Select another marker or add a new one.</p>'; // Clear content area
    console.log("Deleted marker ID:", markerId);
}


// --- Phase 4: PDF Report Generation ---

// Helper function to get map snippet using html2canvas
function getMapSnippet(markerLatlng) {
    // Note: Check for html2canvas moved to generateReport function right before use
    return new Promise(async (resolve, reject) => {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            return reject(new Error("Map container element not found."));
        }

        // Temporarily pan map to the marker location for the snapshot
        const currentZoom = map.getZoom();
        const snippetZoom = Math.min(currentZoom + 3, 18); // Zoom in more (+3), max 18
        map.setView([markerLatlng.lat, markerLatlng.lng], snippetZoom, { animate: false });

        // Wait a moment for tiles to potentially load after setView
        // Also ensures map state is updated before capture
        await new Promise(res => setTimeout(res, 1500)); // Increased delay to 1.5 seconds

        try {
            // Options for html2canvas (optional, but can help)
            const options = {
                useCORS: true, // Try to capture cross-origin images (like map tiles)
                allowTaint: true, // May be needed for some tile servers
                logging: false, // Disable excessive logging
                // Ensure background is captured if map container has one
                backgroundColor: window.getComputedStyle(mapContainer).backgroundColor || '#FFFFFF'
            };

            console.log("Attempting html2canvas capture...");
            // Call via window object
            const canvas = await window.html2canvas(mapContainer, options); 
            const dataUrl = canvas.toDataURL('image/png');
            console.log("html2canvas capture successful.");
            resolve(dataUrl);

        } catch (error) {
            console.error("html2canvas error:", error);
            reject(new Error(`Failed to capture map snippet using html2canvas: ${error.message}`));
        }
        // No need to restore view here, it's done after the loop in generateReport
    });
}


async function generateReport() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex'; // Show loading indicator

    try { // Wrap the entire report generation in try...finally
        // Check for required libraries right before use
        if (typeof window.html2canvas !== 'function') {
            alert("Error: html2canvas library is not loaded. Cannot generate map snippets. Please check your internet connection, browser console (for loading errors), or browser extensions (like ad blockers).");
            console.error("window.html2canvas function is not defined when generateReport is called.");
            return; // Exit if library missing
        }
         // Check for jsPDF (already done via const jsPDF = window.jspdf.jsPDF, but good practice)
         if (typeof jsPDF !== 'function') {
             alert("Error: jsPDF library is not loaded. Cannot generate PDF. Please check your internet connection or browser console.");
             console.error("jsPDF function is not defined when generateReport is called.");
             return; // Exit if library missing
         }


        if (markersData.length === 0) {
            alert("No markers to report. Add some locations first.");
            return; // Exit if no data
        }

        const doc = new jsPDF({
            orientation: 'p', // portrait
            unit: 'mm', // millimeters
            format: 'a4' // standard A4 size
        });

        let yPos = 15; // Starting Y position in mm
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const usableWidth = pageWidth - 2 * margin;
        const snippetSize = 60; // Desired square size for map snippet in mm

        // --- PDF Header ---
        const creatorName = document.getElementById('creator-name').value || 'N/A';
        const reportDescription = document.getElementById('report-description').value || 'N/A';
        const generationDate = new Date().toLocaleString();

        doc.setFontSize(18);
        doc.text("GeoReport", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.text(`Creator: ${creatorName}`, margin, yPos);
        doc.text(`Generated: ${generationDate}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 5;

        doc.text("Description:", margin, yPos);
        yPos += 4;
        const descLines = doc.splitTextToSize(reportDescription, usableWidth);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 4 + 6; // Add space after description

        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos); // Draw a separator line
        yPos += 8;


    // Store original map state to restore later
        const originalCenter = map.getCenter();
        const originalZoom = map.getZoom();
        let processingErrorOccurred = false; // Flag to track errors

        // Loop through markers sequentially using for...of with await
        for (const marker of markersData) {
            doc.setFontSize(14);
            doc.text(`Marker: ${marker.label}`, margin, yPos);
            yPos += 7;

            // --- Map Snippet ---
            try {
                console.log(`Generating snippet for ${marker.label}...`);
            const snippetDataUrl = await getMapSnippet(marker.latlng);
            if (snippetDataUrl) {
                 // Check space for snippet + some text + table header (Use snippetSize now)
                if (yPos + snippetSize + 20 > pageHeight - margin) { 
                    doc.addPage();
                    yPos = margin;
                }
                // Add snippet as a square
                doc.addImage(snippetDataUrl, 'PNG', margin, yPos, snippetSize, snippetSize); 
                yPos += snippetSize + 5; // Add space after snippet
                console.log(`Snippet added for ${marker.label}`);
                } else {
                     console.warn(`Could not generate snippet for ${marker.label}. Skipping snippet.`);
                     // Add placeholder text if snippet failed
                     doc.setFontSize(10);
                     doc.setTextColor(150); // Grey text
                     doc.text("[Map snippet could not be generated]", margin, yPos);
                     doc.setTextColor(0); // Reset color
                     yPos += 7;
                }
            } catch (error) {
                console.error(`Error generating snippet for ${marker.label}:`, error);
                processingErrorOccurred = true;
                 // Add placeholder text if snippet failed
                if (yPos + 10 > pageHeight - margin) { // Check space for error message
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFontSize(10);
                doc.setTextColor(255, 0, 0); // Red text
                doc.text(`[Error generating map snippet for ${marker.label}]`, margin, yPos);
                doc.setTextColor(0); // Reset color
                yPos += 7;
            }


            // --- Location Note ---
             if (yPos + 10 > pageHeight - margin) { // Check space before adding note
                doc.addPage();
                yPos = margin;
            }
            doc.setFontSize(12);
            doc.text("Location Note:", margin, yPos);
            yPos += 5;
            doc.setFontSize(10);
            const noteLines = doc.splitTextToSize(marker.locationNote || '(No location note provided)', usableWidth);
            // Check space for note lines
            if (yPos + noteLines.length * 5 > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
            doc.text(noteLines, margin, yPos);
            yPos += noteLines.length * 5 + 5; // Add space after note

            // --- Image/Note Table ---
            if (marker.images.length > 0) {
                 if (yPos + 15 > pageHeight - margin) { // Check space for table header
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFontSize(12);
                doc.text("Associated Images & Notes:", margin, yPos);
                yPos += 7;

                const tableColumnStyles = {
                    0: { cellWidth: 60, minCellHeight: 45 }, // Image column width & min height
                    1: { cellWidth: 'auto' }, // Note column width
                };
                const tableHead = [['Image', 'Note']];
                // Prepare body data: Pass NULL for the image column, autoTable won't render it as text.
                // We retrieve the actual image data in didDrawCell using the row index.
                const tableBody = marker.images.map(imgObj => [null, imgObj.note || '(No note)']); 

                // Check if autoTable function exists on the doc instance
                if (typeof doc.autoTable !== 'function') {
                     console.error("jsPDF autoTable plugin is not loaded or attached correctly to the jsPDF instance.");
                     processingErrorOccurred = true;
                     // Optionally add placeholder text to the PDF
                     doc.setFontSize(10);
                     doc.setTextColor(255, 0, 0);
                     doc.text("[Image table could not be generated - autoTable plugin missing]", margin, yPos);
                     doc.setTextColor(0);
                     yPos += 10;
                } else {
                    // Call autoTable directly on the jsPDF instance (doc)
                    doc.autoTable({
                        head: tableHead,
                        body: tableBody, // Pass full data including base64
                        startY: yPos,
                        margin: { left: margin, right: margin },
                        columnStyles: tableColumnStyles,
                        didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 0) {
                            // Retrieve the correct image data using the row index from the original array
                            const imgData = marker.images[data.row.index]?.imageData; 
                            const cellHeight = data.cell.height;
                            const cellWidth = data.column.width;
                            const padding = 2; // Padding inside the cell

                            // Check if imgData is valid before getting properties
                            if (imgData && typeof imgData === 'string' && imgData.startsWith('data:image')) {
                                try {
                                    const imgProps = doc.getImageProperties(imgData);
                                    const aspectRatio = imgProps.width / imgProps.height;
                                    
                                    // Calculate max available width/height within padding
                                    const maxWidth = cellWidth - (2 * padding);
                                    const maxHeight = cellHeight - (2 * padding);

                                    // Calculate dimensions based on aspect ratio to fit within maxWidth/maxHeight
                                    let imgWidth = maxWidth;
                                    let imgHeight = imgWidth / aspectRatio;

                                    if (imgHeight > maxHeight) {
                                        imgHeight = maxHeight;
                                        imgWidth = imgHeight * aspectRatio;
                                    }
                                     // Ensure width doesn't exceed maxWidth after height adjustment
                                     if (imgWidth > maxWidth) {
                                         imgWidth = maxWidth;
                                         imgHeight = imgWidth / aspectRatio;
                                     }


                                    // Center image in cell 
                                    const imgX = data.cell.x + (cellWidth - imgWidth) / 2;
                                    const imgY = data.cell.y + (cellHeight - imgHeight) / 2;

                                    doc.addImage(imgData, imgProps.fileType, imgX, imgY, imgWidth, imgHeight);
                                        
                                    // No need to clear data.cell.text as we passed null initially

                                    } catch (imgError) {
                                         console.error("Error adding image to PDF table:", imgError, "Image data:", imgData.substring(0, 50) + "...");
                                         // Optionally draw placeholder text in cell
                                         doc.setFontSize(8);
                                         doc.setTextColor(255, 0, 0);
                                         doc.text("[Image Error]", data.cell.x + 2, data.cell.y + data.cell.height / 2);
                                         doc.setTextColor(0);
                                         processingErrorOccurred = true;
                                         // Optionally draw placeholder text in cell
                                         doc.setFontSize(8);
                                         doc.setTextColor(255, 0, 0);
                                         doc.text("[Image Error]", data.cell.x + padding, data.cell.y + cellHeight / 2);
                                         doc.setTextColor(0);
                                         processingErrorOccurred = true;
                                    }
                                } else {
                                     console.warn("Invalid image data for PDF table cell at row index:", data.row.index);
                                     doc.setFontSize(8);
                                     doc.setTextColor(255, 0, 0);
                                     doc.text("[Invalid Img]", data.cell.x + padding, data.cell.y + cellHeight / 2);
                                     doc.setTextColor(0);
                                     processingErrorOccurred = true;
                                }
                            }
                             // Note text (column index 1) is handled automatically by autoTable as we passed the string data
                        },
                        // Ensure row height is sufficient for images
                         willDrawCell: (data) => {
                             if (data.section === 'body' && data.column.index === 0) {
                                 // Optional: Could try to calculate required height here, but minCellHeight is often easier
                             }
                         },
                    });
                     yPos = doc.lastAutoTable.finalY + 10; // Update yPos after table
                }
                // Removed duplicated code block that started here
            } else {
                 if (yPos + 10 > pageHeight - margin) { // Check space
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFontSize(10);
                doc.text("(No images associated with this location)", margin, yPos);
                yPos += 10;
            }

            // Add space before next marker or check for page break
            yPos += 5; // Space between marker sections
            if (yPos > pageHeight - margin && marker !== markersData[markersData.length - 1]) { // Don't add page after last item
                doc.addPage();
                yPos = margin; // Reset yPos for new page
            }
        }

        // Restore map view
        map.setView(originalCenter, originalZoom, { animate: false });

        // Save the PDF
        try {
            doc.save('GeoReport.pdf');
            console.log("PDF generated successfully.");
            if (processingErrorOccurred) {
                 alert("PDF generated, but some errors occurred (e.g., failed to load/add some images or snippets). Please check the console for details.");
            }
        } catch (saveError) {
            console.error("Error saving PDF:", saveError);
            alert("An error occurred while trying to save the PDF.");
        }
    } finally {
        loadingOverlay.style.display = 'none'; // Hide loading indicator
    }
}
// --- Removed duplicated generateReport function block ---

// --- Phase 5: Import/Export Functionality ---

function exportData() {
    if (markersData.length === 0) {
        alert("No data to export. Add some markers first.");
        return;
    }

    try {
        // Only export the serializable markersData array
        const dataToExport = JSON.stringify(markersData, null, 2); // Pretty print JSON

        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'georeport-data.json'; // Filename for the download
        document.body.appendChild(link); // Required for Firefox
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("Data exported successfully.");

    } catch (error) {
        console.error("Error exporting data:", error);
        alert("An error occurred while exporting data.");
    }
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected for import.");
        return;
    }

    if (file.type !== 'application/json') {
        alert("Invalid file type. Please select a '.json' file exported from GeoReport.");
        importInput.value = ''; // Reset file input
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        let importedData;
        try {
            importedData = JSON.parse(e.target.result);
            // Basic validation: Check if it's an array (can add more checks)
            if (!Array.isArray(importedData)) {
                 throw new Error("Invalid JSON structure: Expected an array.");
            }
             // Optional: More detailed validation of object structure within the array
             // e.g., check for id, label, latlng, locationNote, images properties

        } catch (error) {
            console.error("Error parsing imported file:", error);
            alert(`Error reading or parsing file: ${error.message}\nPlease ensure it's a valid GeoReport JSON file.`);
            importInput.value = ''; // Reset file input
            return;
        }

        // --- Clear Current State ---
        console.log("Clearing current map state...");
        // Remove existing Leaflet markers from the map
        Object.values(leafletMarkers).forEach(marker => map.removeLayer(marker));
        leafletMarkers = {}; // Clear the lookup object

        // Clear data array
        markersData = [];

        // Clear UI elements
        legendElement.innerHTML = '';
        contentAreaElement.innerHTML = '<p>Data imported. Select a marker to view details.</p>'; // Reset content area

        // --- Hydrate with Imported Data ---
        console.log("Hydrating map with imported data...");
        let maxId = -1;
        try {
            markersData = importedData; // Assign the validated imported data

            markersData.forEach(marker => {
                // Validate essential properties before creating marker
                if (marker.latlng && typeof marker.latlng.lat === 'number' && typeof marker.latlng.lng === 'number') {
                    // Recreate Leaflet marker
                    const leafletMarker = L.marker([marker.latlng.lat, marker.latlng.lng])
                        .addTo(map)
                        .bindPopup(marker.label || 'No Label'); // Use label or default

                    leafletMarkers[marker.id] = leafletMarker; // Store the new Leaflet instance

                    // Add click listener
                    leafletMarker.on('click', () => {
                        displayMarkerContent(marker.id);
                    });

                    // Track the highest ID to reset nextMarkerId
                    if (typeof marker.id === 'number' && marker.id > maxId) {
                        maxId = marker.id;
                    }
                } else {
                     console.warn("Skipping marker due to invalid latlng:", marker);
                }
                 // Ensure notes and images array exist, default if necessary
                 marker.locationNote = marker.locationNote || "";
                 marker.images = Array.isArray(marker.images) ? marker.images : [];
                 // Optional: Validate image objects within the array (imageData, note)
            });

            nextMarkerId = maxId + 1; // Set the next ID correctly

            updateLegend(); // Rebuild the legend UI

            console.log(`Import successful. ${markersData.length} markers loaded.`);
            alert(`Import successful. ${markersData.length} markers loaded.`);

            // Optional: Automatically display content for the first imported marker
            if (markersData.length > 0) {
                 // displayMarkerContent(markersData[0].id); // Uncomment to show first marker details
                 map.fitBounds(Object.values(leafletMarkers).map(m => m.getLatLng()), { padding: [50, 50] }); // Zoom map to fit markers
            }

        } catch (hydrationError) {
             console.error("Error processing imported data during hydration:", hydrationError);
             alert("An error occurred while processing the imported data. The application state might be inconsistent.");
             // Attempt to clear again to prevent partial state?
             Object.values(leafletMarkers).forEach(marker => map.removeLayer(marker));
             leafletMarkers = {};
             markersData = [];
             legendElement.innerHTML = '';
             contentAreaElement.innerHTML = '<p>Error during import. Please try again or refresh.</p>';
        } finally {
             importInput.value = ''; // Reset file input regardless of success/failure after processing
        }
    };

    reader.onerror = function(error) {
        console.error("Error reading file:", error);
        alert("An error occurred while reading the file.");
        importInput.value = ''; // Reset file input
    };

    reader.readAsText(file); // Read the file content as text
}


// --- Start the application ---
// Wrap initialization in DOMContentLoaded to ensure DOM is ready and scripts likely loaded
document.addEventListener('DOMContentLoaded', initializeMap);

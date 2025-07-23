// --- Global Variables & Data Structures ---
let markersData = []; // Holds the core data for each marker (serializable)
let domMarkers = {}; // Maps markerData ID to the marker's DOM element
let nextMarkerId = 0;
let baseImageDataUrl = null; // To store the loaded base image data
let currentBaseImage = { // To store natural dimensions for coordinate calculation
    element: null,
    naturalWidth: 0,
    naturalHeight: 0
}; 
const jsPDF = window.jspdf.jsPDF; // Explicitly access jsPDF from window

// --- DOM Elements ---
// Declare variables, will be assigned in initializeApp after DOM is ready
let imageDisplayArea, imageContainer, baseImageElement, imageLoadPrompt, baseImageInput, baseImageLoadLabel;
let legendElement, contentAreaElement, reportButton, exportButton, importInput, importButtonLabel, loadingOverlay;

function cacheDOMElements() {
    imageDisplayArea = document.getElementById('image-display-area');
    imageContainer = document.getElementById('image-container');
    baseImageElement = document.getElementById('base-image');
    imageLoadPrompt = document.getElementById('image-load-prompt');
    baseImageInput = document.getElementById('base-image-input');
    baseImageLoadLabel = document.querySelector('#image-load-prompt label');
    legendElement = document.getElementById('legend');
    contentAreaElement = document.getElementById('content-area');
    reportButton = document.getElementById('report-button');
    exportButton = document.getElementById('export-button');
    importInput = document.getElementById('import-input');
    importButtonLabel = document.querySelector('#controls label[for="import-input"]'); 
    loadingOverlay = document.getElementById('loading-overlay');
}


// --- Initialization ---
function initializeApp() {
    cacheDOMElements(); // Get references to DOM elements

    // Event listener for loading the base image
    baseImageInput.addEventListener('change', handleBaseImageLoad);
    baseImageLoadLabel.addEventListener('click', () => baseImageInput.click()); // Trigger hidden input

    // Event listeners for sidebar controls
    reportButton.addEventListener('click', generateReport);
    exportButton.addEventListener('click', exportData);
    importInput.addEventListener('change', handleImport);
    importButtonLabel.addEventListener('click', () => importInput.click()); // Trigger hidden input
}

// --- Base Image Handling ---
function handleBaseImageLoad(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            baseImageDataUrl = e.target.result; // Store Base64 data
            baseImageElement.src = baseImageDataUrl;
            baseImageElement.style.display = 'block'; // Show the image element
            imageLoadPrompt.style.display = 'none'; // Hide the prompt

            // Store natural dimensions once the image is loaded into the element
            baseImageElement.onload = () => {
                 currentBaseImage.element = baseImageElement;
                 currentBaseImage.naturalWidth = baseImageElement.naturalWidth;
                 currentBaseImage.naturalHeight = baseImageElement.naturalHeight;
                 console.log(`Base image loaded: ${currentBaseImage.naturalWidth}x${currentBaseImage.naturalHeight}`);
                 
                 // Clear existing markers if a new image is loaded
                 clearAllMarkers(); 
                 
                 // Add click listener for placing markers *after* image is loaded
                 imageContainer.removeEventListener('click', handleImageClick); // Remove previous listener if any
                 imageContainer.addEventListener('click', handleImageClick);
            };
             baseImageElement.onerror = () => {
                 alert("Error loading image into element.");
                 resetBaseImage();
             }
        }
        reader.onerror = function() {
            alert("Error reading image file.");
            resetBaseImage();
        }
        reader.readAsDataURL(file);
    } else {
        alert("Please select a valid image file.");
        resetBaseImage();
    }
     // Reset file input to allow loading the same file again
     baseImageInput.value = '';
}

function resetBaseImage() {
     baseImageDataUrl = null;
     baseImageElement.src = '#';
     baseImageElement.style.display = 'none';
     imageLoadPrompt.style.display = 'block';
     currentBaseImage = { element: null, naturalWidth: 0, naturalHeight: 0 };
     if (imageContainer) { // Check if container exists
        imageContainer.removeEventListener('click', handleImageClick);
     }
     clearAllMarkers();
     if (contentAreaElement) { // Check if element exists
        contentAreaElement.innerHTML = '<p>Load a base image and click on it to add a marker...</p>';
     }
}

function clearAllMarkers() {
     markersData = [];
     Object.values(domMarkers).forEach(markerDiv => {
         if (markerDiv && markerDiv.parentNode) {
             markerDiv.parentNode.removeChild(markerDiv);
         }
     });
     domMarkers = {};
     nextMarkerId = 0;
     updateLegend();
}


// --- Marker Handling ---
function handleImageClick(event) {
    // Ensure the click is directly on the image or container, not on an existing marker
    if (event.target.classList.contains('image-marker')) {
        return; 
    }
    if (!currentBaseImage.element || !baseImageDataUrl) {
        alert("Please load a base image first.");
        return;
    }

    const label = prompt("Enter a label for this marker:");
    if (label) {
        const rect = imageContainer.getBoundingClientRect(); // Get container position/size on screen
        const imageRect = baseImageElement.getBoundingClientRect(); // Get displayed image position/size

        // Calculate click coordinates relative to the container
        const clickX = event.clientX - imageRect.left;
        const clickY = event.clientY - imageRect.top;

        // Calculate relative coordinates (percentages) based on the *displayed* image size
        const relativeX = clickX / imageRect.width;
        const relativeY = clickY / imageRect.height;

        // Clamp coordinates between 0 and 1 to handle clicks slightly outside bounds
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));

        const defaultColor = '#FF0000'; // Default to red
        const newMarkerData = {
            id: nextMarkerId++,
            label: label,
            coords: { x: clampedX, y: clampedY }, // Store relative coordinates
            color: defaultColor, // Add color property
            locationNote: "", // Keep same structure as GeoReport for notes/images
            images: [] 
        };

        markersData.push(newMarkerData);
        createMarkerElement(newMarkerData); // Create the visual marker
        updateLegend();
        displayMarkerContent(newMarkerData.id); // Show details for the new marker
    }
}

function createMarkerElement(markerData) {
    const markerDiv = document.createElement('div');
    markerDiv.className = 'image-marker';
    markerDiv.style.left = `${markerData.coords.x * 100}%`;
    markerDiv.style.top = `${markerData.coords.y * 100}%`;
    markerDiv.style.backgroundColor = markerData.color || '#FF0000'; // Use stored color, default red
    markerDiv.dataset.markerId = markerData.id;

    markerDiv.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent image click handler when clicking marker
        displayMarkerContent(markerData.id);
    });

    imageContainer.appendChild(markerDiv);
    domMarkers[markerData.id] = markerDiv; // Store reference to the DOM element
}

function updateLegend() {
    if (!legendElement) return; // Ensure element exists
    legendElement.innerHTML = ''; // Clear existing legend
    markersData.forEach(marker => {
        const li = document.createElement('li');
        li.textContent = marker.label;
        li.dataset.markerId = marker.id; 
        li.addEventListener('click', () => {
            displayMarkerContent(marker.id);
        });
        legendElement.appendChild(li);
    });
}

// --- Marker Content Display & Associated Image Handling ---

function displayMarkerContent(markerId) {
    if (!contentAreaElement) return; // Ensure element exists

    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) {
        contentAreaElement.innerHTML = '<p>Select a marker to see details.</p>';
        // Clear selection styles
        Object.values(domMarkers).forEach(m => m.classList.remove('selected'));
        if (legendElement) {
            Array.from(legendElement.children).forEach(li => li.classList.remove('selected'));
        }
        return;
    }
    const marker = markersData[markerIndex];

    contentAreaElement.innerHTML = ''; // Clear previous content

    // 1. Label
    const labelElement = document.createElement('h2');
    labelElement.textContent = marker.label;
    contentAreaElement.appendChild(labelElement);

    // 2. Color Picker
    const colorContainer = document.createElement('div');
    colorContainer.style.marginTop = '10px';
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Marker Color: ';
    colorLabel.style.marginRight = '5px';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = marker.color || '#FF0000'; // Use stored color or default
    colorInput.id = `marker-color-${markerId}`;
    colorInput.addEventListener('input', (event) => {
        const newColor = event.target.value;
        markersData[markerIndex].color = newColor; // Update data
        if (domMarkers[markerId]) { // Update visual marker
            domMarkers[markerId].style.backgroundColor = newColor;
        }
    });
    colorContainer.appendChild(colorLabel);
    colorContainer.appendChild(colorInput);
    contentAreaElement.appendChild(colorContainer);


    // 3. Location Note (using 'locationNote' to keep data structure consistent)
    const noteLabel = document.createElement('label');
    noteLabel.textContent = 'Marker Note:';
    noteLabel.style.display = 'block';
    noteLabel.style.marginBottom = '5px';
    noteLabel.style.marginTop = '10px'; // Add some space above
    contentAreaElement.appendChild(noteLabel);

    const locationNoteTextarea = document.createElement('textarea');
    locationNoteTextarea.id = `location-note-${markerId}`;
    locationNoteTextarea.value = marker.locationNote;
    locationNoteTextarea.placeholder = 'Add general notes for this marker...';
    locationNoteTextarea.addEventListener('input', (event) => {
        markersData[markerIndex].locationNote = event.target.value;
    });
    contentAreaElement.appendChild(locationNoteTextarea);

    // 4. Associated Image Upload Section
    const imageUploadLabel = document.createElement('label');
    imageUploadLabel.textContent = 'Add Associated Images:';
    imageUploadLabel.style.display = 'block';
    imageUploadLabel.style.marginTop = '15px';
    imageUploadLabel.style.marginBottom = '5px';
    contentAreaElement.appendChild(imageUploadLabel);

    const imageUploadInput = document.createElement('input');
    imageUploadInput.type = 'file';
    imageUploadInput.multiple = true;
    imageUploadInput.accept = 'image/*';
    imageUploadInput.id = `image-upload-${markerId}`;
    imageUploadInput.addEventListener('change', (event) => handleMarkerImageUpload(event, markerId));
    contentAreaElement.appendChild(imageUploadInput);

    // 5. Associated Image List Area
    const imageListArea = document.createElement('div');
    imageListArea.id = `image-list-${markerId}`; // Unique ID for the list container
    imageListArea.className = 'image-list'; // Use class for styling if needed
    imageListArea.style.marginTop = '15px';
    contentAreaElement.appendChild(imageListArea);

    // 6. Populate Associated Image List
    renderMarkerImageList(markerId);

    // 7. Add Delete Marker Button
    const deleteMarkerButton = document.createElement('button');
    deleteMarkerButton.textContent = 'Delete This Marker';
    deleteMarkerButton.className = 'delete-marker-button'; // For styling
    deleteMarkerButton.addEventListener('click', () => deleteMarker(markerId));
    contentAreaElement.appendChild(deleteMarkerButton);

    // --- Highlight Selection ---
    // Highlight selected marker on image
    Object.values(domMarkers).forEach(m => m.classList.remove('selected'));
    if (domMarkers[markerId]) {
        domMarkers[markerId].classList.add('selected');
    }
     // Highlight selected legend item
     if (legendElement) {
         Array.from(legendElement.children).forEach(li => {
             li.classList.remove('selected');
             if (parseInt(li.dataset.markerId) === markerId) {
                 li.classList.add('selected');
             }
         });
     }
}

function renderMarkerImageList(markerId) {
    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) return; 

    const marker = markersData[markerIndex];
    const imageListArea = document.getElementById(`image-list-${markerId}`); // Get the correct container
    if (!imageListArea) {
        console.error("Image list area not found for marker:", markerId);
        return; 
    }

    imageListArea.innerHTML = ''; // Clear current list

    if (!marker.images || marker.images.length === 0) {
        imageListArea.innerHTML = '<p>No associated images uploaded yet.</p>';
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
                renderMarkerImageList(mId); // Re-render the list for this marker
            }
        });
        itemContainer.appendChild(deleteButton);

        imageListArea.appendChild(itemContainer);
    });
}

function handleMarkerImageUpload(event, markerId) {
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
                // Ensure the images array exists
                if (!markersData[markerIndex].images) {
                     markersData[markerIndex].images = [];
                }
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
            renderMarkerImageList(markerId); // Update the UI with new images
            console.log(`Added ${promises.length} associated images for marker ${markerId}`);
        })
        .catch((error) => {
            console.error("Error processing one or more associated image files:", error);
            alert("An error occurred while uploading some associated images. Please check the console.");
            // Still try to render what might have succeeded
            renderMarkerImageList(markerId);
        })
        .finally(() => {
             // Clear the file input value to allow re-uploading the same file(s)
             event.target.value = '';
        });
}

// --- Marker Deletion ---
function deleteMarker(markerId) {
    if (!confirm("Are you sure you want to delete this marker and all its associated data?")) {
        return;
    }

    const markerIndex = markersData.findIndex(m => m.id === markerId);
    if (markerIndex === -1) {
        console.error("Marker data not found for deletion:", markerId);
        // Attempt to remove DOM element anyway if it exists
        if (domMarkers[markerId]) {
             domMarkers[markerId].remove();
             delete domMarkers[markerId];
        }
        return;
    }

    // Remove from DOM
    if (domMarkers[markerId]) {
        domMarkers[markerId].remove();
        delete domMarkers[markerId]; // Remove reference
    } else {
         console.warn("DOM element not found for marker ID:", markerId);
    }

    // Remove from data array
    markersData.splice(markerIndex, 1);

    // Update UI
    updateLegend();
    contentAreaElement.innerHTML = '<p>Marker deleted. Select another marker or add a new one.</p>'; // Clear content area
    console.log("Deleted marker ID:", markerId);
}

// --- PDF Report Generation ---

// Helper function to get image snippet using html2canvas
// Captures the entire image container including base image and markers
function getImageContainerSnippet() {
    return new Promise(async (resolve, reject) => {
        const containerToCapture = document.getElementById('image-container');
        if (!containerToCapture) {
            return reject(new Error("Image container element (#image-container) not found."));
        }
         // Ensure base image is loaded before capturing
         if (!baseImageDataUrl) {
             return reject(new Error("Base image is not loaded. Cannot generate snippet."));
         }

        // Wait a short moment just in case of any final rendering updates
        await new Promise(res => setTimeout(res, 200)); 

        try {
            // Check if html2canvas is loaded via window object
            if (typeof window.html2canvas !== 'function') {
                 console.error("window.html2canvas function is not defined. Check if the library script loaded correctly.");
                 return reject(new Error("Snapshot function (window.html2canvas) not available."));
            }

            const options = {
                useCORS: true, 
                allowTaint: true,
                logging: false,
                scale: 1.5 // Increase scale slightly for potentially better resolution in PDF
            };

            console.log("Attempting html2canvas capture of image container...");
            const canvas = await window.html2canvas(containerToCapture, options); 
            const dataUrl = canvas.toDataURL('image/png');
            console.log("html2canvas capture successful.");
            resolve(dataUrl);

        } catch (error) {
            console.error("html2canvas error:", error);
            reject(new Error(`Failed to capture image container snippet: ${error.message}`));
        }
    });
}


async function generateReport() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex'; // Show loading indicator

    try { // Wrap the entire report generation in try...finally
        // Check for required libraries right before use
        if (typeof window.html2canvas !== 'function') {
            alert("Error: html2canvas library is not loaded. Cannot generate image snippets. Please check console.");
            console.error("window.html2canvas function is not defined when generateReport is called.");
            return; 
        }
         if (typeof jsPDF !== 'function') {
             alert("Error: jsPDF library is not loaded. Cannot generate PDF. Please check console.");
             console.error("jsPDF function is not defined when generateReport is called.");
             return; 
         }
         if (!baseImageDataUrl) {
              alert("Please load a base image before generating a report.");
              return;
         }


        if (markersData.length === 0) {
            alert("No markers placed to report.");
            return; 
        }

        const doc = new jsPDF({
            orientation: 'p', 
            unit: 'mm', 
            format: 'a4' 
        });

        let yPos = 15; 
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const usableWidth = pageWidth - 2 * margin;
        
        // --- PDF Header ---
        const creatorName = document.getElementById('creator-name').value || 'N/A';
        const reportDescription = document.getElementById('report-description').value || 'N/A';
        const generationDate = new Date().toLocaleString();

        doc.setFontSize(18);
        doc.text("Process Map Report", margin, yPos); // Changed Title
        yPos += 8;

        doc.setFontSize(10);
        doc.text(`Creator: ${creatorName}`, margin, yPos);
        doc.text(`Generated: ${generationDate}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 5;

        doc.text("Description:", margin, yPos);
        yPos += 4;
        const descLines = doc.splitTextToSize(reportDescription, usableWidth);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 4 + 6; 

        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos); 
        yPos += 8;

        let processingErrorOccurred = false; 

        // --- Add Base Image Snippet (Once at the beginning of marker details) ---
        doc.setFontSize(14);
        doc.text("Base Image with Markers:", margin, yPos);
        yPos += 6;
        try {
             console.log("Generating base image snippet...");
             const baseImageSnippetUrl = await getImageContainerSnippet();
             const imgProps = doc.getImageProperties(baseImageSnippetUrl);
             const aspectRatio = imgProps.width / imgProps.height;
             let snippetHeight = usableWidth / aspectRatio;
             let snippetWidth = usableWidth;

             // Check if snippet height exceeds available space (e.g., half a page)
             const maxSnippetHeight = (pageHeight - yPos - margin) * 0.7; // Limit to 70% of remaining space
             if (snippetHeight > maxSnippetHeight) {
                 snippetHeight = maxSnippetHeight;
                 snippetWidth = snippetHeight * aspectRatio;
             }
              // Ensure width doesn't exceed usableWidth after height adjustment
              if (snippetWidth > usableWidth) {
                  snippetWidth = usableWidth;
                  snippetHeight = snippetWidth / aspectRatio;
              }


             if (yPos + snippetHeight > pageHeight - margin) { // Check if it fits on current page
                 doc.addPage();
                 yPos = margin;
             }
             doc.addImage(baseImageSnippetUrl, 'PNG', margin, yPos, snippetWidth, snippetHeight);
             yPos += snippetHeight + 8; // Add space after snippet
             console.log("Base image snippet added.");

        } catch (error) {
             console.error("Error generating base image snippet:", error);
             processingErrorOccurred = true;
             if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; }
             doc.setFontSize(10);
             doc.setTextColor(255, 0, 0);
             doc.text("[Error generating base image snippet]", margin, yPos);
             doc.setTextColor(0);
             yPos += 7;
        }


        // --- Loop through markers for details ---
        for (const marker of markersData) {
             // Check for page break before starting a new marker section
             // Estimate height needed: Label + Note lines + Table header + some padding
             const estimatedNoteLines = (marker.locationNote || '').length / 80 + 1; // Rough estimate
             const estimatedHeight = 10 + (estimatedNoteLines * 5) + (marker.images.length > 0 ? 20 : 10); 
             if (yPos + estimatedHeight > pageHeight - margin) {
                 doc.addPage();
                 yPos = margin;
             }

            doc.setFontSize(14);
            // Add marker coordinates to the label line and set color
            const coordText = `(X: ${marker.coords.x.toFixed(3)}, Y: ${marker.coords.y.toFixed(3)})`;
            const markerColor = marker.color || '#000000'; // Default to black if no color
            doc.setTextColor(markerColor); // Set text color
            doc.text(`Marker: ${marker.label} ${coordText}`, margin, yPos);
            doc.setTextColor(0); // Reset text color to black for subsequent text
            yPos += 7;

            // --- Location Note ---
             if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; }
            doc.setFontSize(12);
            doc.text("Marker Note:", margin, yPos);
            yPos += 5;
            doc.setFontSize(10);
            const noteLines = doc.splitTextToSize(marker.locationNote || '(No marker note provided)', usableWidth);
            if (yPos + noteLines.length * 5 > pageHeight - margin) { doc.addPage(); yPos = margin; }
            doc.text(noteLines, margin, yPos);
            yPos += noteLines.length * 5 + 5; 

            // --- Associated Image/Note Table ---
            if (marker.images && marker.images.length > 0) {
                 if (yPos + 15 > pageHeight - margin) { doc.addPage(); yPos = margin; }
                doc.setFontSize(12);
                doc.text("Associated Images & Notes:", margin, yPos);
                yPos += 7;

                const tableColumnStyles = {
                    0: { cellWidth: 60, minCellHeight: 45 }, 
                    1: { cellWidth: 'auto' }, 
                };
                const tableHead = [['Image', 'Note']];
                const tableBody = marker.images.map(imgObj => [null, imgObj.note || '(No note)']); 

                if (typeof doc.autoTable !== 'function') {
                     console.error("jsPDF autoTable plugin is not loaded.");
                     processingErrorOccurred = true;
                     if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; }
                     doc.setFontSize(10); doc.setTextColor(255, 0, 0);
                     doc.text("[Image table could not be generated - autoTable plugin missing]", margin, yPos);
                     doc.setTextColor(0); yPos += 10;
                } else {
                    doc.autoTable({
                        head: tableHead,
                        body: tableBody, 
                        startY: yPos,
                        margin: { left: margin, right: margin },
                        columnStyles: tableColumnStyles,
                        didDrawCell: (data) => {
                            if (data.section === 'body' && data.column.index === 0) {
                                const imgData = marker.images[data.row.index]?.imageData; 
                                const cellHeight = data.cell.height;
                                const cellWidth = data.column.width;
                                const padding = 2; 

                                if (imgData && typeof imgData === 'string' && imgData.startsWith('data:image')) {
                                    try {
                                        const imgProps = doc.getImageProperties(imgData);
                                        const aspectRatio = imgProps.width / imgProps.height;
                                        const maxWidth = cellWidth - (2 * padding);
                                        const maxHeight = cellHeight - (2 * padding);
                                        let imgWidth = maxWidth;
                                        let imgHeight = imgWidth / aspectRatio;
                                        if (imgHeight > maxHeight) { imgHeight = maxHeight; imgWidth = imgHeight * aspectRatio; }
                                        if (imgWidth > maxWidth) { imgWidth = maxWidth; imgHeight = imgWidth / aspectRatio; }
                                        const imgX = data.cell.x + (cellWidth - imgWidth) / 2;
                                        const imgY = data.cell.y + (cellHeight - imgHeight) / 2;
                                        doc.addImage(imgData, imgProps.fileType, imgX, imgY, imgWidth, imgHeight);
                                    } catch (imgError) {
                                         console.error("Error adding image to PDF table:", imgError);
                                         doc.setFontSize(8); doc.setTextColor(255, 0, 0);
                                         doc.text("[Image Error]", data.cell.x + padding, data.cell.y + cellHeight / 2);
                                         doc.setTextColor(0); processingErrorOccurred = true;
                                    }
                                } else {
                                     console.warn("Invalid image data for PDF table cell at row index:", data.row.index);
                                     doc.setFontSize(8); doc.setTextColor(255, 0, 0);
                                     doc.text("[Invalid Img]", data.cell.x + padding, data.cell.y + cellHeight / 2);
                                     doc.setTextColor(0); processingErrorOccurred = true;
                                }
                            }
                        },
                    });
                     yPos = doc.lastAutoTable.finalY + 10; 
                }
            } else {
                 if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; }
                doc.setFontSize(10);
                doc.text("(No associated images)", margin, yPos);
                yPos += 10;
            }

            // Add space before next marker section
            yPos += 5; 
            // Check if it's the last marker before adding separator/page break
             if (marker !== markersData[markersData.length - 1]) {
                 if (yPos + 5 > pageHeight - margin) { // Need space for line + next header
                     doc.addPage();
                     yPos = margin;
                 } else {
                      doc.setLineWidth(0.2);
                      doc.line(margin, yPos, pageWidth - margin, yPos); // Separator line between markers
                      yPos += 8;
                 }
             }
        }

        // Save the PDF
        try {
            doc.save('ProcessMapReport.pdf'); // Changed filename
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

// --- Import/Export Functionality ---

function exportData() {
    if (!baseImageDataUrl && markersData.length === 0) {
        alert("No base image loaded and no markers placed. Nothing to export.");
        return;
    }

    try {
        // Create the export object, including base image data and markers
        const exportObject = {
            baseImageDataUrl: baseImageDataUrl, // Include the loaded base image
            markers: markersData // Include the array of marker data
        };

        const dataToExport = JSON.stringify(exportObject, null, 2); // Pretty print JSON

        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'processmap-data.json'; // Specific filename
        document.body.appendChild(link); 
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
        alert("Invalid file type. Please select a '.json' file exported from ProcessMapper.");
        importInput.value = ''; // Reset file input
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        let importedObject;
        try {
            importedObject = JSON.parse(e.target.result);
            // Validate structure: Check for baseImageDataUrl and markers array
            // Allow baseImageDataUrl to be null if user exported without loading an image
            if (typeof importedObject !== 'object' || importedObject === null || 
                (importedObject.baseImageDataUrl !== null && typeof importedObject.baseImageDataUrl !== 'string') || 
                !Array.isArray(importedObject.markers)) {
                 throw new Error("Invalid JSON structure: Expected an object with 'baseImageDataUrl' (string or null) and a 'markers' (array).");
            }
             // Optional: More detailed validation of marker structure within the array

        } catch (error) {
            console.error("Error parsing imported file:", error);
            alert(`Error reading or parsing file: ${error.message}\nPlease ensure it's a valid ProcessMapper JSON file.`);
            importInput.value = ''; // Reset file input
            return;
        }

        // --- Clear Current State ---
        console.log("Clearing current state before import...");
        resetBaseImage(); // Resets image, markers, data, legend, content area

        // --- Load Base Image ---
        if (importedObject.baseImageDataUrl) {
            baseImageDataUrl = importedObject.baseImageDataUrl;
            baseImageElement.src = baseImageDataUrl;
            baseImageElement.style.display = 'block';
            imageLoadPrompt.style.display = 'none';

            // Need to wait for image element to load to get dimensions and add click listener
            baseImageElement.onload = () => {
                 currentBaseImage.element = baseImageElement;
                 currentBaseImage.naturalWidth = baseImageElement.naturalWidth;
                 currentBaseImage.naturalHeight = baseImageElement.naturalHeight;
                 console.log(`Imported base image loaded: ${currentBaseImage.naturalWidth}x${currentBaseImage.naturalHeight}`);
                 
                 // Add click listener *after* image dimensions are known
                 imageContainer.removeEventListener('click', handleImageClick); 
                 imageContainer.addEventListener('click', handleImageClick);

                 // Now hydrate markers *after* base image is loaded
                 hydrateMarkers(importedObject.markers); 
            };
             baseImageElement.onerror = () => {
                 alert("Error loading imported base image into element. Markers cannot be placed accurately.");
                 resetBaseImage(); // Reset again on error
                 // Still try to load marker data, but they won't be visible
                 hydrateMarkers(importedObject.markers); 
             }
        } else {
             console.warn("Imported data does not contain a base image. Loading marker data only.");
             // If no base image in import, just load marker data. Markers won't be visible until user loads an image manually.
             hydrateMarkers(importedObject.markers); 
        }
    };

    reader.onerror = function(error) {
        console.error("Error reading file:", error);
        alert("An error occurred while reading the file.");
        importInput.value = ''; // Reset file input
    };

    reader.readAsText(file); // Read the file content as text
    // Reset immediately so user can select same file again if needed after an error
    importInput.value = ''; 
}

// Helper function to hydrate markers after base image is loaded (or if no base image)
function hydrateMarkers(importedMarkers) {
     console.log("Hydrating markers...");
     let maxId = -1;
     try {
         // Ensure importedMarkers is an array before assigning
         markersData = Array.isArray(importedMarkers) ? importedMarkers : []; 

         markersData.forEach(marker => {
             // Validate essential properties before creating marker element
             if (marker.coords && typeof marker.coords.x === 'number' && typeof marker.coords.y === 'number') {
                 // Only create the DOM element if the base image is actually loaded and displayed
                 if (currentBaseImage.element && baseImageElement.style.display === 'block') {
                      createMarkerElement(marker);
                 } else {
                      console.warn(`Marker ${marker.id || 'N/A'} data loaded, but DOM element not created (no base image loaded/visible yet).`);
                 }

                 // Track the highest ID to reset nextMarkerId
                 if (typeof marker.id === 'number' && marker.id > maxId) {
                     maxId = marker.id;
                 }
             } else {
                  console.warn("Skipping marker due to invalid/missing coords:", marker);
             }
              // Ensure notes, images array, and color exist, default if necessary
              marker.locationNote = marker.locationNote || "";
              marker.images = Array.isArray(marker.images) ? marker.images : [];
              marker.color = marker.color || '#FF0000'; // Default color if missing in import
              
              // Optional: Validate image objects within the array (imageData, note)
              if (marker.images) {
                   marker.images = marker.images.filter(img => img && typeof img.imageData === 'string' && typeof img.note === 'string');
              }
         });

         nextMarkerId = maxId + 1; // Set the next ID correctly
         updateLegend(); // Rebuild the legend UI

         console.log(`Import successful. ${markersData.length} markers data loaded.`);
         // Avoid alert if no base image was loaded, as markers won't be visible yet.
         if (baseImageDataUrl) {
              alert(`Import successful. ${markersData.length} markers loaded onto the image.`);
         } else {
              alert(`Import successful. ${markersData.length} markers data loaded. Load a base image to see markers.`);
         }


         // Optionally display first marker details
         // if (markersData.length > 0) { displayMarkerContent(markersData[0].id); }

     } catch (hydrationError) {
          console.error("Error processing imported marker data during hydration:", hydrationError);
          alert("An error occurred while processing the imported marker data. The application state might be inconsistent.");
          // Attempt to clear again?
          resetBaseImage(); 
     }
}


// --- Start the application ---
document.addEventListener('DOMContentLoaded', initializeApp);

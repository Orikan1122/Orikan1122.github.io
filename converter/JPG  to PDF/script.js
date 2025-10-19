// The pdfjsLib worker setting is removed as it's no longer used.

// Get references to the HTML elements
// Changed ID from pdf-upload to image-upload
const imageUpload = document.getElementById('image-upload');
const outputContainer = document.getElementById('output-container');
const statusContainer = document.getElementById('status-container');

// Listen for a file to be selected
imageUpload.addEventListener('change', handleFileSelect, false);

// --- Utility Functions ---

// 1. Reads a File object and resolves with its Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return reject(new Error("File is not a valid image type."));
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// 2. Gets the actual dimensions of an image from its Data URL
function getImageDimensions(dataUrl) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = dataUrl;
    });
}

// 3. Displays the final download link
function displayDownloadLink(pdfDataUrl, numImages) {
    outputContainer.innerHTML = ''; // Clear previous content

    const downloadLink = document.createElement('a');
    downloadLink.href = pdfDataUrl;
    downloadLink.download = `converted_images_(${numImages}).pdf`;
    downloadLink.textContent = `⬇️ Download PDF (${numImages} Pages)`;
    downloadLink.className = 'download-link';
    
    outputContainer.appendChild(downloadLink);
}

// --- Main Conversion Logic ---

async function handleFileSelect(event) {
    const files = event.target.files;
    
    if (files.length === 0) return;
    
    // Clear previous output and status
    outputContainer.innerHTML = '';
    statusContainer.textContent = `Found ${files.length} images. Starting conversion...`;

    try {
        // Get jsPDF constructor from the global scope (thanks to the CDN)
        const { jsPDF } = window.jspdf;
        
        // Initialize jsPDF document (Portrait, Millimeters, A4 size)
        const doc = new jsPDF('p', 'mm', 'a4'); 
        
        // Define A4 dimensions in mm
        const a4Width = 210;
        const a4Height = 297;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Add a new page for every image (except the first one, which uses the default page)
            if (i > 0) {
                doc.addPage();
            }

            statusContainer.textContent = `Processing image ${i + 1} of ${files.length}...`;
            
            // Convert file to Data URL
            const imageDataUrl = await readFileAsDataURL(file);
            
            // Get original dimensions
            const { width: originalWidth, height: originalHeight } = await getImageDimensions(imageDataUrl);

            // --- Fit image to A4 logic ---
            let imgWidth = a4Width;
            let imgHeight = (originalHeight * a4Width) / originalWidth;

            // If the image is taller than A4, scale it down to fit the height
            if (imgHeight > a4Height) {
                imgHeight = a4Height;
                imgWidth = (originalWidth * a4Height) / originalHeight;
            }
            
            // Calculate center position
            const x = (a4Width - imgWidth) / 2;
            const y = (a4Height - imgHeight) / 2;

            // Determine image format (only supports JPG and PNG for simplicity with jsPDF)
            const imgFormat = file.type === 'image/png' ? 'PNG' : 'JPEG';
            
            // Add image to the current page
            doc.addImage(imageDataUrl, imgFormat, x, y, imgWidth, imgHeight);
        }
        
        // Output the PDF as a Data URL string
        const pdfDataUrl = doc.output('datauristring');
        
        // Display the final download link
        displayDownloadLink(pdfDataUrl, files.length);

        statusContainer.textContent = `Conversion complete! ${files.length} images combined into one PDF.`;

    } catch (error) {
        console.error('Error processing image to PDF:', error);
        statusContainer.textContent = 'An error occurred. Please check the console.';
        alert('Failed to process the images: ' + error.message);
    }
}
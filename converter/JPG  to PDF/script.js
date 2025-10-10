// Set the workerSrc to point to the CDN. This is required for PDF.js to work.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

// Get references to the HTML elements
const pdfUpload = document.getElementById('pdf-upload');
const outputContainer = document.getElementById('output-container');
const statusContainer = document.getElementById('status-container');

// Listen for a file to be selected
pdfUpload.addEventListener('change', handleFileSelect, false);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    // Clear previous output and status
    outputContainer.innerHTML = '';
    statusContainer.textContent = 'Loading PDF...';

    try {
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            // The file content is read as an ArrayBuffer
            const typedarray = new Uint8Array(this.result);
            
            // Load the PDF document
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            statusContainer.textContent = `PDF loaded. Found ${pdf.numPages} pages. Converting...`;
            
            // Process each page
            for (let i = 1; i <= pdf.numPages; i++) {
                statusContainer.textContent = `Processing page ${i} of ${pdf.numPages}...`;
                await processPage(pdf, i);
            }
            
            statusContainer.textContent = 'Conversion complete!';
        };

        // Read the file as an ArrayBuffer
        fileReader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Error processing PDF:', error);
        statusContainer.textContent = 'An error occurred. Please check the console.';
        alert('Failed to process the PDF file.');
    }
}

async function processPage(pdf, pageNumber) {
    // Get the page
    const page = await pdf.getPage(pageNumber);

    // Set the scale for rendering (higher scale = better quality)
    const scale = 2.0;
    const viewport = page.getViewport({ scale: scale });

    // Create a canvas element to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the page onto the canvas
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    // Convert the canvas to a JPG image data URL
    // Use a quality setting of 0.9 (90%)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Display the image and a download link
    displayImage(imageDataUrl, pageNumber);
}

function displayImage(url, pageNum) {
    // Create a container for the image and its download link
    const imageCard = document.createElement('div');
    imageCard.className = 'image-card';

    // Create the image element
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Page ${pageNum}`;

    // Create the download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `page_${pageNum}.jpg`;
    downloadLink.textContent = `Download Page ${pageNum}`;

    // Append the image and link to the card, and the card to the output container
    imageCard.appendChild(img);
    imageCard.appendChild(downloadLink);
    outputContainer.appendChild(imageCard);
}
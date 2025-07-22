// Set the workerSrc to point to the CDN
// This is required for PDF.js to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const fileInput = document.getElementById('pdf-file');
const statusDiv = document.getElementById('status');
const outputContainer = document.getElementById('output-container');

fileInput.addEventListener('change', handleFileSelect, false);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        statusDiv.textContent = 'Please select a valid PDF file.';
        return;
    }

    // Clear previous results and status
    statusDiv.textContent = 'Loading PDF...';
    outputContainer.innerHTML = '';

    const fileReader = new FileReader();

    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            statusDiv.textContent = `PDF loaded. Found ${pdf.numPages} pages. Converting...`;

            for (let i = 1; i <= pdf.numPages; i++) {
                statusDiv.textContent = `Processing page ${i} of ${pdf.numPages}...`;
                
                const page = await pdf.getPage(i);
                
                const scale = 1.5; // Increase scale for higher quality
                const viewport = page.getViewport({ scale: scale });

                // Create a canvas element to render the PDF page
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
                
                // Convert canvas to JPG and create output elements
                createOutput(canvas.toDataURL('image/jpeg', 0.9), i); // 0.9 is JPEG quality
            }
            statusDiv.textContent = 'Conversion complete!';

        } catch (error) {
            console.error('Error processing PDF:', error);
            statusDiv.textContent = `Error: ${error.message}`;
        }
    };

    fileReader.readAsArrayBuffer(file);
}

function createOutput(dataUrl, pageNum) {
    const outputItem = document.createElement('div');
    outputItem.className = 'output-item';

    const img = document.createElement('img');
    img.src = dataUrl;

    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `page_${pageNum}.jpg`;
    downloadLink.textContent = `Download Page ${pageNum}`;

    outputItem.appendChild(img);
    outputItem.appendChild(downloadLink);
    outputContainer.appendChild(outputItem);
}
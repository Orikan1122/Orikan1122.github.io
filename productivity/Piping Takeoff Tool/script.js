// Set workerSrc for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

// DOM Elements
const pdfUpload = document.getElementById('pdf-upload');
const pdfName = document.getElementById('pdf-name');
const viewerContainer = document.getElementById('viewer-container');
const pdfViewer = document.getElementById('pdf-viewer');
const pdfCanvas = document.getElementById('pdf-canvas');
const drawingCanvas = document.getElementById('drawing-canvas');
const pdfCtx = pdfCanvas.getContext('2d');
const drawingCtx = drawingCanvas.getContext('2d');
const resizer = document.getElementById('resizer');
const controlsPanel = document.getElementById('controls-panel');

const calibrateBtn = document.getElementById('calibrate-btn');
const scaleDisplay = document.getElementById('scale-display');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');

const registerBody = document.getElementById('register-body');
const addRowBtn = document.getElementById('add-row-btn');

const setupPipesBtn = document.getElementById('setup-pipes-btn');
const pipeDbModal = document.getElementById('pipe-db-modal');
const closeModalBtn = document.querySelector('.close-btn');
const addPipeTypeBtn = document.getElementById('add-pipe-type-btn');
const pipeDbList = document.getElementById('pipe-db-list');

const pipeNameInput = document.getElementById('pipe-name-input');
const pipeDiameterInput = document.getElementById('pipe-diameter-input');
const pipePriceInput = document.getElementById('pipe-price-input');


const exportBtn = document.getElementById('export-project-btn');
const importBtn = document.getElementById('import-project-btn');
const importInput = document.getElementById('import-project-input');
const exportA3PdfBtn = document.getElementById('export-a3-pdf-btn');

// --- Application State ---
let pdfDoc = null, currentPageNum = 1, pageRendering = false, pageNumPending = null;
let currentMode = 'draw', isDrawing = false, isPanning = false;
let lastPanPoint = { x: 0, y: 0 }, startPoint = { x: 0, y: 0 };
let activePipeRunId = null, editingPipeTypeId = null;

let projectData = {
    scale: null,
    pipeTypes: [ { id: Date.now(), name: 'Default Pipe', diameter: 50, price: 10 } ],
    pipeRuns: [],
    viewerState: { zoom: 1, pan: { x: 0, y: 0 } }
};

// --- PDF Handling & Drawing Interaction Logic (Confirmed Working) ---
function renderPage(num){pageRendering=!0,pdfDoc.getPage(num).then(page=>{const fixedResolutionScale=1.5,viewport=page.getViewport({scale:fixedResolutionScale});pdfCanvas.height=viewport.height,pdfCanvas.width=viewport.width,drawingCanvas.height=viewport.height,drawingCanvas.width=viewport.width,pdfViewer.style.width=`${viewport.width}px`,pdfViewer.style.height=`${viewport.height}px`,0===projectData.viewerState.pan.x&&0===projectData.viewerState.pan.y&&(projectData.viewerState.pan.x=(viewerContainer.clientWidth-viewport.width)/2,projectData.viewerState.pan.y=(viewerContainer.clientHeight-viewport.height)/2),updateViewerTransform(),page.render({canvasContext:pdfCtx,viewport:viewport}).promise.then(()=>{pageRendering=!1,null!==pageNumPending&&(renderPage(pageNumPending),pageNumPending=null),redrawAllLines()})}),currentPageNum=num}
function updateViewerTransform(){pdfViewer.style.transform=`translate(${projectData.viewerState.pan.x}px, ${projectData.viewerState.pan.y}px) scale(${projectData.viewerState.zoom})`}
pdfUpload.addEventListener("change",e=>{const file=e.target.files[0];if("application/pdf"!==file.type)return alert("Please select a PDF file.");const fileReader=new FileReader;fileReader.onload=function(){const typedarray=new Uint8Array(this.result);pdfjsLib.getDocument(typedarray).promise.then(pdf=>{pdfDoc=pdf,pdfName.textContent=file.name,currentPageNum=1,projectData.viewerState={zoom:1,pan:{x:0,y:0}},renderPage(currentPageNum)})},fileReader.readAsArrayBuffer(file)});
zoomInBtn.addEventListener("click",()=>{pdfDoc&&(projectData.viewerState.zoom*=1.2,updateViewerTransform())}),zoomOutBtn.addEventListener("click",()=>{pdfDoc&&(projectData.viewerState.zoom/=1.2,updateViewerTransform())});
function getCanvasCoordinates(e){const rect=drawingCanvas.getBoundingClientRect();return{x:(e.clientX-rect.left)/projectData.viewerState.zoom,y:(e.clientY-rect.top)/projectData.viewerState.zoom}}
function redrawAllLines(){clearDrawingCanvas(),projectData.pipeRuns.forEach(pipeRun=>{drawingCtx.strokeStyle=pipeRun.color,drawingCtx.lineWidth=3/projectData.viewerState.zoom,pipeRun.segments.forEach(segment=>{drawingCtx.beginPath(),drawingCtx.moveTo(segment.start.x,segment.start.y),drawingCtx.lineTo(segment.end.x,segment.end.y),drawingCtx.stroke()})})}
document.addEventListener("mousemove",e=>{if(isPanning){const dx=e.clientX-lastPanPoint.x,dy=e.clientY-lastPanPoint.y;projectData.viewerState.pan.x+=dx,projectData.viewerState.pan.y+=dy,updateViewerTransform(),lastPanPoint={x:e.clientX,y:e.clientY}}else if(isDrawing){let currentPoint=getCanvasCoordinates(e),lockedPoint=getLockedPoint(startPoint,currentPoint,e.shiftKey);clearDrawingCanvas(),redrawAllLines(),drawingCtx.beginPath(),drawingCtx.moveTo(startPoint.x,startPoint.y),drawingCtx.lineTo(lockedPoint.x,lockedPoint.y),drawingCtx.strokeStyle="red",drawingCtx.lineWidth=2/projectData.viewerState.zoom,drawingCtx.stroke()}});
function clearDrawingCanvas(){drawingCtx.clearRect(0,0,drawingCanvas.width,drawingCanvas.height)}
calibrateBtn.addEventListener("click",()=>{pdfDoc?(setMode("calibrate"),alert("Draw a line on the PDF over a known dimension.")):alert("Please load a PDF first.")});
function handleCalibration(start,end){const pixelLength=Math.sqrt(Math.pow(end.x-start.x,2)+Math.pow(end.y-start.y,2)),realLength=parseFloat(prompt("Enter the real-world length for the drawn line (in meters):"));isNaN(realLength)||realLength<=0?alert("Invalid length. Scale not set."):(projectData.scale=pixelLength/realLength,scaleDisplay.textContent=`Scale: 1m = ${projectData.scale.toFixed(2)}px`,alert("Scale set successfully!")),setMode("draw"),clearDrawingCanvas(),redrawAllLines()}
function setMode(mode){currentMode=mode,pdfViewer.className=`${mode}-mode`}
function getLockedPoint(start,current,isShiftPressed){if(!isShiftPressed)return current;const dx=Math.abs(current.x-start.x),dy=Math.abs(current.y-start.y);return dx>dy?{x:current.x,y:start.y}:{x:start.x,y:current.y}}
drawingCanvas.addEventListener("contextmenu",e=>e.preventDefault()),drawingCanvas.addEventListener("mousedown",e=>{pdfDoc&&(2===e.button?(isPanning=!0,lastPanPoint={x:e.clientX,y:e.clientY},pdfViewer.style.cursor="grabbing"):0===e.button&&(startPoint=getCanvasCoordinates(e),isDrawing=!0))});
document.addEventListener("mouseup",e=>{if(isPanning&&2===e.button)isPanning=!1,pdfViewer.style.cursor="crosshair";else if(isDrawing&&0===e.button){isDrawing=!1;let endPoint=getCanvasCoordinates(e),lockedEndPoint=getLockedPoint(startPoint,endPoint,e.shiftKey);"calibrate"===currentMode?handleCalibration(startPoint,lockedEndPoint):"draw"===currentMode&&(activePipeRunId?projectData.scale?addSegmentToPipeRun(activePipeRunId,startPoint,lockedEndPoint):alert("Please set the scale before drawing."):alert("Please select a pipe run from the register first.")),clearDrawingCanvas(),redrawAllLines()}});
function addSegmentToPipeRun(id,start,end){const pipeRun=projectData.pipeRuns.find(pr=>pr.id===id);pipeRun&&(pipeRun.segments.push({start:start,end:end}),updatePipeRunCalculations(id))}
resizer.addEventListener("mousedown",function(e){e.preventDefault(),document.addEventListener("mousemove",resizePanel),document.addEventListener("mouseup",stopResize)});function resizePanel(e){const newWidth=e.clientX;newWidth>350&&newWidth<800&&(controlsPanel.style.width=newWidth+"px")}function stopResize(){document.removeEventListener("mousemove",resizePanel),document.removeEventListener("mouseup",stopResize)}

// --- (REPLACED) A3 PDF Export ---
function calculateBoundingBox(){let minX=1/0,minY=1/0,maxX=-1/0,maxY=-1/0,hasLines=!1;return projectData.pipeRuns.forEach(run=>{run.segments.forEach(seg=>{hasLines=!0,minX=Math.min(minX,seg.start.x,seg.end.x),minY=Math.min(minY,seg.start.y,seg.end.y),maxX=Math.max(maxX,seg.start.x,seg.end.x),maxY=Math.max(maxY,seg.start.y,seg.end.y)})}),hasLines?{x:minX-50,y:minY-50,width:maxX-minX+100,height:maxY-minY+100}:null}

exportA3PdfBtn.addEventListener('click', async () => {
    if (!pdfDoc) return alert("Please load a PDF before exporting.");
    const bbox = calculateBoundingBox();
    if (!bbox) return alert("No lines have been drawn to export.");
    const title = prompt("Please enter a title for your A3 export:", "Piping Takeoff Report");
    if (!title) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const A3_WIDTH = 420, A3_HEIGHT = 297, MARGIN = 10;
    doc.setFontSize(22);
    doc.text(title, A3_WIDTH / 2, MARGIN + 5, { align: 'center' });

    // --- FIX 1: Robust Table Generation with Readable Font ---
    const tableElement = document.getElementById('piping-register');
    const tableClone = tableElement.cloneNode(true);
    tableClone.style.position = 'absolute';
    tableClone.style.left = '-9999px';
    // Apply styles for better legibility
    tableClone.style.fontSize = '16px'; // Set a clear, absolute font size
    tableClone.style.width = 'auto'; // Let the table size itself
    tableClone.querySelectorAll('th, td').forEach(cell => {
        cell.style.padding = '8px';
        cell.style.border = '1px solid #ccc';
    });
    document.body.appendChild(tableClone);

    try {
        // Prepare table clone for rendering (remove interactive elements)
        tableClone.querySelector('thead th:last-child').remove(); // remove '+' button column
        tableClone.querySelectorAll('tbody tr').forEach(row => {
            row.querySelector('td:last-child').remove(); // remove '-' button cells
            
            const pipeRun = projectData.pipeRuns.find(pr => pr.id == row.dataset.id);
            const colorCell = row.children[0];
            colorCell.innerHTML = '';
            colorCell.style.backgroundColor = pipeRun?.color || '#ffffff';
            colorCell.style.width = '40px'; 
            
            const selectCell = row.children[1];
            selectCell.textContent = selectCell.querySelector('select').options[selectCell.querySelector('select').selectedIndex]?.text || 'N/A';
            
            const zAxisCell = row.children[4];
            zAxisCell.textContent = zAxisCell.querySelector('input').value;
        });

        const tableCanvas = await html2canvas(tableClone, { scale: 3 }); // Use higher scale for clarity
        document.body.removeChild(tableClone);

        const tableImgData = tableCanvas.toDataURL('image/png');
        const tableWidth = 180;
        const tableHeight = (tableWidth * tableCanvas.height) / tableCanvas.width;
        doc.addImage(tableImgData, 'PNG', MARGIN, MARGIN + 15, tableWidth, tableHeight);
    } catch (error) {
        console.error("Error generating table image:", error);
        alert("Could not generate the table image for the PDF. Check console for details.");
        if (document.body.contains(tableClone)) document.body.removeChild(tableClone);
        return;
    }
    
    // --- FIX 2: Correct Drawing and Line Alignment via Coordinate Correction ---
    try {
        // This MUST match the `fixedResolutionScale` in `renderPage`.
        const ON_SCREEN_RENDER_SCALE = 1.5;
        // The scale for high-res export rendering.
        const EXPORT_DPI_SCALE = 3.0;
        // The factor to convert from on-screen coordinates to export coordinates.
        const coordCorrectionFactor = EXPORT_DPI_SCALE / ON_SCREEN_RENDER_SCALE;

        const page = await pdfDoc.getPage(currentPageNum);
        const exportViewport = page.getViewport({ scale: EXPORT_DPI_SCALE });

        // 1. Render the entire PDF page to a hidden, high-res canvas
        const fullPageCanvas = document.createElement('canvas');
        fullPageCanvas.width = exportViewport.width;
        fullPageCanvas.height = exportViewport.height;
        const fullPageCtx = fullPageCanvas.getContext('2d');
        await page.render({ canvasContext: fullPageCtx, viewport: exportViewport }).promise;
        
        // 2. Define the corrected bounding box in the export scale coordinate system
        const correctedBbox = {
            x: bbox.x * coordCorrectionFactor,
            y: bbox.y * coordCorrectionFactor,
            width: bbox.width * coordCorrectionFactor,
            height: bbox.height * coordCorrectionFactor
        };

        // 3. Create the final cropped canvas and copy the relevant section
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = correctedBbox.width;
        croppedCanvas.height = correctedBbox.height;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCtx.drawImage(
            fullPageCanvas,
            correctedBbox.x, correctedBbox.y,
            correctedBbox.width, correctedBbox.height,
            0, 0,
            correctedBbox.width, correctedBbox.height
        );
        
        // 4. Draw the lines onto the cropped canvas, translating coordinates correctly
        croppedCtx.lineWidth = 5; // Good fixed line width for high-res canvas
        projectData.pipeRuns.forEach(run => {
            croppedCtx.strokeStyle = run.color;
            run.segments.forEach(seg => {
                croppedCtx.beginPath();
                // Translate original segment coordinates into the cropped canvas's local space
                const startX = (seg.start.x * coordCorrectionFactor) - correctedBbox.x;
                const startY = (seg.start.y * coordCorrectionFactor) - correctedBbox.y;
                const endX = (seg.end.x * coordCorrectionFactor) - correctedBbox.x;
                const endY = (seg.end.y * coordCorrectionFactor) - correctedBbox.y;

                croppedCtx.moveTo(startX, startY);
                croppedCtx.lineTo(endX, endY);
                croppedCtx.stroke();
            });
        });
        
        // 5. Place the final, correct image onto the PDF, fitting it to the available space
        const drawingImgData = croppedCanvas.toDataURL('image/png', 1.0);
        const drawingAreaX = 200;
        const drawingAreaY = MARGIN + 15;
        const drawingAreaWidth = A3_WIDTH - drawingAreaX - MARGIN;
        const drawingAreaHeight = A3_HEIGHT - drawingAreaY - MARGIN;
        
        const imgAspectRatio = correctedBbox.width / correctedBbox.height;
        const areaAspectRatio = drawingAreaWidth / drawingAreaHeight;
        let imgFinalWidth, imgFinalHeight;

        if (imgAspectRatio > areaAspectRatio) {
            imgFinalWidth = drawingAreaWidth;
            imgFinalHeight = drawingAreaWidth / imgAspectRatio;
        } else {
            imgFinalHeight = drawingAreaHeight;
            imgFinalWidth = drawingAreaHeight * imgAspectRatio;
        }
        
        doc.addImage(drawingImgData, 'PNG', drawingAreaX, drawingAreaY, imgFinalWidth, imgFinalHeight);
    } catch (error) {
        console.error("Error generating drawing image:", error);
        alert("Could not generate the drawing image for the PDF. Check console for details.");
    }
    
    doc.save(`${title.replace(/ /g, '_')}.pdf`);
});


// --- All other functions (Pipe DB, Register Rows, Project I/O) are unchanged ---
function openPipeDbModal(){renderPipeDb(),pipeDbModal.style.display="block"}function closePipeDbModal(){pipeDbModal.style.display="none",resetPipeForm()}
function renderPipeDb(){pipeDbList.innerHTML="",projectData.pipeTypes.forEach(pipe=>{const entryDiv=document.createElement("div");entryDiv.className="pipe-db-entry";const infoSpan=document.createElement("span");infoSpan.textContent=`${pipe.name} (ID: ${pipe.diameter}mm, Price: $${pipe.price}/m)`;const actionsDiv=document.createElement("div");actionsDiv.className="pipe-db-actions";const editBtn=document.createElement("button");editBtn.textContent="Edit",editBtn.className="edit-pipe-btn",editBtn.onclick=()=>editPipeType(pipe.id);const deleteBtn=document.createElement("button");deleteBtn.textContent="Delete",deleteBtn.className="delete-pipe-btn",deleteBtn.onclick=()=>deletePipeType(pipe.id),actionsDiv.appendChild(editBtn),actionsDiv.appendChild(deleteBtn),entryDiv.appendChild(infoSpan),entryDiv.appendChild(actionsDiv),pipeDbList.appendChild(entryDiv)})}
function handleAddOrUpdatePipe(){const name=pipeNameInput.value,diameter=parseFloat(pipeDiameterInput.value),price=parseFloat(pipePriceInput.value);if(!name||isNaN(diameter)||isNaN(price))return alert("Please fill all fields correctly.");editingPipeTypeId?(projectData.pipeTypes.find(p=>p.id===editingPipeTypeId)&&(projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).name=name,projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).diameter=diameter,projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).price=price),updateAllPipeRunCalculations()):projectData.pipeTypes.push({id:Date.now(),name:name,diameter:diameter,price:price}),renderPipeDb(),updateAllPipeTypeDropdowns(),resetPipeForm()}
function editPipeType(id){const pipe=projectData.pipeTypes.find(p=>p.id===id);pipe&&(editingPipeTypeId=id,pipeNameInput.value=pipe.name,pipeDiameterInput.value=pipe.diameter,pipePriceInput.value=pipe.price,addPipeTypeBtn.textContent="Update Pipe")}
function deletePipeType(id){if(projectData.pipeRuns.some(run=>run.pipeTypeId===id))return alert("Cannot delete this pipe type as it is currently in use by one or more pipe runs.");confirm("Are you sure you want to delete this pipe type?")&&(projectData.pipeTypes=projectData.pipeTypes.filter(p=>p.id!==id),renderPipeDb(),updateAllPipeTypeDropdowns())}
function resetPipeForm(){editingPipeTypeId=null,pipeNameInput.value="",pipeDiameterInput.value="",pipePriceInput.value="",addPipeTypeBtn.textContent="Add Pipe"}
function updateAllPipeRunCalculations(){projectData.pipeRuns.forEach(run=>updatePipeRunCalculations(run.id))}
setupPipesBtn.addEventListener("click",openPipeDbModal),closeModalBtn.addEventListener("click",closePipeDbModal),addPipeTypeBtn.addEventListener("click",handleAddOrUpdatePipe),window.addEventListener("click",e=>{e.target==pipeDbModal&&closePipeDbModal()});
function addPipeRunRow(pipeRunData=null){const newId=pipeRunData?pipeRunData.id:Date.now();if(!pipeRunData){projectData.pipeRuns.push({id:newId,color:"#ff0000",pipeTypeId:projectData.pipeTypes[0]?.id||null,lengthX:0,lengthY:0,lengthZ:0,totalLength:0,volume:0,price:0,segments:[]}),pipeRunData=projectData.pipeRuns.find(pr=>pr.id===newId)}const row=document.createElement("tr");row.dataset.id=newId,row.innerHTML=`<td><input type="color" class="color-swatch" value="${pipeRunData.color}"></td><td><select class="pipe-type-select"></select></td><td class="length-x">0.00</td><td class="length-y">0.00</td><td><input type="number" class="length-z" value="${pipeRunData.lengthZ}" min="0" step="0.1"></td><td class="total-length">0.00</td><td class="volume">0.00</td><td class="price">0.00</td><td><button class="remove-row-btn">-</button></td>`,registerBody.appendChild(row),updatePipeTypeDropdown(row.querySelector(".pipe-type-select"),pipeRunData.pipeTypeId),row.addEventListener("click",()=>setActivePipeRun(newId)),row.querySelector(".color-swatch").addEventListener("input",e=>{pipeRunData.color=e.target.value,redrawAllLines()}),row.querySelector(".pipe-type-select").addEventListener("change",e=>{pipeRunData.pipeTypeId=parseInt(e.target.value),updatePipeRunCalculations(newId)}),row.querySelector(".length-z").addEventListener("input",e=>{pipeRunData.lengthZ=parseFloat(e.target.value)||0,updatePipeRunCalculations(newId)}),row.querySelector(".remove-row-btn").addEventListener("click",e=>{e.stopPropagation(),removePipeRunRow(newId)}),updatePipeRunCalculations(newId)}
function removePipeRunRow(id){projectData.pipeRuns=projectData.pipeRuns.filter(pr=>pr.id!==id),document.querySelector(`tr[data-id='${id}']`).remove(),redrawAllLines(),activePipeRunId===id&&(activePipeRunId=null,setMode("draw"))}
function setActivePipeRun(id){activePipeRunId=id,document.querySelectorAll("#register-body tr").forEach(row=>{row.classList.toggle("active-row",row.dataset.id==id)}),setMode("draw")}
function updatePipeRunCalculations(id){const pipeRun=projectData.pipeRuns.find(pr=>pr.id===id),pipeType=projectData.pipeTypes.find(pt=>pt.id===pipeRun.pipeTypeId),row=document.querySelector(`tr[data-id='${id}']`);if(pipeRun&&row){let lengthX=0,lengthY=0,drawnLength=0;projectData.scale&&pipeRun.segments.forEach(seg=>{const dx=Math.abs(seg.end.x-seg.start.x),dy=Math.abs(seg.end.y-seg.start.y);lengthX+=dx/projectData.scale,lengthY+=dy/projectData.scale,drawnLength+=Math.sqrt(dx*dx+dy*dy)/projectData.scale}),pipeRun.lengthX=lengthX,pipeRun.lengthY=lengthY,pipeRun.totalLength=drawnLength+pipeRun.lengthZ,pipeType?(pipeRun.volume=Math.PI*(pipeType.diameter/2/1e3)*(pipeType.diameter/2/1e3)*pipeRun.totalLength*1e3,pipeRun.price=pipeRun.totalLength*pipeType.price):(pipeRun.volume=0,pipeRun.price=0),row.querySelector(".length-x").textContent=pipeRun.lengthX.toFixed(2),row.querySelector(".length-y").textContent=pipeRun.lengthY.toFixed(2),row.querySelector(".total-length").textContent=pipeRun.totalLength.toFixed(2),row.querySelector(".volume").textContent=pipeRun.volume.toFixed(2),row.querySelector(".price").textContent=pipeRun.price.toFixed(2)}}
function updatePipeTypeDropdown(selectElement,selectedId){selectElement.innerHTML="",projectData.pipeTypes.forEach(pipe=>{const option=document.createElement("option");option.value=pipe.id,option.textContent=pipe.name,selectElement.appendChild(option)}),selectedId&&(selectElement.value=selectedId)}
function updateAllPipeTypeDropdowns(){document.querySelectorAll(".pipe-type-select").forEach(select=>{const rowId=parseInt(select.closest("tr").dataset.id),pipeRun=projectData.pipeRuns.find(pr=>pr.id===rowId);updatePipeTypeDropdown(select,pipeRun.pipeTypeId)})}
addRowBtn.addEventListener("click",()=>addPipeRunRow());
exportBtn.addEventListener("click",()=>{const dataStr=JSON.stringify(projectData,null,2),blob=new Blob([dataStr],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url,a.download="piping-takeoff-project.json",a.click(),URL.revokeObjectURL(url)});
importBtn.addEventListener("click",()=>importInput.click()),importInput.addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader;reader.onload=function(event){try{const importedData=JSON.parse(event.target.result);loadProject(importedData)}catch(error){alert("Error parsing project file. It may be corrupt."),console.error(error)}},reader.readAsText(file),e.target.value=""});
function loadProject(data){registerBody.innerHTML="",projectData.pipeRuns=[],activePipeRunId=null,projectData=data,scaleDisplay.textContent=projectData.scale?`Scale: 1m = ${projectData.scale.toFixed(2)}px`:"Scale not set.",updateAllPipeTypeDropdowns(),projectData.pipeRuns.forEach(pr=>{addPipeRunRow(pr)}),pdfDoc&&(projectData.viewerState.zoom=1,projectData.viewerState.pan={x:0,y:0},renderPage(currentPageNum)),alert("Project loaded successfully!")}
function initializeApp(){setMode("draw"),addPipeRunRow(),projectData.pipeRuns.length>0&&setActivePipeRun(projectData.pipeRuns[0].id),renderPipeDb()}
initializeApp();

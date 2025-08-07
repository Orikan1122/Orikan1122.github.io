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

// --- PDF Handling & Display (BUG FIX APPLIED HERE) ---
function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(page => {
        // *** FIX: Render at a fixed high resolution (e.g., 1.5x) regardless of interactive zoom. ***
        // This prevents the "double zoom" bug.
        const fixedResolutionScale = 1.5;
        const viewport = page.getViewport({ scale: fixedResolutionScale });

        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        drawingCanvas.height = viewport.height;
        drawingCanvas.width = viewport.width;
        
        pdfViewer.style.width = `${viewport.width}px`;
        pdfViewer.style.height = `${viewport.height}px`;

        if (projectData.viewerState.pan.x === 0 && projectData.viewerState.pan.y === 0) {
            projectData.viewerState.pan.x = (viewerContainer.clientWidth - viewport.width) / 2;
            projectData.viewerState.pan.y = (viewerContainer.clientHeight - viewport.height) / 2;
        }
        updateViewerTransform();

        page.render({ canvasContext: pdfCtx, viewport: viewport }).promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            redrawAllLines();
        });
    });
    currentPageNum = num;
}

function updateViewerTransform() {
    // The interactive zoom is now ONLY controlled by this CSS transform.
    pdfViewer.style.transform = `translate(${projectData.viewerState.pan.x}px, ${projectData.viewerState.pan.y}px) scale(${projectData.viewerState.zoom})`;
}

pdfUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') return alert('Please select a PDF file.');
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            pdfName.textContent = file.name;
            currentPageNum = 1;
            projectData.viewerState = { zoom: 1, pan: { x: 0, y: 0 } };
            renderPage(currentPageNum);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

// --- Zoom Controls (BUG FIX APPLIED HERE) ---
zoomInBtn.addEventListener("click", () => {
    if (!pdfDoc) return;
    projectData.viewerState.zoom *= 1.2;
    // *** FIX: Only update the transform and redraw lines, DO NOT re-render the whole PDF. ***
    updateViewerTransform();
    redrawAllLines();
});

zoomOutBtn.addEventListener("click", () => {
    if (!pdfDoc) return;
    projectData.viewerState.zoom /= 1.2;
    // *** FIX: Only update the transform and redraw lines. ***
    updateViewerTransform();
    redrawAllLines();
});


// --- Measurement, Scaling, and Drawing (No changes below, but included for completeness) ---
calibrateBtn.addEventListener("click",()=>{pdfDoc?(setMode("calibrate"),alert("Draw a line on the PDF over a known dimension.")):alert("Please load a PDF first.")});
function handleCalibration(start,end){const pixelLength=Math.sqrt(Math.pow(end.x-start.x,2)+Math.pow(end.y-start.y,2)),realLength=parseFloat(prompt("Enter the real-world length for the drawn line (in meters):"));isNaN(realLength)||realLength<=0?alert("Invalid length. Scale not set."):(projectData.scale=pixelLength/realLength,scaleDisplay.textContent=`Scale: 1m = ${projectData.scale.toFixed(2)}px`,alert("Scale set successfully!")),setMode("draw"),clearDrawingCanvas(),redrawAllLines()}
function setMode(mode){currentMode=mode,pdfViewer.className=`${mode}-mode`}
function getCanvasCoordinates(e){const rect=pdfViewer.getBoundingClientRect();return{x:(e.clientX-rect.left)/projectData.viewerState.zoom,y:(e.clientY-rect.top)/projectData.viewerState.zoom}}
function getLockedPoint(start,current,isShiftPressed){if(!isShiftPressed)return current;const dx=Math.abs(current.x-start.x),dy=Math.abs(current.y-start.y);return dx>dy?{x:current.x,y:start.y}:{x:start.x,y:current.y}}
drawingCanvas.addEventListener("contextmenu",e=>e.preventDefault()),drawingCanvas.addEventListener("mousedown",e=>{pdfDoc&&(2===e.button?(isPanning=!0,lastPanPoint={x:e.clientX,y:e.clientY},pdfViewer.style.cursor="grabbing"):0===e.button&&(startPoint=getCanvasCoordinates(e),isDrawing=!0))}),document.addEventListener("mousemove",e=>{if(isPanning){const dx=e.clientX-lastPanPoint.x,dy=e.clientY-lastPanPoint.y;projectData.viewerState.pan.x+=dx,projectData.viewerState.pan.y+=dy,updateViewerTransform(),lastPanPoint={x:e.clientX,y:e.clientY}}else if(isDrawing){let currentPoint=getCanvasCoordinates(e),lockedPoint=getLockedPoint(startPoint,currentPoint,e.shiftKey);clearDrawingCanvas(),redrawAllLines(),drawingCtx.save(),drawingCtx.scale(projectData.viewerState.zoom,projectData.viewerState.zoom),drawingCtx.beginPath(),drawingCtx.moveTo(startPoint.x,startPoint.y),drawingCtx.lineTo(lockedPoint.x,lockedPoint.y),drawingCtx.strokeStyle="red",drawingCtx.lineWidth=2/projectData.viewerState.zoom,drawingCtx.stroke(),drawingCtx.restore()}}),document.addEventListener("mouseup",e=>{if(isPanning&&2===e.button)isPanning=!1,pdfViewer.style.cursor="crosshair";else if(isDrawing&&0===e.button){isDrawing=!1;let endPoint=getCanvasCoordinates(e),lockedEndPoint=getLockedPoint(startPoint,endPoint,e.shiftKey);"calibrate"===currentMode?handleCalibration(startPoint,lockedEndPoint):"draw"===currentMode&&(activePipeRunId?projectData.scale?addSegmentToPipeRun(activePipeRunId,startPoint,lockedEndPoint):alert("Please set the scale before drawing."):alert("Please select a pipe run from the register first.")),clearDrawingCanvas(),redrawAllLines()}});
function addSegmentToPipeRun(id,start,end){const pipeRun=projectData.pipeRuns.find(pr=>pr.id===id);pipeRun&&(pipeRun.segments.push({start:start,end:end}),updatePipeRunCalculations(id))}
function redrawAllLines(){clearDrawingCanvas(),drawingCtx.save(),drawingCtx.scale(projectData.viewerState.zoom,projectData.viewerState.zoom),projectData.pipeRuns.forEach(pipeRun=>{drawingCtx.strokeStyle=pipeRun.color,drawingCtx.lineWidth=3/projectData.viewerState.zoom,pipeRun.segments.forEach(segment=>{drawingCtx.beginPath(),drawingCtx.moveTo(segment.start.x,segment.start.y),drawingCtx.lineTo(segment.end.x,segment.end.y),drawingCtx.stroke()})}),drawingCtx.restore()}
function clearDrawingCanvas(){drawingCtx.clearRect(0,0,drawingCanvas.width,drawingCanvas.height)}
resizer.addEventListener("mousedown",function(e){e.preventDefault(),document.addEventListener("mousemove",resizePanel),document.addEventListener("mouseup",stopResize)});function resizePanel(e){const newWidth=e.clientX;newWidth>350&&newWidth<800&&(controlsPanel.style.width=newWidth+"px")}function stopResize(){document.removeEventListener("mousemove",resizePanel),document.removeEventListener("mouseup",stopResize)}
function openPipeDbModal(){renderPipeDb(),pipeDbModal.style.display="block"}function closePipeDbModal(){pipeDbModal.style.display="none",resetPipeForm()}
function renderPipeDb(){pipeDbList.innerHTML="",projectData.pipeTypes.forEach(pipe=>{const entryDiv=document.createElement("div");entryDiv.className="pipe-db-entry";const infoSpan=document.createElement("span");infoSpan.textContent=`${pipe.name} (ID: ${pipe.diameter}mm, Price: $${pipe.price}/m)`;const actionsDiv=document.createElement("div");actionsDiv.className="pipe-db-actions";const editBtn=document.createElement("button");editBtn.textContent="Edit",editBtn.className="edit-pipe-btn",editBtn.onclick=()=>editPipeType(pipe.id);const deleteBtn=document.createElement("button");deleteBtn.textContent="Delete",deleteBtn.className="delete-pipe-btn",deleteBtn.onclick=()=>deletePipeType(pipe.id),actionsDiv.appendChild(editBtn),actionsDiv.appendChild(deleteBtn),entryDiv.appendChild(infoSpan),entryDiv.appendChild(actionsDiv),pipeDbList.appendChild(entryDiv)})}
function handleAddOrUpdatePipe(){const name=pipeNameInput.value,diameter=parseFloat(pipeDiameterInput.value),price=parseFloat(pipePriceInput.value);if(!name||isNaN(diameter)||isNaN(price))return alert("Please fill all fields correctly.");editingPipeTypeId?(projectData.pipeTypes.find(p=>p.id===editingPipeTypeId)&&(projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).name=name,projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).diameter=diameter,projectData.pipeTypes.find(p=>p.id===editingPipeTypeId).price=price),updateAllPipeRunCalculations()):projectData.pipeTypes.push({id:Date.now(),name:name,diameter:diameter,price:price}),renderPipeDb(),updateAllPipeTypeDropdowns(),resetPipeForm()}
function editPipeType(id){const pipe=projectData.pipeTypes.find(p=>p.id===id);pipe&&(editingPipeTypeId=id,pipeNameInput.value=pipe.name,pipeDiameterInput.value=pipe.diameter,pipePriceInput.value=pipe.price,addPipeTypeBtn.textContent="Update Pipe")}
function deletePipeType(id){if(projectData.pipeRuns.some(run=>run.pipeTypeId===id))return alert("Cannot delete this pipe type as it is currently in use by one or more pipe runs.");confirm("Are you sure you want to delete this pipe type?")&&(projectData.pipeTypes=projectData.pipeTypes.filter(p=>p.id!==id),renderPipeDb(),updateAllPipeTypeDropdowns())}
function resetPipeForm(){editingPipeTypeId=null,pipeNameInput.value="",pipeDiameterInput.value="",pipePriceInput.value="",addPipeTypeBtn.textContent="Add Pipe"}
function updateAllPipeRunCalculations(){projectData.pipeRuns.forEach(run=>updatePipeRunCalculations(run.id))}
setupPipesBtn.addEventListener("click",openPipeDbModal),closeModalBtn.addEventListener("click",closePipeDbModal),addPipeTypeBtn.addEventListener("click",handleAddOrUpdatePipe),window.addEventListener("click",e=>{e.target==pipeDbModal&&closePipeDbModal()});
function calculateBoundingBox(){let minX=1/0,minY=1/0,maxX=-1/0,maxY=-1/0,hasLines=!1;return projectData.pipeRuns.forEach(run=>{run.segments.forEach(seg=>{hasLines=!0,minX=Math.min(minX,seg.start.x,seg.end.x),minY=Math.min(minY,seg.start.y,seg.end.y),maxX=Math.max(maxX,seg.start.x,seg.end.x),maxY=Math.max(maxY,seg.start.y,seg.end.y)})}),hasLines?{x:minX-50,y:minY-50,width:maxX-minX+100,height:maxY-minY+100}:null}
exportA3PdfBtn.addEventListener("click",async()=>{if(!pdfDoc)return alert("Please load a PDF before exporting.");const bbox=calculateBoundingBox();if(!bbox)return alert("No lines have been drawn to export.");const title=prompt("Please enter a title for your A3 export:","Piping Takeoff Report");if(!title)return;const{jsPDF:jsPDF}=window.jspdf,doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a3"}),A3_WIDTH=420,A3_HEIGHT=297,MARGIN=10;doc.setFontSize(22),doc.text(title,A3_WIDTH/2,MARGIN+5,{align:"center"});const tableElement=document.getElementById("piping-register"),elementsToRestore=[];try{tableElement.querySelectorAll("thead th:last-child, tbody td:last-child").forEach(el=>{el.classList.add("hide-for-pdf")}),tableElement.querySelectorAll("#register-body tr").forEach(row=>{const cellsToTransform=[{cell:row.children[0],type:"color"},{cell:row.children[1],type:"select"},{cell:row.children[4],type:"number"}];cellsToTransform.forEach(({cell:cell,type:type})=>{const originalHTML=cell.innerHTML;elementsToRestore.push({element:cell,originalHTML:originalHTML}),"color"===type?(cell.innerHTML="",cell.style.backgroundColor=cell.querySelector("input").value):"select"===type?cell.textContent=cell.querySelector("select").options[cell.querySelector("select").selectedIndex]?.text||"N/A":"number"===type&&(cell.textContent=cell.querySelector("input").value)})});const tableCanvas=await html2canvas(tableElement),tableImgData=tableCanvas.toDataURL("image/png"),tableWidth=180,tableHeight=180*tableCanvas.height/tableCanvas.width;doc.addImage(tableImgData,"PNG",MARGIN,MARGIN+15,tableWidth,tableHeight)}catch(error){console.error("Error generating table image:",error),alert("Could not generate the table image for the PDF.")}finally{tableElement.querySelectorAll(".hide-for-pdf").forEach(el=>el.classList.remove("hide-for-pdf")),elementsToRestore.forEach(({element:element,originalHTML:originalHTML})=>{element.innerHTML=originalHTML,element.style.backgroundColor=""})}try{const page=await pdfDoc.getPage(currentPageNum),dpi_scale=3,tempCanvas=document.createElement("canvas");tempCanvas.width=bbox.width*dpi_scale,tempCanvas.height=bbox.height*dpi_scale;const tempCtx=tempCanvas.getContext("2d");tempCtx.translate(-bbox.x*dpi_scale,-bbox.y*dpi_scale),await page.render({canvasContext:tempCtx,viewport:page.getViewport({scale:dpi_scale})}).promise,tempCtx.lineWidth=5*dpi_scale,projectData.pipeRuns.forEach(run=>{tempCtx.strokeStyle=run.color,run.segments.forEach(seg=>{tempCtx.beginPath(),tempCtx.moveTo(seg.start.x*dpi_scale,seg.start.y*dpi_scale),tempCtx.lineTo(seg.end.x*dpi_scale,seg.end.y*dpi_scale),tempCtx.stroke()})});const drawingImgData=tempCanvas.toDataURL("image/png"),drawingAreaWidth=A3_WIDTH-200-2*MARGIN,drawingAreaHeight=A3_HEIGHT-(MARGIN+15),imgAspectRatio=bbox.width/bbox.height,areaAspectRatio=drawingAreaWidth/drawingAreaHeight;let imgFinalWidth,imgFinalHeight;imgFinalWidth=imgAspectRatio>areaAspectRatio?drawingAreaWidth:drawingAreaHeight*imgAspectRatio,imgFinalHeight=imgAspectRatio>areaAspectRatio?drawingAreaWidth/imgAspectRatio:drawingAreaHeight,doc.addImage(drawingImgData,"PNG",200,MARGIN+15,imgFinalWidth,imgFinalHeight)}catch(error){console.error("Error generating drawing image:",error),alert("Could not generate the drawing image for the PDF.")}doc.save(`${title.replace(/ /g,"_")}.pdf`)});
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
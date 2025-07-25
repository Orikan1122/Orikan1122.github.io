// --- Element References ---
const imageLoader = document.getElementById('imageLoader');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const loadingMessage = document.getElementById('loadingMessage');

const colorToReplaceBox = document.getElementById('colorToReplaceBox');
const colorToReplaceHex = document.getElementById('colorToReplaceHex');

const newColorPicker = document.getElementById('newColorPicker');
const newColorHexInput = document.getElementById('newColorHex');

const toleranceSlider = document.getElementById('tolerance');
const toleranceValue = document.getElementById('toleranceValue');
const adjustToneToggle = document.getElementById('adjustToneToggle');

const applyBtn = document.getElementById('applyBtn');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

// --- State Management ---
let originalImageData = null;
let currentCanvasState = null; // Holds the current clean image data without markers
let history = []; // To store ImageData for undo functionality
let selectedColor = { r: 255, g: 255, b: 255 };

// --- Event Listeners ---
imageLoader.addEventListener('change', handleImage);
newColorPicker.addEventListener('input', (e) => newColorHexInput.value = e.target.value);
newColorHexInput.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) newColorPicker.value = e.target.value;
});
toleranceSlider.addEventListener('input', (e) => toleranceValue.textContent = e.target.value);
canvas.addEventListener('click', pickColor);
applyBtn.addEventListener('click', applyChanges);
undoBtn.addEventListener('click', undoLastChange);
resetBtn.addEventListener('click', resetToOriginal);

// --- Core Functions ---

function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            currentCanvasState = originalImageData; // Set the initial clean state
            history = []; // Clear history for new image
            updateButtonStates();
            loadingMessage.style.display = 'none';
            canvas.style.display = 'block';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    loadingMessage.style.display = 'block';
    canvas.style.display = 'none';
}

function pickColor(e) {
    if (!currentCanvasState) return;

    // First, restore the clean canvas state to erase any previous marker
    ctx.putImageData(currentCanvasState, 0, 0);

    // Get the element's bounding rectangle
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scale between the displayed size and the actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Accurately map the click coordinates to the canvas coordinates
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    
    selectedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    colorToReplaceBox.style.backgroundColor = hex;
    colorToReplaceHex.textContent = hex;

    // Draw a new marker at the clicked position
    drawMarker(x, y);
}

function drawMarker(x, y) {
    // Draw a white circle for contrast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw a black circle on top
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.stroke();
}

function applyChanges() {
    if (!originalImageData) return alert("Please load an image first.");

    // IMPORTANT: Use the clean 'currentCanvasState' for processing, not the visible canvas
    history.push(currentCanvasState);
    
    const newImageData = ctx.createImageData(canvas.width, canvas.height);
    newImageData.data.set(new Uint8ClampedArray(currentCanvasState.data));

    if (adjustToneToggle.checked) {
        applyToneAdjustment(newImageData);
    } else {
        applySelectiveColorChange(newImageData);
    }

    ctx.putImageData(newImageData, 0, 0);
    currentCanvasState = newImageData; // Update the clean state with the new changes
    updateButtonStates();
}

function applySelectiveColorChange(imageData) {
    const data = imageData.data;
    const newColor = hexToRgb(newColorHexInput.value);
    const tolerance = parseInt(toleranceSlider.value);
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
            Math.pow(r - selectedColor.r, 2) +
            Math.pow(g - selectedColor.g, 2) +
            Math.pow(b - selectedColor.b, 2)
        );

        if (distance <= tolerance) {
            data[i] = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
        }
    }
}

function applyToneAdjustment(imageData) {
    const data = imageData.data;
    const fromHSL = rgbToHsl(selectedColor.r, selectedColor.g, selectedColor.b);
    const toColorRGB = hexToRgb(newColorHexInput.value);
    const toHSL = rgbToHsl(toColorRGB.r, toColorRGB.g, toColorRGB.b);

    const hueShift = toHSL.h - fromHSL.h;
    const satShift = toHSL.s - fromHSL.s;
    const lightShift = toHSL.l - fromHSL.l;

    for (let i = 0; i < data.length; i += 4) {
        const currentHSL = rgbToHsl(data[i], data[i + 1], data[i + 2]);

        currentHSL.h += hueShift;
        currentHSL.s += satShift;
        currentHSL.l += lightShift;

        if (currentHSL.h > 1) currentHSL.h -= 1;
        if (currentHSL.h < 0) currentHSL.h += 1;

        currentHSL.s = Math.max(0, Math.min(1, currentHSL.s));
        currentHSL.l = Math.max(0, Math.min(1, currentHSL.l));

        const newRGB = hslToRgb(currentHSL.h, currentHSL.s, currentHSL.l);

        data[i] = newRGB.r;
        data[i + 1] = newRGB.g;
        data[i + 2] = newRGB.b;
    }
}


// --- History & UI Management ---

function undoLastChange() {
    if (history.length > 0) {
        const lastState = history.pop();
        ctx.putImageData(lastState, 0, 0);
        currentCanvasState = lastState; // Revert to the previous clean state
        updateButtonStates();
    }
}

function resetToOriginal() {
    if (originalImageData) {
        history = [];
        ctx.putImageData(originalImageData, 0, 0);
        currentCanvasState = originalImageData; // Reset to the original clean state
        updateButtonStates();
    }
}

function updateButtonStates() {
    const hasImage = !!originalImageData;
    const hasHistory = history.length > 0;

    undoBtn.disabled = !hasHistory;
    resetBtn.disabled = !hasHistory;
    applyBtn.disabled = !hasImage;

    if (hasImage) {
        downloadBtn.classList.remove('disabled');
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = 'edited-image.jpeg';
        }, 'image/jpeg', 0.95);
    } else {
        downloadBtn.classList.add('disabled');
        downloadBtn.href = "#";
    }
}

// --- Color Conversion Helpers ---

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// --- Initial State ---
updateButtonStates();
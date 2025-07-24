const fs = require('fs');
const path = require('path');

// --- Define the base paths ---
const projectRoot = __dirname;
const subDirPath = path.join('productivity', 'Guideline Tool');

// --- Define the source and distribution paths ---
const srcDir = path.join(projectRoot, 'src', subDirPath);
const distDir = path.join(projectRoot, 'dist');
const distSubDir = path.join(distDir, subDirPath);
const assetsSrcDir = path.join(srcDir, 'assets');
const assetsDistDir = path.join(distSubDir, 'assets');

// --- ADDED FOR DEBUGGING: Log all constructed paths ---
console.log('--- Debugging Paths ---');
console.log(`Project Root: ${projectRoot}`);
console.log(`Source Directory for Assets: ${assetsSrcDir}`);
console.log(`Distribution Directory: ${distSubDir}`);
console.log('-------------------------');

// 1. Create distribution directories
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
fs.mkdirSync(distSubDir, { recursive: true });
fs.mkdirSync(assetsDistDir, { recursive: true });

console.log('Starting build process...');

// --- ADDED FOR DEBUGGING: Check if the assets source directory exists ---
if (!fs.existsSync(assetsSrcDir)) {
    console.error(`❌ CRITICAL ERROR: The source assets directory does not exist at path: ${assetsSrcDir}`);
    // Exit the script early if the folder isn't found
    process.exit(1);
}

// 2. Read the asset files from the source directory
const assetFiles = fs.readdirSync(assetsSrcDir);
// --- ADDED FOR DEBUGGING: Log the files that were found ---
console.log(`Files found in assets directory: [${assetFiles.join(', ')}]`);
if (assetFiles.length === 0) {
    console.warn('⚠️ WARNING: No image files were found in the assets directory. The brand assets section will be empty.');
}

// 3. Generate HTML for each asset
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
const assetsHtml = assetFiles
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => {
        // ... (rest of the mapping function is the same)
        const fileName = path.basename(file, path.extname(file));
        const friendlyName = fileName.replace(/-/g, ' ');
        return `
            <div class="asset-item">
                <img src="assets/${file}" alt="${friendlyName}">
                <p>${file}</p>
                <div class="asset-buttons">
                    <a href="assets/${file}" download="CCHBC-${fileName}${path.extname(file)}" class="btn">Download</a>
                    <button class="btn copy-btn" data-src="assets/${file}">Copy</button>
                </div>
            </div>
        `;
    })
    .join('');
console.log(`Generated HTML for ${assetFiles.filter(f => imageExtensions.includes(path.extname(f).toLowerCase())).length} images.`);

// 4. Read the template and inject the HTML
const templatePath = path.join(srcDir, 'index.html');
const templateContent = fs.readFileSync(templatePath, 'utf8');
const finalHtml = templateContent.replace('<!-- ASSETS_PLACEHOLDER -->', assetsHtml);
fs.writeFileSync(path.join(distSubDir, 'index.html'), finalHtml);
console.log(`Generated final index.html in ${distSubDir}`);

// 5. Copy other necessary files
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distSubDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(distSubDir, 'script.js'));
assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsDistDir, file));
});
console.log(`Copied all necessary files to ${distSubDir}`);
console.log('✅ Build complete!');

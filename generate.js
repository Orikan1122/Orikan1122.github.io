const fs = require('fs');
const path = require('path');

// --- Define the base paths ---
const projectRoot = __dirname;
const subDirPath = path.join('productivity', 'Guideline Tool');

const srcDir = path.join(projectRoot, subDirPath); 
const distDir = path.join(projectRoot, 'dist');
const distSubDir = path.join(distDir, subDirPath);

const assetsSrcDir = path.join(srcDir, 'assets');
const assetsDistDir = path.join(distSubDir, 'assets');

// 1. Create distribution directories
console.log('--- Build Setup ---');
console.log(`Source Directory: ${srcDir}`);
console.log(`Assets Source Directory: ${assetsSrcDir}`);
fs.mkdirSync(distSubDir, { recursive: true });
fs.mkdirSync(assetsDistDir, { recursive: true });
console.log('Distribution directories created.');

// 2. Read and process asset files
const assetFiles = fs.readdirSync(assetsSrcDir);
console.log(`Found ${assetFiles.length} total files in assets directory: [${assetFiles.join(', ')}]`);

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
let assetsHtml = '';
let processedImageCount = 0;

assetFiles.forEach(file => {
    if (imageExtensions.includes(path.extname(file).toLowerCase())) {
        processedImageCount++;
        const fileName = path.basename(file, path.extname(file));
        const friendlyName = fileName.replace(/-/g, ' ');
        
        // THIS IS THE MOST CRUCIAL LOG
        console.log(`Processing image #${processedImageCount}: ${file}`);

        assetsHtml += `
            <div class="asset-item">
                <img src="assets/${file}" alt="${friendlyName}">
                <p>${file}</p>
                <div class="asset-buttons">
                    <a href="assets/${file}" download="CCHBC-${fileName}${path.extname(file)}" class="btn">Download</a>
                    <button class="btn copy-btn" data-src="assets/${file}">Copy</button>
                </div>
            </div>
        `;
    }
});

console.log(`Generated HTML for ${processedImageCount} images.`);

// 3. Inject assets into HTML template
const templatePath = path.join(srcDir, 'index.html');
const templateContent = fs.readFileSync(templatePath, 'utf8');

// Another crucial log
if (!templateContent.includes('<!-- ASSETS_PLACEHOLDER -->')) {
    console.error("CRITICAL ERROR: The placeholder '<!-- ASSETS_PLACEHOLDER -->' was NOT FOUND in index.html!");
    process.exit(1); // Exit with an error code
}

const finalHtml = templateContent.replace('<!-- ASSETS_PLACEHOLDER -->', assetsHtml);
fs.writeFileSync(path.join(distSubDir, 'index.html'), finalHtml);
console.log('Generated final index.html.');

// 4. Copy all necessary files
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distSubDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(distSubDir, 'script.js'));
assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsDistDir, file));
});
console.log('Copied all necessary files.');
console.log('✅ Build complete!');

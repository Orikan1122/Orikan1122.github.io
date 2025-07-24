const fs = require('fs');
const path = require('path');

// --- Define the base paths ---
const projectRoot = __dirname;
const subDirPath = path.join('productivity', 'Guideline Tool'); // This path is correct based on your screenshot

// --- Define the source and distribution paths ---
// CORRECTED: Removed 'src' from this line
const srcDir = path.join(projectRoot, subDirPath); 
const distDir = path.join(projectRoot, 'dist');
const distSubDir = path.join(distDir, subDirPath);

const assetsSrcDir = path.join(srcDir, 'assets');
const assetsDistDir = path.join(distSubDir, 'assets');

// 1. Create distribution directories
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
fs.mkdirSync(distSubDir, { recursive: true });
fs.mkdirSync(assetsDistDir, { recursive: true });

console.log(`Starting build process for directory: ${srcDir}`);

// 2. Read and process asset files
const assetFiles = fs.readdirSync(assetsSrcDir);
console.log(`Found ${assetFiles.length} files in assets directory.`);

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
const assetsHtml = assetFiles
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => {
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

// 3. Inject assets into HTML template
const templatePath = path.join(srcDir, 'index.html');
const templateContent = fs.readFileSync(templatePath, 'utf8');
const finalHtml = templateContent.replace('<!-- ASSETS_PLACEHOLDER -->', assetsHtml);
fs.writeFileSync(path.join(distSubDir, 'index.html'), finalHtml);
console.log(`Generated final index.html.`);

// 4. Copy all necessary files
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distSubDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(distSubDir, 'script.js'));
assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsDistDir, file));
});
console.log(`Copied all necessary files.`);
console.log('✅ Build complete!');

const fs = require('fs');
const path = require('path');

// --- Define the base paths ---
const projectRoot = __dirname;
// NEW: Define the subdirectory path
const subDirPath = path.join('productivity', 'Guideline Tool');

// --- Define the source and distribution paths using the subdirectory ---
const srcDir = path.join(projectRoot, 'src', subDirPath);
const distDir = path.join(projectRoot, 'dist'); // The dist folder itself is still at the root
const distSubDir = path.join(distDir, subDirPath); // The path where files will be placed INSIDE dist

const assetsSrcDir = path.join(srcDir, 'assets');
const assetsDistDir = path.join(distSubDir, 'assets');

// 1. Ensure the distribution directories exist and are clean
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
if (fs.existsSync(distSubDir)) {
    fs.rmSync(distSubDir, { recursive: true, force: true });
}
// Create the full nested path: dist/productivity/Guideline Tool
fs.mkdirSync(distSubDir, { recursive: true });
fs.mkdirSync(assetsDistDir, { recursive: true });

console.log(`Starting build for subdirectory: ${subDirPath}`);

// 2. Generate the HTML for each asset
const assetFiles = fs.readdirSync(assetsSrcDir);
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
const assetsHtml = assetFiles
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => {
        const fileName = path.basename(file, path.extname(file));
        const friendlyName = fileName.replace(/-/g, ' ');
        // The paths inside the HTML are relative, so they don't need to change!
        // "assets/file.jpg" will correctly point to a sibling "assets" folder.
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
console.log(`Found and processed ${assetFiles.length} assets.`);

// 3. Read the HTML template and inject the generated assets
const templatePath = path.join(srcDir, 'index.html');
const templateContent = fs.readFileSync(templatePath, 'utf8');
const finalHtml = templateContent.replace('<!-- ASSETS_PLACEHOLDER -->', assetsHtml);
fs.writeFileSync(path.join(distSubDir, 'index.html'), finalHtml);
console.log(`Generated final index.html in ${distSubDir}`);

// 4. Copy other necessary files (CSS, JS, and all assets)
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distSubDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(distSubDir, 'script.js'));
assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsDistDir, file));
});
console.log(`Copied all necessary files to ${distSubDir}`);
console.log('✅ Build complete!');

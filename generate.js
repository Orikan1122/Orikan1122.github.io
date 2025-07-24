const fs = require('fs');
const path = require('path');

// --- Define the base paths ---
const projectRoot = __dirname;
const subDirPath = path.join('productivity', 'Guideline Tool');

// --- Define the source and output paths ---
const srcDir = path.join(projectRoot, subDirPath); 
const outputDir = path.join(projectRoot, '_site'); // CHANGED FROM 'dist' TO '_site'
const outputSubDir = path.join(outputDir, subDirPath);

const assetsSrcDir = path.join(srcDir, 'assets');
const assetsOutputDir = path.join(outputSubDir, 'assets');

// 1. Create output directories
console.log('--- Build Setup ---');
console.log(`Source Directory: ${srcDir}`);
console.log(`Output Directory: ${outputDir}`);
fs.mkdirSync(outputSubDir, { recursive: true });
fs.mkdirSync(assetsOutputDir, { recursive: true });
console.log('Output directories created.');

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
fs.writeFileSync(path.join(outputSubDir, 'index.html'), finalHtml);
console.log('Generated final index.html.');

// 4. Copy all necessary files
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(outputSubDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(outputSubDir, 'script.js'));
assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsOutputDir, file));
});
console.log('Copied all necessary files.');
console.log('✅ Build complete!');

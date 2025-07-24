const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const assetsSrcDir = path.join(srcDir, 'assets');
const assetsDistDir = path.join(distDir, 'assets');

// 1. Ensure the distribution directory exists and is clean
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);
fs.mkdirSync(assetsDistDir);

console.log('Starting build process...');

// 2. Generate the HTML for each asset
const assetFiles = fs.readdirSync(assetsSrcDir);
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
console.log(`Found and processed ${assetFiles.length} assets.`);

// 3. Read the HTML template and inject the generated assets
const templatePath = path.join(srcDir, 'index.html');
const templateContent = fs.readFileSync(templatePath, 'utf8');
const finalHtml = templateContent.replace('<!-- ASSETS_PLACEHOLDER -->', assetsHtml);
fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml);
console.log('Generated final index.html.');

// 4. Copy other necessary files (CSS, JS, and all assets)
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));
fs.copyFileSync(path.join(srcDir, 'script.js'), path.join(distDir, 'script.js'));

assetFiles.forEach(file => {
    fs.copyFileSync(path.join(assetsSrcDir, file), path.join(assetsDistDir, file));
});
console.log('Copied all necessary files to dist folder.');
console.log('✅ Build complete!');

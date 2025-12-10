const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];

async function generateIcons() {
    for (const size of sizes) {
        const svgPath = path.join(__dirname, `icon${size}.svg`);
        const pngPath = path.join(__dirname, `icon${size}.png`);
        
        if (fs.existsSync(svgPath)) {
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(pngPath);
            console.log(`✅ Generated icon${size}.png`);
        } else {
            console.log(`⚠️ SVG not found: ${svgPath}`);
        }
    }
    console.log('\n🎯 All icons generated! Ready for Chrome Web Store.');
}

generateIcons().catch(console.error);

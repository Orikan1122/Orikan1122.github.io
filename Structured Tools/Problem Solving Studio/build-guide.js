// Bettet Anleitung_KI_Report.md als guide.js ein, damit die App auch ohne Server (file://) läuft.
// Aufruf nach jeder Änderung an der Anleitung:  node build-guide.js
const fs = require('fs');
const path = require('path');
const md = fs.readFileSync(path.join(__dirname, 'Anleitung_KI_Report.md'), 'utf8');
fs.writeFileSync(
    path.join(__dirname, 'guide.js'),
    '/* Automatisch erzeugt aus Anleitung_KI_Report.md (node build-guide.js) */\n' +
    'window.PS = window.PS || {};\nPS.GUIDE_MD = ' + JSON.stringify(md) + ';\n'
);
console.log('guide.js geschrieben (' + md.length + ' Zeichen)');

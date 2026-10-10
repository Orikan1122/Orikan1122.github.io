// Google Apps Script für das Spesen-Tool
// 1. Auf script.google.com ein neues Projekt anlegen und diesen Code einfügen.
// 2. TOKEN auf ein eigenes, geheimes Passwort setzen.
// 3. Bereitstellen > Neue Bereitstellung > Typ "Web-App"
//    Ausführen als: Ich | Zugriff: Jeder
// 4. Die Web-App-URL und das Token im Spesen-Tool eintragen.

const TOKEN = 'HIER_EIN_GEHEIMES_PASSWORT';
const FOLDER_NAME = 'Spesen';
const FILE_NAME = 'spesen_backup.json';

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function getFile_() {
  const folder = getFolder_();
  const it = folder.getFilesByName(FILE_NAME);
  return it.hasNext() ? it.next() : folder.createFile(FILE_NAME, '[]', 'application/json');
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return out_({ ok: false, error: 'Token falsch' });
    if (!Array.isArray(body.items)) return out_({ ok: false, error: 'Ungültige Daten' });
    getFile_().setContent(JSON.stringify(body.items));
    return out_({ ok: true, count: body.items.length });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  if (!e.parameter || e.parameter.token !== TOKEN) return out_({ ok: false, error: 'Token falsch' });
  return out_({ ok: true, items: JSON.parse(getFile_().getBlob().getDataAsString() || '[]') });
}

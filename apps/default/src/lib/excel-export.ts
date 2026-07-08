import type { SpreadsheetData, SheetData } from '../types';

// Generate a minimal XLSX file using raw XML (Office Open XML format)
// This avoids needing the xlsx library and produces a fully compatible Excel file

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWorksheet(sheet: SheetData, sheetIndex: number): string {
  const allRows = [sheet.columns, ...sheet.rows];
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>`;

  allRows.forEach((row, rIdx) => {
    xml += `\n    <row r="${rIdx + 1}">`;
    row.forEach((cell, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const cellRef = `${colLetter}${rIdx + 1}`;
      const isHeader = rIdx === 0;
      const cellValue = escapeXml(String(cell ?? ''));
      xml += `\n      <c r="${cellRef}" t="inlineStr"${isHeader ? ` s="1"` : ''}>`;
      xml += `<is><t>${cellValue}</t></is></c>`;
    });
    xml += `\n    </row>`;
  });

  xml += `\n  </sheetData>
</worksheet>`;
  return xml;
}

function buildWorkbook(data: SpreadsheetData): string {
  let sheetsXml = '';
  data.sheets.forEach((sheet, i) => {
    sheetsXml += `\n  <sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}
  </sheets>
</workbook>`;
}

function buildWorkbookRels(data: SpreadsheetData): string {
  let rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  data.sheets.forEach((_, i) => {
    rels += `\n  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
  });
  rels += `\n</Relationships>`;
  return rels;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts>
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills>
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4F6BCC"/></patternFill></fill>
  </fills>
  <borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
  </cellXfs>
</styleSheet>`;

// Simple ZIP builder (store method, no compression)
function uint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function dosDate(d: Date): number {
  return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
}

function dosTime(d: Date): number {
  return (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
}

function crc32(data: Uint8Array): number {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32LE(val: number, buf: Uint8Array, off: number): void {
  buf[off] = val & 0xff; buf[off+1] = (val>>8) & 0xff;
  buf[off+2] = (val>>16) & 0xff; buf[off+3] = (val>>24) & 0xff;
}

function writeUint16LE(val: number, buf: Uint8Array, off: number): void {
  buf[off] = val & 0xff; buf[off+1] = (val>>8) & 0xff;
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const now = new Date();
  const dt = dosDate(now);
  const tm = dosTime(now);
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = uint8(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + nameBytes.length + file.data.length);
    writeUint32LE(0x04034b50, local, 0); // local file header sig
    writeUint16LE(20, local, 4); // version needed
    writeUint16LE(0, local, 6); // flags
    writeUint16LE(0, local, 8); // compression: stored
    writeUint16LE(tm, local, 10);
    writeUint16LE(dt, local, 12);
    writeUint32LE(crc, local, 14);
    writeUint32LE(file.data.length, local, 18);
    writeUint32LE(file.data.length, local, 22);
    writeUint16LE(nameBytes.length, local, 26);
    writeUint16LE(0, local, 28);
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32LE(0x02014b50, central, 0); // central dir sig
    writeUint16LE(20, central, 4); // version made by
    writeUint16LE(20, central, 6); // version needed
    writeUint16LE(0, central, 8); // flags
    writeUint16LE(0, central, 10); // compression
    writeUint16LE(tm, central, 12);
    writeUint16LE(dt, central, 14);
    writeUint32LE(crc, central, 16);
    writeUint32LE(file.data.length, central, 20);
    writeUint32LE(file.data.length, central, 24);
    writeUint16LE(nameBytes.length, central, 28);
    writeUint16LE(0, central, 30);
    writeUint16LE(0, central, 32);
    writeUint16LE(0, central, 34);
    writeUint16LE(0, central, 36);
    writeUint32LE(0, central, 38);
    writeUint32LE(offset, central, 42);
    central.set(nameBytes, 46);

    localHeaders.push(local);
    centralDirs.push(central);
    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = centralDirs.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  writeUint32LE(0x06054b50, eocd, 0);
  writeUint16LE(0, eocd, 4);
  writeUint16LE(0, eocd, 6);
  writeUint16LE(files.length, eocd, 8);
  writeUint16LE(files.length, eocd, 10);
  writeUint32LE(centralSize, eocd, 12);
  writeUint32LE(centralOffset, eocd, 16);
  writeUint16LE(0, eocd, 20);

  const all = [...localHeaders, ...centralDirs, eocd];
  const total = all.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of all) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}

export function exportToCsv(data: SpreadsheetData): void {
  const filename = (data.title || 'spreadsheet').replace(/[^a-z0-9\-_\s]/gi, '').trim().replace(/\s+/g, '_');

  if (data.sheets.length === 1) {
    // Single sheet → one CSV file
    const sheet = data.sheets[0];
    const rows = [sheet.columns, ...sheet.rows];
    const csv = rows.map(row =>
      row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    // Multiple sheets → zip of CSVs
    const files: Array<{ name: string; data: Uint8Array }> = data.sheets.map(sheet => {
      const rows = [sheet.columns, ...sheet.rows];
      const csv = rows.map(row =>
        row.map(cell => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      ).join('\r\n');
      const safeName = sheet.name.replace(/[^a-z0-9\-_\s]/gi, '').trim().replace(/\s+/g, '_');
      return { name: `${safeName}.csv`, data: uint8(csv) };
    });
    const zipData = buildZip(files);
    const blob = new Blob([zipData], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}_csv.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function exportToXlsx(data: SpreadsheetData): void {
  const files: Array<{ name: string; data: Uint8Array }> = [];

  // [Content_Types].xml
  let ctXml = CONTENT_TYPES_XML;
  data.sheets.forEach((_, i) => {
    ctXml += `  <Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n`;
  });
  ctXml += `  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n</Types>`;
  files.push({ name: '[Content_Types].xml', data: uint8(ctXml) });

  // _rels/.rels
  files.push({ name: '_rels/.rels', data: uint8(ROOT_RELS_XML) });

  // xl/workbook.xml
  files.push({ name: 'xl/workbook.xml', data: uint8(buildWorkbook(data)) });

  // xl/_rels/workbook.xml.rels
  let wbRels = buildWorkbookRels(data);
  const styleRelId = `rId${data.sheets.length + 1}`;
  wbRels = wbRels.replace('</Relationships>', `  <Relationship Id="${styleRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n</Relationships>`);
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: uint8(wbRels) });

  // xl/styles.xml
  files.push({ name: 'xl/styles.xml', data: uint8(STYLES_XML) });

  // xl/worksheets/sheetN.xml
  data.sheets.forEach((sheet, i) => {
    files.push({ name: `xl/worksheets/sheet${i+1}.xml`, data: uint8(buildWorksheet(sheet, i)) });
  });

  const zipData = buildZip(files);
  const blob = new Blob([zipData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = (data.title || 'spreadsheet').replace(/[^a-z0-9\-_\s]/gi, '').trim().replace(/\s+/g, '_') + '.xlsx';
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

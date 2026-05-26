const Papa = require('papaparse');
const XLSX = require('xlsx');

function parseCSV(buffer, filename) {
  const text = buffer.toString('utf8');
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });

  const columns = (result.meta.fields || []).map((field) => {
    const values = result.data.map((row) => row[field]);
    const nullCount = values.filter((v) => v === null || v === '' || v === undefined).length;
    return {
      name: field,
      type: 'text',
      nullable: true,
      null_percent: values.length
        ? parseFloat(((nullCount / values.length) * 100).toFixed(1))
        : 0,
    };
  });

  const tableName = filename.replace(/\.[^.]+$/, '');
  return [{
    name: tableName,
    row_count: result.data.length,
    duplicate_count: 0,
    last_modified: new Date().toISOString(),
    notes: '',
    columns,
    sample_rows: result.data.slice(0, 10),
  }];
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const tables = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (rows.length === 0) continue;

    const fields = Object.keys(rows[0]);
    const columns = fields.map((field) => {
      const values = rows.map((r) => r[field]);
      const nullCount = values.filter((v) => v === null || v === '').length;
      return {
        name: field,
        type: 'text',
        nullable: true,
        null_percent: parseFloat(((nullCount / values.length) * 100).toFixed(1)),
      };
    });

    tables.push({
      name: sheetName,
      row_count: rows.length,
      duplicate_count: 0,
      last_modified: new Date().toISOString(),
      notes: '',
      columns,
      sample_rows: rows.slice(0, 10),
    });
  }
  return tables;
}

module.exports = { parseCSV, parseExcel };

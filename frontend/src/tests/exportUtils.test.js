import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pure utility functions extracted for testing — mirrors logic in SqlQueryRunner and RelationshipMap

function exportCsvContent(fields, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [fields.join(','), ...rows.map(row => fields.map(f => escape(row[f])).join(','))];
  return lines.join('\n');
}

function buildMermaid(tables, relationships) {
  const typeMap = { text: 'string', number: 'int', boolean: 'boolean' };
  const lines = ['erDiagram'];
  for (const t of tables) {
    const display = t.name.includes('__') ? t.name.split('__').slice(1).join('__') : t.name;
    lines.push(`  ${display} {`);
    for (const c of (t.columns || [])) {
      const mType = typeMap[(c.type || '').toLowerCase()] || 'string';
      lines.push(`    ${mType} ${c.name.replace(/\W/g, '_')}${c.nullable ? '' : ' PK'}`);
    }
    lines.push('  }');
  }
  for (const r of relationships) {
    const from = r.from_table.includes('__') ? r.from_table.split('__').slice(1).join('__') : r.from_table;
    const to = r.to_table.includes('__') ? r.to_table.split('__').slice(1).join('__') : r.to_table;
    lines.push(`  ${from} ||--o{ ${to} : "${r.from_column}"`);
  }
  return lines.join('\n');
}

function buildDDL(tables) {
  const typeMap = { text: 'TEXT', number: 'NUMERIC', boolean: 'BOOLEAN', integer: 'INTEGER' };
  return tables.map(t => {
    const display = t.name.includes('__') ? t.name.split('__').slice(1).join('__') : t.name;
    const cols = (t.columns || []).map(c => {
      const sqlType = typeMap[(c.type || '').toLowerCase()] || 'TEXT';
      return `  ${c.name} ${sqlType}${c.nullable ? '' : ' NOT NULL'}`;
    }).join(',\n');
    return `CREATE TABLE ${display} (\n${cols}\n);`;
  }).join('\n\n');
}

describe('exportCsvContent', () => {
  it('generates valid CSV with a header row', () => {
    const output = exportCsvContent(['id', 'name'], [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
    const lines = output.split('\n');
    expect(lines[0]).toBe('id,name');
    expect(lines[1]).toBe('1,Alice');
    expect(lines[2]).toBe('2,Bob');
  });

  it('escapes values containing commas', () => {
    const output = exportCsvContent(['val'], [{ val: 'hello, world' }]);
    expect(output).toContain('"hello, world"');
  });

  it('escapes values containing double quotes', () => {
    const output = exportCsvContent(['val'], [{ val: 'say "hi"' }]);
    expect(output).toContain('"say ""hi"""');
  });

  it('renders NULL as empty string', () => {
    const output = exportCsvContent(['a'], [{ a: null }]);
    const lines = output.split('\n');
    expect(lines[1]).toBe('');
  });

  it('handles an empty row set', () => {
    const output = exportCsvContent(['id'], []);
    expect(output).toBe('id');
  });
});

describe('buildMermaid', () => {
  const tables = [
    { name: 'orders', columns: [{ name: 'id', type: 'integer', nullable: false }, { name: 'amount', type: 'number', nullable: true }] },
    { name: 'customers', columns: [{ name: 'id', type: 'integer', nullable: false }] },
  ];
  const relationships = [{ from_table: 'orders', from_column: 'customer_id', to_table: 'customers', to_column: 'id' }];

  it('starts with erDiagram keyword', () => {
    const mmd = buildMermaid(tables, []);
    expect(mmd.startsWith('erDiagram')).toBe(true);
  });

  it('includes all table names', () => {
    const mmd = buildMermaid(tables, []);
    expect(mmd).toContain('orders {');
    expect(mmd).toContain('customers {');
  });

  it('renders relationship edges', () => {
    const mmd = buildMermaid(tables, relationships);
    expect(mmd).toContain('orders ||--o{ customers');
  });

  it('strips __ prefix from multi-source table names', () => {
    const t = [{ name: 'source1__users', columns: [] }];
    const mmd = buildMermaid(t, []);
    expect(mmd).toContain('users {');
    expect(mmd).not.toContain('source1__users');
  });
});

describe('buildDDL', () => {
  const tables = [
    { name: 'orders', columns: [{ name: 'id', type: 'integer', nullable: false }, { name: 'note', type: 'text', nullable: true }] },
  ];

  it('outputs CREATE TABLE statement', () => {
    const ddl = buildDDL(tables);
    expect(ddl).toContain('CREATE TABLE orders');
  });

  it('marks NOT NULL columns correctly', () => {
    const ddl = buildDDL(tables);
    expect(ddl).toContain('id INTEGER NOT NULL');
    expect(ddl).not.toContain('note TEXT NOT NULL');
  });

  it('handles multiple tables separated by blank lines', () => {
    const multi = [
      { name: 'a', columns: [{ name: 'x', type: 'text', nullable: true }] },
      { name: 'b', columns: [{ name: 'y', type: 'integer', nullable: false }] },
    ];
    const ddl = buildDDL(multi);
    expect(ddl).toContain('CREATE TABLE a');
    expect(ddl).toContain('CREATE TABLE b');
  });
});

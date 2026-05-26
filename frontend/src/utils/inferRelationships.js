export function inferRelationships(tables) {
  const tableIndex = {};
  for (const t of tables) {
    const base = t._isPrimary === false
      ? t.name.split('__').slice(1).join('__')
      : t.name;
    tableIndex[base.toLowerCase()] = { tableName: t.name, base };
  }

  const suggested = [];
  const seen = new Set();

  for (const table of tables) {
    const fromBase = table._isPrimary === false
      ? table.name.split('__').slice(1).join('__')
      : table.name;

    for (const col of (table.columns || [])) {
      const colLower = col.name.toLowerCase();

      for (const [targetLower, target] of Object.entries(tableIndex)) {
        if (target.tableName === table.name) continue;

        const isMatch =
          colLower === `${targetLower}_id` ||
          colLower === `${targetLower}id` ||
          colLower === `fk_${targetLower}` ||
          colLower === `${targetLower}_fk` ||
          colLower === `${targetLower}_key`;

        if (isMatch) {
          const key = `${table.name}.${col.name}->${target.tableName}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggested.push({
              from_table: table.name,
              from_column: col.name,
              to_table: target.tableName,
              to_column: 'id',
            });
          }
        }
      }
    }
  }

  return suggested;
}

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

const snapshots = {
  salesCSV: {
    source: { type: 'csv', name: 'Q1_2026_Sales.csv', exported_at: '2026-04-01T08:00:00Z' },
    tables: [
      {
        name: 'Q1_2026_Sales',
        row_count: 5840,
        duplicate_count: 37,
        notes: '37 duplicate rows detected — likely double-entry on March 31',
        columns: [
          { name: 'row_id',     type: 'text',    nullable: false, null_percent: 0 },
          { name: 'region',     type: 'text',    nullable: false, null_percent: 0 },
          { name: 'rep_name',   type: 'text',    nullable: true,  null_percent: 2.1 },
          { name: 'product',    type: 'text',    nullable: false, null_percent: 0 },
          { name: 'units_sold', type: 'text',    nullable: false, null_percent: 0 },
          { name: 'revenue',    type: 'text',    nullable: false, null_percent: 0 },
          { name: 'sale_date',  type: 'text',    nullable: false, null_percent: 0 },
          { name: 'channel',    type: 'text',    nullable: true,  null_percent: 8.7 },
        ],
        sample_rows: [
          { row_id: '1', region: 'Northeast', rep_name: 'Jordan Wells', product: 'Pro Plan',   units_sold: '3',  revenue: '897.00',  sale_date: '2026-01-04', channel: 'inbound' },
          { row_id: '2', region: 'Southeast', rep_name: 'Maria Santos', product: 'Starter',    units_sold: '10', revenue: '990.00',  sale_date: '2026-01-05', channel: 'outbound' },
          { row_id: '3', region: 'West',      rep_name: null,           product: 'Enterprise', units_sold: '1',  revenue: '4800.00', sale_date: '2026-01-07', channel: null },
          { row_id: '4', region: 'Midwest',   rep_name: 'Dana Park',    product: 'Pro Plan',   units_sold: '7',  revenue: '2093.00', sale_date: '2026-01-10', channel: 'inbound' },
        ],
      },
    ],
    relationships: [],
  },

  customersJSON: {
    source: { type: 'json', name: 'customers_export.json', exported_at: '2026-04-15T14:00:00Z' },
    tables: [
      {
        name: 'customers_export',
        row_count: 1240,
        duplicate_count: 0,
        notes: '',
        columns: [
          { name: 'id',         type: 'number',  nullable: false, null_percent: 0 },
          { name: 'name',       type: 'string',  nullable: false, null_percent: 0 },
          { name: 'email',      type: 'string',  nullable: false, null_percent: 0 },
          { name: 'plan',       type: 'string',  nullable: false, null_percent: 0 },
          { name: 'mrr',        type: 'number',  nullable: true,  null_percent: 4.2 },
          { name: 'signup_date',type: 'string',  nullable: false, null_percent: 0 },
          { name: 'churned',    type: 'boolean', nullable: false, null_percent: 0 },
        ],
        sample_rows: [
          { id: 1, name: 'Acme Corp',      email: 'billing@acme.com',    plan: 'Enterprise', mrr: 2400, signup_date: '2024-03-01', churned: false },
          { id: 2, name: 'Bright Ideas',   email: 'ops@brightideas.io',  plan: 'Pro',        mrr: 299,  signup_date: '2024-07-15', churned: false },
          { id: 3, name: 'Old Client LLC', email: 'info@oldclient.com',  plan: 'Starter',    mrr: null, signup_date: '2023-01-10', churned: true },
          { id: 4, name: 'TechFlow',       email: 'admin@techflow.dev',  plan: 'Pro',        mrr: 299,  signup_date: '2025-02-20', churned: false },
        ],
      },
    ],
    relationships: [],
  },

  surveyCSV: {
    source: { type: 'csv', name: 'employee_survey_2026.csv', exported_at: '2026-03-28T09:00:00Z' },
    tables: [
      {
        name: 'employee_survey_2026',
        row_count: 312,
        duplicate_count: 0,
        notes: '',
        columns: [
          { name: 'response_id',    type: 'text', nullable: false, null_percent: 0 },
          { name: 'department',     type: 'text', nullable: false, null_percent: 0 },
          { name: 'tenure_years',   type: 'text', nullable: false, null_percent: 0 },
          { name: 'satisfaction',   type: 'text', nullable: false, null_percent: 0 },
          { name: 'nps_score',      type: 'text', nullable: true,  null_percent: 6.1 },
          { name: 'would_refer',    type: 'text', nullable: false, null_percent: 0 },
          { name: 'free_response',  type: 'text', nullable: true,  null_percent: 41.3 },
        ],
        sample_rows: [
          { response_id: 'R001', department: 'Engineering', tenure_years: '3', satisfaction: '4', nps_score: '9',  would_refer: 'yes', free_response: 'Great team culture.' },
          { response_id: 'R002', department: 'Sales',       tenure_years: '1', satisfaction: '3', nps_score: '6',  would_refer: 'no',  free_response: null },
          { response_id: 'R003', department: 'Design',      tenure_years: '5', satisfaction: '5', nps_score: null, would_refer: 'yes', free_response: 'Best job I have had.' },
          { response_id: 'R004', department: 'Engineering', tenure_years: '2', satisfaction: '4', nps_score: '8',  would_refer: 'yes', free_response: null },
        ],
      },
    ],
    relationships: [],
  },
};

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const { rows: [user] } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Dev User', 'dev@datalens.test', passwordHash]
  );
  const userId = user.id;

  const snapshotDefs = [
    { name: 'Q1 2026 Sales',          source_type: 'csv',  data: snapshots.salesCSV },
    { name: 'Customer Export — Apr',   source_type: 'json', data: snapshots.customersJSON },
    { name: 'Employee Survey 2026',    source_type: 'csv',  data: snapshots.surveyCSV },
  ];

  const savedIds = [];
  for (const s of snapshotDefs) {
    const dataHash = hash(s.data);
    const { rows: [row] } = await pool.query(
      `INSERT INTO snapshots (user_id, name, source_type, snapshot_data, hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, name) DO UPDATE
         SET snapshot_data = EXCLUDED.snapshot_data,
             hash          = EXCLUDED.hash,
             updated_at    = NOW()
       RETURNING id`,
      [userId, s.name, s.source_type, JSON.stringify(s.data), dataHash]
    );
    savedIds.push(row.id);
  }

  for (const snapshotId of savedIds) {
    await pool.query(
      `INSERT INTO audit_log (user_id, snapshot_id, action) VALUES ($1, $2, $3)`,
      [userId, snapshotId, 'connected']
    );
  }

  console.log('\nSeed complete.');
  console.log('  Email:    dev@datalens.test');
  console.log('  Password: password123');
  console.log('  Snapshots: Q1 2026 Sales (CSV), Customer Export (JSON), Employee Survey (CSV)\n');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

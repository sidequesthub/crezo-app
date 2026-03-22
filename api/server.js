/**
 * Crezo API — Express server for PostgreSQL
 * Deploy to Vercel (serverless) or run standalone (e.g. Raspberry Pi)
 *
 * Set DATABASE_URL for your PostgreSQL connection (Raspberry Pi or cloud)
 */

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Health check
app.get('/api/health', (_, res) => {
  res.json({ ok: true, db: !!pool });
});

// Creators
app.get('/api/creators/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM creators WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Content slots
app.get('/api/creators/:creatorId/content-slots', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM content_slots WHERE creator_id = $1 ORDER BY scheduled_date',
      [req.params.creatorId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deals
app.get('/api/creators/:creatorId/deals', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      `SELECT d.*, b.name as brand_name, b.contact_person, b.whatsapp
       FROM deals d
       JOIN brands b ON d.brand_id = b.id
       WHERE d.creator_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.creatorId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Invoices
app.get('/api/creators/:creatorId/invoices', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      `SELECT i.*, d.title as deal_title
       FROM invoices i
       JOIN deals d ON i.deal_id = d.id
       WHERE i.creator_id = $1
       ORDER BY i.created_at DESC`,
      [req.params.creatorId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Crezo API running on http://localhost:${port}`);
  if (!pool) console.warn('DATABASE_URL not set — using mock data');
});

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'dashboard.db')

let db

function getDb() {
  if (!db) {
    // Zajistíme, že složka existuje
    const fs = require('fs')
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initDb(db)
  }
  return db
}

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      month TEXT NOT NULL,
      ad_spend REAL DEFAULT 0,
      visitors INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      orders INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      bump1 INTEGER DEFAULT 0,
      bump2 INTEGER DEFAULT 0,
      vip INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(campaign_id, week_start),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      roas REAL DEFAULT 5.0,
      revenue REAL DEFAULT 400000,
      orders INTEGER DEFAULT 80
    );
  `)

  // Výchozí cíle
  db.prepare(`INSERT OR IGNORE INTO targets (id, roas, revenue, orders) VALUES ('default', 5.0, 400000, 80)`).run()
}

export function getCampaigns() {
  return getDb().prepare('SELECT * FROM campaigns').all()
}

export function upsertCampaign(id, name) {
  return getDb().prepare('INSERT OR REPLACE INTO campaigns (id, name) VALUES (?, ?)').run(id, name)
}

export function getWeeklyData(campaignId) {
  return getDb().prepare(`
    SELECT * FROM weekly_data
    WHERE campaign_id = ?
    ORDER BY week_start ASC
  `).all(campaignId)
}

export function getAllWeeklyData() {
  return getDb().prepare(`
    SELECT wd.*, c.name as campaign_name
    FROM weekly_data wd
    JOIN campaigns c ON c.id = wd.campaign_id
    ORDER BY wd.campaign_id, wd.week_start ASC
  `).all()
}

export function upsertWeeklyData(data) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO weekly_data
    (campaign_id, week_start, week_end, month, ad_spend, visitors, leads, orders, revenue, bump1, bump2, vip)
    VALUES (@campaign_id, @week_start, @week_end, @month, @ad_spend, @visitors, @leads, @orders, @revenue, @bump1, @bump2, @vip)
  `)
  return stmt.run(data)
}

export function getTargets() {
  return getDb().prepare('SELECT * FROM targets WHERE id = ?').get('default')
}

export function updateTargets(targets) {
  return getDb().prepare('UPDATE targets SET roas = ?, revenue = ?, orders = ? WHERE id = ?')
    .run(targets.roas, targets.revenue, targets.orders, 'default')
}

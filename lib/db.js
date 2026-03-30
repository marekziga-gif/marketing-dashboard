import { sql } from '@vercel/postgres'

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS processed_invoices (
      invoice_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      PRIMARY KEY (invoice_id, campaign_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_data (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(campaign_id, week_start)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      roas REAL DEFAULT 5.0,
      revenue REAL DEFAULT 400000,
      orders INTEGER DEFAULT 80
    )
  `
  await sql`INSERT INTO targets (id, roas, revenue, orders) VALUES ('default', 5.0, 400000, 80) ON CONFLICT (id) DO NOTHING`
}

export async function getCampaigns() {
  const { rows } = await sql`SELECT * FROM campaigns`
  return rows
}

export async function upsertCampaign(id, name) {
  await sql`INSERT INTO campaigns (id, name) VALUES (${id}, ${name}) ON CONFLICT (id) DO UPDATE SET name = ${name}`
}

export async function getAllWeeklyData() {
  const { rows } = await sql`
    SELECT wd.*, c.name as campaign_name
    FROM weekly_data wd
    JOIN campaigns c ON c.id = wd.campaign_id
    ORDER BY wd.campaign_id, wd.week_start ASC
  `
  return rows
}

export async function upsertWeeklyData(data) {
  await sql`
    INSERT INTO weekly_data (campaign_id, week_start, week_end, month, ad_spend, visitors, leads, orders, revenue, bump1, bump2, vip)
    VALUES (${data.campaign_id}, ${data.week_start}, ${data.week_end}, ${data.month}, ${data.ad_spend}, ${data.visitors}, ${data.leads}, ${data.orders}, ${data.revenue}, ${data.bump1}, ${data.bump2}, ${data.vip})
    ON CONFLICT (campaign_id, week_start) DO UPDATE SET
      week_end = ${data.week_end}, month = ${data.month}, ad_spend = ${data.ad_spend},
      visitors = ${data.visitors}, leads = ${data.leads}, orders = ${data.orders},
      revenue = ${data.revenue}, bump1 = ${data.bump1}, bump2 = ${data.bump2}, vip = ${data.vip}
  `
}

export async function getTargets() {
  const { rows } = await sql`SELECT * FROM targets WHERE id = 'default'`
  return rows[0]
}

export async function addInvoiceToWeek(campaignId, weekStart, invoiceTotal) {
  const result = await sql`
    UPDATE weekly_data
    SET orders = orders + 1, revenue = revenue + ${invoiceTotal}
    WHERE campaign_id = ${campaignId} AND week_start = ${weekStart}
  `
  return result.rowCount
}

export async function isInvoiceProcessed(invoiceId, campaignId) {
  const { rows } = await sql`
    SELECT 1 FROM processed_invoices WHERE invoice_id = ${invoiceId} AND campaign_id = ${campaignId}
  `
  return rows.length > 0
}

export async function markInvoiceProcessed(invoiceId, campaignId, weekStart) {
  await sql`
    INSERT INTO processed_invoices (invoice_id, campaign_id, week_start)
    VALUES (${invoiceId}, ${campaignId}, ${weekStart})
    ON CONFLICT DO NOTHING
  `
}

export async function resetProcessedInvoices(campaignId) {
  await sql`DELETE FROM processed_invoices WHERE campaign_id = ${campaignId}`
}

export async function updateTargets(targets) {
  await sql`UPDATE targets SET roas = ${targets.roas}, revenue = ${targets.revenue}, orders = ${targets.orders} WHERE id = 'default'`
}

export async function resetCampaignFapi(campaignId) {
  await sql`UPDATE weekly_data SET orders = 0, revenue = 0, bump1 = 0, bump2 = 0, vip = 0 WHERE campaign_id = ${campaignId}`
}

// Upsert pouze Meta Ads data - nezmění orders/revenue/bumpy
export async function upsertMetaAdsData(data) {
  await sql`
    INSERT INTO weekly_data (campaign_id, week_start, week_end, month, ad_spend, visitors, leads, orders, revenue, bump1, bump2, vip)
    VALUES (${data.campaign_id}, ${data.week_start}, ${data.week_end}, ${data.month}, ${data.ad_spend}, ${data.visitors}, ${data.leads}, 0, 0, 0, 0, 0)
    ON CONFLICT (campaign_id, week_start) DO UPDATE SET
      week_end = ${data.week_end},
      month = ${data.month},
      ad_spend = ${data.ad_spend},
      visitors = ${data.visitors},
      leads = ${data.leads}
  `
}

export async function deleteWeek(campaignId, weekStart) {
  await sql`DELETE FROM weekly_data WHERE campaign_id = ${campaignId} AND week_start = ${weekStart}`
}

export async function deleteCampaign(campaignId) {
  await sql`DELETE FROM weekly_data WHERE campaign_id = ${campaignId}`
  await sql`DELETE FROM campaigns WHERE id = ${campaignId}`
}

'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Area, Legend, ReferenceLine
} from 'recharts'

const GOLD = '#ffcc00'
const GREEN = '#3d9403'
const RED = '#ef4444'
const CARD = '#0c1525'
const CARD_GLOW = '0 0 30px rgba(255,204,0,0.04), inset 0 1px 0 rgba(255,204,0,0.06)'
const BORDER = 'rgba(255,204,0,0.10)'
const TEXT_DIM = '#ffffff'

// Cíle / targety
const TARGETS = {
  roas: 5.0,
  revenue: 400000,
  orders: 80,
}

const allData = {
  'mistr-nabidek': {
    name: 'Mistr nabídek',
    weeks: [
      { week: '1.1. - 7.1.', month: 'Leden', adSpend: 10200, visitors: 2800, leads: 240, orders: 14, revenue: 69300, bump1: 4, bump2: 2, vip: 1 },
      { week: '8.1. - 14.1.', month: 'Leden', adSpend: 11500, visitors: 3000, leads: 260, orders: 16, revenue: 79200, bump1: 5, bump2: 3, vip: 2 },
      { week: '15.1. - 21.1.', month: 'Leden', adSpend: 12800, visitors: 3300, leads: 290, orders: 19, revenue: 94050, bump1: 6, bump2: 3, vip: 2 },
      { week: '22.1. - 28.1.', month: 'Leden', adSpend: 13200, visitors: 3500, leads: 310, orders: 20, revenue: 99000, bump1: 7, bump2: 4, vip: 3 },
      { week: '1.2. - 7.2.', month: 'Únor', adSpend: 12450, visitors: 3200, leads: 280, orders: 18, revenue: 89100, bump1: 5, bump2: 3, vip: 2 },
      { week: '8.2. - 14.2.', month: 'Únor', adSpend: 15200, visitors: 4100, leads: 350, orders: 24, revenue: 118800, bump1: 8, bump2: 4, vip: 3 },
      { week: '15.2. - 21.2.', month: 'Únor', adSpend: 13800, visitors: 3600, leads: 310, orders: 21, revenue: 103950, bump1: 6, bump2: 5, vip: 2 },
      { week: '22.2. - 28.2.', month: 'Únor', adSpend: 16100, visitors: 4500, leads: 400, orders: 28, revenue: 138600, bump1: 9, bump2: 6, vip: 4 },
    ]
  },
  'webinar-johny': {
    name: 'Johnyho webinář',
    weeks: [
      { week: '1.1. - 7.1.', month: 'Leden', adSpend: 6500, visitors: 1700, leads: 150, orders: 9, revenue: 44550, bump1: 2, bump2: 1, vip: 1 },
      { week: '8.1. - 14.1.', month: 'Leden', adSpend: 7200, visitors: 1900, leads: 170, orders: 11, revenue: 54450, bump1: 3, bump2: 2, vip: 1 },
      { week: '15.1. - 21.1.', month: 'Leden', adSpend: 7800, visitors: 2000, leads: 180, orders: 12, revenue: 59400, bump1: 3, bump2: 2, vip: 1 },
      { week: '22.1. - 28.1.', month: 'Leden', adSpend: 8100, visitors: 2200, leads: 200, orders: 13, revenue: 64350, bump1: 4, bump2: 2, vip: 2 },
      { week: '1.2. - 7.2.', month: 'Únor', adSpend: 8200, visitors: 2100, leads: 190, orders: 12, revenue: 59400, bump1: 3, bump2: 2, vip: 1 },
      { week: '8.2. - 14.2.', month: 'Únor', adSpend: 9800, visitors: 2600, leads: 230, orders: 15, revenue: 74250, bump1: 4, bump2: 2, vip: 2 },
      { week: '15.2. - 21.2.', month: 'Únor', adSpend: 8900, visitors: 2300, leads: 210, orders: 14, revenue: 69300, bump1: 4, bump2: 3, vip: 1 },
      { week: '22.2. - 28.2.', month: 'Únor', adSpend: 11200, visitors: 3000, leads: 270, orders: 19, revenue: 94050, bump1: 6, bump2: 4, vip: 3 },
    ]
  }
}

const ALL_MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

function enrich(data) {
  return data.map(d => ({
    ...d,
    aov: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
    cpa: d.orders > 0 ? Math.round(d.adSpend / d.orders) : 0,
    profit: d.revenue - d.adSpend,
    roas: d.adSpend > 0 ? parseFloat((d.revenue / d.adSpend).toFixed(1)) : 0,
    leadConv: d.visitors > 0 ? parseFloat(((d.leads / d.visitors) * 100).toFixed(1)) : 0,
    orderConv: d.leads > 0 ? parseFloat(((d.orders / d.leads) * 100).toFixed(1)) : 0,
  }))
}

function sumRows(rows) {
  const s = rows.reduce((acc, d) => {
    Object.keys(d).forEach(k => { if (typeof d[k] === 'number') acc[k] = (acc[k] || 0) + d[k] })
    return acc
  }, {})
  s.aov = s.orders > 0 ? Math.round(s.revenue / s.orders) : 0
  s.cpa = s.orders > 0 ? Math.round(s.adSpend / s.orders) : 0
  s.profit = s.revenue - s.adSpend
  s.roas = s.adSpend > 0 ? parseFloat((s.revenue / s.adSpend).toFixed(1)) : 0
  s.leadConv = s.visitors > 0 ? parseFloat(((s.leads / s.visitors) * 100).toFixed(1)) : 0
  s.orderConv = s.leads > 0 ? parseFloat(((s.orders / s.leads) * 100).toFixed(1)) : 0
  return s
}

function fmt(v) { return new Intl.NumberFormat('cs-CZ').format(v) }
function fmtCZK(v) { return `${fmt(v)} Kč` }

function groupByMonth(weeks) {
  const map = {}
  weeks.forEach(w => {
    if (!map[w.month]) map[w.month] = []
    map[w.month].push(w)
  })
  return Object.entries(map).map(([month, rows]) => ({ label: month, ...sumRows(rows) }))
}

// Heatmapa - vrací barvu pozadí podle toho jak je hodnota dobrá/špatná
function heatColor(value, allValues, higherIsBetter = true) {
  if (allValues.length < 2) return 'transparent'
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  if (max === min) return 'transparent'
  const ratio = (value - min) / (max - min)
  const normalized = higherIsBetter ? ratio : 1 - ratio
  if (normalized >= 0.75) return 'rgba(61,148,3,0.18)'
  if (normalized >= 0.5) return 'rgba(61,148,3,0.08)'
  if (normalized <= 0.25) return 'rgba(239,68,68,0.12)'
  return 'transparent'
}

const cardStyle = { background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: CARD_GLOW }

function Trend({ current, previous }) {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / previous * 100).toFixed(0)
  const up = current >= previous
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: up ? GREEN : RED, marginLeft: 8 }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

function TargetBar({ label, current, target, unit }) {
  const pct = Math.min((current / target) * 100, 100)
  const met = current >= target
  return (
    <div style={{ ...cardStyle, padding: '18px 24px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: met ? GREEN : TEXT_DIM }}>{unit === 'x' ? `${current}x / ${target}x` : `${fmt(current)} / ${fmt(target)} ${unit}`}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: met ? GREEN : GOLD, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ textAlign: 'right', marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: met ? GREEN : GOLD }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function KPICard({ label, value, highlight, trend }) {
  return (
    <div style={{ ...cardStyle, padding: '22px 24px', flex: '1 1 0', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: highlight || '#fff', lineHeight: 1.2 }}>
        {value}
        {trend}
      </div>
    </div>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? GOLD : 'transparent', color: active ? '#000' : TEXT_DIM,
      fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
    }}>
      {label}
    </button>
  )
}

function ExportButton({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, cursor: 'pointer',
      background: 'transparent', color: TEXT_DIM, fontWeight: 600, fontSize: 12, fontFamily: 'Inter',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.target.style.borderColor = GOLD; e.target.style.color = GOLD }}
    onMouseLeave={e => { e.target.style.borderColor = BORDER; e.target.style.color = TEXT_DIM }}
    >
      {label}
    </button>
  )
}

export default function Dashboard() {
  const [activeCampaign, setActiveCampaign] = useState('mistr-nabidek')
  const [view, setView] = useState('weekly')
  const [selectedMonth, setSelectedMonth] = useState('Vše')
  const [tab, setTab] = useState('detail')
  const [liveData, setLiveData] = useState(null)
  const [liveTargets, setLiveTargets] = useState(null)
  const dashRef = useRef(null)

  // Načtení dat z API
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => {
        if (data.campaigns && Object.keys(data.campaigns).length > 0) {
          // Sloučit live data s ukázkovými - live data mají přednost
          const merged = { ...allData }
          Object.entries(data.campaigns).forEach(([key, val]) => {
            if (val.weeks && val.weeks.length > 0) {
              merged[key] = val
            }
          })
          setLiveData(merged)
          if (data.targets) setLiveTargets(data.targets)
        }
      })
      .catch(() => {})
  }, [])

  const currentData = liveData || allData
  const currentTargets = liveTargets || TARGETS
  const campaign = currentData[activeCampaign] || allData[activeCampaign]

  // Dynamicky zjistit měsíce z dat
  const months = useMemo(() => {
    if (!campaign?.weeks) return ALL_MONTHS.slice(0, 2)
    const found = [...new Set(campaign.weeks.map(w => w.month))]
    return ALL_MONTHS.filter(m => found.includes(m))
  }, [campaign])

  const filteredWeeks = useMemo(() =>
    enrich((campaign?.weeks || []).filter(w => selectedMonth === 'Vše' || w.month === selectedMonth)),
    [activeCampaign, selectedMonth, campaign]
  )

  const monthlyData = useMemo(() => groupByMonth(campaign?.weeks || []), [activeCampaign, campaign])

  const displayData = view === 'weekly'
    ? filteredWeeks.map(d => ({ ...d, label: d.week }))
    : monthlyData

  const totals = sumRows(view === 'weekly' ? filteredWeeks : (campaign?.weeks || []))

  // Dynamický trend - aktuální vs předchozí měsíc
  const prevMonth = useMemo(() => {
    if (selectedMonth === 'Vše' || months.length < 2) return null
    const idx = ALL_MONTHS.indexOf(selectedMonth)
    const prev = ALL_MONTHS[idx - 1]
    return months.includes(prev) ? prev : null
  }, [selectedMonth, months])
  const prevTotals = prevMonth ? sumRows(enrich((campaign?.weeks || []).filter(w => w.month === prevMonth))) : null

  // Heatmapa hodnoty
  const heatValues = useMemo(() => ({
    revenue: displayData.map(d => d.revenue),
    profit: displayData.map(d => d.profit),
    roas: displayData.map(d => d.roas),
    orders: displayData.map(d => d.orders),
    leads: displayData.map(d => d.leads),
    cpa: displayData.map(d => d.cpa),
  }), [displayData])

  const comparisonData = useMemo(() => {
    return months.map(m => {
      const row = { label: m }
      Object.entries(allData).forEach(([key, c]) => {
        const s = sumRows(c.weeks.filter(w => w.month === m))
        row[`${key}_adSpend`] = s.adSpend
        row[`${key}_revenue`] = s.revenue
        row[`${key}_profit`] = s.profit
        row[`${key}_roas`] = s.roas
        row[`${key}_orders`] = s.orders
      })
      return row
    })
  }, [])

  const tooltipStyle = {
    contentStyle: { background: '#1a1a1a', border: `1px solid rgba(255,204,0,0.15)`, borderRadius: 10, color: '#f0f0f0', fontFamily: 'Inter', fontSize: 13 },
    labelStyle: { color: TEXT_DIM },
    cursor: { fill: 'rgba(255,204,0,0.05)' },
  }

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Týden', 'Útrata za reklamu', 'Návštěvníci', 'Nové kontakty', 'Objednávky', 'Tržby', 'Bump 1', 'Bump 2', 'VIP', 'Průměrná objednávka', 'Cena za objednávku', 'Čistý zisk', 'Návratnost']
    const rows = displayData.map(d => [d.label, d.adSpend, d.visitors, d.leads, d.orders, d.revenue, d.bump1, d.bump2, d.vip, d.aov, d.cpa, d.profit, d.roas])
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign.name.replace(/\s/g, '_')}_report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [displayData, campaign.name])

  // Export PDF
  const exportPDF = useCallback(async () => {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')
    const el = dashRef.current
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: '#060d18', scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('l', 'mm', 'a4')
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, w, h)
    pdf.save(`${campaign.name.replace(/\s/g, '_')}_report.pdf`)
  }, [campaign.name])

  const showTrend = prevTotals && view === 'weekly' && selectedMonth !== 'Vše'

  return (
    <div ref={dashRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.5px' }}>
            Front-end funnels <span style={{ color: GOLD }}>DA</span>
          </h1>
          <p style={{ margin: '6px 0 0', color: TEXT_DIM, fontSize: 13 }}>Aktualizace každé pondělí</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportButton label="Stáhnout CSV" onClick={exportCSV} />
          <ExportButton label="Stáhnout PDF" onClick={exportPDF} />
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 6, ...cardStyle, borderRadius: 12, padding: 4 }}>
          <Pill label="Mistr nabídek" active={activeCampaign === 'mistr-nabidek' && tab === 'detail'} onClick={() => { setActiveCampaign('mistr-nabidek'); setTab('detail') }} />
          <Pill label="Johnyho webinář" active={activeCampaign === 'webinar-johny' && tab === 'detail'} onClick={() => { setActiveCampaign('webinar-johny'); setTab('detail') }} />
          <div style={{ width: 1, background: BORDER, margin: '4px 2px' }} />
          <Pill label="Srovnání" active={tab === 'compare'} onClick={() => setTab('compare')} />
        </div>

        {tab === 'detail' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, ...cardStyle, borderRadius: 10, padding: 3 }}>
              <Pill label="Týdny" active={view === 'weekly'} onClick={() => setView('weekly')} />
              <Pill label="Měsíce" active={view === 'monthly'} onClick={() => setView('monthly')} />
            </div>
            {view === 'weekly' && (
              <div style={{ display: 'flex', gap: 4, ...cardStyle, borderRadius: 10, padding: 3, marginLeft: 8 }}>
                {months.map(m => (
                  <Pill key={m} label={m} active={selectedMonth === m} onClick={() => setSelectedMonth(m)} />
                ))}
                <Pill label="Vše" active={selectedMonth === 'Vše'} onClick={() => setSelectedMonth('Vše')} />
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'detail' ? (
        <>
          {/* KPI Row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <KPICard label="Útrata za reklamu" value={fmtCZK(totals.adSpend)} trend={showTrend ? <Trend current={totals.adSpend} previous={prevTotals.adSpend} /> : null} />
            <KPICard label="Nové kontakty" value={fmt(totals.leads)} trend={showTrend ? <Trend current={totals.leads} previous={prevTotals.leads} /> : null} />
            <KPICard label="Objednávky" value={fmt(totals.orders)} highlight={GOLD} trend={showTrend ? <Trend current={totals.orders} previous={prevTotals.orders} /> : null} />
            <KPICard label="Tržby" value={fmtCZK(totals.revenue)} highlight={GREEN} trend={showTrend ? <Trend current={totals.revenue} previous={prevTotals.revenue} /> : null} />
            <KPICard label="Čistý zisk" value={fmtCZK(totals.profit)} highlight={totals.profit > 0 ? GREEN : RED} trend={showTrend ? <Trend current={totals.profit} previous={prevTotals.profit} /> : null} />
            <KPICard label="Návratnost" value={`${totals.roas}x`} highlight={totals.roas >= 3 ? GREEN : GOLD} trend={showTrend ? <Trend current={totals.roas} previous={prevTotals.roas} /> : null} />
          </div>

          {/* Cíle / Targety */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <TargetBar label="Cíl tržby" current={totals.revenue} target={TARGETS.revenue} unit="Kč" />
            <TargetBar label="Cíl objednávky" current={totals.orders} target={TARGETS.orders} unit="ks" />
            <TargetBar label="Cíl návratnost" current={totals.roas} target={TARGETS.roas} unit="x" />
          </div>

          {/* Konverzní poměry */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <div style={{ ...cardStyle, padding: '18px 24px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Návštěvník → Kontakt</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Montserrat', color: GOLD }}>{totals.leadConv}%</div>
            </div>
            <div style={{ ...cardStyle, padding: '18px 24px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Kontakt → Objednávka</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Montserrat', color: GOLD }}>{totals.orderConv}%</div>
            </div>
            <div style={{ ...cardStyle, padding: '18px 24px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Cena za kontakt</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Montserrat', color: '#fff' }}>{fmtCZK(totals.leads > 0 ? Math.round(totals.adSpend / totals.leads) : 0)}</div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Tržby vs Útrata za reklamu</h3>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={v => fmtCZK(v)} />
                  <Area type="monotone" dataKey="revenue" name="Tržby" fill={GREEN} fillOpacity={0.08} stroke={GREEN} strokeWidth={2} />
                  <Bar dataKey="adSpend" name="Útrata" fill={GOLD} fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Návratnost & Čistý zisk</h3>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${v}x`} />
                  <Tooltip {...tooltipStyle} formatter={(v, name) => name === 'Návratnost' ? `${v}x` : fmtCZK(v)} />
                  <ReferenceLine yAxisId="right" y={TARGETS.roas} stroke={GOLD} strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: `Cíl ${TARGETS.roas}x`, fill: GOLD, fontSize: 11, opacity: 0.6 }} />
                  <Bar yAxisId="left" dataKey="profit" name="Čistý zisk" fill={GREEN} fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="roas" name="Návratnost" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD, r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table s heatmapou */}
          <div style={{ ...cardStyle, padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>
                Detailní přehled &mdash; {campaign.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: TEXT_DIM }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(61,148,3,0.18)', display: 'inline-block' }} /> Nejlepší</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239,68,68,0.12)', display: 'inline-block' }} /> Nejslabší</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {[view === 'weekly' ? 'Týden' : 'Měsíc', 'Útrata', 'Návšt.', 'Kontakty', 'Obj.', 'Tržby', 'B1', 'B2', 'VIP', 'Prům. obj.', 'Cena/obj.', 'Zisk', 'Návratn.'].map((h, i) => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: i === 0 ? 'left' : 'right',
                        color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                        letterSpacing: '0.5px', borderBottom: `2px solid ${BORDER}`, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,204,0,0.05)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 500 }}>{d.label}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>{fmtCZK(d.adSpend)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>{fmt(d.visitors)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', background: heatColor(d.leads, heatValues.leads) }}>{d.leads}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: GOLD, background: heatColor(d.orders, heatValues.orders) }}>{d.orders}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: GREEN, background: heatColor(d.revenue, heatValues.revenue) }}>{fmtCZK(d.revenue)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: TEXT_DIM }}>{d.bump1}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: TEXT_DIM }}>{d.bump2}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: TEXT_DIM }}>{d.vip}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>{fmtCZK(d.aov)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', background: heatColor(d.cpa, heatValues.cpa, false) }}>{fmtCZK(d.cpa)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: d.profit > 0 ? GREEN : RED, background: heatColor(d.profit, heatValues.profit) }}>{fmtCZK(d.profit)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: d.roas >= 3 ? GREEN : GOLD, background: heatColor(d.roas, heatValues.roas) }}>{d.roas}x</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${BORDER}` }}>
                    <td style={{ padding: '14px', fontWeight: 800, fontFamily: 'Montserrat', color: GOLD }}>CELKEM</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{fmtCZK(totals.adSpend)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{fmt(totals.visitors)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{fmt(totals.leads)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: GOLD }}>{totals.orders}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmtCZK(totals.revenue)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{displayData.reduce((s, d) => s + d.bump1, 0)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{displayData.reduce((s, d) => s + d.bump2, 0)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{displayData.reduce((s, d) => s + d.vip, 0)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{fmtCZK(totals.aov)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{fmtCZK(totals.cpa)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmtCZK(totals.profit)}</td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: GREEN }}>{totals.roas}x</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Srovnání kampaní */
        <>
          <div style={{ ...cardStyle, padding: '28px 32px', marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 24px', fontSize: 17, fontWeight: 700, fontFamily: 'Montserrat' }}>Investice vs Výnosy</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparisonData} barGap={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 13 }} />
                <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={v => fmtCZK(v)} />
                <Legend />
                <Bar dataKey="mistr-nabidek_adSpend" name="Mistr nabídek — Útrata" fill="#cc9900" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="mistr-nabidek_revenue" name="Mistr nabídek — Tržby" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar dataKey="webinar-johny_adSpend" name="Johnyho webinář — Útrata" fill="#166534" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="webinar-johny_revenue" name="Johnyho webinář — Tržby" fill={GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Tržby po měsících</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 12 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={v => fmtCZK(v)} />
                  <Legend />
                  <Bar dataKey="mistr-nabidek_revenue" name="Mistr nabídek" fill={GOLD} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="webinar-johny_revenue" name="Johnyho webinář" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Čistý zisk po měsících</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 12 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={v => fmtCZK(v)} />
                  <Legend />
                  <Bar dataKey="mistr-nabidek_profit" name="Mistr nabídek" fill={GOLD} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="webinar-johny_profit" name="Johnyho webinář" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Návratnost po měsících</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 12 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `${v}x`} />
                  <Tooltip {...tooltipStyle} formatter={v => `${v}x`} />
                  <Legend />
                  <Bar dataKey="mistr-nabidek_roas" name="Mistr nabídek" fill={GOLD} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="webinar-johny_roas" name="Johnyho webinář" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...cardStyle, padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat' }}>Objednávky po měsících</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,204,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 12 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="mistr-nabidek_orders" name="Mistr nabídek" fill={GOLD} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="webinar-johny_orders" name="Johnyho webinář" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', opacity: 0.6 }}>
        {['Meta Ads', 'MailerLite', 'FAPI'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_DIM }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

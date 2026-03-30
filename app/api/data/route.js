import { NextResponse } from 'next/server'
import { getCampaigns, getAllWeeklyData, getTargets, upsertCampaign, upsertWeeklyData, updateTargets, addInvoiceToWeek, resetCampaignFapi, upsertMetaAdsData, deleteWeek, initDb } from '../../../lib/db'

const MONTH_MAP = {
  'January': 'Leden', 'February': 'Únor', 'March': 'Březen', 'April': 'Duben',
  'May': 'Květen', 'June': 'Červen', 'July': 'Červenec', 'August': 'Srpen',
  'September': 'Září', 'October': 'Říjen', 'November': 'Listopad', 'December': 'Prosinec',
}

function toCzechMonth(m) {
  return MONTH_MAP[m] || m
}

function checkAuth(request) {
  const apiKey = request.headers.get('x-api-key')
  const secret = process.env.API_SECRET || 'da-dashboard-2026'
  return apiKey === secret
}

// GET - získat všechna data pro dashboard
export async function GET() {
  try {
    await initDb()
    const campaigns = await getCampaigns()
    const weeklyData = await getAllWeeklyData()
    const targets = await getTargets()

    const grouped = {}
    campaigns.forEach(c => {
      grouped[c.id] = {
        name: c.name,
        weeks: weeklyData
          .filter(w => w.campaign_id === c.id)
          .map(w => ({
            week: `${w.week_start} - ${w.week_end}`,
            month: toCzechMonth(w.month),
            adSpend: w.ad_spend,
            visitors: w.visitors,
            leads: w.leads,
            orders: w.orders,
            revenue: w.revenue,
            bump1: w.bump1,
            bump2: w.bump2,
            vip: w.vip,
          }))
      }
    })

    return NextResponse.json({ campaigns: grouped, targets })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - zapsat nová data (voláno z Make.com)
export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Neautorizovaný přístup' }, { status: 401 })
  }

  try {
    await initDb()
    const body = await request.json()

    // Aktualizace pouze Meta Ads dat (nezmění orders/revenue)
    if (body.action === 'update_meta_ads') {
      await upsertCampaign(body.campaign_id, body.campaign_name)
      await upsertMetaAdsData({
        campaign_id: body.campaign_id,
        week_start: body.week_start,
        week_end: body.week_end,
        month: toCzechMonth(body.month),
        ad_spend: parseFloat(body.ad_spend) || 0,
        visitors: parseInt(body.visitors) || 0,
        leads: parseInt(body.leads) || 0,
      })
      return NextResponse.json({ success: true })
    }

    // Smazání konkrétního týdne
    if (body.action === 'delete_week') {
      await deleteWeek(body.campaign_id, body.week_start)
      return NextResponse.json({ success: true })
    }

    // Reset FAPI dat pro kampaň (před čistým importem)
    if (body.action === 'reset_fapi') {
      const campaignId = body.campaign_id || 'mistr-nabidek'
      await resetCampaignFapi(campaignId)
      return NextResponse.json({ success: true, reset: campaignId })
    }

    // Přidání faktury s automatickým přiřazením do týdne
    if (body.action === 'add_invoice') {
      const total = parseFloat(body.total || 0) + parseFloat(body.total_vat || 0)

      // Pokud má paid_on, automaticky najdi správný týden
      if (body.paid_on) {
        const paidDate = new Date(body.paid_on)
        const day = paidDate.getDate()
        const month = paidDate.getMonth() + 1
        // Najdi pondělí daného týdne
        const dayOfWeek = paidDate.getDay()
        const monday = new Date(paidDate)
        monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const weekStart = `${monday.getDate()}.${monday.getMonth() + 1}.`
        const weekEnd = `${sunday.getDate()}.${sunday.getMonth() + 1}.`
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
        const monthName = monthNames[monday.getMonth()]

        // Ujisti se, že týden existuje v DB
        await upsertCampaign(body.campaign_id || 'mistr-nabidek', body.campaign_name || 'Mistr nabídek')
        const updated = await addInvoiceToWeek(body.campaign_id || 'mistr-nabidek', weekStart, total)
        if (!updated) {
          // Týden ještě neexistuje - vytvoříme ho
          await upsertWeeklyData({
            campaign_id: body.campaign_id || 'mistr-nabidek',
            week_start: weekStart, week_end: weekEnd, month: monthName,
            ad_spend: 0, visitors: 0, leads: 0, orders: 0, revenue: 0,
            bump1: 0, bump2: 0, vip: 0,
          })
          await addInvoiceToWeek(body.campaign_id || 'mistr-nabidek', weekStart, total)
        }
        return NextResponse.json({ success: true, added_revenue: total, week: `${weekStart} - ${weekEnd}` })
      }

      // Fallback - ruční week_start
      await addInvoiceToWeek(body.campaign_id, body.week_start, total)
      return NextResponse.json({ success: true, added_revenue: total })
    }

    // Formát 1: Přímá data (všechno najednou)
    if (body.campaign_id && body.campaign_name) {
      await upsertCampaign(body.campaign_id, body.campaign_name)
    }

    if (body.week_start) {
      // Pokud přijdou raw faktury (pole invoices), agregujeme je
      let orders = body.orders || 0
      let revenue = body.revenue || 0
      let bump1 = body.bump1 || 0
      let bump2 = body.bump2 || 0
      let vip = body.vip || 0

      if (body.invoices && Array.isArray(body.invoices)) {
        orders = body.invoices.length
        revenue = body.invoices.reduce((sum, inv) => {
          const total = parseFloat(inv.total || 0) + parseFloat(inv.total_vat || 0)
          return sum + total
        }, 0)
        // Počítání bumpů a VIP z položek faktur
        body.invoices.forEach(inv => {
          if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach(item => {
              const name = (item.name || '').toLowerCase()
              if (name.includes('bump 1') || name.includes('bump1')) bump1++
              else if (name.includes('bump 2') || name.includes('bump2')) bump2++
              else if (name.includes('vip')) vip++
            })
          }
        })
      }

      await upsertWeeklyData({
        campaign_id: body.campaign_id,
        week_start: body.week_start,
        week_end: body.week_end,
        month: body.month,
        ad_spend: body.ad_spend || 0,
        visitors: body.visitors || 0,
        leads: body.leads || 0,
        orders,
        revenue,
        bump1,
        bump2,
        vip,
      })
    }

    if (body.targets) {
      await updateTargets(body.targets)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

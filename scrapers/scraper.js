/**
 * LAUNCH LOCAL SPACE COAST — Scraper v2
 * Now with Puppeteer support for JavaScript-rendered sites (chambers, org sites, etc.)
 *
 * Scraper types:
 *   generic    — fast HTML scraper for static sites
 *   puppeteer  — headless browser for JS-rendered sites (most chamber sites)
 *   ical       — parses .ics calendar feeds (most reliable when available)
 */

import 'dotenv/config'
import axios from 'axios'
import * as cheerio from 'cheerio'
import ical from 'node-ical'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const DRY_RUN = process.env.DRY_RUN === 'true'
const MAX_EVENTS_PER_SOURCE = 20

// ─── HELPERS ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function isUpcoming(date) {
  return date && new Date(date) >= new Date()
}

function guessCategory(text) {
  const t = (text || '').toLowerCase()
  if (/network|mixer|connect|professional/.test(t)) return 'Networking'
  if (/health|wellness|fitness|yoga|run|walk/.test(t)) return 'Health & Wellness'
  if (/art|museum|gallery|exhibit|theater|theatre/.test(t)) return 'Arts & Culture'
  if (/music|concert|band|perform|live/.test(t)) return 'Music & Entertainment'
  if (/food|drink|wine|beer|dinner|lunch|tasting/.test(t)) return 'Food & Drink'
  if (/business|entrepreneur|startup|chamber/.test(t)) return 'Business'
  if (/outdoor|hike|paddle|kayak|beach|park/.test(t)) return 'Outdoors'
  if (/class|workshop|seminar|training|learn|educat/.test(t)) return 'Education'
  if (/community|volunteer|nonprofit|charity/.test(t)) return 'Community'
  return 'Other'
}

function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim()
}

// Try to parse messy date strings
function parseDate(str) {
  if (!str) return null
  const cleaned = str.replace(/\s+/g, ' ').trim()
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) return d
  // Try common formats like "May 19, 2026 6:00 PM"
  const match = cleaned.match(/(\w+ \d+,?\s*\d{4})\s*(\d+:\d+\s*[AP]M)?/i)
  if (match) {
    const d2 = new Date(match[1] + (match[2] ? ' ' + match[2] : ''))
    if (!isNaN(d2.getTime())) return d2
  }
  return null
}

// ─── ICAL SCRAPER ─────────────────────────────────────────────────────────

async function scrapeIcal(source) {
  log(`  Fetching iCal: ${source.url}`)
  const events = []
  try {
    const data = await ical.fromURL(source.url)
    for (const key of Object.keys(data)) {
      const item = data[key]
      if (item.type !== 'VEVENT') continue
      const start = item.start
      if (!isUpcoming(start)) continue
      events.push({
        title: cleanText(item.summary) || 'Untitled Event',
        description: cleanText(item.description) || null,
        start_date: new Date(start).toISOString(),
        end_date: item.end ? new Date(item.end).toISOString() : null,
        location_name: cleanText(item.location) || null,
        event_url: item.url || source.url,
        source_id: source.id,
        source_name: source.name,
        status: 'published',
        category: guessCategory((item.summary || '') + ' ' + (item.description || '')),
      })
      if (events.length >= MAX_EVENTS_PER_SOURCE) break
    }
  } catch (err) {
    log(`  ✗ iCal error: ${err.message}`)
  }
  return events
}

// ─── GENERIC HTML SCRAPER ────────────────────────────────────────────────

async function scrapeGeneric(source) {
  log(`  Fetching HTML: ${source.url}`)
  const events = []
  let html
  try {
    const res = await axios.get(source.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LaunchLocalSCBot/2.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    html = res.data
  } catch (err) {
    log(`  ✗ Fetch error: ${err.message}`)
    return events
  }

  const $ = cheerio.load(html)
  const sel = source.css_selectors || {}

  // Try JSON-LD structured data first
  const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || []
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match.replace(/<script[^>]*>|<\/script>/gi, ''))
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        if (!['Event', 'SocialEvent', 'BusinessEvent'].includes(item['@type'])) continue
        if (events.length >= MAX_EVENTS_PER_SOURCE) break
        const start = item.startDate
        if (!start || !isUpcoming(start)) continue
        events.push({
          title: cleanText(item.name) || 'Untitled Event',
          description: cleanText(item.description) || null,
          start_date: new Date(start).toISOString(),
          end_date: item.endDate ? new Date(item.endDate).toISOString() : null,
          location_name: item.location?.name || null,
          address: item.location?.address?.streetAddress || null,
          city: item.location?.address?.addressLocality || null,
          event_url: item.url || source.url,
          image_url: item.image || null,
          is_free: item.isAccessibleForFree || false,
          source_id: source.id,
          source_name: source.name,
          status: 'published',
          category: guessCategory(item.name + ' ' + (item.description || '')),
        })
      }
    } catch (_) {}
  }

  // Custom CSS selectors fallback
  if (events.length === 0 && sel.item) {
    $(sel.item).each((i, el) => {
      if (i >= MAX_EVENTS_PER_SOURCE) return false
      const title = sel.title ? $(el).find(sel.title).first().text().trim()
        : $(el).find('h1,h2,h3,h4,.title,.event-title').first().text().trim()
      const dateText = sel.date ? $(el).find(sel.date).first().text().trim()
        : $(el).find('.date,.event-date,time,[class*="date"]').first().text().trim()
      const link = sel.url ? $(el).find(sel.url).first().attr('href')
        : $(el).find('a').first().attr('href')
      const description = sel.description ? $(el).find(sel.description).first().text().trim()
        : $(el).find('p,.description,.excerpt').first().text().trim()
      if (!title || !dateText) return
      const parsedDate = parseDate(dateText)
      if (!parsedDate || !isUpcoming(parsedDate)) return
      const href = link && link.startsWith('http') ? link
        : link ? new URL(link, source.url).href : source.url
      events.push({
        title,
        description: description || null,
        start_date: parsedDate.toISOString(),
        location_name: null,
        event_url: href,
        source_id: source.id,
        source_name: source.name,
        status: 'published',
        category: guessCategory(title + ' ' + description),
      })
    })
  }

  log(`  Found ${events.length} events`)
  return events
}

// ─── PUPPETEER SCRAPER (JS-rendered sites) ──────────────────────────────────

async function scrapePuppeteer(source) {
  log(`  Launching browser for: ${source.url}`)
  const events = []
  let browser

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (compatible; LaunchLocalSCBot/2.0)')
    await page.setViewport({ width: 1280, height: 800 })

    // Navigate and wait for content to load
    await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait a little extra for any lazy-loaded content
    await sleep(2000)

    // Get the fully rendered HTML
    const html = await page.content()
    const $ = cheerio.load(html)
    const sel = source.css_selectors || {}

    // Try JSON-LD first (works even on JS-rendered pages)
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || []
    for (const match of jsonLdMatches) {
      try {
        const json = JSON.parse(match.replace(/<script[^>]*>|<\/script>/gi, ''))
        const items = Array.isArray(json) ? json : [json]
        for (const item of items) {
          if (!['Event', 'SocialEvent', 'BusinessEvent'].includes(item['@type'])) continue
          if (events.length >= MAX_EVENTS_PER_SOURCE) break
          const start = item.startDate
          if (!start || !isUpcoming(start)) continue
          events.push({
            title: cleanText(item.name) || 'Untitled Event',
            description: cleanText(item.description) || null,
            start_date: new Date(start).toISOString(),
            end_date: item.endDate ? new Date(item.endDate).toISOString() : null,
            location_name: item.location?.name || null,
            address: item.location?.address?.streetAddress || null,
            city: item.location?.address?.addressLocality || null,
            event_url: item.url || source.url,
            image_url: typeof item.image === 'string' ? item.image : null,
            is_free: item.isAccessibleForFree || false,
            source_id: source.id,
            source_name: source.name,
            status: 'published',
            category: guessCategory(item.name + ' ' + (item.description || '')),
          })
        }
      } catch (_) {}
    }

    // Custom selectors (set these per-source in Supabase for best results)
    if (events.length === 0 && sel.item) {
      $(sel.item).each((i, el) => {
        if (i >= MAX_EVENTS_PER_SOURCE) return false
        const title = sel.title ? $(el).find(sel.title).first().text().trim()
          : $(el).find('h1,h2,h3,h4,.title,.event-title,[class*="title"]').first().text().trim()
        const dateText = sel.date ? $(el).find(sel.date).first().text().trim()
          : $(el).find('.date,.event-date,time,[class*="date"],[class*="Date"]').first().text().trim()
        const link = sel.url ? $(el).find(sel.url).first().attr('href')
          : $(el).find('a').first().attr('href')
        const description = sel.description ? $(el).find(sel.description).first().text().trim()
          : $(el).find('p,.description,.excerpt,[class*="desc"]').first().text().trim()
        if (!title) return
        const parsedDate = parseDate(dateText)
        if (!parsedDate || !isUpcoming(parsedDate)) return
        const href = link && link.startsWith('http') ? link
          : link ? new URL(link, source.url).href : source.url
        events.push({
          title,
          description: description || null,
          start_date: parsedDate.toISOString(),
          location_name: null,
          event_url: href,
          source_id: source.id,
          source_name: source.name,
          status: 'published',
          category: guessCategory(title + ' ' + description),
        })
      })
    }

    // Generic fallback — look for anything that looks like an event listing
    if (events.length === 0) {
      log(`  Trying generic Puppeteer extraction...`)
      const extractedEvents = await page.evaluate((maxEvents) => {
        const results = []

        // Look for common event container patterns
        const containers = document.querySelectorAll(
          '[class*="event"], [class*="Event"], [id*="event"], ' +
          '.list-item, .item, article, .card, [class*="card"]'
        )

        for (const el of containers) {
          if (results.length >= maxEvents) break

          const titleEl = el.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]')
          const dateEl = el.querySelector('time,[class*="date"],[class*="Date"],[class*="time"]')
          const linkEl = el.querySelector('a[href]')

          const title = titleEl?.textContent?.trim()
          const dateText = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime')
          const href = linkEl?.href

          if (!title || title.length < 3) continue

          results.push({ title, dateText, href, description: '' })
        }

        return results
      }, MAX_EVENTS_PER_SOURCE)

      for (const item of extractedEvents) {
        const parsedDate = parseDate(item.dateText)
        if (!parsedDate || !isUpcoming(parsedDate)) continue
        events.push({
          title: item.title,
          description: null,
          start_date: parsedDate.toISOString(),
          event_url: item.href || source.url,
          source_id: source.id,
          source_name: source.name,
          status: 'published',
          category: guessCategory(item.title),
        })
      }
    }

  } catch (err) {
    log(`  ✗ Puppeteer error: ${err.message}`)
  } finally {
    if (browser) await browser.close()
  }

  log(`  Found ${events.length} events`)
  return events
}

// ─── DEDUP & INSERT ──────────────────────────────────────────────────────────

async function upsertEvents(events) {
  if (events.length === 0) return 0

  const { data: existing } = await supabase
    .from('events')
    .select('title, start_date, source_id')
    .in('source_id', [...new Set(events.map(e => e.source_id).filter(Boolean))])

  const existingKeys = new Set(
    (existing || []).map(e => `${e.title}__${e.start_date?.slice(0, 10)}`)
  )

  const newEvents = events.filter(e => {
    const key = `${e.title}__${e.start_date?.slice(0, 10)}`
    return !existingKeys.has(key)
  })

  if (newEvents.length === 0) {
    log(`  All ${events.length} events already exist — skipping`)
    return 0
  }

  if (DRY_RUN) {
    log(`  DRY RUN — would insert ${newEvents.length} new events`)
    newEvents.forEach(e => log(`    • ${e.title} (${e.start_date?.slice(0, 10)})`))
    return newEvents.length
  }

  const { error } = await supabase.from('events').insert(newEvents)
  if (error) {
    log(`  ✗ Insert error: ${error.message}`)
    return 0
  }

  return newEvents.length
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function run() {
  log('=== Launch Local Space Coast — Event Scraper v2 (Puppeteer enabled) ===')
  if (DRY_RUN) log('DRY RUN MODE — no data will be written')

  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true)

  if (error) {
    log(`Fatal: could not fetch sources — ${error.message}`)
    process.exit(1)
  }

  log(`Found ${sources.length} active sources`)
  let totalInserted = 0

  for (const source of sources) {
    log(`\nProcessing: ${source.name} (${source.scraper_type})`)

    try {
      let events = []

      switch (source.scraper_type) {
        case 'ical':
          events = await scrapeIcal(source)
          break
        case 'puppeteer':
          events = await scrapePuppeteer(source)
          break
        case 'generic':
        default:
          events = await scrapeGeneric(source)
          break
      }

      const inserted = await upsertEvents(events)
      totalInserted += inserted
      log(`  ✓ Inserted ${inserted} new events`)

      if (!DRY_RUN) {
        await supabase
          .from('sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: `${inserted} new events`
          })
          .eq('id', source.id)
      }

    } catch (err) {
      log(`  ✗ Error: ${err.message}`)
      if (!DRY_RUN) {
        await supabase
          .from('sources')
          .update({ last_scrape_status: `Error: ${err.message}` })
          .eq('id', source.id)
      }
    }

    // Be polite — don't hammer servers
    await sleep(3000)
  }

  log(`\n=== Done. Total new events inserted: ${totalInserted} ===`)
}

run().catch(err => {
  log(`Unhandled error: ${err.message}`)
  process.exit(1)
})



import dotenv from 'dotenv'
import Table from '../models/Table.js'
import Reservation from '../models/Reservation.js'
import { selectBestTable } from './availability.js'
import { createConfirmedReservation } from './reservationService.js'

dotenv.config()

function formatDate(value) {
  if (!value) return null

  if (value === 'today' || value === 'Today') {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  if (value === 'tomorrow' || value === 'Tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]

  return value
}

function formatTime(value) {
  if (!value) return null
  const raw = String(value).trim().toLowerCase()
  if (!raw) return null

  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!match) return value

  let hour = Number(match[1])
  const minute = match[2] || '00'
  const suffix = (match[3] || '').toLowerCase()

  if (!suffix) {
    return `${String(hour).padStart(2, '0')}:${minute}`
  }

  if (suffix === 'pm' && hour < 12) hour += 12
  if (suffix === 'am' && hour === 12) hour = 0

  const hour12 = hour % 12 || 12
  const suffixText = hour >= 12 ? 'PM' : 'AM'
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffixText}`
}

function parseDateFromText(text) {
  const lower = String(text).toLowerCase()
  if (lower.includes('today')) return 'today'
  if (lower.includes('tomorrow')) return 'tomorrow'

  const match = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]

  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (slashMatch) {
    const [_, month, day, year] = slashMatch
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    return date.toISOString().split('T')[0]
  }

  return null
}

function parseTimeFromText(text) {
  const match = String(text).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return null
  return formatTime(`${match[1]}:${match[2] || '00'} ${match[3] || ''}`.trim())
}

function parseGuestsFromText(text) {
  const match = String(text).match(/(?:for|guest|guests|people)\s*(\d+)/i)
  if (match) return Number(match[1])
  const fallback = String(text).match(/\b(\d+)\b/)
  return fallback ? Number(fallback[1]) : null
}

function parseNameFromText(text) {
  const trimmed = String(text).trim()
  if (!trimmed) return null
  const withPrefix = trimmed.replace(/^(my name is|name is|i am|i'm|call me|customer is)\s+/i, '')
  if (withPrefix && withPrefix.length <= 80) return withPrefix
  return null
}

function parsePhoneFromText(text) {
  const matches = String(text).match(/\d{3,15}/g)
  if (!matches) return null
  return matches[0]
}

function buildPrompt(state) {
  if (!state) return 'What would you like to reserve?'

  if (!state.date) return 'What date would you like to book for?'
  if (!state.time) return 'What time would you like to arrive?'
  if (!state.guests) return 'How many guests will be joining?'
  if (!state.name) return 'May I have the customer name?'
  if (!state.phone) return 'Could you share the mobile number for the reservation?'
  return null
}

export function normalizeGroqPayload(rawPayload) {
  if (!rawPayload) return null

  const text = String(rawPayload).trim()
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fencedMatch ? fencedMatch[1] : text
  const jsonMatch = candidate.match(/\{[\s\S]*\}/)

  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed || typeof parsed !== 'object') return null

    return {
      date: parsed.date ?? null,
      time: parsed.time ?? null,
      guests: parsed.guests ?? null,
      name: parsed.name ?? null,
      phone: parsed.phone ?? null,
      confirmationText: parsed.confirmationText ?? null
    }
  } catch {
    return null
  }
}

/**
 * -----------------------------
 * AI PROVIDER CONFIGURATION (Future)
 * -----------------------------
 * ACTIVE: groq
 */
// const activeProvider = "groq";
// const activeModel = "openai/gpt-oss-120b";

/*
// OPENAI (Future)
// const activeProvider = "openai";
// const activeModel = "gpt-5";
// const apiKey = process.env.OPENAI_API_KEY;

// ANTHROPIC / CLAUDE (Future)
// const activeProvider = "anthropic";
// const activeModel = "claude-sonnet-4";
// const apiKey = process.env.ANTHROPIC_API_KEY;

// DEEPSEEK (Future)
// const activeProvider = "deepseek";
// const activeModel = "deepseek-chat";
// const apiKey = process.env.DEEPSEEK_API_KEY;
*/

async function callGroqForParsing(message, state = {}) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY
  if (!apiKey) return null

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
  const apiUrl = process.env.GROQ_API_URL || process.env.GROK_URL || 'https://api.groq.com/openai/v1/chat/completions'

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant reservation parser. Extract reservation details from the customer message. Return strictly valid JSON with date, time, guests, name, phone and optional confirmationText.'
          },
          {
            role: 'user',
            content: `Customer message: "${message}"\nExisting state: ${JSON.stringify(state)}`
          }
        ]
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    return normalizeGroqPayload(content)
  } catch {
    return null
  }
}

export async function processReservationRequest({ message, state = {} }) {
  const mergedState = {
    ...state,
    date: state.date || null,
    time: state.time || null,
    guests: state.guests || null,
    name: state.name || null,
    phone: state.phone || null
  }

  const userText = String(message || '').trim()

  let nextState = { ...mergedState }

  const grokPayload = await callGroqForParsing(userText, nextState)
  if (grokPayload) {
    const normalizedGuests = grokPayload.guests != null ? Number(grokPayload.guests) : null

    nextState = {
      ...nextState,
      date: nextState.date || formatDate(grokPayload.date) || null,
      time: nextState.time || grokPayload.time || null,
      guests: nextState.guests ?? (Number.isFinite(normalizedGuests) ? normalizedGuests : null),
      name: nextState.name || grokPayload.name || null,
      phone: nextState.phone || grokPayload.phone || null
    }
  }

  if (!nextState.date) {
    const parsedDate = parseDateFromText(userText)
    if (parsedDate) {
      nextState.date = formatDate(parsedDate)
    }
  }

  if (!nextState.time) {
    const parsedTime = parseTimeFromText(userText)
    if (parsedTime) {
      nextState.time = parsedTime
    }
  }

  if (!nextState.guests) {
    const parsedGuests = parseGuestsFromText(userText)
    if (parsedGuests) {
      nextState.guests = parsedGuests
    }
  }

  if (!nextState.name) {
    const parsedName = parseNameFromText(userText)
    if (parsedName) {
      nextState.name = parsedName
    }
  }

  if (!nextState.phone) {
    const parsedPhone = parsePhoneFromText(userText)
    if (parsedPhone) {
      nextState.phone = parsedPhone
    }
  }

  const prompt = buildPrompt(nextState)
  if (prompt) {
    return {
      success: true,
      needsInput: true,
      state: nextState,
      message: prompt,
      pendingField: prompt.includes('date') ? 'date' : prompt.includes('time') ? 'time' : prompt.includes('guests') ? 'guests' : prompt.includes('customer name') ? 'name' : 'phone'
    }
  }

  const dbTables = await Table.find({}).sort({ tableNumber: 1 }).lean()
  const tables = dbTables.length > 0
    ? dbTables.map((table) => ({
        id: table.tableNumber,
        tableNumber: table.tableNumber,
        seats: table.seats,
        status: table.status || 'available',
        updatedAt: table.updatedAt,
        reservationDate: table.reservationDate,
        reservationTime: table.reservationTime
      }))
    : Array.from({ length: 12 }).map((_, index) => ({ id: index + 1, seats: [2, 4, 6, 8][index % 4], status: 'available' }))

  const existingReservations = await Reservation.find({ status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] } }).lean()
  const availability = selectBestTable({
    guestCount: nextState.guests,
    requestedDate: nextState.date,
    requestedTime: nextState.time,
    tables,
    reservations: existingReservations.map((reservation) => ({
      tableId: reservation.suggestedTable || reservation.tableId,
      tableNumbers: reservation.tableNumbers || [],
      date: reservation.date,
      time: reservation.time,
      duration: reservation.duration
    }))
  })

  if (!availability.available || !availability.table) {
    return {
      success: true,
      state: nextState,
      message: availability.message || 'I’m sorry. No suitable table is available right now.',
      needsInput: false,
      available: false
    }
  }

  const { formattedReservation } = await createConfirmedReservation({
    name: nextState.name,
    phone: nextState.phone,
    date: formatDate(nextState.date),
    time: nextState.time,
    guests: Number(nextState.guests || 2),
    preference: 'No Preference',
    tableId: availability.table.id,
    tableCapacity: availability.table.seats,
    suggestedTable: availability.table.id,
    confidence: availability.confidence || 96,
    duration: 120,
    source: 'ai-chat',
    reason: availability.reason || 'Auto-assigned by AI reservation manager',
    suggestedTimes: availability.suggestedTimes || [],
    approvedBy: 'AI',
    reservationSource: 'AI_CHAT'
  })

  // Emit updated tables
  const allTables = await Table.find().sort({ tableNumber: 1 })
  emitReservationEvent('tables_updated', { tables: allTables })

  return {
    success: true,
    state: nextState,
    message: `✅ Reservation Confirmed\n\nTable T${availability.table.id}\nGuests ${nextState.guests}\nDate ${formatDate(nextState.date)}\nTime ${nextState.time}\nDuration 120 Minutes\n\nConfirmed by AI\nSee you soon 🍽️`,
    needsInput: false,
    reservation: formattedReservation,
    available: true,
    table: availability.table
  }
}

export default processReservationRequest

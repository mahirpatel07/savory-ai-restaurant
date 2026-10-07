import { StateGraph, Annotation } from '@langchain/langgraph'
import { ChatGroq } from '@langchain/groq'
import '../loadEnv.js'

import Table from '../models/Table.js'
import Reservation from '../models/Reservation.js'
import { selectBestTable } from './availability.js'
import { createConfirmedReservation } from './reservationService.js'
import { menuData, restaurantInfo } from '../data/restaurantData.js'

let _model = null

/*
// OPENAI (Future)
// const provider = "openai";
// const model = "gpt-5";
// const apiKey = process.env.OPENAI_API_KEY;

// ANTHROPIC / CLAUDE (Future)
// const provider = "anthropic";
// const model = "claude-sonnet-4";
// const apiKey = process.env.ANTHROPIC_API_KEY;

// DEEPSEEK (Future)
// const provider = "deepseek";
// const model = "deepseek-chat";
// const apiKey = process.env.DEEPSEEK_API_KEY;
*/
function getModel() {
  if (!_model) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing from environment variables. Please check your .env file.')
    }

    _model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0
    })
  }
  return _model
}

function normalizeDate(value) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const lower = raw.toLowerCase()
  if (lower.includes('today')) return new Date().toISOString().split('T')[0]
  if (lower.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const targetDay = days.findIndex((day) => lower.includes(day))
  if (targetDay !== -1) {
    const d = new Date()
    const current = d.getDay()
    let diff = targetDay - current
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return raw

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    const normalizedYear = year.length === 2 ? `20${year}` : year
    const date = new Date(`${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (!Number.isNaN(date.getTime())) return date.toISOString().split('T')[0]
  }

  const dayMonthMatch = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)$/i)
  if (dayMonthMatch) {
    const [, day, month] = dayMonthMatch
    const monthIndex = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(month.toLowerCase())
    const d = new Date()
    d.setMonth(monthIndex)
    d.setDate(Number(day))
    return d.toISOString().split('T')[0]
  }

  return null
}

function matchesIntent(message, regex) {
  return Boolean(message && regex.test(String(message).toLowerCase()))
}

const RESET_REGEX = /(book another|reserve again|new reservation|start over|another reservation)/i
const GREETING_REGEX = /^(hi|hello|hey|hola|greetings|good morning|good afternoon|good evening|namaste|hallo)$/i // Strict match for pure greetings
const CONFIRM_REGEX = /\b(yes|yeah|yup|ok|okay|done|confirm|proceed|book it|reserve it|go ahead|sure|absolutely|please do|that works|sounds good|please confirm|confirm reservation)\b/i
const THANKS_REGEX = /\b(thank you|thanks|nice|awesome|perfect|okay|done|great)\b/i
const INFO_REGEX = /(restaurant information|location|hours|address|contact|about savory|restaurant info)/i
const MENU_REGEX = /(view menu|see menu|show menu|menu)/i
const CANCEL_REGEX = /(cancel reservation|cancel booking|delete reservation|remove booking)/i

const START = '__start__'
const END = '__end__'

const ReservationState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  extraction: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({ name: null, phone: null, guests: null, date: null, time: null, preference: null, requestedTable: null })
  }),
  intent: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 'MAKE_RESERVATION'
  }),
  current_state: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 'WELCOME'
  }),
  current_step: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 'ASK_NAME'
  }),
  validation_error: Annotation({
    reducer: (x, y) => y,
    default: () => null
  }),
  preview: Annotation({
    reducer: (x, y) => (y === undefined ? x : y),
    default: () => null
  }),
  reservation_result: Annotation({
    reducer: (x, y) => (y === undefined ? x : y),
    default: () => null
  }),
  is_completed: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false
  }),
  voiceMode: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false
  }),
  specialResponse: Annotation({
    reducer: (x, y) => (y === undefined ? x : y),
    default: () => null
  }),
  response: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  menu_data: Annotation({
    reducer: (x, y) => y,
    default: () => null
  }),
  info_data: Annotation({
    reducer: (x, y) => y,
    default: () => null
  })
})

async function extractionNode(state) {
  const lastMessage = state.messages[state.messages.length - 1]?.content || ''
  const extraction = { ...state.extraction }
  let currentState = state.current_state || 'WELCOME'
  let currentStep = state.current_step || 'ASK_NAME'
  let intent = state.intent || 'MAKE_RESERVATION'

  if (matchesIntent(lastMessage, RESET_REGEX) || (matchesIntent(lastMessage, GREETING_REGEX) && lastMessage.split(' ').length <= 2)) {
    return {
      extraction: { name: null, phone: null, guests: null, date: null, time: null, preference: null, requestedTable: null },
      intent: 'MAKE_RESERVATION',
      current_state: 'WELCOME',
      current_step: 'ASK_NAME',
      is_completed: false,
      preview: null,
      reservation_result: null,
      specialResponse: `Hello! 👋 Welcome to Savory!
I'm your AI Reservation Assistant.
I can help you:
🍽 Reserve a table
📅 Check table availability
⏰ Find the best dining time
👨‍👩‍👧 Reserve for individuals, families or groups
✨ Answer restaurant questions

I'll guide you through the reservation process.
How can I help you today?`,
      response: null
    }
  }

  // Handle Intent matching for general info
  if (matchesIntent(lastMessage, MENU_REGEX)) {
    return {
      specialResponse: "Here is today's menu. We offer a variety of artisanal pizzas, gourmet burgers, handcrafted pastas, and refreshing drinks.",
      menu_data: menuData,
      current_state: currentState
    }
  }

  if (matchesIntent(lastMessage, INFO_REGEX)) {
    return {
      specialResponse: `Savory is a premier dining destination specializing in ${restaurantInfo.cuisine}. We are located at ${restaurantInfo.address}. We are open from ${restaurantInfo.openingHours} to ${restaurantInfo.closingHours} daily.`,
      info_data: restaurantInfo,
      current_state: currentState
    }
  }

  if (matchesIntent(lastMessage, CANCEL_REGEX)) {
    return {
      intent: 'CANCEL_RESERVATION',
      current_state: 'ASK_CANCEL_INFO',
      specialResponse: "I can help you with that. Could you please provide your phone number so I can find your reservation?"
    }
  }

  // State Transition Logic for Confirmations
  if (currentState === 'CONFIRM_DETAILS' && matchesIntent(lastMessage, CONFIRM_REGEX)) {
    return { current_state: 'CHECK_AVAILABILITY' }
  }

  if (currentState === 'WAITING_FOR_CONFIRMATION' && matchesIntent(lastMessage, CONFIRM_REGEX)) {
    if (intent === 'MAKE_RESERVATION') {
      return { current_state: 'RESERVATION_SAVING' }
    }
    // If it was CHECK_AVAILABILITY, we don't return here,
    // we let the LLM change the intent to MAKE_RESERVATION
    // and then we'll handle the state transition below.
  }

  if (currentState === 'RESERVATION_CONFIRMED' && (matchesIntent(lastMessage, THANKS_REGEX) || matchesIntent(lastMessage, CONFIRM_REGEX))) {
    return { current_state: 'COMPLETED' }
  }

  // If already confirmed or completed, stop extracting details
  if (currentState === 'RESERVATION_CONFIRMED' || currentState === 'COMPLETED') {
    return { extraction }
  }

  // Use AI for better extraction
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const prompt = `You are Sia, the professional Reservation Agent for 'Savory'.
Extract reservation details from the customer message.
Today's Date: ${todayStr} (${now.toLocaleDateString('en-US', { weekday: 'long' })})
Current Time: ${now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}

Customer message: "${lastMessage}"
Current Step: ${currentStep}
Existing state: ${JSON.stringify(extraction)}

Return ONLY a valid JSON object with:
- intent: One of "CHECK_AVAILABILITY", "MAKE_RESERVATION", or "CANCEL_RESERVATION" (string)
- name: Customer name (string or null)
- phone: Customer phone (digits only, string or null)
- date: Reservation date (YYYY-MM-DD or null)
- time: Reservation time (HH:MM AM/PM or HH:MM or null)
- guests: Number of guests (integer or null)
- preference: Table preference (string or null)
- requestedTable: Specific table number requested (integer or null)

CRITICAL RULES:
1. Extract ALL available information from the message, even if it's not for the 'Current Step'.
2. ONLY extract 'name' if the user explicitly provided it. NEVER use 'Sia', 'Savory', or 'Guest'.
3. If the user mentions "today" or "tomorrow", use ${todayStr} or ${tomorrowStr}.
4. Handle relative dates like "in 3 days" or "after 3 days" by adding to ${todayStr}.
5. Handle days of the week like "next Friday" relative to ${todayStr}.
6. If the user provides a time like "1pm", extract it as "01:00 PM" or "13:00".
7. If information is NOT in the message, use null for that field in your JSON (do NOT guess).
8. If the user is CORRECTING something (e.g., "actually 8pm"), extract the new value.
9. Intent is "CHECK_AVAILABILITY" if they ask "is a table available", "can I check", "do you have room", "is table 4 free", etc.
10. Intent is "MAKE_RESERVATION" if they say "book a table", "reserve", "I want a reservation", etc.
11. Intent is "CANCEL_RESERVATION" if they say "cancel my booking", "I want to delete my reservation", etc.
12. If the current intent in state is "CHECK_AVAILABILITY" but the user says "book it" or "reserve it", change intent to "MAKE_RESERVATION".
13. For "is table 4 available", set intent="CHECK_AVAILABILITY" and requestedTable=4.`;

    const res = await getModel().invoke(prompt);
    const text = res.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Update intent
      if (parsed.intent) intent = parsed.intent;

      // Update state with newly extracted values (partial update)
      if (parsed.name !== null) extraction.name = parsed.name;
      if (parsed.phone !== null) extraction.phone = String(parsed.phone).replace(/\D/g, '');
      if (parsed.date !== null) {
        const normalized = normalizeDate(parsed.date);
        if (normalized) extraction.date = normalized;
        else extraction.date = parsed.date;
      }
      if (parsed.time !== null) extraction.time = parsed.time;
      if (parsed.guests !== null) extraction.guests = Number(parsed.guests);
      if (parsed.preference !== null) extraction.preference = parsed.preference;
      if (parsed.requestedTable !== null) extraction.requestedTable = Number(parsed.requestedTable);
    }
  } catch (error) {
    console.error('LLM Extraction Error:', error);
    // If it's a model not found error, rethrow to be caught by the main route
    if (error.message.includes('404') || error.message.includes('model_not_found')) {
      throw error;
    }
  }

  // Determine the next step based on missing fields and state
  if (intent === 'CHECK_AVAILABILITY') {
    if (!extraction.guests) currentStep = 'ASK_GUESTS';
    else if (!extraction.date) currentStep = 'ASK_DATE';
    else if (!extraction.time) currentStep = 'ASK_TIME';
    else if (currentState === 'CHECK_AVAILABILITY') currentStep = 'CHECK_AVAILABILITY';
    else if (currentState === 'WAITING_FOR_CONFIRMATION') currentStep = 'ASSIGN_TABLE';
    else currentStep = 'CHECK_AVAILABILITY';
  } else {
    if (!extraction.name) currentStep = 'ASK_NAME';
    else if (!extraction.phone) currentStep = 'ASK_PHONE';
    else if (!extraction.guests) currentStep = 'ASK_GUESTS';
    else if (!extraction.date) currentStep = 'ASK_DATE';
    else if (!extraction.time) currentStep = 'ASK_TIME';
    else if (currentState === 'CHECK_AVAILABILITY') currentStep = 'CHECK_AVAILABILITY';
    else if (currentState === 'WAITING_FOR_CONFIRMATION') currentStep = 'ASSIGN_TABLE';
    else if (currentState === 'RESERVATION_SAVING') currentStep = 'SAVE_RESERVATION';
    else if (currentState === 'RESERVATION_CONFIRMED' || currentState === 'COMPLETED') currentStep = 'CONFIRMED';
    else currentStep = 'CHECK_AVAILABILITY';
  }

  // If we just got all details, move state to CONFIRM_DETAILS immediately to avoid COLLECT_DETAILS questions
  if (intent === 'MAKE_RESERVATION') {
    if (extraction.name && extraction.phone && extraction.guests && extraction.date && extraction.time && currentState === 'COLLECT_DETAILS') {
      currentState = 'CONFIRM_DETAILS';
    } else if (currentState === 'WELCOME' && (extraction.name || extraction.phone || extraction.guests || extraction.date || extraction.time)) {
      currentState = 'COLLECT_DETAILS';
    } else if (currentState === 'WAITING_FOR_CONFIRMATION' && (matchesIntent(lastMessage, CONFIRM_REGEX) || intent !== state.intent)) {
      // Transition from availability check to reservation flow
      currentState = 'COLLECT_DETAILS';
    }
  } else if (intent === 'CHECK_AVAILABILITY') {
    if (extraction.guests && extraction.date && extraction.time && currentState === 'COLLECT_DETAILS') {
        currentState = 'CHECK_AVAILABILITY';
    } else if (currentState === 'WELCOME' && (extraction.guests || extraction.date || extraction.time)) {
        currentState = 'COLLECT_DETAILS';
    }
  }

  return { extraction, current_step: currentStep, current_state: currentState, intent }
}

async function validationNode(state) {
  let { extraction, current_state, intent } = state

  // If we just entered from WELCOME or are already COLLECTING
  if (current_state === 'WELCOME' || current_state === 'COLLECT_DETAILS') {
    if (intent === 'CHECK_AVAILABILITY') {
        const hasAvailInfo = extraction.guests && extraction.date && extraction.time;
        if (hasAvailInfo) {
            return { current_state: 'CHECK_AVAILABILITY' }
        }
    } else {
        const hasAll = extraction.name && extraction.phone && extraction.guests && extraction.date && extraction.time;
        if (hasAll) {
          return { current_state: 'CONFIRM_DETAILS' }
        }
    }
    return { current_state: 'COLLECT_DETAILS' }
  }

  return { current_state }
}

async function fulfillmentNode(state) {
  const { extraction, current_state, preview } = state

  if (current_state === 'CHECK_AVAILABILITY') {
    console.log(`[GRAPH FULFILLMENT] CHECK_AVAILABILITY: date=${extraction.date}, time=${extraction.time}, guests=${extraction.guests}`);
    const normalizedDate = normalizeDate(extraction.date)
    const dbTables = await Table.find({}).sort({ tableNumber: 1 }).lean()
    const tables = dbTables.length > 0
      ? dbTables.map((t) => ({
          id: t.tableNumber,
          tableNumber: t.tableNumber,
          seats: t.seats,
          status: t.status || 'available',
          updatedAt: t.updatedAt,
          reservationDate: t.reservationDate,
          reservationTime: t.reservationTime
        }))
      : Array.from({ length: 12 }).map((_, i) => ({ id: i + 1, tableNumber: i + 1, seats: [2, 4, 6, 8][i % 4], status: 'available' }))

    const dbReservations = await Reservation.find({ status: { $in: ['approved', 'confirmed', 'pending', 'checked-in'] } }).lean()

    const availability = selectBestTable({
      guestCount: extraction.guests,
      requestedDate: normalizedDate,
      requestedTime: extraction.time,
      tables,
      reservations: dbReservations,
      requestedTableId: extraction.requestedTable
    })

    if (!availability.available) {
        return { current_state: 'NO_TABLE', preview: availability }
    }

    return {
        current_state: 'WAITING_FOR_CONFIRMATION',
        preview: {
            ...availability,
            guests: extraction.guests,
            date: normalizedDate,
            time: extraction.time
        }
    }
  }

  if (current_state === 'RESERVATION_SAVING') {
    const { formattedReservation } = await createConfirmedReservation({
      name: extraction.name,
      phone: extraction.phone,
      date: normalizeDate(extraction.date),
      time: extraction.time,
      guests: Number(extraction.guests),
      preference: extraction.preference || 'No Preference',
      tableNumbers: preview.tableIds,
      tableCapacity: preview.totalCapacity,
      confidence: 100,
      source: 'ai-chat',
      reason: preview.reason,
      approvedBy: 'AI',
      reservationSource: 'AI_CHAT'
    })

    return {
      current_state: 'RESERVATION_CONFIRMED',
      is_completed: true,
      reservation_result: formattedReservation
    }
  }

  return {}
}

async function responseNode(state) {
  if (state.specialResponse) return { response: state.specialResponse }

  const { current_state, extraction, preview, reservation_result, current_step, intent } = state

  if (current_state === 'WELCOME') {
    return { response: `Hello! 👋 Welcome to Savory!
I'm your AI Reservation Assistant.
I can help you:
🍽 Reserve a table
📅 Check table availability
⏰ Find the best dining time
👨‍👩‍👧 Reserve for individuals, families or groups
✨ Answer restaurant questions

I'll guide you through the reservation process.
How can I help you today?` }
  }

  if (current_state === 'COLLECT_DETAILS') {
    const prompt = `You are Sia from Savory, a professional AI Reservation Assistant.
We are currently collecting details for a ${intent === 'CHECK_AVAILABILITY' ? 'table availability check' : 'reservation'}.
The next missing piece of information is: ${current_step}.

Current State:
${intent === 'MAKE_RESERVATION' ? `Name: ${extraction.name || 'Missing'}\nPhone: ${extraction.phone || 'Missing'}` : ''}
Guests: ${extraction.guests || 'Missing'}
Date: ${extraction.date || 'Missing'}
Time: ${extraction.time || 'Missing'}

INSTRUCTIONS:
1. Ask for ONLY the information associated with the current step: ${current_step}.
2. If multiple pieces of information are missing, focus on the current step.
3. If the user just provided some information, acknowledge it briefly and move to the next.
4. Do NOT introduce yourself or say "Hello" again.
5. Be concise, warm, and professional.
6. If the user asked a question or made a comment, address it briefly before asking for the missing info.
7. If intent is CHECK_AVAILABILITY, NEVER ask for name or phone.

Response:`;

    try {
      const res = await getModel().invoke(prompt);
      return { response: res.content.trim() }
    } catch (error) {
      console.error('LLM Response Error:', error);
      if (error.message.includes('404') || error.message.includes('model_not_found')) {
        throw error;
      }
      return { response: `I'm having trouble connecting to my brain right now. Could you please provide ${current_step}?` }
    }
  }

  if (current_state === 'CONFIRM_DETAILS') {
    return { response: `I've got your reservation details:
Name: ${extraction.name}
Guests: ${extraction.guests}
Date: ${extraction.date}
Time: ${extraction.time}
Seating: ${extraction.preference || 'No Preference'}

Would you like me to proceed with checking table availability?` }
  }

  if (current_state === 'CHECK_AVAILABILITY') {
    return { response: `🔍 Checking live table availability for ${extraction.date} at ${extraction.time}...` }
  }

  if (current_state === 'WAITING_FOR_CONFIRMATION') {
    const tablesStr = preview.tableIds.map(id => `T${id}`).join(' + ');
    if (intent === 'CHECK_AVAILABILITY') {
        return { response: `🔍 I've checked live table availability for ${preview.date} at ${preview.time}.

✅ Table ${tablesStr} is available for ${preview.guests} guests.

Would you like me to book this table for you?` }
    }
    return { response: `✅ Great news! I found the best available arrangement.

Tables: ${tablesStr} (${preview.totalCapacity} Seats)
Guests: ${preview.guests}

Would you like me to confirm this reservation?` }
  }

  if (current_state === 'RESERVATION_CONFIRMED') {
    return { response: `✅ Reservation Confirmed!
ID: ${reservation_result.id}
Name: ${reservation_result.name}
Tables: ${reservation_result.tableNumbers.map(n => 'T'+n).join(', ')}
Guests: ${reservation_result.guests}
Date: ${reservation_result.date}
Time: ${reservation_result.time}
Status: Confirmed

See you soon at Savory! 🍽️` }
  }

  if (current_state === 'COMPLETED') {
    return { response: "You're most welcome! We look forward to serving you. Is there anything else I can help you with today?" }
  }

  if (current_state === 'NO_TABLE') {
    return { response: preview.message || "I'm sorry, we don't have any tables available for that time." }
  }

  return { response: "How else can I assist you?" }
}

const workflow = new StateGraph(ReservationState)
  .addNode('extract', extractionNode)
  .addNode('validate', validationNode)
  .addNode('fulfillment', fulfillmentNode)
  .addNode('respond', responseNode)
  .addEdge(START, 'extract')
  .addEdge('extract', 'validate')
  .addEdge('validate', 'fulfillment')
  .addEdge('fulfillment', 'respond')
  .addEdge('respond', END)

export const reservationGraph = workflow.compile()

export async function runReservationGraph({ message, state = {}, history = [], voiceMode = false }) {
  const inputState = {
    messages: [
      ...history.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: message }
    ],
    extraction: state.extraction || { name: null, phone: null, guests: null, date: null, time: null, preference: null, requestedTable: null },
    intent: state.intent || 'MAKE_RESERVATION',
    current_state: state.current_state || 'WELCOME',
    is_completed: state.is_completed || false,
    preview: state.preview || null,
    reservation_result: state.reservation_result || null,
    voiceMode
  }

  const result = await reservationGraph.invoke(inputState)

  return {
    success: result.current_state === 'RESERVATION_CONFIRMED',
    message: result.response,
    state: {
      extraction: result.extraction,
      intent: result.intent,
      current_state: result.current_state,
      is_completed: result.is_completed,
      preview: result.preview,
      reservation_result: result.reservation_result
    },
    reservation: result.reservation_result,
    preview: result.preview,
    menuData: result.menu_data,
    infoData: result.info_data
  }
}

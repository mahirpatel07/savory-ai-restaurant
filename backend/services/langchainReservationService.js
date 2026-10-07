import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '../../.env')

dotenv.config({ path: envPath })

import { ChatGroq } from '@langchain/groq'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import Table from '../models/Table.js'
import Reservation from '../models/Reservation.js'
import { selectBestTable } from './availability.js'
import { createConfirmedReservation } from './reservationService.js'

// -----------------------------
// AI PROVIDER CONFIGURATION (Future)
// -----------------------------
// ACTIVE: groq
// -----------------------------
// const provider = "groq";
// const model = "openai/gpt-oss-120b";

// -----------------------------
// OPENAI (Future)
// -----------------------------
// const provider = "openai";
// const model = "gpt-5";
// const apiKey = process.env.OPENAI_API_KEY;

// -----------------------------
// ANTHROPIC / CLAUDE (Future)
// -----------------------------
// const provider = "anthropic";
// const model = "claude-sonnet-4";
// const apiKey = process.env.ANTHROPIC_API_KEY;

// -----------------------------
// DEEPSEEK (Future)
// -----------------------------
// const provider = "deepseek";
// const model = "deepseek-chat";
// const apiKey = process.env.DEEPSEEK_API_KEY;

// Initialize Groq Chat Model
const groqModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  temperature: 0.7,
})

// Define the reservation details schema
const _ReservationDetailsSchema = z.object({
  name: z.string().describe('Customer name'),
  phone: z.string().describe('Customer phone number'),
  date: z.string().describe('Reservation date in YYYY-MM-DD format'),
  time: z.string().describe('Reservation time in HH:MM or HH:MM AM/PM format'),
  guestCount: z.number().describe('Number of guests'),
  preference: z.string().optional().describe('Table preference (window, quiet, etc)'),
})

const reservationPrompt = PromptTemplate.fromTemplate(`You are a sophisticated restaurant reservation assistant for 'Savory'.
Your goal is to extract reservation details from the customer message while considering the current conversation state.

Customer Message: {message}

Current State: {state}

Extract the following information if available:
- name: Customer's name
- phone: Customer's phone number (extract digits only)
- date: Reservation date (respond with YYYY-MM-DD format). If they say 'today' or 'tomorrow', use those words.
- time: Reservation time (convert to HH:MM AM/PM format, e.g., 7:00 PM)
- guestCount: Number of guests (integer)
- preference: Any specific table preference (window, outdoor, quiet, etc.)

Guidelines:
1. If the user provides new information that conflicts with the state, prioritize the new information.
2. For dates like "18 July", assume the current year unless specified.
3. If a field is missing in both message and state, return null for that field.
4. Respond ONLY with a valid JSON object.

Example Output:
{{
  "name": "John Doe",
  "phone": "1234567890",
  "date": "2026-07-25",
  "time": "7:30 PM",
  "guestCount": 4,
  "preference": "window seat"
}}`)

/**
 * Parse the LLM response to extract structured data
 */
function parseGroqResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        name: parsed.name || null,
        phone: parsed.phone ? String(parsed.phone).replace(/\D/g, '') : null,
        date: parsed.date || null,
        time: parsed.time || null,
        guestCount: parsed.guestCount ? Number(parsed.guestCount) : null,
        preference: parsed.preference || null,
      }
    }
  } catch (error) {
    console.error('Error parsing Groq response:', error)
  }
  return {
    name: null,
    phone: null,
    date: null,
    time: null,
    guestCount: null,
    preference: null,
  }
}

/**
 * Format date string to YYYY-MM-DD
 */
function formatDateForReservation(dateStr) {
  if (!dateStr) return null

  if (dateStr === 'today') {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  if (dateStr === 'tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  return null
}

/**
 * Process reservation request using LangChain + Groq
 */
export async function processReservationRequestLangChain({ message, state = {}, voiceMode = false }) {
  try {
    // Build the chain
    const chain = reservationPrompt.pipe(groqModel).pipe(new StringOutputParser())

    // If voice mode is on, we add a specific instruction for the response formatting
    const contextualMessage = voiceMode
      ? `${message}\n\nNote: The user is in voice mode. Please ensure your response is concise, conversational, and avoids complex markdown or symbols.`
      : message;

    // Invoke the chain
    const response = await chain.invoke({
      message: contextualMessage || '',
      state: JSON.stringify(state),
    })

    // Parse the response
    const extractedData = parseGroqResponse(response)

    // Format the date if available
    if (extractedData.date) {
      extractedData.date = formatDateForReservation(extractedData.date)
    }

    // Accumulate state with extracted data
    const updatedState = {
      ...state,
      ...Object.fromEntries(
        Object.entries(extractedData).filter(([_, v]) => v !== null && v !== undefined)
      ),
    }

    // Check if we have enough information to make a reservation
    const hasEnoughInfo =
      updatedState.name &&
      updatedState.phone &&
      updatedState.date &&
      updatedState.time &&
      updatedState.guestCount

    if (hasEnoughInfo) {
      // Try to select a table and create reservation
      try {
        const tables = await Table.find({}).sort({ tableNumber: 1 }).lean()
        const tableList = tables.map((t) => ({
          id: t.tableNumber,
          tableNumber: t.tableNumber,
          seats: t.seats,
          status: t.status || 'available',
          updatedAt: t.updatedAt,
          reservationDate: t.reservationDate,
          reservationTime: t.reservationTime
        }))

        // Get existing reservations
        const dbReservations = await Reservation.find({ status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] } }).lean()
        const reservations = dbReservations.map(r => ({
          ...r,
          tableId: r.assignedTable || r.suggestedTable || r.tableId
        }))

        const result = selectBestTable({
          guestCount: updatedState.guestCount,
          requestedDate: updatedState.date,
          requestedTime: updatedState.time,
          tables: tableList,
          reservations,
        })

        if (!result.available) {
          return {
            success: false,
            message: result.message || `Sorry, no available tables for ${updatedState.guestCount} guests on ${updatedState.date} at ${updatedState.time}. Would you like to try a different time?`,
            state: updatedState,
            suggestedTimes: result.suggestedTimes,
            nextStep: 'ask_alternative_time',
          }
        }

        const selectedTable = result.table
        const reservation = await createConfirmedReservation({
          name: updatedState.name,
          phone: updatedState.phone,
          date: updatedState.date,
          time: updatedState.time,
          guests: updatedState.guestCount,
          tableId: selectedTable.id,
          preference: updatedState.preference || 'No preference',
        })

        return {
          success: true,
          message: `Perfect! Reservation confirmed for ${updatedState.name} on ${updatedState.date} at ${updatedState.time}. Table ${selectedTable.tableNumber} reserved for ${updatedState.guestCount} guests.`,
          reservation,
          state: updatedState,
          nextStep: 'confirmed',
        }
      } catch (error) {
        console.error('Error creating reservation:', error)
        return {
          success: false,
          message: 'Unable to process reservation at this moment. Please try again.',
          state: updatedState,
          error: error.message,
        }
      }
    } else {
      // Ask for missing information
      const missing = []
      if (!updatedState.name) missing.push('your name')
      if (!updatedState.phone) missing.push('your phone number')
      if (!updatedState.date) missing.push('your preferred date')
      if (!updatedState.time) missing.push('your preferred time')
      if (!updatedState.guestCount) missing.push('number of guests')

      return {
        success: false,
        message: `I need a bit more information: ${missing.join(', ')}. Could you provide the missing details?`,
        state: updatedState,
        nextStep: 'ask_missing_info',
      }
    }
  } catch (error) {
    console.error('Error processing reservation request:', error)
    return {
      success: false,
      message: 'Unable to process your request. Please try again.',
      error: error.message,
    }
  }
}

/**
 * Process natural language chat using LangChain + Groq
 */
export async function chatWithAssistantLangChain({ message, systemRole = 'You are a helpful restaurant reservation assistant.' }) {
  try {
    const chatPrompt = PromptTemplate.fromTemplate('{message}')
    const chain = chatPrompt.pipe(groqModel).pipe(new StringOutputParser())

    const response = await chain.invoke({
      message: systemRole + '\n\nUser: ' + message,
    })

    return {
      success: true,
      message: response,
    }
  } catch (error) {
    console.error('Error in chat:', error)
    return {
      success: false,
      message: 'Unable to process your message. Please try again.',
      error: error.message,
    }
  }
}

import axios from 'axios';
import https from 'https';
import { RESTAURANT_SYSTEM_PROMPT } from '../constants/prompts.js';

const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

// Create an https agent with keepAlive enabled to prevent socket hang up issues in Node.js
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000
});

/**
 * Creates a new Ultravox voice session.
 */
export async function createVoiceSession() {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  if (!apiKey) {
    throw new Error('ULTRAVOX_API_KEY is not defined in environment variables.');
  }

  // Populate dynamic fields in the prompt
  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: 'numeric' };
  const currentTime = new Intl.DateTimeFormat('en-IN', options).format(now);
  const currentDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' }).format(now);

  const systemPrompt = RESTAURANT_SYSTEM_PROMPT
    .replace('{{CURRENT_DATE}}', currentDate)
    .replace('{{CURRENT_TIME}}', currentTime);

  try {
    const response = await axios.post(
      ULTRAVOX_API_URL,
      {
        systemPrompt: systemPrompt,
        model: 'fixie-ai/ultravox',
        voice: process.env.ULTRAVOX_VOICE_ID || 'Jessica',
        temperature: 0.8,
        medium: { webRtc: {} },
        selectedTools: [
          {
            temporaryTool: {
              modelToolName: 'checkAvailability',
              description: 'Check table availability for a specific date, time, and guest count.',
              dynamicParameters: [
                {
                  name: 'date',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                  required: true
                },
                {
                  name: 'time',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Time in HH:MM AM/PM format' },
                  required: true
                },
                {
                  name: 'guestCount',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'integer', description: 'Number of guests' },
                  required: true
                }
              ],
              client: {}
            }
          },
          {
            temporaryTool: {
              modelToolName: 'createBooking',
              description: 'Create a new table reservation.',
              dynamicParameters: [
                {
                  name: 'name',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Customer name' },
                  required: true
                },
                {
                  name: 'phone',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Customer phone number' },
                  required: true
                },
                {
                  name: 'date',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Reservation date (YYYY-MM-DD)' },
                  required: true
                },
                {
                  name: 'time',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Reservation time (HH:MM AM/PM)' },
                  required: true
                },
                {
                  name: 'guests',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'integer', description: 'Number of guests' },
                  required: true
                },
                {
                  name: 'preference',
                  location: 'PARAMETER_LOCATION_BODY',
                  schema: { type: 'string', description: 'Seating preference' },
                  required: false
                }
              ],
              client: {}
            }
          },
          {
            temporaryTool: {
              modelToolName: 'getMenu',
              description: 'Get the restaurant menu and today\'s special.',
              client: {}
            }
          },
          {
            temporaryTool: {
              modelToolName: 'getRestaurantInfo',
              description: 'Get information about Savory restaurant like location, hours, etc.',
              client: {}
            }
          }
        ]
      },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent,
        timeout: 60000 // 60 seconds timeout
      }
    );

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      console.error('Ultravox API Socket Hang Up. Retrying with connection: close header...');
      // If keep-alive fails, try once more with connection: close
      const retryResponse = await axios.post(
        ULTRAVOX_API_URL,
        {
          systemPrompt: systemPrompt,
          model: 'fixie-ai/ultravox',
          voice: process.env.ULTRAVOX_VOICE_ID || 'Jessica',
          temperature: 0.8,
          medium: { webRtc: {} },
          selectedTools: [
            {
              temporaryTool: {
                modelToolName: 'checkAvailability',
                description: 'Check table availability for a specific date, time, and guest count.',
                dynamicParameters: [
                  {
                    name: 'date',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                    required: true
                  },
                  {
                    name: 'time',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Time in HH:MM AM/PM format' },
                    required: true
                  },
                  {
                    name: 'guestCount',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'integer', description: 'Number of guests' },
                    required: true
                  }
                ],
                client: {}
              }
            },
            {
              temporaryTool: {
                modelToolName: 'createBooking',
                description: 'Create a new table reservation.',
                dynamicParameters: [
                  {
                    name: 'name',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Customer name' },
                    required: true
                  },
                  {
                    name: 'phone',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Customer phone number' },
                    required: true
                  },
                  {
                    name: 'date',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Reservation date (YYYY-MM-DD)' },
                    required: true
                  },
                  {
                    name: 'time',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Reservation time (HH:MM AM/PM)' },
                    required: true
                  },
                  {
                    name: 'guests',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'integer', description: 'Number of guests' },
                    required: true
                  },
                  {
                    name: 'preference',
                    location: 'PARAMETER_LOCATION_BODY',
                    schema: { type: 'string', description: 'Seating preference' },
                    required: false
                  }
                ],
                client: {}
              }
            },
            {
              temporaryTool: {
                modelToolName: 'getMenu',
                description: 'Get the restaurant menu and today\'s special.',
                client: {}
              }
            },
            {
              temporaryTool: {
                modelToolName: 'getRestaurantInfo',
                description: 'Get information about Savory restaurant like location, hours, etc.',
                client: {}
              }
            }
          ]
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Connection': 'close'
          },
          timeout: 60000
        }
      );
      return retryResponse.data;
    }
    throw error;
  }
}

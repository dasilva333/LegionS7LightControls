const axios = require('axios');
const { mergeGodModeState, getGodModeState } = require('../services/godmodeConfigStore');
const { sendCommand } = require('../frida/proxy');

// --- Configuration ---
// Ideally move this to process.env later
const API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const POLL_INTERVAL = 15 * 60 * 1000; // 15 Minutes

let timer = null;

/**
 * Maps OpenWeatherMap Condition IDs to GodMode States
 */
function mapWeatherCondition(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'STORM';
    if (weatherId >= 300 && weatherId < 400) return 'RAIN';
    if (weatherId >= 500 && weatherId < 600) {
        if (weatherId === 500 || weatherId === 501) return 'RAIN';
        return 'STORM'; 
    }
    if (weatherId >= 600 && weatherId < 700) return 'RAIN'; // Snow
    return 'CLEAR';
}

async function fetchWeather() {
    try {
        const currentState = await getGodModeState();
        
        // Check if zip is configured in the DB state
        const zip = currentState.weatherSettings?.zipCode;
        const country = currentState.weatherSettings?.country || 'us';

        if (!zip) {
            // Silent return if not configured yet
            return;
        }

        const url = `${BASE_URL}?zip=${zip},${country}&appid=${API_KEY}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;

        const weatherId = data.weather[0].id;
        const condition = mapWeatherCondition(weatherId);
        const tempC = data.main.temp;
        // Convert to F if you prefer, or keep C and let frontend handle display
        // const tempF = (tempC * 9/5) + 32; 

        console.log(`[WeatherDaemon] ${data.name}: ${data.weather[0].main} (${condition}) | Temp: ${tempC}°C`);

        // 1. Update DB
        await mergeGodModeState({
            weather: {
                condition: condition,
                stormOverride: currentState.weather.stormOverride,
                dedicatedKeys: currentState.weather.dedicatedKeys
            },
            widgets: {
                ...currentState.widgets,
                temperature: {
                    ...currentState.widgets.temperature,
                    value: tempC
                }
            }
        });

        // 2. Sync Frida immediately
        await sendCommand('updateState', { 
            weather: { condition }, 
            widgets: { temperature: { value: tempC } } 
        });

    } catch (error) {
        console.error('[WeatherDaemon] Error:', error.response?.data?.message || error.message);
    }
}

function start() {
    if (timer) return;
    console.log('[WeatherDaemon] Started. Polling every 15m.');
    
    // Initial fetch after a short delay to let server boot
    setTimeout(fetchWeather, 5000);
    
    // Loop
    timer = setInterval(fetchWeather, POLL_INTERVAL);
}

// Auto-start on require
if (API_KEY !== 'YOUR_OPENWEATHER_API_KEY') {
    start();
} else {
    console.warn('[WeatherDaemon] Skipped: No API Key configured.');
}

module.exports = { fetchWeather }; // Export for testing if needed
// Reverse-geocode coordinates to a location name using OpenStreetMap Nominatim
async function fetchLocationName(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}` +
              `&zoom=10&addressdetails=1&accept-language=en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Location data fetch failed');
  }
  const data = await response.json();
  if (data.address) {
    const { city, town, village, county, state } = data.address;
    return city || town || village || county || state || 'Unknown location';
  }
  if (data.display_name) {
    return data.display_name;
  }
  return 'Unknown location';
}

// Fetch current weather and daily forecast
async function fetchWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current_weather=true` +
              `&hourly=uv_index,weathercode,temperature_2m` +
              `&daily=temperature_2m_max,temperature_2m_min,uv_index_max` +
              `&timezone=auto&temperature_unit=celsius&windspeed_unit=kmh`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather data fetch failed');
  }
  return await response.json();
}
// Classify UV index into Böckchenindex category
function classifyUVRisk(uv) {
  if (uv == null) return 'Unknown';
  if (uv <= 2) return 'Böckchenindex: 1';
  if (uv <= 5) return 'Böckchenindex: 2';
  if (uv <= 7) return 'Böckchenindex: 3';
  if (uv <= 10) return 'Böckchenindex: 4';
  return 'Böckchenindex: 5';
}
// Map weather code to icon (emoji)
function mapWeatherCodeToIcon(code) {
  const codeMap = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    56: '🌧️', 57: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
    80: '🌧️', 81: '🌧️', 82: '🌧️',
    85: '❄️', 86: '❄️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  return codeMap[code] || '❓';
}
// Display hourly forecast for the current day
function displayHourly(hourlyData) {
  const hourlyDiv = document.getElementById('hourly');
  hourlyDiv.innerHTML = '';
  if (!hourlyData || !hourlyData.time) {
    hourlyDiv.innerHTML = '<p>No hourly data available.</p>';
    return;
  }
  // Debug hourly data to ensure it is fetched correctly
  console.log('Hourly Data:', hourlyData);
  const times = hourlyData.time;
  const temps = hourlyData.temperature_2m;
  const codes = hourlyData.weathercode;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  for (let i = 0; i < times.length; i++) {
    const parts = times[i].split('T');
    const datePart = parts[0];
    const timePart = parts[1];
    const hour = parseInt(timePart.split(':')[0], 10);
    if (datePart !== todayStr || hour < currentHour) continue;
    const temp = temps[i];
    const icon = mapWeatherCodeToIcon(codes[i]);
    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <p class="hourly-time">${hour}:00</p>
      <p class="hourly-icon">${icon}</p>
      <p class="hourly-temp">${temp}°</p>
    `;
    hourlyDiv.appendChild(card);
  }
}

// Display current weather with UV index and cancer risk
function displayWeather(weather, hourlyData) {
  const weatherDiv = document.getElementById('weather');
  // Extract UV index for current time
  let uvIndex = null;
  if (hourlyData && hourlyData.time && hourlyData.uv_index) {
    const idx = hourlyData.time.findIndex(t => t === weather.time);
    if (idx !== -1) uvIndex = hourlyData.uv_index[idx];
  }
  const uvText = uvIndex != null ? uvIndex : 'N/A';
  const uvRisk = uvIndex != null ? classifyUVRisk(uvIndex) : 'Unknown';
  weatherDiv.innerHTML = `
    <p>Temperature: ${weather.temperature}°C</p>
    <p>Wind Speed: ${weather.windspeed} km/h</p>
    <p>Wind Direction: ${weather.winddirection}°</p>
    <p class="uv-info">UV Index: ${uvText} (${uvRisk})</p>
  `;
}

// Modify the displayForecast function to include Aperol chance calculation
function displayForecast(daily) {
  const forecastDiv = document.getElementById('forecast');
  forecastDiv.innerHTML = '';
  // Skip the first day (today) to show upcoming days
  for (let i = 1; i < daily.time.length; i++) {
    const date = daily.time[i];
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];
    const weatherCode = daily.weathercode[i];

    // Calculate Aperol score based on weather conditions
    let aperolScore = 1; // Default to 1 for bad weather
    if (weatherCode <= 3) { // Clear to partly cloudy
      aperolScore = 4;
    } else if (weatherCode <= 48) { // Foggy
      aperolScore = 3;
    } else if (weatherCode <= 55) { // Light drizzle
      aperolScore = 2;
    }
    const aperolEmojis = '🍹'.repeat(aperolScore);

    const card = document.createElement('div');
    card.className = 'forecast-card';
    const dt = new Date(date);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = dt.toLocaleDateString(undefined, options);
    const uvMax = daily.uv_index_max[i];
    const uvRisk = classifyUVRisk(uvMax);
    card.innerHTML = `
      <p class="forecast-date">${dateStr}</p>
      <p class="forecast-temp">High: ${max}°C</p>
      <p class="forecast-temp">Low: ${min}°C</p>
      <p class="forecast-aperol">${aperolEmojis}</p>
      <p class="forecast-uv">UV Index: ${uvMax} (${uvRisk})</p>
    `;
    forecastDiv.appendChild(card);
  }
}

// Display error messages for both weather and forecast
function showError(message) {
  const weatherDiv = document.getElementById('weather');
  weatherDiv.innerHTML = `<p class="error">${message}</p>`;
  const forecastDiv = document.getElementById('forecast');
  if (forecastDiv) forecastDiv.innerHTML = '';
}

// Ensure UV index data is correctly passed to displayWeather
window.addEventListener('load', () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        // Display location name
        const locationName = await fetchLocationName(latitude, longitude);
        const locEl = document.getElementById('location');
        if (locEl) locEl.textContent = locationName;

        // Fetch weather and forecast
        const data = await fetchWeatherData(latitude, longitude);
        displayWeather(data.current_weather, data.hourly);
        displayHourly(data.hourly);
        displayForecast(data.daily);
      } catch (err) {
        showError(err.message);
      }
    }, (error) => {
      showError('Geolocation error: ' + error.message);
    });
  } else {
    showError('Geolocation is not supported by your browser.');
  }
});

// Add trippy mode functionality
let trippyInterval = null;

function enableTrippyMode() {
  const body = document.body;
  let hue = 0;
  trippyInterval = setInterval(() => {
    hue = (hue + 10) % 360;
    body.style.background = `hsl(${hue}, 100%, 50%)`;
    body.style.backgroundImage = `radial-gradient(circle, hsl(${(hue + 60) % 360}, 100%, 50%), hsl(${(hue + 120) % 360}, 100%, 50%))`;
  }, 100);

  // Update button text
  const button = document.getElementById('trippy-mode');
  button.textContent = 'Disable Trippy Mode';
}

function disableTrippyMode() {
  if (trippyInterval) {
    clearInterval(trippyInterval);
    trippyInterval = null;
  }
  const body = document.body;
  body.style.background = '#e0f7fa';
  body.style.backgroundImage = 'none';
  
  // Update button text
  const button = document.getElementById('trippy-mode');
  button.textContent = 'Trippy Mode';
}

// Attach event listener to the button
const trippyButton = document.getElementById('trippy-mode');
if (trippyButton) {
  trippyButton.addEventListener('click', () => {
    if (trippyInterval) {
      disableTrippyMode();
    } else {
      enableTrippyMode();
    }
  });
}
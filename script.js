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
              `&hourly=uv_index` +
              `&daily=temperature_2m_max,temperature_2m_min,uv_index_max` +
              `&timezone=auto&temperature_unit=celsius&windspeed_unit=kmh`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather data fetch failed');
  }
  return await response.json();
}
// Classify UV index into cancer risk category
function classifyUVRisk(uv) {
  if (uv == null) return 'Unknown';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
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
    <p class="uv-info">UV Index: ${uvText} (${uvRisk} cancer risk)</p>
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

    // Calculate Aperol chance based on temperature
    const averageTemp = (max + min) / 2;
    const aperolChance = Math.max(1, Math.round((averageTemp - 3) / 2)); // Ensure at least 1 Aperol

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
      <p class="forecast-aperol">Aperol Chance: ${aperolChance}</p>
      <p class="forecast-uv">UV Index: ${uvMax} (${uvRisk} cancer risk)</p>
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
function enableTrippyMode() {
  const body = document.body;
  let hue = 0;
  const interval = setInterval(() => {
    hue = (hue + 10) % 360;
    body.style.background = `hsl(${hue}, 100%, 50%)`;
    body.style.backgroundImage = `radial-gradient(circle, hsl(${(hue + 60) % 360}, 100%, 50%), hsl(${(hue + 120) % 360}, 100%, 50%))`;
  }, 100);

  // Disable trippy mode when button is clicked again
  const button = document.getElementById('trippy-mode');
  button.textContent = 'Disable Trippy Mode';
  button.onclick = () => {
    clearInterval(interval);
    body.style.background = '#e0f7fa'; // Reset to original background
    body.style.backgroundImage = 'none';
    button.textContent = 'Trippy Mode';
    button.onclick = enableTrippyMode;
  };
}

// Attach event listener to the button
const trippyButton = document.getElementById('trippy-mode');
if (trippyButton) {
  trippyButton.addEventListener('click', enableTrippyMode);
}
# Weather App

A simple web application that shows current weather data and a multi-day forecast based on your browser's geolocation. It also displays your detected city name. It uses the free Open-Meteo API (no API key required).

## Usage

1. Clone or download this repository.
2. Serve the files via a local HTTP server (required for geolocation API):
   - Using Python 3: `python3 -m http.server 8000`
   - Or using Node.js: `npx http-server . -p 8000`
3. Open your browser at `http://localhost:8000`.
4. Allow the page to access your location. The current weather data for your location will be displayed.

## Files

- `index.html`: The main HTML file.
- `style.css`: Basic styling.
- `script.js`: JavaScript code to fetch and display weather data.

## License

This project is provided as-is.
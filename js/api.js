const WEATHER_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const RADIO_URL = "https://de1.api.radio-browser.info/json/stations/search";

async function checkedFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
  }
  return response;
}

export async function fetchWeather({ city = "Eindhoven", unit = "celsius", signal } = {}) {
  const geoUrl = new URL(GEO_BASE);
  geoUrl.search = new URLSearchParams({ name: city, count: "1", language: "ru", format: "json" });

  const geoResponse = await checkedFetch(geoUrl, { signal });
  const geoData = await geoResponse.json();
  const place = geoData.results?.[0];
  if (!place) throw new Error(`Не удалось найти город «${city}». Проверь название и повтори.`);

  const weatherUrl = new URL(WEATHER_BASE);
  weatherUrl.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    temperature_unit: unit,
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
    timezone: "auto"
  });

  const weatherResponse = await checkedFetch(weatherUrl, { signal });
  const weatherData = await weatherResponse.json();
  if (!weatherData.current) throw new Error("Погодный сервис не вернул текущие данные.");
  return { place, current: weatherData.current, unit };
}

export async function fetchAmbientStations(signal) {
  const url = new URL(RADIO_URL);
  url.search = new URLSearchParams({ tag: "ambient", limit: "8", hidebroken: "true", order: "clickcount", reverse: "true" });
  const response = await checkedFetch(url, { signal });
  const stations = await response.json();
  if (!Array.isArray(stations)) throw new Error("Музыкальный сервис вернул неожиданный формат.");
  const usable = stations.filter(station => station.name && (station.url_resolved || station.url));
  if (!usable.length) throw new Error("Сейчас не удалось найти доступные ambient-станции.");
  return usable.slice(0, 6);
}

export function weatherDescription(code) {
  if (code === 0) return "Ясное небо";
  if ([1, 2].includes(code)) return "Небольшая облачность";
  if (code === 3) return "Пасмурно";
  if ([45, 48].includes(code)) return "Туман";
  if ([51, 53, 55, 56, 57].includes(code)) return "Морось";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Дождь";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Снег";
  if ([95, 96, 99].includes(code)) return "Гроза";
  return "Погода меняется";
}

export function weatherIcon(code, isDay = 1) {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3, 45, 48].includes(code)) return "☁️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌥️";
}

import { Dashboard } from "./Dashboard.js";
import { widgetMeta } from "./widgets.js";
import {
  fetchWeather,
  fetchAmbientStations,
  weatherDescription,
  weatherIcon
} from "./api.js";
import { playSoftClick } from "./audio.js";
import { loadAppState, saveAppState } from "./storage.js";

const grid = document.querySelector("#widget-grid");
const count = document.querySelector("#widget-count");
const toast = document.querySelector("#toast");
let toastTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setApiState(card, { loading = false, error = "", status = "" } = {}) {
  const statusEl = card.querySelector("[data-api-status]");
  const errorEl = card.querySelector("[data-api-error]");
  const retry = card.querySelector('[data-action="retry-api"]');

  if (statusEl) {
    statusEl.textContent = status || (loading ? "Загрузка…" : "");
    statusEl.hidden = !statusEl.textContent;
  }
  if (errorEl) {
    errorEl.textContent = error;
    errorEl.hidden = !error;
  }
  if (retry) retry.disabled = loading;
  card.classList.toggle("is-loading", loading);
}

function buildSudokuImage(values, difficulty = "Средняя") {
  const size = 300;
  const cell = size / 9;
  const lines = [];
  const numbers = [];
  for (let i = 0; i <= 9; i++) {
    const position = 10 + i * cell;
    const stroke = i % 3 === 0 ? "#485647" : "#d5d9cb";
    const strokeWidth = i % 3 === 0 ? 2.2 : 0.8;
    lines.push(`<line x1="10" y1="${position}" x2="310" y2="${position}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    lines.push(`<line x1="${position}" y1="10" x2="${position}" y2="310" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
  }
  values.forEach((row, r) => row.forEach((value, c) => {
    if (!value) return;
    const x = 10 + c * cell + cell / 2;
    const y = 10 + r * cell + cell / 2 + 6;
    numbers.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="15" font-weight="${value ? 600 : 400}" fill="#30392f">${value}</text>`);
  }));
  const safeDifficulty = String(difficulty).replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="354" viewBox="0 0 320 354">
    <rect x="0" y="0" width="320" height="354" rx="10" fill="#fffdf6"/>
    <text x="10" y="17" font-family="Verdana, Arial, sans-serif" font-size="8" letter-spacing="1.8" fill="#7b8976">A LITTLE PAUSE · SUDOKU</text>
    <rect x="254" y="4" width="56" height="18" rx="9" fill="#e4eddf"/>
    <text x="282" y="16" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="8" font-weight="700" fill="#536c50">${safeDifficulty.slice(0, 10)}</text>
    <rect x="10" y="10" width="300" height="300" rx="2" fill="#fffdf6" stroke="#485647" stroke-width="2.2"/>
    ${lines.join("")}${numbers.join("")}
    <text x="160" y="337" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="8" letter-spacing="1.4" fill="#9ba494">SLOW DOWN · BREATHE · PLAY</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function loadSudoku(component) {
  const card = component.element;
  if (!card || component.destroyed) return;
  const image = card.querySelector('[data-sudoku-image]');
  const status = card.querySelector('[data-sudoku-status]');
  const error = card.querySelector('[data-sudoku-error]');
  if (!image || !status || !error) return;

  component.abortControllers.forEach(activeController => activeController.abort());
  const controller = component.createAbortController();
  image.hidden = true;
  image.removeAttribute('src');
  error.hidden = true;
  error.textContent = '';
  status.hidden = false;
  status.textContent = 'Ищем новую головоломку…';
  const refresh = card.querySelector('[data-action="refresh-sudoku"]');
  if (refresh) refresh.disabled = true;

  try {
    const response = await fetch('https://sudoku-api.vercel.app/api/dosuku', { signal: controller.signal });
    if (!response.ok) throw new Error(`Сервис ответил ${response.status}.`);
    const data = await response.json();
    const grid = data?.newboard?.grids?.[0]?.value || data?.grid?.value || data?.grid || data?.value;
    if (!Array.isArray(grid) || grid.length !== 9 || grid.some(row => !Array.isArray(row) || row.length !== 9 || row.some(n => !Number.isInteger(n) || n < 0 || n > 9))) {
      throw new Error('Сервис вернул судоку в неожиданном формате.');
    }
    if (component.destroyed || controller.signal.aborted) return;
    const difficulty = data?.newboard?.grids?.[0]?.difficulty || data?.difficulty || 'Средняя';
    image.src = buildSudokuImage(grid, difficulty);
    image.alt = `Судоку из API, сложность: ${difficulty}. Статичное изображение головоломки.`;
    image.hidden = false;
    status.hidden = true;
  } catch (requestError) {
    if (requestError.name === 'AbortError' || component.destroyed) return;
    status.hidden = true;
    error.textContent = `Не удалось загрузить судоку. ${requestError.message} Нажми ↻, чтобы попробовать ещё раз.`;
    error.hidden = false;
  } finally {
    component.releaseAbortController(controller);
    if (!component.destroyed && refresh) refresh.disabled = false;
  }
}

function weatherMarkup(data, unit) {
  const current = data.current;
  const tempUnit = unit === "fahrenheit" ? "°F" : "°C";
  const windUnit = unit === "fahrenheit" ? "mph" : "км/ч";
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const wind = Math.round(current.wind_speed_10m);

  return `<div class="weather-display">
      <div class="weather-icon">${weatherIcon(current.weather_code, current.is_day)}</div>
      <div class="temperature">${temp}${tempUnit}</div>
      <div class="weather-place">${escapeHtml(data.place.name)}${data.place.country ? `, ${escapeHtml(data.place.country)}` : ""}</div>
      <div class="weather-caption">${weatherDescription(current.weather_code)}</div>
    </div>
    <div class="weather-stats">
      <div class="weather-stat">Ощущается<strong>${feels}${tempUnit}</strong></div>
      <div class="weather-stat">Ветер<strong>${wind} ${windUnit}</strong></div>
      <div class="weather-stat">Влажность<strong>${Math.round(current.relative_humidity_2m)}%</strong></div>
      <div class="weather-stat">Осадки<strong>${Number(current.precipitation).toLocaleString("ru-RU")} мм</strong></div>
    </div>
    <p class="mini-label api-caption">Данные Open-Meteo · ${escapeHtml(current.time.replace("T", " "))}</p>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function loadWeather(component, { city, unit } = {}) {
  const card = component.element;
  if (!card || component.destroyed) return;

  const cityInput = card.querySelector("[data-weather-city]");
  const chosenCity = (city ?? cityInput?.value ?? "Eindhoven").trim();
  const chosenUnit = unit ?? card.dataset.temperatureUnit ?? "celsius";
  if (!chosenCity) {
    setApiState(card, { error: "Введи название города." });
    return;
  }

  card.dataset.temperatureUnit = chosenUnit;
  card.querySelectorAll("[data-unit]").forEach(button => {
    const active = button.dataset.unit === chosenUnit;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const result = card.querySelector("[data-api-result]");
  component.abortControllers.forEach(activeController => activeController.abort());
  const controller = component.createAbortController();
  result.replaceChildren();
  setApiState(card, { loading: true, status: `Ищем погоду: ${chosenCity}…` });

  try {
    const data = await fetchWeather({
      city: chosenCity,
      unit: chosenUnit,
      signal: controller.signal
    });
    if (component.destroyed || controller.signal.aborted) return;
    result.innerHTML = weatherMarkup(data, chosenUnit);
    setApiState(card, { status: "Погода обновлена ✦" });
  } catch (error) {
    if (error.name === "AbortError" || component.destroyed) return;
    result.replaceChildren();
    setApiState(card, { error: `Не удалось загрузить погоду. ${error.message}` });
  } finally {
    component.releaseAbortController(controller);
    if (!component.destroyed) {
      const retry = card.querySelector('[data-action="retry-api"]');
      if (retry) retry.disabled = false;
    }
  }
}

async function loadMusic(component) {
  const card = component.element;
  if (!card || component.destroyed) return;

  const result = card.querySelector("[data-api-result]");
  component.abortControllers.forEach(activeController => activeController.abort());
  const controller = component.createAbortController();
  result.replaceChildren();
  setApiState(card, { loading: true, status: "Ищем уютные ambient-станции…" });

  try {
    const stations = await fetchAmbientStations(controller.signal);
    if (component.destroyed || controller.signal.aborted) return;

    result.innerHTML = `<div class="station-list">${stations.map((station, index) => {
      const stream = station.url_resolved || station.url;
      const stationName = escapeHtml(station.name);
      const country = escapeHtml(station.country || "Интернет-радио");
      return `<div class="station-item">
        <div class="station-meta"><span class="station-number">${String(index + 1).padStart(2, "0")}</span>
          <div><strong>${stationName}</strong><small>${country}</small></div></div>
        <audio controls preload="none" src="${escapeHtml(stream)}" aria-label="Воспроизвести ${stationName}"></audio>
      </div>`;
    }).join("")}</div>`;
    setApiState(card, { status: `Найдено станций: ${stations.length}` });
  } catch (error) {
    if (error.name === "AbortError" || component.destroyed) return;
    result.replaceChildren();
    setApiState(card, { error: `Не удалось загрузить список музыки. ${error.message}` });
  } finally {
    component.releaseAbortController(controller);
    if (!component.destroyed) {
      const retry = card.querySelector('[data-action="retry-api"]');
      if (retry) retry.disabled = false;
    }
  }
}

function bindWidgetInteractions(component, type) {
  const card = component.element;
  if (!card) return;

  if (type === "todo") {
    const form = card.querySelector("[data-task-form]");
    const input = card.querySelector("[data-task-input]");
    component.listen(form, "submit", event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      tasks = [...tasks, { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, done: false }].slice(-200);
      input.value = "";
      renderTasks();
      persistState();
    });
    renderTasks();
  }

  if (type === "sudoku") {
    component.listen(card.querySelector('[data-action="refresh-sudoku"]'), "click", () => loadSudoku(component));
    loadSudoku(component);
  }

  if (type === "weather") {
    card.dataset.temperatureUnit = "celsius";
    component.listen(card.querySelector("[data-weather-form]"), "submit", event => {
      event.preventDefault();
      loadWeather(component, { city: card.querySelector("[data-weather-city]").value });
    });
    card.querySelectorAll("[data-unit]").forEach(button => {
      component.listen(button, "click", () => {
        loadWeather(component, { unit: button.dataset.unit });
      });
    });
    component.listen(card.querySelector('[data-action="retry-api"]'), "click", () => loadWeather(component));
    loadWeather(component);
  }

  if (type === "sounds") {
    component.listen(card.querySelector('[data-action="retry-api"]'), "click", () => loadMusic(component));
    loadMusic(component);
  }


  const resetButton = card.querySelector('[data-action="reset-clicker"]');
  if (resetButton) {
    component.listen(resetButton, "click", () => {
      const value = card.querySelector(".click-count-value");
      if (value) value.textContent = "0";
      const heart = card.querySelector(".big-toggle");
      if (heart) heart.textContent = "♡";
      notify("Счётчик сброшен");
    });
  }

  const heart = card.querySelector(".big-toggle");
  if (heart) {
    component.listen(heart, "click", () => {
      const value = card.querySelector(".click-count-value");
      if (value) value.textContent = String(Number(value.textContent) + 1);
      heart.textContent = heart.textContent === "♡" ? "♥" : "♡";
      playSoftClick();
    });
  }

  let selectedColor = "#f2d58b";
  card.querySelectorAll(".swatch").forEach(swatch => {
    component.listen(swatch, "click", () => {
      selectedColor = swatch.dataset.color;
      card.querySelectorAll(".swatch").forEach(item => {
        item.setAttribute("aria-pressed", String(item === swatch));
      });
    });
  });

  card.querySelectorAll("[data-part]").forEach(part => {
    component.listen(part, "click", () => part.setAttribute("fill", selectedColor));
    component.listen(part, "keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        part.setAttribute("fill", selectedColor);
      }
    });
  });
}

const appState = loadAppState();
let tasks = appState.tasks;

function persistState(widgetTypes = dashboard.getTypes()) {
  saveAppState({ widgetTypes, tasks });
}

function renderTasks() {
  const component = dashboard?.getWidget("widget-todo");
  const list = component?.element?.querySelector("[data-task-list]");
  if (!list) return;
  list.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "task-empty";
    empty.textContent = "Список пуст. Добавь небольшое дело или запланируй паузу.";
    list.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " is-done" : ""}`;
    const label = document.createElement("label");
    label.className = "task-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      tasks = tasks.map(current => current.id === task.id ? { ...current, done: checkbox.checked } : current);
      renderTasks();
      persistState();
    });
    const text = document.createElement("span");
    text.textContent = task.text;
    label.append(checkbox, text);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Удалить задачу: ${task.text}`);
    remove.addEventListener("click", () => {
      tasks = tasks.filter(current => current.id !== task.id);
      renderTasks();
      persistState();
    });
    item.append(label, remove);
    list.appendChild(item);
  });
}

const dashboard = new Dashboard({
  container: grid,
  countElement: count,
  notify,
  onWidgetReady: bindWidgetInteractions,
  onChange: types => saveAppState({ widgetTypes: types, tasks })
});

const defaultWidgets = ["todo", "sudoku", "weather", "coloring", "clicker", "sounds"];
const widgetTypesToRestore = appState.widgetTypes === null ? defaultWidgets : appState.widgetTypes;
widgetTypesToRestore.forEach(type => dashboard.addWidget(type));
if (!widgetTypesToRestore.length) {
  grid.innerHTML = '<div class="empty-state"><span>☁</span>Здесь пока тихо. Добавь виджет слева или сверху.</div>';
}
renderTasks();

document.querySelectorAll(".add-widget").forEach(button => {
  button.addEventListener("click", () => dashboard.addWidget(button.dataset.widget));
});

document.querySelector("#random-widget").addEventListener("click", () => {
  const available = Object.keys(widgetMeta).filter(type => !dashboard.hasType(type));
  if (!available.length) {
    notify("Все виджеты уже на доске ✿");
    return;
  }
  dashboard.addWidget(available[Math.floor(Math.random() * available.length)]);
});

document.querySelector("#reset-layout").addEventListener("click", () => {
  dashboard.clear();
  defaultWidgets.forEach(type => dashboard.addWidget(type));
  notify("Демонстрационная доска восстановлена");
});

const today = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long"
}).format(new Date());
document.querySelector("#today-label").textContent = today;

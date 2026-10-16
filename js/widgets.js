export const widgetMeta = {
  todo: { title: "Список дел", icon: "✓", color: "#dce9dc", wide: true },
  sudoku: { title: "Судоку", icon: "▦", color: "#dce9dc", wide: false },
  weather: { title: "Погода", icon: "☼", color: "#d8e8ee", wide: false },
  coloring: { title: "Раскраска", icon: "▧", color: "#f5dfdf", wide: false },
  clicker: { title: "Антистресс-кликер", icon: "♡", color: "#f4d9d5", wide: false },
  sounds: { title: "Уютный микшер", icon: "♫", color: "#e5def1", wide: true }
};

export function renderWidgetContent(type) {
  switch (type) {
    case "todo":
      return `
        <form class="task-form" data-task-form>
          <label class="sr-only" for="task-input">Новое дело</label>
          <input id="task-input" name="task" type="text" maxlength="240" data-task-input placeholder="Например, сделать перерыв на чай…" autocomplete="off" required>
          <button class="primary-button" type="submit">Добавить <span>＋</span></button>
        </form>
        <ul class="task-list" data-task-list aria-live="polite"></ul>`;
    case "sudoku":
      return `
        <div class="sudoku-picture" aria-label="Судоку как изображение">
          <div class="sudoku-picture-status" data-sudoku-status aria-live="polite">Загружаем судоку…</div>
          <img class="sudoku-api-image" data-sudoku-image alt="Судоку из внешнего API" hidden>
          <p class="sudoku-picture-error" data-sudoku-error role="status" hidden></p>
          <p class="sudoku-picture-note">Новая головоломка — по кнопке ↻ в заголовке</p>
        </div>`;
    case "weather":
      return `
        <form class="weather-search" data-weather-form>
          <label for="weather-city-${Math.random().toString(36).slice(2, 8)}">Город</label>
          <div class="weather-search-row">
            <input type="text" data-weather-city value="Eindhoven" maxlength="80" placeholder="Например, Eindhoven" required>
            <button class="small-button" type="submit">Найти</button>
          </div>
        </form>
        <div class="unit-switch" role="group" aria-label="Единицы температуры">
          <button type="button" data-unit="celsius" class="unit-button is-active" aria-pressed="true">°C</button>
          <button type="button" data-unit="fahrenheit" class="unit-button" aria-pressed="false">°F</button>
        </div>
        <div class="api-status" data-api-status>Загружаем погоду…</div>
        <div class="api-result" data-api-result>
          <div class="loading-skeleton weather-skeleton"></div>
        </div>
        <div class="api-error" data-api-error hidden></div>
        <div class="api-actions">
          <button class="small-button" type="button" data-action="retry-api">Повторить</button>

        </div>`;
    case "coloring":
      return `
        <div class="coloring-art">
          <svg viewBox="0 0 240 150" role="img" aria-label="Раскраска: домик, солнце и холмы">
            <circle data-part="sun" cx="183" cy="35" r="21" fill="#fffaf0"/>
            <path data-part="hill1" d="M0 125 Q55 63 113 125 Z" fill="#fffaf0"/>
            <path data-part="hill2" d="M85 137 Q155 55 240 137 Z" fill="#fffaf0"/>
            <path data-part="house" d="M77 91 L112 60 L147 91 V130 H77 Z" fill="#fffaf0"/>
            <path data-part="roof" d="M68 92 L112 52 L156 92 L147 96 L112 65 L77 96 Z" fill="#fffaf0"/>
            <rect data-part="door" x="105" y="103" width="17" height="27" rx="1" fill="#fffaf0"/>
            <rect data-part="window" x="84" y="99" width="13" height="13" fill="#fffaf0"/>
          </svg>
        </div>
        <div class="palette" aria-label="Палитра цветов">
          <button class="swatch" data-color="#f2d58b" style="background:#f2d58b" aria-label="Жёлтый" aria-pressed="true"></button>
          <button class="swatch" data-color="#d99791" style="background:#d99791" aria-label="Розовый" aria-pressed="false"></button>
          <button class="swatch" data-color="#86ad8b" style="background:#86ad8b" aria-label="Зелёный" aria-pressed="false"></button>
          <button class="swatch" data-color="#a8cbd7" style="background:#a8cbd7" aria-label="Голубой" aria-pressed="false"></button>
          <button class="swatch" data-color="#b9a8d7" style="background:#b9a8d7" aria-label="Сиреневый" aria-pressed="false"></button>
        </div>`;
    case "clicker":
      return `
        <div class="clicker-stage"><button class="big-toggle" aria-label="Нажать антистресс-кнопку">♡</button></div>
        <div class="click-count"><span class="click-count-value">0</span> нажатий</div>
        <div class="click-help">нажимай в своём ритме</div>`;
    case "sounds":
      return `
        <div class="api-status" data-api-status>Ищем уютные ambient-станции…</div>
        <div class="api-result" data-api-result>
          <div class="loading-skeleton sound-skeleton"></div>
        </div>
        <div class="api-error" data-api-error hidden></div>
        <div class="api-actions">
          <button class="small-button" type="button" data-action="retry-api">Повторить</button>

        </div>
`;
    default:
      return "";
  }
}

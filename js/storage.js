const STORAGE_KEY = "antistress-center-state-v1";
const VALID_WIDGETS = new Set(["todo", "sudoku", "weather", "coloring", "clicker", "sounds"]);

export function loadAppState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { widgetTypes: null, tasks: [] };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Неверная структура сохранения");
    }

    let widgetTypes = Array.isArray(parsed.widgetTypes)
      ? [...new Set(parsed.widgetTypes.filter(type => VALID_WIDGETS.has(type)))]
      : null;
    // Migrate old layouts: the task list used to live outside the widget grid.
    if (Array.isArray(widgetTypes) && Number(parsed.version || 1) < 2 && !widgetTypes.includes("todo")) {
      widgetTypes = ["todo", ...widgetTypes];
    }
    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.filter(task => task && typeof task.text === "string" && task.text.trim())
          .slice(0, 200)
          .map((task, index) => ({
            id: typeof task.id === "string" ? task.id : `task-restored-${index}`,
            text: task.text.slice(0, 240),
            done: task.done === true
          }))
      : [];

    return { widgetTypes, tasks };
  } catch (error) {
    // Повреждённый JSON, отключённое хранилище или запрет доступа не должны ломать UI.
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* storage недоступен */ }
    return { widgetTypes: null, tasks: [] };
  }
}

export function saveAppState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      widgetTypes: Array.isArray(state.widgetTypes) ? state.widgetTypes.filter(type => VALID_WIDGETS.has(type)) : [],
      tasks: Array.isArray(state.tasks) ? state.tasks.slice(0, 200) : []
    }));
    return true;
  } catch (error) {
    // QuotaExceededError / SecurityError: приложение продолжает работать в памяти.
    return false;
  }
}

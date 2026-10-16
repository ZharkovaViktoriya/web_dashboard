import { widgetMeta, renderWidgetContent } from "./widgets.js";

export class UIComponent {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.type = null;
    this.content = "";
    this.onRemove = null;
    this.element = null;
    this.cleanups = [];
    this.timers = new Set();
    this.abortControllers = new Set();
    this.destroyed = false;
  }

  render() {
    if (this.element) return this.element;

    const meta = widgetMeta[this.type] || {
      title: this.title,
      kicker: "ВИДЖЕТ",
      icon: "✦",
      color: "#e5def1",
      wide: false
    };

    const card = document.createElement("article");
    card.className = `widget-card ${meta.wide ? "wide" : ""}`;
    card.dataset.type = this.type || "";
    card.dataset.widgetId = this.id;
    card.innerHTML = `
      <header class="card-head">
        <div class="card-title-wrap">
          <span class="card-icon" style="background:${meta.color}">${meta.icon}</span>
          <div><h3 class="card-title">${this.title}</h3></div>
        </div>
        <div class="card-controls">
          ${this.type === "sudoku" ? '<button class="card-control sudoku-refresh" type="button" data-action="refresh-sudoku" title="Новое задание" aria-label="Новое задание">↻</button>' : ''}
          <button class="card-control" type="button" data-action="collapse" title="Свернуть или развернуть" aria-label="Свернуть виджет" aria-expanded="true">−</button>
          <button class="card-control card-remove" type="button" data-action="remove" title="Удалить виджет" aria-label="Удалить виджет «${this.title}»">×</button>
        </div>
      </header>
      <div class="card-content">
        <div class="card-body">${this.content || renderWidgetContent(this.type)}</div>
        ${this.type === "clicker" ? '<footer class="card-foot"><span></span><button class="small-button" type="button" data-action="reset-clicker">Сбросить</button></footer>' : ''}
      </div>`;

    this.element = card;

    const collapseButton = card.querySelector('[data-action="collapse"]');
    this.listen(collapseButton, "click", () => {
      const collapsed = card.classList.toggle("is-collapsed");
      collapseButton.textContent = collapsed ? "+" : "−";
      collapseButton.setAttribute("aria-expanded", String(!collapsed));
      collapseButton.setAttribute("aria-label", collapsed ? "Развернуть виджет" : "Свернуть виджет");
    });

    this.listen(card.querySelector('[data-action="remove"]'), "click", () => {
      if (typeof this.onRemove === "function") this.onRemove(this.id);
      else this.destroy();
    });

    return card;
  }

  listen(target, eventName, handler, options) {
    if (!target || this.destroyed) return;
    target.addEventListener(eventName, handler, options);
    this.cleanups.push(() => target.removeEventListener(eventName, handler, options));
  }

  createAbortController() {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }

  releaseAbortController(controller) {
    this.abortControllers.delete(controller);
  }

  setTimer(callback, delay) {
    const timerId = window.setTimeout(() => {
      this.timers.delete(timerId);
      if (!this.destroyed) callback();
    }, delay);
    this.timers.add(timerId);
    return timerId;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();

    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];

    this.timers.forEach(timerId => window.clearTimeout(timerId));
    this.timers.clear();

    this.element?.querySelectorAll("audio").forEach(audio => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    });

    this.element?.remove();
    this.element = null;
    this.onRemove = null;
  }
}

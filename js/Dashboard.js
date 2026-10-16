import { UIComponent } from "./UIComponent.js";
import { ToDoWidget } from "./ToDoWidget.js";
import { widgetMeta, renderWidgetContent } from "./widgets.js";

export class Dashboard {
  constructor({ container, countElement, notify, onWidgetReady, onChange } = {}) {
    if (!container) throw new Error("Dashboard: требуется контейнер для виджетов.");
    this.container = container;
    this.countElement = countElement || null;
    this.notify = typeof notify === "function" ? notify : () => {};
    this.onWidgetReady = typeof onWidgetReady === "function" ? onWidgetReady : () => {};
    this.onChange = typeof onChange === "function" ? onChange : () => {};
    this.widgets = new Map();
    this.types = new Map();
  }

  addWidget(type) {
    const meta = widgetMeta[type];
    if (!meta) {
      this.notify("Такого типа виджета нет в списке.");
      return null;
    }
    if (this.types.has(type)) {
      this.notify(`«${meta.title}» уже добавлен на доску ✿`);
      this.widgets.get(this.types.get(type))?.element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }

    this.container.querySelector(".empty-state")?.remove();

    const id = `widget-${type}`;
    const component = type === "todo"
      ? new ToDoWidget(id, meta.title)
      : new UIComponent(id, meta.title);
    component.type = type;
    component.content = renderWidgetContent(type);
    component.onRemove = widgetId => this.removeWidget(widgetId);

    this.widgets.set(id, component);
    this.types.set(type, id);
    this.container.appendChild(component.render());
    this.updateCount();
    this.onWidgetReady(component, type);
    this.onChange(this.getTypes());
    return component;
  }

  removeWidget(id) {
    const component = this.widgets.get(id);
    if (!component) return false;

    const type = component.type;
    component.destroy();
    this.widgets.delete(id);
    if (this.types.get(type) === id) this.types.delete(type);
    this.updateCount();
    this.onChange(this.getTypes());

    if (this.widgets.size === 0) {
      this.container.innerHTML = `<div class="empty-state"><span>☁</span>Здесь пока тихо. Добавь виджет слева или сверху.</div>`;
    }
    this.notify("Виджет убран с доски");
    return true;
  }

  clear() {
    [...this.widgets.values()].forEach(component => component.destroy());
    this.widgets.clear();
    this.types.clear();
    this.container.innerHTML = "";
    this.updateCount();
    this.onChange(this.getTypes());
  }

  updateCount() {
    if (this.countElement) this.countElement.textContent = this.widgets.size;
  }

  getWidget(id) {
    return this.widgets.get(id) || null;
  }

  hasType(type) {
    return this.types.has(type);
  }

  getTypes() {
    return [...this.widgets.values()].map(component => component.type);
  }
}

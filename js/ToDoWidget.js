import { UIComponent } from "./UIComponent.js";
import { renderWidgetContent } from "./widgets.js";

/** Виджет списка дел на базе общей карточки UIComponent. */
export class ToDoWidget extends UIComponent {
  constructor(id, title = "Список дел") {
    super(id, title);
    this.type = "todo";
    this.content = renderWidgetContent("todo");
    this.tasks = [];
  }
}

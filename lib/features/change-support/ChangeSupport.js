'use strict';

var getElementType = require('../../util/Elements').getType;

/**
 * Adds change support to the diagram, including
	添加更改图形的执行
 *
 * <ul>
 *   <li>redrawing shapes and connections on change</li>
 * </ul>
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {ElementRegistry} elementRegistry
 * @param {GraphicsFactory} graphicsFactory
 */
function ChangeSupport(eventBus, canvas, elementRegistry, graphicsFactory) {

  // redraw shapes / connections on change
	// 重新绘制形状/连接
  eventBus.on('element.changed', function(event) {

    var element = event.element;

    // element might have been deleted and replaced by new element with same ID
    // thus check for parent of element except for root element
	// 元素可能被删除或者被取代检查根元素以外的元素
    if (element.parent || element === canvas.getRootElement()) {
      event.gfx = elementRegistry.getGraphics(element);
    }

    // shape + gfx may have been deleted
    if (!event.gfx) {
      return;
    }

    eventBus.fire(getElementType(element) + '.changed', event);
  });

  eventBus.on('elements.changed', function(event) {

    var elements = event.elements;

    elements.forEach(function(e) {
      eventBus.fire('element.changed', { element: e });
    });

    graphicsFactory.updateContainments(elements);
  });

  eventBus.on('shape.changed', function(event) {
    graphicsFactory.update('shape', event.element, event.gfx);
  });

  eventBus.on('connection.changed', function(event) {
    graphicsFactory.update('connection', event.element, event.gfx);
  });
}

ChangeSupport.$inject = [ 'eventBus', 'canvas', 'elementRegistry', 'graphicsFactory' ];

module.exports = ChangeSupport;

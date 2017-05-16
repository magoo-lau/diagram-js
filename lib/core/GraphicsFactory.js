'use strict';

var forEach = require('lodash/collection/forEach'),
    reduce = require('lodash/collection/reduce');

var GraphicsUtil = require('../util/GraphicsUtil');

var translate = require('../util/SvgTransformUtil').translate;

var domClear = require('min-dom/lib/clear');

var svgAppend = require('tiny-svg/lib/append'),
    svgAttr = require('tiny-svg/lib/attr'),
    svgClasses = require('tiny-svg/lib/classes'),
    svgCreate = require('tiny-svg/lib/create'),
    svgRemove = require('tiny-svg/lib/remove');


/**
 * A factory that creates graphical elements
 创建图形元素工厂类
 *
 * @param {EventBus} eventBus
 * @param {ElementRegistry} elementRegistry
 */
function GraphicsFactory(eventBus, elementRegistry) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
}

GraphicsFactory.$inject = [ 'eventBus' , 'elementRegistry' ];

module.exports = GraphicsFactory;


GraphicsFactory.prototype._getChildren = function(element) {

  var gfx = this._elementRegistry.getGraphics(element);

  var childrenGfx;

  // root element
  if (!element.parent) {
    childrenGfx = gfx;
  } else {
    childrenGfx = GraphicsUtil.getChildren(gfx);
    if (!childrenGfx) {
      childrenGfx = svgCreate('g');
      svgClasses(childrenGfx).add('djs-children');

      svgAppend(gfx.parentNode, childrenGfx);
    }
  }

  return childrenGfx;
};

/**
 * Clears the graphical representation of the element and returns the
 * cleared visual (the <g class="djs-visual" /> element).
	清除的图示元素并返回清除后的元素
 */
GraphicsFactory.prototype._clear = function(gfx) {
  var visual = GraphicsUtil.getVisual(gfx);

  domClear(visual);

  return visual;
};

/**
 * Creates a gfx container for shapes and connections
	创建一个图形和连接的gfx容器
 *
 * The layout is as follows:
	图形结构如下
 *
 * <g class="djs-group">
 *
 *   <!-- the gfx -->
 *   <g class="djs-element djs-(shape|connection)">
 *     <g class="djs-visual">
 *       <!-- the renderer draws in here -->
			渲染在如下。。
 *     </g>
 *
 *     <!-- extensions (overlays, click box, ...) goes here
		扩展（覆盖层，点击框等）在这里
 *   </g>
 *
 *   <!-- the gfx child nodes -->
		子节点
 *   <g class="djs-children"></g>
 * </g>
 *
 * @param {Object} parent
 * @param {String} type the type of the element, i.e. shape | connection
 */
GraphicsFactory.prototype._createContainer = function(type, parentGfx) {
  var outerGfx = svgCreate('g');
  svgClasses(outerGfx).add('djs-group');

  svgAppend(parentGfx, outerGfx);

  var gfx = svgCreate('g');
  svgClasses(gfx).add('djs-element');
  svgClasses(gfx).add('djs-' + type);

  svgAppend(outerGfx, gfx);

  // create visual
  var visual = svgCreate('g');
  svgClasses(visual).add('djs-visual');

  svgAppend(gfx, visual);

  return gfx;
};

GraphicsFactory.prototype.create = function(type, element) {
  var childrenGfx = this._getChildren(element.parent);
  return this._createContainer(type, childrenGfx);
};

//更新容器
GraphicsFactory.prototype.updateContainments = function(elements) {

  var self = this,
      elementRegistry = this._elementRegistry,
      parents;

  parents = reduce(elements, function(map, e) {

    if (e.parent) {
      map[e.parent.id] = e.parent;
    }

    return map;
  }, {});

  // update all parents of changed and reorganized their children
  // in the correct order (as indicated in our model)
  // 更新所有父节点的子节点 
  forEach(parents, function(parent) {

    var childGfx = self._getChildren(parent),
        children = parent.children;

    if (!children) {
      return;
    }

    forEach(children.slice().reverse(), function(c) {
      var gfx = elementRegistry.getGraphics(c);

      prependTo(gfx.parentNode, childGfx);
    });
  });
};
//渲染图形
GraphicsFactory.prototype.drawShape = function(visual, element) {
  var eventBus = this._eventBus;

  return eventBus.fire('render.shape', { gfx: visual, element: element });
};
//获取图形路径
GraphicsFactory.prototype.getShapePath = function(element) {
  var eventBus = this._eventBus;

  return eventBus.fire('render.getShapePath', element);
};

GraphicsFactory.prototype.drawConnection = function(visual, element) {
  var eventBus = this._eventBus;

  return eventBus.fire('render.connection', { gfx: visual, element: element });
};

GraphicsFactory.prototype.getConnectionPath = function(waypoints) {
  var eventBus = this._eventBus;

  return eventBus.fire('render.getConnectionPath', waypoints);
};
// 更新节点 
GraphicsFactory.prototype.update = function(type, element, gfx) {
  // Do not update root element 
  // 不更新父节点
  if (!element.parent) {
    return;
  }

  var visual = this._clear(gfx);

  // redraw
  if (type === 'shape') {
    this.drawShape(visual, element);

    // update positioning
	// 调整位置
    translate(gfx, element.x, element.y);
  } else
  if (type === 'connection') {
    this.drawConnection(visual, element);
  } else {
    throw new Error('unknown type: ' + type);
  }

  if (element.hidden) {
    svgAttr(gfx, 'display', 'none');
  } else {
    svgAttr(gfx, 'display', 'block');
  }
};

GraphicsFactory.prototype.remove = function(element) {
  var gfx = this._elementRegistry.getGraphics(element);

  // remove
  svgRemove(gfx.parentNode);
};

////////// helpers ///////////

function prependTo(newNode, parentNode) {
  parentNode.insertBefore(newNode, parentNode.firstChild);
}

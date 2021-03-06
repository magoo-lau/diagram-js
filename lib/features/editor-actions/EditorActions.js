'use strict';

var forEach = require('lodash/collection/forEach'),
    isArray = require('lodash/lang/isArray');

var NOT_REGISTERED_ERROR = 'is not a registered action',
    IS_REGISTERED_ERROR = 'is already registered';


/**
 * An interface that provides access to modeling actions by decoupling
 * the one who requests the action to be triggered and the trigger itself.
 一个接口,它提供了访问通过解耦建模操作 请求操作被触发,触发本身
 *
 * It's possible to add new actions by registering them with ´registerAction´ and likewise
 * unregister existing ones with ´unregisterAction´.
 注册事件行为
 *
 */
function EditorActions(eventBus, commandStack, modeling, selection,
  zoomScroll, copyPaste, canvas, rules, mouseTracking) {

  this._actions = {
    undo: function() {
      commandStack.undo();
    },
    redo: function() {
      commandStack.redo();
    },
    copy: function() {
      var selectedElements = selection.get();

      copyPaste.copy(selectedElements);
    },
    paste: function() {
      var context = mouseTracking.getHoverContext();

      copyPaste.paste(context);
    },
    stepZoom: function(opts) {
      zoomScroll.stepZoom(opts.value);
    },
    zoom: function(opts) {
      canvas.zoom(opts.value);
    },
    removeSelection: function() {
      var selectedElements = selection.get();

      if (selectedElements.length) {
        var allowed = rules.allowed('elements.delete', { elements: selectedElements }),
            removableElements;

        if (allowed === false) {
          return;
        }
        else if (isArray(allowed)) {
          removableElements = allowed;
        }
        else {
          removableElements = selectedElements;
        }

        if (removableElements.length) {
          modeling.removeElements(removableElements.slice());
        }
      }
    },
    moveCanvas: function(opts) {
      var dx = 0,
          dy = 0,
          invertY = opts.invertY,
          speed = opts.speed;

      var actualSpeed = speed / Math.min(Math.sqrt(canvas.viewbox().scale), 1);

      switch (opts.direction) {
      case 'left':    // Left
        dx = actualSpeed;
        break;
      case 'up':    // Up
        dy = actualSpeed;
        break;
      case 'right':    // Right
        dx = -actualSpeed;
        break;
      case 'down':    // Down
        dy = -actualSpeed;
        break;
      }

      if (dy && invertY) {
        dy = -dy;
      }

      canvas.scroll({ dx: dx, dy: dy });
    }
  };
}

EditorActions.$inject = [
  'eventBus',
  'commandStack',
  'modeling',
  'selection',
  'zoomScroll',
  'copyPaste',
  'canvas',
  'rules',
  'mouseTracking'
];

module.exports = EditorActions;


/**
 * Triggers a registered action
	触发注册的一个事件
 *
 * @param  {String} action
 * @param  {Object} opts
 *
 * @return {Unknown} Returns what the registered listener returns
 */
EditorActions.prototype.trigger = function(action, opts) {
  if (!this._actions[action]) {
    throw error(action, NOT_REGISTERED_ERROR);
  }

  return this._actions[action](opts);
};


/**
 * Registers a collections of actions.
 * The key of the object will be the name of the action.
	注册一个事件
 *
 * @example
 * ´´´
 * var actions = {
 *   spaceTool: function() {
 *     spaceTool.activateSelection();
 *   },
 *   lassoTool: function() {
 *     lassoTool.activateSelection();
 *   }
 * ];
 *
 * editorActions.register(actions);
 *
 * editorActions.isRegistered('spaceTool'); // true
 * ´´´
 *
 * @param  {Object} actions
 */
EditorActions.prototype.register = function(actions, listener) {
  if (typeof actions === 'string') {
    return this._registerAction(actions, listener);
  }

  forEach(actions, function(listener, action) {
    this._registerAction(action, listener);
  }, this);
};

/**
 * Registers a listener to an action key
 *
 * @param  {String} action
 * @param  {Function} listener
 */
EditorActions.prototype._registerAction = function(action, listener) {
  if (this.isRegistered(action)) {
    throw error(action, IS_REGISTERED_ERROR);
  }

  this._actions[action] = listener;
};

/**
 * Unregister an existing action
	 移除事件
 *
 * @param {String} action
 */
EditorActions.prototype.unregister = function(action) {
  if (!this.isRegistered(action)) {
    throw error(action, NOT_REGISTERED_ERROR);
  }

  this._actions[action] = undefined;
};

/**
 * Returns the number of actions that are currently registered
 返回事件数量
 *
 * @return {Number}
 */
EditorActions.prototype.length = function() {
  return Object.keys(this._actions).length;
};

/**
 * Checks wether the given action is registered
	检查是否注册
 *
 * @param {String} action
 *
 * @return {Boolean}
 */
EditorActions.prototype.isRegistered = function(action) {
  return !!this._actions[action];
};


function error(action, message) {
  return new Error(action + ' ' + message);
}

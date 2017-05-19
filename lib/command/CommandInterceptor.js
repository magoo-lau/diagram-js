'use strict';

var forEach = require('lodash/collection/forEach'),
    isFunction = require('lodash/lang/isFunction'),
    isArray = require('lodash/lang/isArray'),
    isNumber = require('lodash/lang/isNumber');


var DEFAULT_PRIORITY = 1000;


function isObject(element) {
  return typeof element === 'object';
}

/**
 * A utility that can be used to plug-in into the command execution for
 * extension and/or validation.
	一个插件用于命令的验证和扩展
 *
 * @param {EventBus} eventBus
 *
 * @example
 *
 * var inherits = require('inherits');
 *
 * var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');
 *
 * function CommandLogger(eventBus) {
 *   CommandInterceptor.call(this, eventBus);
 *
 *   this.preExecute(function(event) {
 *     console.log('command pre-execute', event);
 *   });
 * }
 *
 * inherits(CommandLogger, CommandInterceptor);
 *
 */
function CommandInterceptor(eventBus) {
  this._eventBus = eventBus;
}

CommandInterceptor.$inject = [ 'eventBus' ];

module.exports = CommandInterceptor;

function unwrapEvent(fn, that) {
  return function(event) {
    return fn.call(that || null, event.context, event.command, event);
  };
}

/**
 * Register an interceptor for a command execution
	为命令执行注册一个拦截器
 *
 * @param {String|Array<String>} [events] list of commands to register on		事件列表
 * @param {String} [hook] command hook, i.e. preExecute, executed to listen on	钩子 （前置后置执行等）
 * @param {Number} [priority] the priority on which to hook into the execution	优先级
 * @param {Function} handlerFn interceptor to be invoked with (event)
 * @param {Boolean} unwrap if true, unwrap the event and pass (context, command, event) to the
 *                          listener instead
 * @param {Object} [that] Pass context (`this`) to the handler function			执行上下文
 */
CommandInterceptor.prototype.on = function(events, hook, priority, handlerFn, unwrap, that) {

  if (isFunction(hook) || isNumber(hook)) {
    that = unwrap;
    unwrap = handlerFn;
    handlerFn = priority;
    priority = hook;
    hook = null;
  }

  if (isFunction(priority)) {
    that = unwrap;
    unwrap = handlerFn;
    handlerFn = priority;
    priority = DEFAULT_PRIORITY;
  }

  if (isObject(unwrap)) {
    that = unwrap;
    unwrap = false;
  }

  if (!isFunction(handlerFn)) {
    throw new Error('handlerFn must be a function');
  }

  if (!isArray(events)) {
    events = [ events ];
  }

  var eventBus = this._eventBus;

  forEach(events, function(event) {
    // concat commandStack(.event)?(.hook)?
    var fullEvent = [ 'commandStack', event, hook ].filter(function(e) { return e; }).join('.');

    eventBus.on(fullEvent, priority, unwrap ? unwrapEvent(handlerFn, that) : handlerFn, that);
  });
};


var hooks = [
  'canExecute',
  'preExecute',
  'preExecuted',
  'execute',
  'executed',
  'postExecute',
  'postExecuted',
  'revert',
  'reverted'
];

/*
 * Install hook shortcuts
	安装钩子快捷方式
 *
 * This will generate the CommandInterceptor#(preExecute|...|reverted) methods
 * which will in term forward to CommandInterceptor#on.
	这将生成CommandInterceptor #(preExecute | . |)方法  这将会在以后的命令拦截器上。
 */
forEach(hooks, function(hook) {

  /**
   * {canExecute|preExecute|preExecuted|execute|executed|postExecute|postExecuted|revert|reverted}
   *
   * A named hook for plugging into the command execution
	用于插入命令执行的命名钩子
   *
   * @param {String|Array<String>} [events] list of commands to register on
   * @param {Number} [priority] the priority on which to hook into the execution
   * @param {Function} handlerFn interceptor to be invoked with (event)
   * @param {Boolean} [unwrap=false] if true, unwrap the event and pass (context, command, event) to the
   *                          listener instead
   * @param {Object} [that] Pass context (`this`) to the handler function
   */
  CommandInterceptor.prototype[hook] = function(events, priority, handlerFn, unwrap, that) {

    if (isFunction(events) || isNumber(events)) {
      that = unwrap;
      unwrap = handlerFn;
      handlerFn = priority;
      priority = events;
      events = null;
    }

    this.on(events, hook, priority, handlerFn, unwrap, that);
  };
});

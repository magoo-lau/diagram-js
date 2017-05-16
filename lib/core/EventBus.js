'use strict';

var isFunction = require('lodash/lang/isFunction'),
    isArray = require('lodash/lang/isArray'),
    isNumber = require('lodash/lang/isNumber'),
    bind = require('lodash/function/bind'),
    assign = require('lodash/object/assign');

var FN_REF = '__fn';

//Ĭ���¼����ȼ� 
var DEFAULT_PRIORITY = 1000;

var slice = Array.prototype.slice;

/**
 * A general purpose event bus.
 ͨ���¼����ߡ�
 *
 * This component is used to communicate across a diagram instance.
 * Other parts of a diagram can use it to listen to and broadcast events.
 ��ǰ������ڴ���diagram��ʵ���¼����������ֵ�ͼ�������������㲥�¼�
 *
 *
 * ## Registering for Events
	ע���¼�
 *
 * The event bus provides the {@link EventBus#on} and {@link EventBus#once}
 * methods to register for events. {@link EventBus#off} can be used to
 * remove event registrations. Listeners receive an instance of {@link Event}
 * as the first argument. It allows them to hook into the event execution.
 *
 * ```javascript
 *
 * // listen for event
 * eventBus.on('foo', function(event) {
 *
 *   // access event type
 *   event.type; // 'foo'
 *
 *   // stop propagation to other listeners
 *   event.stopPropagation();
 *
 *   // prevent event default
 *   event.preventDefault();
 * });
 *
 * // listen for event with custom payload
	ʹ���Զ��帺�������¼�
 * eventBus.on('bar', function(event, payload) {
 *   console.log(payload);
 * });
 *
 * // listen for event returning value
	�����¼�����ֵ
 * eventBus.on('foobar', function(event) {
 *
 *   // stop event propagation + prevent default
	ֹͣ�¼�����+��ֹĬ��
 *   return false;
 *
 *   // stop event propagation + return custom result
	ֹͣ�¼�����+�����Զ�����
 *   return {
 *     complex: 'listening result'
 *   };
 * });
 *
 *
 * // listen with custom priority (default=1000, higher is better)
	 ����ʹ���Զ������ȼ�(Ĭ��= 1000,���ߵĸ���)
 * eventBus.on('priorityfoo', 1500, function(event) {
 *   console.log('invoked first!');
 * });
 *
 *
 * // listen for event and pass the context (`this`)
	 �����¼���ͨ��������(����this)
 * eventBus.on('foobar', function(event) {
 *   this.foo();
 * }, this);
 * ```
 *
 *
 * ## Emitting Events
	�����¼�
 *
 * Events can be emitted via the event bus using {@link EventBus#fire}.
 *
 * ```javascript
 *
 * // false indicates that the default action
 * // was prevented by listeners
	����false ��ʾ�Ѿ���ֹĬ���¼�
 * if (eventBus.fire('foo') === false) {
 *   console.log('default has been prevented!');
 * };
 *
 *
 * // custom args + return value listener
	 �Զ������+����ֵ ������
 * eventBus.on('sum', function(event, a, b) {
 *   return a + b;
 * });
 *
 * // you can pass custom arguments + retrieve result values.
 ������ͨ���Զ������+�������ֵ��
 * var sum = eventBus.fire('sum', 1, 2);
 * console.log(sum); // 3
 * ```
 */
function EventBus() {
  this._listeners = {};

  // cleanup on destroy on lowest priority to allow message passing until the bitter end
  // �����ڴݻ���������ȼ�������Ϣ����,ֱ�����
  this.on('diagram.destroy', 1, this._destroy, this);
}

module.exports = EventBus;


/**
 * Register an event listener for events with the given name.
	ע��һ���¼�������
 *
 * The callback will be invoked with `event, ...additionalArguments`
 * that have been passed to {@link EventBus#fire}.
	��ص������¼�
 *
 * Returning false from a listener will prevent the events default action
 * (if any is specified). To stop an event from being processed further in
 * other listeners execute {@link Event#stopPropagation}.
 *
 * Returning anything but `undefined` from a listener will stop the listener propagation.
	���س���`undefined`����κ�ֵ
 *
 * @param {String|Array<String>} events
	�¼�����
 * @param {Number} [priority=1000] the priority in which this listener is called, larger is higher
	���ȼ�
 * @param {Function} callback
	�ص�����
 * @param {Object} [that] Pass context (`this`) to the callback
	����ʱ����
 */
EventBus.prototype.on = function(events, priority, callback, that) {

  events = isArray(events) ? events : [ events ];
	
	// ����ڶ��������Ƿ��� �� ���ȼ�����ΪĬ��ֵ
  if (isFunction(priority)) {
    that = callback;
    callback = priority;
    priority = DEFAULT_PRIORITY;
  }

  if (!isNumber(priority)) {
    throw new Error('priority must be a number');
  }

  var actualCallback = callback;

  if (that) {
    actualCallback = bind(callback, that);

    // make sure we remember and are able to remove
    // bound callbacks via {@link #off} using the original
    // callback
	//ȷ�����Ǽ�ס����ɾ��ԭʼ����
    actualCallback[FN_REF] = callback[FN_REF] || callback;
  }

  var self = this,
      listener = { priority: priority, callback: actualCallback };

  events.forEach(function(e) {
    self._addListener(e, listener);
  });
};


/**
 * Register an event listener that is executed only once.
	ע��һ���¼�������,ִֻ��һ�Ρ�
 *
 * @param {String} event the event name to register for
 * @param {Function} callback the callback to execute
 * @param {Object} [that] Pass context (`this`) to the callback
 */
EventBus.prototype.once = function(event, priority, callback, that) {
  var self = this;

  if (isFunction(priority)) {
    that = callback;
    callback = priority;
    priority = DEFAULT_PRIORITY;
  }

  if (!isNumber(priority)) {
    throw new Error('priority must be a number');
  }

  function wrappedCallback() {
    self.off(event, wrappedCallback);
    return callback.apply(that, arguments);
  }

  // make sure we remember and are able to remove
  // bound callbacks via {@link #off} using the original
  // callback
  wrappedCallback[FN_REF] = callback;

  this.on(event, priority, wrappedCallback);
};


/**
 * Removes event listeners by event and callback.
 ɾ���¼����������¼��ͻص�
 *
 * If no callback is given, all listeners for a given event name are being removed.
	���û�лص������������е�ǰ���͵��¼����ᱻ�Ƴ�
 *
 * @param {String} event
 * @param {Function} [callback]
 */
EventBus.prototype.off = function(event, callback) {
  var listeners = this._getListeners(event),
      listener,
      listenerCallback,
      idx;

  if (callback) {

    // move through listeners from back to front
    // and remove matching listeners
    for (idx = listeners.length - 1; (listener = listeners[idx]); idx--) {
      listenerCallback = listener.callback;

      if (listenerCallback === callback || listenerCallback[FN_REF] === callback) {
        listeners.splice(idx, 1);
      }
    }
  } else {
    // clear listeners
    listeners.length = 0;
  }
};


/**
 * Fires a named event.
	�����¼�
 *
 * @example
 *
 * // fire event by name
 * events.fire('foo');
 *
 * // fire event object with nested type
	�����¼�������Ҫ��һ��type����
 * var event = { type: 'foo' };
 * events.fire(event);
 *
 * // fire event with explicit type
	������ʾ������
 * var event = { x: 10, y: 20 };
 * events.fire('element.moved', event);
 *
 * // pass additional arguments to the event
	 ���ݸ��Ӳ������¼�
 * events.on('foo', function(event, bar) {
 *   alert(bar);
 * });
 *
 * events.fire({ type: 'foo' }, 'I am bar!');
 *
 * @param {String} [name] the optional event name
 * @param {Object} [event] the event object
 * @param {...Object} additional arguments to be passed to the callback functions
 *
 * @return {Boolean} the events return value, if specified or false if the
 *                   default action was prevented by listeners
 */
EventBus.prototype.fire = function(type, data) {

  var event,
      listeners,
      returnValue,
      args;

  args = slice.call(arguments);

  if (typeof type === 'object') {
    event = type;
    type = event.type;
  }

  if (!type) {
    throw new Error('no event type specified');
  }

  listeners = this._listeners[type];

  if (!listeners) {
    return;
  }

  // we make sure we fire instances of our home made
  // events here. We wrap them only once, though
  // ������Ҫȷ����ǰ������ʵ���������Լ����¼�����,����,����ֻ��װһ��
  if (data instanceof Event) {
    // we are fine, we alread have an event
    event = data;
  } else {
    event = new Event();
    event.init(data);
  }

  // ensure we pass the event as the first parameter
  //ȷ������ͨ���¼���Ϊ��һ������
  args[0] = event;

  // original event type (in case we delegate)
  //ԭʼ�¼�����(�Է�ί���¼�)
  var originalType = event.type;

  // update event type before delegation
  // �����¼�����Ϊԭ��ί���¼�
  if (type !== originalType) {
    event.type = type;
  }

  try {
    returnValue = this._invokeListeners(event, args, listeners);
  } finally {
    // reset event type after delegation
    if (type !== originalType) {
      event.type = originalType;
    }
  }

  // set the return value to false if the event default
  // got prevented and no other return value exists
  if (returnValue === undefined && event.defaultPrevented) {
    returnValue = false;
  }

  return returnValue;
};

//����error
EventBus.prototype.handleError = function(error) {
  return this.fire('error', { error: error }) === false;
};

//���������¼�
EventBus.prototype._destroy = function() {
  this._listeners = {};
};

//���ü����¼�
EventBus.prototype._invokeListeners = function(event, args, listeners) {

  var idx,
      listener,
      returnValue;

  for (idx = 0; (listener = listeners[idx]); idx++) {

    // handle stopped propagation
    if (event.cancelBubble) {
      break;
    }

    returnValue = this._invokeListener(event, args, listener);
  }

  return returnValue;
};

//���ü����¼�
EventBus.prototype._invokeListener = function(event, args, listener) {

  var returnValue;

  try {
    // returning false prevents the default action
    returnValue = invokeFunction(listener.callback, args);

    // stop propagation on return value
    if (returnValue !== undefined) {
      event.returnValue = returnValue;
      event.stopPropagation();
    }

    // prevent default on return false
    if (returnValue === false) {
      event.preventDefault();
    }
  } catch (e) {
    if (!this.handleError(e)) {
      console.error('unhandled error in event listener');
      console.error(e.stack);

      throw e;
    }
  }

  return returnValue;
};

/*
 * Add new listener with a certain priority to the list
 * of listeners (for the given event).
 ����µ������� �������ȼ�����
 *
 * The semantics of listener registration / listener execution are
 * first register, first serve: New listeners will always be inserted
 * after existing listeners with the same priority.
 *
 * Example: Inserting two listeners with priority 1000 and 1300
 *
 *    * before: [ 1500, 1500, 1000, 1000 ]
 *    * after: [ 1500, 1500, (new=1300), 1000, 1000, (new=1000) ]
 *
 * @param {String} event
 * @param {Object} listener { priority, callback }
 */
EventBus.prototype._addListener = function(event, newListener) {

  var listeners = this._getListeners(event),
      existingListener,
      idx;

  // ensure we order listeners by priority from
  // 0 (high) to n > 0 (low)
  for (idx = 0; (existingListener = listeners[idx]); idx++) {
    if (existingListener.priority < newListener.priority) {

      // prepend newListener at before existingListener
      listeners.splice(idx, 0, newListener);
      return;
    }
  }

  listeners.push(newListener);
};


//�������ƻ���¼�����
EventBus.prototype._getListeners = function(name) {
  var listeners = this._listeners[name];

  if (!listeners) {
    this._listeners[name] = listeners = [];
  }

  return listeners;
};


/**
 * A event that is emitted via the event bus.
 һ���¼�,ͨ���¼����߷���
 */
function Event() { }

module.exports.Event = Event;

//��ֹð��
Event.prototype.stopPropagation = function() {
  this.cancelBubble = true;
};
//��ֹĬ���¼�
Event.prototype.preventDefault = function() {
  this.defaultPrevented = true;
};
//��ʼ������
Event.prototype.init = function(data) {
  assign(this, data || {});
};


/**
 * Invoke function. Be fast...
 *
 * @param {Function} fn
 * @param {Array<Object>} args
 *
 * @return {Any}
 */
function invokeFunction(fn, args) {
  return fn.apply(null, args);
}

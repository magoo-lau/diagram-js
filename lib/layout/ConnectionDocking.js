'use strict';

/**
 * @memberOf djs.layout
 */

/**
 * @class DockingPointDescriptor
 */

/**
 * @name DockingPointDescriptor#point
 * @type djs.Point
 */

/**
 * @name DockingPointDescriptor#actual
 * @type djs.Point
 */

/**
 * @name DockingPointDescriptor#idx
 * @type Number
 */

/**
 * A layout component for connections that retrieves waypoint information.
	用于检索路径点信息的连接的布局组件。
 *
 * @class
 * @constructor
 */
function ConnectionDocking() {}

module.exports = ConnectionDocking;



/**
 * Return the actual waypoints of the connection (visually).
 返回连接的实际路径(可视地)。
 *
 * @param {djs.model.Connection} connection
 * @param {djs.model.Base} [source]
 * @param {djs.model.Base} [target]
 *
 * @return {Array<Point>}
 */
ConnectionDocking.prototype.getCroppedWaypoints = function(connection, source, target) {
  return connection.waypoints;
};

/**
 * Return the connection docking point on the specified shape
	返回图形的连接点
 *
 * @param {djs.model.Connection} connection
 * @param {djs.model.Shape} shape
 * @param {Boolean} [dockStart=false]
 *
 * @return {DockingPointDescriptor}
 */
ConnectionDocking.prototype.getDockingPoint = function(connection, shape, dockStart) {

  var waypoints = connection.waypoints,
      dockingIdx,
      dockingPoint;

  dockingIdx = dockStart ? 0 : waypoints.length - 1;
  dockingPoint = waypoints[dockingIdx];

  return {
    point: dockingPoint,
    actual: dockingPoint,
    idx: dockingIdx
  };
};
/*
 * Copyright (C) 2009  Camptocamp
 *
 * This file is part of MapFish Client
 *
 * MapFish Client is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MapFish Client is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MapFish Client.  If not, see <http://www.gnu.org/licenses/>.
 */


/*
 * @requires core/Searcher.js
 * @requires core/Protocol.js
 * @requires OpenLayers/Map.js
 * @requires OpenLayers/Util.js
 * @requires OpenLayers/Events.js
 * @requires OpenLayers/Control.js
 * @requires OpenLayers/Handler/Click.js
 * @requires OpenLayers/Handler/Hover.js
 * @requires OpenLayers/Handler/Box.js
 * @requires OpenLayers/Filter/Spatial.js
 * @requires OpenLayers/Popup/FramedCloud.js
 */

/**
 * Class: mapfish.Searcher.Map
 * Use this class to create a Map searcher. A Map searcher sends search requests
 * as the user clicks, pauses or draws boxes on the map.
 *
 * Typical usage:
 * (start code)
 *         var searcher = new mapfish.Searcher.Map({
 *             mode: mapfish.Searcher.Map.HOVER,
 *             url: "countries",
 *             protocol: {
 *                 params: {
 *                     limit: 10
 *                 }
 *             },
 *             displayDefaultPopup: true,
 *             delay: 400
 *         });
 *         map.addControl(searcher);
 *         searcher.activate();
 * (end)
 *
 * Inherits from:
 * - mapfish.Searcher
 * - OpenLayers.Control
 */
mapfish.Searcher.Map = OpenLayers.Class(mapfish.Searcher, OpenLayers.Control, {

    /**
     * Constant: EVENT_TYPES
     * {Array(String)} Supported event types.
     *
     * Supported events:
     *  - *searchcomplete* triggered when the search response is received,
     *      listeners receive an object with a "response" property
     *      referencing the <OpenLayers.Protocol.Response> object.
     *  - *searchcanceled* triggered when the search request is canceled,
     *      listeners receive an object with a "response" property
     *      referencing the <OpenLayers.Protocol.Response> object
     *      representing the ongoing request.
     */
    EVENT_TYPES: ["searchcomplete", "searchcanceled"],

    /**
     * APIProperty: protocol
     * {<OpenLayers.Protocol>} A protocol instance, if not set in the config
     *     passed to the constructor, and if the url option is set, a MapFish
     *     protocol is created using the url option.
     */
    protocol: null,

    /**
     * APIProprerty: url
     * {String} A URL string, used to configure the MapFish protocol this
     *     class' constructor creates if no protocol is set in the
     *     config object.
     */
    url: null,

    /**
     * APIProperty: mode
     * {String} Either <mapfish.Searcher.Map.CLICK> or
     *     <mapfish.Searcher.Map.HOVER> or <mapfish.Searcher.Map.BOX>,
     *     or <mapfish.Searcher.Map.EXTENT>, defaults to
     *     <mapfish.Searcher.Map.CLICK>.
     */
    mode: null,

    /**
     * APIProperty: searchTolerance
     * {Integer} The search tolerance. The units are given by the
     *     searchToleranceUnits property. Defaults to 3.
     */
    searchTolerance: 3,

    /**
     * APIProperty: searchToleranceUnits
     * {String} Tolerance units.
     *     Possible values are 'pixels' and 'geo'.
     *     The latter means that tolerance is given in the current
     *     map units. Defaults to pixels.
     */
    searchToleranceUnits: 'pixels',

    /**
     * APIProperty: pointAsBBOX
     * {Boolean} If true, the filter sent to server will be of BBOX type. If
     *     false, the filter will be of DWITHIN type.
     *     If you're experiencing performance issues don't hesitate to set
     *     it to true. Defaults to false.
     */
    pointAsBBOX: false,

    /**
     * APIProperty: pixelTolerance
     * {Integer} This property has no effect if mode is set to
     *     <mapfish.Searcher.Map.BOX> or to <mapfish.Searcher.Map.EXTENT>, 
     *     and it's meaning depends whether
     *     mode is set to <mapfish.Searcher.Map.CLICK> or
     *     <mapfish.Searcher.Map.HOVER>. If mode is <mapfish.Searcher.Map.CLICK>
     *     pixelTolerance is the maximum number of pixels between mouseup and
     *     mousedown for an event to be considered a click. If mode is
     *     <mapfish.Searcher.Map.HOVER> pixelTolerance is the maximum number of
     *     pixels between mousemoves for an event to be considered a pause.
     *     Default is 2 pixels.
     */
    pixelTolerance: 2,

    /**
     * APIProperty: delay
     * {Integer} This property has no effect if mode is set to
     *     <mapfish.Searcher.Map.BOX> or to  <mapfish.Searcher.Map.EXTENT>,
     *     and it's meaning depends whether
     *     mode is set to <mapfish.Searcher.Map.CLICK> or
     *     <mapfish.Searcher.Map.HOVER>. If mode is <mapfish.Searcher.Map.CLICK>
     *     delay is the number of milliseconds between clicks before the
     *     event is considered a double-click. If mode is
     *     <mapfish.Searcher.Map.HOVER> delay is the number of milliseconds
     *     between mousemoves before the event is considered a pause.
     *     Default is 300.
     */
    delay: 300,

    /**
     * APIProperty: boxDivClassName
     * {String} The CSS class to use for drawing the box, applies only
     *     if mode is <mapfish.Searcher.Map.BOX>, default is
     *     olHandlerBoxZoomBox. 
     */
    boxDivClassName: "olHandlerBoxZoomBox",

    /**
     * APIProperty: displayDefaultPopup
     * {Boolean} Display a default popup with the search results,
     *      does not apply if mode is set to <mapfish.Searcher.Map.EXTENT>;
     *      defaults to false.
     */
    displayDefaultPopup: false,

    /**
     * APIProperty: onMouseMove
     * {Function} Method called if mode is <mapfish.Searcher.Map.HOVER>,
     *      when the mouse moves. Can be used to close a tooltip, for example.
     *      The event is passed in parameter and "this" will be the Map
     *      instance.
     */
    onMouseMove: function(evt) {},

    /**
     * Property: position
     * {<OpenLayers.Bounds> | <OpenLayers.Pixel>} Either the pixel
     *     corresponding to the last mouse click or move, or the
     *     bounds of the last drawn box.
     */
    position: null,

    /**
     * Property: popupLonLat
     * {<OpenLayers.LonLat>} The <OpenLayers.LonLat> object representing
     *      where the popup must be displayed.
     */
    popupLonLat: null,

    /**
     * Property: response
     * {<OpenLayers.Protocol.Response>} The response returned by the
     *     read call to <OpenLayers.Protocol> object.
     */
    response: null,
    
    /**
     * APIProperty: projection
     * {<OpenLayers.Projection>} When passed the bounds or point set in
     *     the filter are reprojected. In order to reproject, a projection
     *     transformation function for the specified projections must be
     *     available. This support may be provided via proj4js or via a
     *     custom transformation function. See
     *     {<OpenLayers.Projection.addTransform>} for more information on
     *     custom transformations.
     */
    projection: null,

    /**
     * Constructor: mapfish.Searcher.Map
     *
     * Parameters:
     * options {Object} Optional object whose properties will be set on the
     *     instance.
     *
     * Returns:
     * {<mapfish.Searcher.Map>}
     */
    initialize: function(options) {
        this.mode = mapfish.Searcher.Map.CLICK;

        // concatenate events specific to this control with those from the base
        this.EVENT_TYPES =
            mapfish.Searcher.Map.prototype.EVENT_TYPES.concat(
            OpenLayers.Control.prototype.EVENT_TYPES
        );

        mapfish.Searcher.prototype.initialize.call(this, options);
        OpenLayers.Control.prototype.initialize.call(this, options);

        if (!(this.protocol instanceof OpenLayers.Protocol)) {
            this.protocol = new mapfish.Protocol.MapFish(
                OpenLayers.Util.extend({
                    url: this.url
                }, this.protocol)
            );
        }

        switch(this.mode) {
            case mapfish.Searcher.Map.CLICK:
                this.handler = new OpenLayers.Handler.Click(
                    this,
                    {click: this.handlePoint},
                    {delay: this.delay, pixelTolerance: this.pixelTolerance}
                );
                break;
            case mapfish.Searcher.Map.HOVER:
                this.handler = new OpenLayers.Handler.Hover(
                    this,
                    {pause: this.handlePoint, move: this.cancelSearch},
                    {delay: this.delay, pixelTolerance: this.pixelTolerance}
                );
                break;
            case mapfish.Searcher.Map.BOX:
                this.handler = new OpenLayers.Handler.Box(
                    this, 
                    {done: this.handleBox}, 
                    {boxDivClassName: this.boxDivClassName}
                );
                break;
            case mapfish.Searcher.Map.EXTENT:
                break;
            default:
                OpenLayers.Console.error("unsupported mode");
                return;
        }
    },

    /**
     * Method: activate
     * Activates the control.
     * 
     * Returns:
     * {Boolean}  True if the control was successfully activated or
     *      false if the control was already active.
     */
    activate: function () {
        var activated = OpenLayers.Control.prototype.activate.call(this);
        if (activated) {
            if (this.mode == mapfish.Searcher.Map.EXTENT) {
                this.map.events.register(
                    "moveend", this, this.handleMoveend);
            }
        }
        return activated;
    },

    /**
     * Method: deactivate
     * Deactivates the control.
     * 
     * Returns:
     * {Boolean}  True if the control was successfully deactivated or
     *      false if the control was already inactive.
     */
    deactivate: function () {
        var deactivated = OpenLayers.Control.prototype.deactivate.call(this);
        if (deactivated) {
            if (this.mode == mapfish.Searcher.Map.EXTENT) {
                this.map.events.unregister(
                    "moveend", this, this.handleMoveend);
            }
        }
        return deactivated;
    },

    /**
     * Method: handlePoint
     *      Called on click or pause.
     *
     * Parameters:
     * evt - {<OpenLayers.Event>}
     */
    handlePoint: function(evt) {
        this.position = evt.xy;
        this.popupLonLat = this.map.getLonLatFromViewPortPx(this.position);
        this.triggerSearch();
    },

    /**
     * Method: handleBox
     *
     * Parameters:
     * position - {<OpenLayers.Bounds>|<OpenLayers.Pixel>}
     */
    handleBox: function(position) {
        if (position instanceof OpenLayers.Bounds) {
            var minXY = this.map.getLonLatFromPixel(
                new OpenLayers.Pixel(position.left, position.bottom));
            var maxXY = this.map.getLonLatFromPixel(
                new OpenLayers.Pixel(position.right, position.top));
            this.position = new OpenLayers.Bounds(
                minXY.lon, minXY.lat,
                maxXY.lon, maxXY.lat);
            this.popupLonLat = this.position.getCenterLonLat();
        } else {
            this.position = position;
            this.popupLonLat = this.map.getLonLatFromViewPortPx(this.position);
        }
        this.triggerSearch();
    },

    /**
     * Method: handleMoveend
     *     Called on map moveend events
     */
    handleMoveend: function() {
        this.position = this.map.getExtent();
        this.triggerSearch();
    },

    /**
     * Method: triggerSearch
     */
    triggerSearch: function() {
        this.cancelSearch();

        var filter = this.getFilter();
        filter = this.isFilter(filter) ? {filter: filter} : {params: filter};
        var options = OpenLayers.Util.extend({
            searcher: this,
            callback: this.handleResponse,
            scope: this
        }, filter);
            
        this.response = this.protocol.read(options);
    },

    /**
     * Method: cancelSearch
     * Called on mousemove and from within triggerSearch to cancel
     *     any ongoing request.
     *
     * Parameters:
     * evt - {<OpenLayers.Event>}
     */
    cancelSearch: function(evt) {
        this.protocol.abort(this.response);
        this.events.triggerEvent("searchcanceled", {response: this.response});
        this.response = null;
        if (this.mode == mapfish.Searcher.Map.HOVER) {
            this.onMouseMove();
        }
    },

    /**
     * Method: handleResponse
     *
     * Parameters:
     * response - {<OpenLayers.Protocol.Response>}
     */
    handleResponse: function(response) {
        this.events.triggerEvent("searchcomplete", {response: response});
        if (this.displayDefaultPopup &&
            this.mode != mapfish.Searcher.Map.EXTENT) {
            this.displayPopup(response.features);
        }
    },

    /**
     * Method: displayPopup
     *
     * Parameters:
     * features - {Array({<OpenLayers.Feature.Vector>})}
     */
    displayPopup: function(features) {
        if (features && features.length > 0) {
            var k;

            // build HTML table
            var html = "<table><tr>";
            for (k in features[0].attributes) {
                 html += "<th>" + k + "</th>";
            }
            html += "</tr>";
            for (var i = 0; i < features.length; i++) {
                var attributes= features[i].attributes;
                html += "<tr>";
                for (k in attributes) {
                    html += "<td>" +  attributes[k] + "</td>";
                }
                html += "</tr>";
            }
            html += "</table>";

            var popup = new OpenLayers.Popup.FramedCloud(
                "mapfish_popup",    // popup id
                this.popupLonLat,   // OpenLayers.LonLat object
                null,               // popup is autosized
                html,               // html string
                null,               // no anchor
                true                // close button
            );
            this.map.addPopup(popup, true);
        }
    },

    /**
     * Method: isFilter
     * Check if the object passed is a <OpenLayers.Filter> object.
     *
     * Parameters:
     * obj - {Object}
     *
     * Returns:
     * {Boolean}
     */
    isFilter: function(obj) {
        return !!obj.CLASS_NAME &&
               !!obj.CLASS_NAME.match(/^OpenLayers\.Filter/);
    },

    /**
     * Method: reproject
     * Reproject the passed object if needed.
     *
     * Parameters:
     * obj - {<OpenLayers.Bounds>}|{<OpenLayers.Point>}
     */
    reproject: function(obj) {
        if (this.projection &&
            !this.projection.equals(this.map.getProjectionObject())) {

            obj.transform(this.map.getProjectionObject(), this.projection);
        }
        return obj;
    },

    /**
     * Method: getFilter
     *      Get the search filter.
     *
     * Returns:
     * {<OpenLayers.Filter>}|{Object} The filter.
     */
    getFilter: function() {
        var filter = null;

        // Because Extent mode doesn't really require a user action
        // and getFilter can be called when merging filters,
        // we need to ensure that position has a value
        if (this.mode == mapfish.Searcher.Map.EXTENT && !this.position) {
            this.position = this.map.getExtent();
        }
        if (this.position) {
            if (this.position instanceof OpenLayers.Bounds) {
                filter = new OpenLayers.Filter.Spatial({
                    type: OpenLayers.Filter.Spatial.BBOX,
                    value: this.reproject(this.position)
                });
            } else {
                var tolerance = this.searchTolerance;
                if (tolerance && this.searchToleranceUnits == "pixels") {
                    tolerance *= this.map.getResolution();
                }
                var ll = this.map.getLonLatFromViewPortPx(this.position);
                var point = this.reproject(
                    new OpenLayers.Geometry.Point(ll.lon, ll.lat)
                );
                if (tolerance) {
                    // simulate a box around the clicked point, performances
                    // may be better than with the DWITHIN filter in some cases
                    if (this.pointAsBBOX) {
                        var box = new OpenLayers.Bounds(
                            ll.lon - tolerance / 2,
                            ll.lat - tolerance / 2,
                            ll.lon + tolerance / 2,
                            ll.lat + tolerance / 2
                        );
                        filter = new OpenLayers.Filter.Spatial({
                            type: OpenLayers.Filter.Spatial.BBOX,
                            value: this.reproject(box)
                        });
                    } else {
                        filter = new OpenLayers.Filter.Spatial({
                            type: OpenLayers.Filter.Spatial.DWITHIN,
                            value: point,
                            distance: tolerance,
                            distanceUnits: this.map.getUnits()
                        });
                    }
                } else {
                    filter = new OpenLayers.Filter.Spatial({
                        type: OpenLayers.Filter.Spatial.WITHIN,
                        value: point
                    });
                }
            }
            this.position = null;
        }
        return filter;
    },

    CLASS_NAME: "mapfish.Searcher.Map"
});

/**
 * Constant: mapfish.Searcher.Map.CLICK
 * Set the searcher mode to this constant if you want search on click.
 */
mapfish.Searcher.Map.CLICK = "CLICK";

/**
 * Constant: mapfish.Searcher.Map.HOVER
 * Set the searcher mode to this constant if you want search on hover.
 */
mapfish.Searcher.Map.HOVER = "HOVER";

/**
 * Constant: mapfish.Searcher.Map.BOX
 * Set the searcher mode to this constant if you want search on box drawing.
 */
mapfish.Searcher.Map.BOX = "BOX";

/**
 * Constant: mapfish.Searcher.Map.EXTENT
 * Set the searcher mode to this constant if you want search on map extent.
 */
mapfish.Searcher.Map.EXTENT = "EXTENT";

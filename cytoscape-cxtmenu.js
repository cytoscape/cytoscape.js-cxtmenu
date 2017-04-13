/*!
Copyright (c) The Cytoscape Consortium

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

;(function(){ 'use strict';

  var defaults = {
    menuRadius: 100, // the radius of the circular menu in pixels
    selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
    commands: [ // an array of commands to list in the menu or a function that returns the array
      /*
      { // example command
        fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item
        content: 'a command name' // html/text content to be displayed in the menu
        select: function(ele){ // a function to execute when the command is selected
          console.log( ele.id() ) // `ele` holds the reference to the active element
        }
      }
      */
    ], // function( ele ){ return [ /*...*/ ] }, // example function for commands
    fillColor: 'rgba(0, 0, 0, 0.75)', // the background colour of the menu
    activeFillColor: 'rgba(1, 105, 217, 0.75)', // the colour used to indicate the selected command
    activePadding: 20, // additional size in pixels for the active command
    indicatorSize: 24, // the size in pixels of the pointer to the active command
    separatorWidth: 3, // the empty spacing in pixels between successive commands
    spotlightPadding: 4, // extra spacing in pixels between the element and the spotlight
    minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight
    maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight
    openMenuEvents: 'cxttapstart taphold', // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
    itemColor: 'white', // the colour of text in the command's content
    itemTextShadowColor: 'transparent', // the text shadow colour of the command's content
    zIndex: 9999, // the z-index of the ui div
    atMouse: false // draw menu at mouse position
  };

  // Object.assign Polyfill for IE
  if (typeof Object.assign != 'function') {
    (function () {
      Object.assign = function (target) {
        // We must check against these specific cases.
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    })();
  }

  var removeEles = function(query, ancestor) {
    var els = [].slice.call(ancestor.querySelectorAll(query));

    ancestor = ancestor || document;

    for (var i = 0, l = els.length; i < l; i++) {
      els[i].remove();
    }
  };

  var setStyles = function(el, style) {
    var props = Object.keys(style);

    for (var i = 0, l = props.length; i < l; i++) {
      el.style[props[i]] = style[props[i]];
    }
  };

  var createElement = function(options){
    options = options || {};

    var el = document.createElement(options.tag || 'div');

    el.className = options.class || '';

    if (options.style) {
      setStyles(el, options.style);
    }

    return el;
  };

  var getPixelRatio = function(){
    return window.devicePixelRatio || 1;
  };

  // registers the extension on a cytoscape lib ref
  var register = function(cytoscape){
    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    cytoscape('core', 'cxtmenu', function(params){
      var options = Object.assign({}, defaults, params);
      var cy = this;
      var container = cy.container();
      var target;

      function getOffset( el ){
        var offset = el.getBoundingClientRect();

        return {
          left: offset.left + document.body.scrollLeft +
                parseFloat(getComputedStyle(document.body)['padding-left']) +
                parseFloat(getComputedStyle(document.body)['border-left-width']),
          top: offset.top + document.body.scrollTop +
               parseFloat(getComputedStyle(document.body)['padding-top']) +
               parseFloat(getComputedStyle(document.body)['border-top-width'])
        };
      }

      var data = {
        options: options,
        handlers: []
      };
      var wrapper = createElement({class: 'cxtmenu'});
      data.container = wrapper;
      var parent = createElement();
      var canvas = createElement({tag: 'canvas'});
      var commands = [];
      var c2d = canvas.getContext('2d');
      var r = options.menuRadius;
      var containerSize = (r + options.activePadding)*2;
      var activeCommandI;
      var offset;

      container.insertBefore(wrapper, container.firstChild);
      wrapper.appendChild(parent);
      parent.appendChild(canvas);

      setStyles(wrapper, {
        position: 'absolute',
        zIndex: options.zIndex
      });

      setStyles(parent, {
        display: 'none',
        width: containerSize + 'px',
        height: containerSize + 'px',
        position: 'absolute',
        zIndex: 1,
        marginLeft: - options.activePadding + 'px',
        marginTop: - options.activePadding + 'px'
      });

      canvas.width = containerSize;
      canvas.height = containerSize;

      function createMenuItems() {
        removeEles('.cxtmenu-item', parent);
        var dtheta = 2 * Math.PI / (commands.length);
        var theta1 = Math.PI / 2;
        var theta2 = theta1 + dtheta;

        for (var i = 0; i < commands.length; i++) {
          var command = commands[i];

          var midtheta = (theta1 + theta2) / 2;
          var rx1 = 0.66 * r * Math.cos(midtheta);
          var ry1 = 0.66 * r * Math.sin(midtheta);

          var item = createElement({class: 'cxtmenu-item'});
          setStyles(item, {
            color: options.itemColor,
            cursor: 'default',
            display: 'table',
            'text-align': 'center',
            //background: 'red',
            position: 'absolute',
            'text-shadow': '-1px -1px 2px ' + options.itemTextShadowColor + ', 1px -1px 2px ' + options.itemTextShadowColor + ', -1px 1px 2px ' + options.itemTextShadowColor + ', 1px 1px 1px ' + options.itemTextShadowColor,
            left: '50%',
            top: '50%',
            'min-height': (r * 0.66) + 'px',
            width: (r * 0.66) + 'px',
            height: (r * 0.66) + 'px',
            marginLeft: (rx1 - r * 0.33) + 'px',
            marginTop: (-ry1 - r * 0.33) + 'px'
          });

          var content = createElement({class: 'cxtmenu-content'});
          content.innerHTML = command.content;
          setStyles(content, {
            'width': (r * 0.66) + 'px',
            'height': (r * 0.66) + 'px',
            'vertical-align': 'middle',
            'display': 'table-cell'
          });

          if (command.disabled) {
            content.classList.add('cxtmenu-disabled');
          }

          parent.appendChild(item);
          item.appendChild(content);

          theta1 += dtheta;
          theta2 += dtheta;
        }
      }

      function queueDrawBg( rspotlight ){
        redrawQueue.drawBg = [ rspotlight ];
      }

      function drawBg( rspotlight ){
        rspotlight = rspotlight !== undefined ? rspotlight : rs;

        c2d.globalCompositeOperation = 'source-over';

        c2d.clearRect(0, 0, containerSize, containerSize);

        // draw background items
        c2d.fillStyle = options.fillColor;
        var dtheta = 2*Math.PI/(commands.length);
        var theta1 = Math.PI/2;
        var theta2 = theta1 + dtheta;

        for( var index = 0; index < commands.length; index++ ){
          var command = commands[index];

          if( command.fillColor ){
            c2d.fillStyle = command.fillColor;
          }
          c2d.beginPath();
          c2d.moveTo(r + options.activePadding, r + options.activePadding);
          c2d.arc(r + options.activePadding, r + options.activePadding, r, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
          c2d.closePath();
          c2d.fill();

          theta1 += dtheta;
          theta2 += dtheta;

          c2d.fillStyle = options.fillColor;
        }

        // draw separators between items
        c2d.globalCompositeOperation = 'destination-out';
        c2d.strokeStyle = 'white';
        c2d.lineWidth = options.separatorWidth;
        theta1 = Math.PI/2;
        theta2 = theta1 + dtheta;

        for( var i = 0; i < commands.length; i++ ){
          var rx1 = r * Math.cos(theta1);
          var ry1 = r * Math.sin(theta1);
          c2d.beginPath();
          c2d.moveTo(r + options.activePadding, r + options.activePadding);
          c2d.lineTo(r + options.activePadding + rx1, r + options.activePadding - ry1);
          c2d.closePath();
          c2d.stroke();

          theta1 += dtheta;
          theta2 += dtheta;
        }


        c2d.fillStyle = 'white';
        c2d.globalCompositeOperation = 'destination-out';
        c2d.beginPath();
        c2d.arc(r + options.activePadding, r + options.activePadding, rspotlight + options.spotlightPadding, 0, Math.PI*2, true);
        c2d.closePath();
        c2d.fill();

        c2d.globalCompositeOperation = 'source-over';
      }

      function queueDrawCommands( rx, ry, theta ){
        redrawQueue.drawCommands = [ rx, ry, theta ];
      }

      function drawCommands( rx, ry, theta ){
        var dtheta = 2*Math.PI/(commands.length);
        var theta1 = Math.PI/2;
        var theta2 = theta1 + dtheta;

        theta1 += dtheta * activeCommandI;
        theta2 += dtheta * activeCommandI;

        c2d.fillStyle = options.activeFillColor;
        c2d.strokeStyle = 'black';
        c2d.lineWidth = 1;
        c2d.beginPath();
        c2d.moveTo(r + options.activePadding, r + options.activePadding);
        c2d.arc(r + options.activePadding, r + options.activePadding, r + options.activePadding, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
        c2d.closePath();
        c2d.fill();

        c2d.fillStyle = 'white';
        c2d.globalCompositeOperation = 'destination-out';

        var tx = r + options.activePadding + rx/r*(rs + options.spotlightPadding - options.indicatorSize/4);
        var ty = r + options.activePadding + ry/r*(rs + options.spotlightPadding - options.indicatorSize/4);
        var rot = Math.PI/4 - theta;

        c2d.translate( tx, ty );
        c2d.rotate( rot );

        // clear the indicator
        c2d.beginPath();
        c2d.fillRect(-options.indicatorSize/2, -options.indicatorSize/2, options.indicatorSize, options.indicatorSize);
        c2d.closePath();
        c2d.fill();

        c2d.rotate( -rot );
        c2d.translate( -tx, -ty );

        // c2d.setTransform( 1, 0, 0, 1, 0, 0 );

        // clear the spotlight
        c2d.beginPath();
        c2d.arc(r + options.activePadding, r + options.activePadding, rs + options.spotlightPadding, 0, Math.PI*2, true);
        c2d.closePath();
        c2d.fill();

        c2d.globalCompositeOperation = 'source-over';
      }

      function updatePixelRatio(){
        var pxr = getPixelRatio();
        var w = container.clientWidth;
        var h = container.clientHeight;

        canvas.width = w * pxr;
        canvas.height = h * pxr;

        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        c2d.setTransform( 1, 0, 0, 1, 0, 0 );
        c2d.scale( pxr, pxr );
      }

      var redrawing = true;
      var redrawQueue = {};
      var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
      var redraw = function(){
        if( redrawQueue.drawBg ){
          drawBg.apply( null, redrawQueue.drawBg );
        }

        if( redrawQueue.drawCommands ){
          drawCommands.apply( null, redrawQueue.drawCommands );
        }

        redrawQueue = {};

        if( redrawing ){
          raf( redraw );
        }
      };

      // kick off
      updatePixelRatio();
      redraw();

      var ctrx, ctry, rs;

      var bindings = {
        on: function(events, selector, fn){

          var _fn = fn;
          if( selector === 'core'){
            _fn = function( e ){
              if( e.cyTarget === cy || e.target === cy ){ // only if event target is directly core
                return fn.apply( this, [ e ] );
              }
            };
          }

          data.handlers.push({
            events: events,
            selector: selector,
            fn: _fn
          });

          if( selector === 'core' ){
            cy.on(events, _fn);
          } else {
            cy.on(events, selector, _fn);
          }

          return this;
        }
      };

      function addEventListeners(){
        var grabbable;
        var inGesture = false;
        var dragHandler;
        var zoomEnabled;
        var panEnabled;
        var boxEnabled;
        var gestureStartEvent;

        var restoreZoom = function(){
          if( zoomEnabled ){
            cy.userZoomingEnabled( true );
          }
        };

        var restoreGrab = function(){
          if( grabbable ){
            target.grabify();
          }
        };

        var restorePan = function(){
          if( panEnabled ){
            cy.userPanningEnabled( true );
          }
        };

        var restoreBoxSeln = function(){
          if( boxEnabled ){
            cy.boxSelectionEnabled( true );
          }
        };

        var restoreGestures = function(){
          restoreGrab();
          restoreZoom();
          restorePan();
          restoreBoxSeln();
        };

        window.addEventListener('resize', updatePixelRatio);

        bindings
          .on('resize', function(e){
            updatePixelRatio();
          })

          .on(options.openMenuEvents, options.selector, function(e){
            target = this; // Remember which node the context menu is for
            var ele = this;
            var isCy = this === cy;

            if (inGesture) {
              parent.style.display = 'none';

              inGesture = false;

              restoreGestures();
            }

            if( typeof options.commands === 'function' ){
              commands = options.commands(target);
            } else {
              commands = options.commands;
            }

            if( !commands || commands.length === 0 ){ return; }

            zoomEnabled = cy.userZoomingEnabled();
            cy.userZoomingEnabled( false );

            panEnabled = cy.userPanningEnabled();
            cy.userPanningEnabled( false );

            boxEnabled = cy.boxSelectionEnabled();
            cy.boxSelectionEnabled( false );

            grabbable = target.grabbable &&  target.grabbable();
            if( grabbable ){
              target.ungrabify();
            }

            var rp, rw, rh;
            if( !isCy && ele.isNode() && !ele.isParent() && !options.atMouse ){
              rp = ele.renderedPosition();
              rw = ele.renderedWidth();
              rh = ele.renderedHeight();
            } else {
              rp = e.renderedPosition || e.cyRenderedPosition;
              rw = 1;
              rh = 1;
            }

            offset = getOffset(container);

            ctrx = rp.x;
            ctry = rp.y;

            createMenuItems();

            setStyles(parent, {
              display: 'block',
              left: (rp.x - r) + 'px',
              top: (rp.y - r) + 'px'
            });

            rs = Math.max(rw, rh)/2;
            rs = Math.max(rs, options.minSpotlightRadius);
            rs = Math.min(rs, options.maxSpotlightRadius);

            queueDrawBg();

            activeCommandI = undefined;

            inGesture = true;
            gestureStartEvent = e;
          })

          .on('cxtdrag tapdrag', options.selector, dragHandler = function(e){

            if( !inGesture ){ return; }

            var origE = e.originalEvent;
            var isTouch = origE.touches && origE.touches.length > 0;

            var pageX = isTouch ? origE.touches[0].pageX : origE.pageX;
            var pageY = isTouch ? origE.touches[0].pageY : origE.pageY;

            activeCommandI = undefined;

            var dx = pageX - offset.left - ctrx;
            var dy = pageY - offset.top - ctry;

            if( dx === 0 ){ dx = 0.01; }

            var d = Math.sqrt( dx*dx + dy*dy );
            var cosTheta = (dy*dy - d*d - dx*dx)/(-2 * d * dx);
            var theta = Math.acos( cosTheta );

            if( d < rs + options.spotlightPadding ){
              queueDrawBg();
              return;
            }

            queueDrawBg();

            var rx = dx*r / d;
            var ry = dy*r / d;

            if( dy > 0 ){
              theta = Math.PI + Math.abs(theta - Math.PI);
            }

            var dtheta = 2*Math.PI/(commands.length);
            var theta1 = Math.PI/2;
            var theta2 = theta1 + dtheta;

            for( var i = 0; i < commands.length; i++ ){
              var command = commands[i];

              var inThisCommand = theta1 <= theta && theta <= theta2
                || theta1 <= theta + 2*Math.PI && theta + 2*Math.PI <= theta2;

              if( command.disabled ){
                inThisCommand = false;
              }

              if( inThisCommand ){
                activeCommandI = i;
                break;
              }

              theta1 += dtheta;
              theta2 += dtheta;
            }

            queueDrawCommands( rx, ry, theta );
          })

          .on('tapdrag', dragHandler)

          .on('cxttapend tapend', function(e){
            parent.style.display = 'none';

            if( activeCommandI !== undefined ){
              var select = commands[ activeCommandI ].select;

              if( select ){
                select.apply( target, [target, gestureStartEvent] );
                activeCommandI = undefined;
              }
            }

            inGesture = false;

            restoreGestures();
          })
        ;
      }

      function removeEventListeners(){
        var handlers = data.handlers;

        for( var i = 0; i < handlers.length; i++ ){
          var h = handlers[i];

          if( h.selector === 'core' ){
            cy.off(h.events, h.fn);
          } else {
            cy.off(h.events, h.selector, h.fn);
          }
        }

        window.removeEventListener('resize', updatePixelRatio);
      }

      function destroyInstance(){
        redrawing = false;

        removeEventListeners();

        wrapper.remove();
      }

      addEventListeners();

      return {
        destroy: function(){
          destroyInstance();
        }
      };

    });

  }; // reg

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  } else if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-cxtmenu', function(){
      return register;
    });
  }

  if( typeof cytoscape !== typeof undefined ){ // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape);
  }

})();

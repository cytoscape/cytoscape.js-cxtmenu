const defaults = require('./defaults');
const assign = require('./assign');
const { removeEles, setStyles, createElement, getPixelRatio, getOffset } = require('./dom-util');

let cxtmenu = function(params){
  let options = assign({}, defaults, params);
  let cy = this;
  let container = cy.container();
  let target;

  let data = {
    options: options,
    handlers: [],
    container: createElement({class: 'cxtmenu'})
  };

  let wrapper = data.container;
  let parent = createElement();
  let canvas = createElement({tag: 'canvas'});
  let commands = [];
  let c2d = canvas.getContext('2d');

  let r = 100; // defailt radius;
  let containerSize = (r + options.activePadding)*2;
  let activeCommandI;
  let offset;

  container.insertBefore(wrapper, container.firstChild);
  wrapper.appendChild(parent);
  parent.appendChild(canvas);

  setStyles(wrapper, {
    position: 'absolute',
    zIndex: options.zIndex,
    userSelect: 'none',
    pointerEvents: 'none' // prevent events on menu in modern browsers
  });

  // prevent events on menu in legacy browsers
  ['mousedown', 'mousemove', 'mouseup', 'contextmenu'].forEach(evt => {
    wrapper.addEventListener(evt, e => {
      e.preventDefault();

      return false;
    });
  });

  setStyles(parent, {
    display: 'none',
    width: containerSize + 'px',
    height: containerSize + 'px',
    position: 'absolute',
    zIndex: 1,
    marginLeft: - options.activePadding + 'px',
    marginTop: - options.activePadding + 'px',
    userSelect: 'none'
  });

  canvas.width = containerSize;
  canvas.height = containerSize;

  function createMenuItems(r, rs) {
    removeEles('.cxtmenu-item', parent);
    let dtheta = 2 * Math.PI / (commands.length);
    let theta1 = Math.PI / 2;
    let theta2 = theta1 + dtheta;

    for (let i = 0; i < commands.length; i++) {
      let command = commands[i];

      let midtheta = (theta1 + theta2) / 2;
      let rx1 = ((r + rs)/2) * Math.cos(midtheta);
      let ry1 = ((r + rs)/2) * Math.sin(midtheta);

      // Arbitrary multiplier to increase the sizing of the space 
      // available for the item.
      let width = 1 * Math.abs((r - rs) * Math.cos(midtheta));
      let height = 1 * Math.abs((r - rs) * Math.sin(midtheta));
      width = Math.max(width, height)

      let item = createElement({class: 'cxtmenu-item'});
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
        'min-height': width + 'px',
        width: width + 'px',
        height: width + 'px',
        marginLeft: (rx1 - width/2) + 'px',
        marginTop: (-ry1 - width/2) + 'px'
      });

      let content = createElement({class: 'cxtmenu-content'});

      if( command.content instanceof HTMLElement ){
        content.appendChild( command.content );
      } else {
        content.innerHTML = command.content;
      }

      setStyles(content, {
        'width': width + 'px',
        'height': width + 'px',
        'vertical-align': 'middle',
        'display': 'table-cell',
      });

      setStyles(content, command.contentStyle || {});

      if (command.disabled === true || command.enabled === false) {
        content.setAttribute('class', 'cxtmenu-content cxtmenu-disabled');
      }

      parent.appendChild(item);
      item.appendChild(content);

      theta1 += dtheta;
      theta2 += dtheta;
    }
  }

  function queueDrawBg( radius, rspotlight ){
    redrawQueue.drawBg = [ radius, rspotlight ];
  }

  function drawBg( radius, rspotlight ){
    c2d.globalCompositeOperation = 'source-over';

    c2d.clearRect(0, 0, containerSize, containerSize);

    // draw background items
    c2d.fillStyle = options.fillColor;
    let dtheta = 2*Math.PI/(commands.length);
    let theta1 = Math.PI/2;
    let theta2 = theta1 + dtheta;

    for( let index = 0; index < commands.length; index++ ){
      let command = commands[index];

      if( command.fillColor ){
        c2d.fillStyle = command.fillColor;
      }
      c2d.beginPath();
      c2d.moveTo(radius + options.activePadding, radius + options.activePadding);
      c2d.arc(radius + options.activePadding, radius + options.activePadding, radius, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
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

    for( let i = 0; i < commands.length; i++ ){
      let rx1 = radius * Math.cos(theta1);
      let ry1 = radius * Math.sin(theta1);
      c2d.beginPath();
      c2d.moveTo(radius + options.activePadding, radius + options.activePadding);
      c2d.lineTo(radius + options.activePadding + rx1, radius + options.activePadding - ry1);
      c2d.closePath();
      c2d.stroke();

      theta1 += dtheta;
      theta2 += dtheta;
    }


    c2d.fillStyle = 'white';
    c2d.globalCompositeOperation = 'destination-out';
    c2d.beginPath();
    c2d.arc(radius + options.activePadding, radius + options.activePadding, rspotlight + options.spotlightPadding, 0, Math.PI*2, true);
    c2d.closePath();
    c2d.fill();

    c2d.globalCompositeOperation = 'source-over';
  }

  function queueDrawCommands( rx, ry, radius, theta, rspotlight ){
    redrawQueue.drawCommands = [ rx, ry, radius, theta, rspotlight ];
  }

  function drawCommands( rx, ry, radius, theta, rs ){
    let dtheta = 2*Math.PI/(commands.length);
    let theta1 = Math.PI/2;
    let theta2 = theta1 + dtheta;

    theta1 += dtheta * activeCommandI;
    theta2 += dtheta * activeCommandI;

    c2d.fillStyle = options.activeFillColor;
    c2d.strokeStyle = 'black';
    c2d.lineWidth = 1;
    c2d.beginPath();
    c2d.moveTo(radius + options.activePadding, radius + options.activePadding);
    c2d.arc(radius + options.activePadding, radius + options.activePadding, radius + options.activePadding, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
    c2d.closePath();
    c2d.fill();

    c2d.fillStyle = 'white';
    c2d.globalCompositeOperation = 'destination-out';

    let tx = radius + options.activePadding + rx/radius*(rs + options.spotlightPadding - options.indicatorSize/4);
    let ty = radius + options.activePadding + ry/radius*(rs + options.spotlightPadding - options.indicatorSize/4);
    let rot = Math.PI/4 - theta;

    c2d.translate( tx, ty );
    c2d.rotate( rot );

    // clear the indicator
    // The indicator size (arrow) depends on the node size as well. If the indicator size is bigger and the rendered node size + padding, 
    // use the rendered node size + padding as the indicator size.
    let indicatorSize = options.indicatorSize > rs + options.spotlightPadding ? rs + options.spotlightPadding : options.indicatorSize
    c2d.beginPath();
    c2d.fillRect(-indicatorSize/2, -indicatorSize/2, indicatorSize, indicatorSize);
    c2d.closePath();
    c2d.fill();

    c2d.rotate( -rot );
    c2d.translate( -tx, -ty );

    // c2d.setTransform( 1, 0, 0, 1, 0, 0 );

    // clear the spotlight
    c2d.beginPath();
    c2d.arc(radius + options.activePadding, radius + options.activePadding, rs + options.spotlightPadding, 0, Math.PI*2, true);
    c2d.closePath();
    c2d.fill();

    c2d.globalCompositeOperation = 'source-over';
  }

  function updatePixelRatio(){
    let pxr = getPixelRatio();
    let w = containerSize;
    let h = containerSize;

    canvas.width = w * pxr;
    canvas.height = h * pxr;

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    c2d.setTransform( 1, 0, 0, 1, 0, 0 );
    c2d.scale( pxr, pxr );
  }

  let redrawing = true;
  let redrawQueue = {};

  let raf = (
    window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.msRequestAnimationFrame
    || (fn => setTimeout(fn, 16))
  );

  let redraw = function(){
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

  let ctrx, ctry, rs;

  let bindings = {
    on: function(events, selector, fn){

      let _fn = fn;
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
    let grabbable;
    let inGesture = false;
    let dragHandler;
    let zoomEnabled;
    let panEnabled;
    let boxEnabled;
    let gestureStartEvent;

    let restoreZoom = function(){
      if( zoomEnabled ){
        cy.userZoomingEnabled( true );
      }
    };

    let restoreGrab = function(){
      if( grabbable ){
        target.grabify();
      }
    };

    let restorePan = function(){
      if( panEnabled ){
        cy.userPanningEnabled( true );
      }
    };

    let restoreBoxSeln = function(){
      if( boxEnabled ){
        cy.boxSelectionEnabled( true );
      }
    };

    let restoreGestures = function(){
      restoreGrab();
      restoreZoom();
      restorePan();
      restoreBoxSeln();
    };

    window.addEventListener('resize', updatePixelRatio);

    bindings
      .on('resize', function(){
        updatePixelRatio();
      })

      .on(options.openMenuEvents, options.selector, function(e){
        target = this; // Remember which node the context menu is for
        let ele = this;
        let isCy = this === cy;

        if (inGesture) {
          parent.style.display = 'none';

          inGesture = false;

          restoreGestures();
        }

        if( typeof options.commands === 'function' ){
          const res = options.commands(target);
          if( res.then ){
            res.then(_commands => {
              commands = _commands;
              openMenu();
            })
          } else {
            commands = res;
            openMenu();
          }
        } else {
          commands = options.commands;
          openMenu();
        }

        function openMenu(){
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

          let rp, rw, rh, rs;
          if( !isCy && ele && ele.isNode instanceof Function && ele.isNode() && !ele.isParent() && !options.atMouse ){
            // If it's a node, the default spotlight radius for a node is the node width
            rp = ele.renderedPosition();
            rw = ele.renderedOuterWidth();
            rh = ele.renderedOuterHeight();
            rs = rw/2;
            // If adaptativeNodespotlightRadius is not enabled and min|maxSpotlighrRadius is defined, use those instead
            rs = !options.adaptativeNodeSpotlightRadius && options.minSpotlightRadius ? Math.max(rs, options.minSpotlightRadius): rs;
            rs = !options.adaptativeNodeSpotlightRadius && options.maxSpotlightRadius ? Math.min(rs, options.maxSpotlightRadius): rs;
          } else {
            // If it's the background or an edge, the spotlight radius is the min|maxSpotlightRadius
            rp = e.renderedPosition || e.cyRenderedPosition;
            rw = 1;
            rh = 1;
            rs = rw/2;
            rs = options.minSpotlightRadius ? Math.max(rs, options.minSpotlightRadius): rs;
            rs = options.maxSpotlightRadius ? Math.min(rs, options.maxSpotlightRadius): rs;
          }

          offset = getOffset(container);

          ctrx = rp.x;
          ctry = rp.y;
          r = rw/2 + (options.menuRadius instanceof Function ? options.menuRadius(target) : Number(options.menuRadius));
          containerSize = (r + options.activePadding)*2;
          updatePixelRatio();

          setStyles(parent, {
            width: containerSize + 'px',
            height: containerSize + 'px',   
            display: 'block',
            left: (rp.x - r) + 'px',
            top: (rp.y - r) + 'px'
          });
          createMenuItems(r, rs);
          queueDrawBg(r, rs);

          activeCommandI = undefined;
          cy.emit("cxthoverend");

          inGesture = true;
          gestureStartEvent = e;
        }
      })

      .on('cxtdrag tapdrag', options.selector, dragHandler = function(e){

        if( !inGesture ){ return; }
        e.preventDefault(); // Otherwise, on mobile, the pull-down refresh gesture gets activated

        let origE = e.originalEvent;
        let isTouch = origE.touches && origE.touches.length > 0;

        let pageX = (isTouch ? origE.touches[0].pageX : origE.pageX) - window.pageXOffset;
        let pageY = (isTouch ? origE.touches[0].pageY : origE.pageY) - window.pageYOffset;

        activeCommandI = undefined;
        cy.emit("cxthoverend");

        let dx = pageX - offset.left - ctrx;
        let dy = pageY - offset.top - ctry;

        if( dx === 0 ){ dx = 0.01; }

        let d = Math.sqrt( dx*dx + dy*dy );
        let cosTheta = (dy*dy - d*d - dx*dx)/(-2 * d * dx);
        let theta = Math.acos( cosTheta );


        let rw;
        if(target && target.isNode instanceof Function && target.isNode() && !target.isParent() && !options.atMouse ){
          // If it's a node, the default spotlight radius for a node is the node width
          rw = target.renderedOuterWidth();
          rs = rw/2;
          // If adaptativeNodespotlightRadius is not enabled and min|maxSpotlighrRadius is defined, use those instead
          rs = !options.adaptativeNodeSpotlightRadius && options.minSpotlightRadius ? Math.max(rs, options.minSpotlightRadius): rs;
          rs = !options.adaptativeNodeSpotlightRadius && options.maxSpotlightRadius ? Math.min(rs, options.maxSpotlightRadius): rs;
        } else {
          // If it's the background or an edge, the spotlight radius is the min|maxSpotlightRadius
          rw = 1;
          rs = rw/2;
          rs = options.minSpotlightRadius ? Math.max(rs, options.minSpotlightRadius): rs;
          rs = options.maxSpotlightRadius ? Math.min(rs, options.maxSpotlightRadius): rs;
        }

        r = rw/2 + (options.menuRadius instanceof Function ? options.menuRadius(target) : Number(options.menuRadius));
        if( d < rs + options.spotlightPadding
            || (typeof options.outsideMenuCancel === "number" && d > r + options.activePadding + options.outsideMenuCancel)){ //

          queueDrawBg(r, rs);
          return;
        }
        queueDrawBg(r, rs);

        let rx = dx*r / d;
        let ry = dy*r / d;

        if( dy > 0 ){
          theta = Math.PI + Math.abs(theta - Math.PI);
        }

        let dtheta = 2*Math.PI/(commands.length);
        let theta1 = Math.PI/2;
        let theta2 = theta1 + dtheta;

        for( let i = 0; i < commands.length; i++ ){
          let command = commands[i];

          let inThisCommand = theta1 <= theta && theta <= theta2
            || theta1 <= theta + 2*Math.PI && theta + 2*Math.PI <= theta2;

          if( command.disabled === true || command.enabled === false ){
            inThisCommand = false;
          }

          if( inThisCommand ){
            activeCommandI = i;
            cy.emit("cxthover", commands[i]);
            break;
          }

          theta1 += dtheta;
          theta2 += dtheta;
        }
        queueDrawCommands( rx, ry, r, theta, rs );
      })

      .on('tapdrag', dragHandler)

      .on('cxttapend tapend', function(){
        parent.style.display = 'none';
        if( activeCommandI !== undefined ){
          let select = commands[ activeCommandI ].select;

          if( select ){
            select.apply( target, [target, gestureStartEvent] );
            activeCommandI = undefined;
            cy.emit("cxthoverend");
          }
        }

        inGesture = false;

        restoreGestures();
      })
    ;
  }

  function removeEventListeners(){
    let handlers = data.handlers;

    for( let i = 0; i < handlers.length; i++ ){
      let h = handlers[i];

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

};

module.exports = cxtmenu;

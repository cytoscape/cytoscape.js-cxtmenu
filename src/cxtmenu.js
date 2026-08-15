const defaults = require('./defaults');
const { resolveOptions } = require('./options');
const { removeEles, setStyles, createElement, getPixelRatio, getOffset } = require('./dom-util');
const { createState, childCommands, enterCommand, leaveCommand, restartDwell, tick, beginRelease, cancelRelease, releaseNow, pinProgress } = require('./ring-state');
const { ringLevelForDistance, ringRadii, commandIndexAtAngle, commandIndexAtAngleInSegment, computeRingLayouts } = require('./ring-geometry');

let cxtmenu = function(params){
  let options = resolveOptions(defaults, params);
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

  let r = 100; // default radius
  let rTotal = r; // radius including submenu rings
  let ringWidth = 0; // radial width of one submenu ring band
  let containerSize = (r + options.activePadding)*2;
  let activeCommandI;
  let activeRingI;
  let offset;

  let ringState = null; // ring-state instance for the open gesture
  let ringsKey = ''; // last rendered ring structure

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

  function menuRadiusValue(){
    return options.menuRadius instanceof Function ? Number(options.menuRadius(target)) : Number(options.menuRadius);
  }

  function ringWidthValue(){
    let w = options.submenuDefaults.ringWidth;

    if( w === false || w == null ){
      return menuRadiusValue();
    }

    return w instanceof Function ? Number(w(target)) : Number(w);
  }

  function visibleRings(){
    return ringState ? ringState.rings : [ { commands, sourcePath: [] } ];
  }

  function ringLayouts(rings){
    return computeRingLayouts(rings, options.submenuDefaults.segmentThreshold);
  }

  function computeRingsKey(){
    return ringState
      ? ringState.rings.map(ring => ring.sourcePath.join('.') + ':' + ring.commands.length).join('|')
      : '';
  }

  function createMenuItems(rootR, rs) {
    removeEles('.cxtmenu-item', parent);

    let rings = visibleRings();
    let layouts = ringLayouts(rings);

    for (let ringI = 0; ringI < rings.length; ringI++) {
      let ringCommands = rings[ringI].commands;
      let radii = ringRadii(ringI, rootR, ringWidth);
      let inner = ringI === 0 ? rs : radii.inner;
      let outer = radii.outer;

      let dtheta = layouts[ringI].dtheta;
      let theta1 = layouts[ringI].start;
      let theta2 = theta1 + dtheta;

      for (let i = 0; i < ringCommands.length; i++) {
        let command = ringCommands[i];

        let midtheta = (theta1 + theta2) / 2;
        let rx1 = ((inner + outer)/2) * Math.cos(midtheta);
        let ry1 = ((inner + outer)/2) * Math.sin(midtheta);

        // Arbitrary multiplier to increase the sizing of the space
        // available for the item.
        let width = 1 * Math.abs((outer - inner) * Math.cos(midtheta));
        let height = 1 * Math.abs((outer - inner) * Math.sin(midtheta));
        width = Math.max(width, height);

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
  }

  function queueDrawBg( radius, rspotlight ){
    redrawQueue.drawBg = [ radius, rspotlight ];
  }

  function drawBg( radius, rspotlight ){
    let cx = rTotal + options.activePadding;

    c2d.globalCompositeOperation = 'source-over';

    c2d.clearRect(0, 0, containerSize, containerSize);

    let rings = visibleRings();
    let layouts = ringLayouts(rings);

    for( let ringI = 0; ringI < rings.length; ringI++ ){
      let ringCommands = rings[ringI].commands;
      let radii = ringRadii(ringI, radius, ringWidth);
      let inner = radii.inner;
      let outer = radii.outer;
      let layout = layouts[ringI];

      // draw background items
      c2d.fillStyle = options.fillColor;
      let dtheta = layout.dtheta;
      let theta1 = layout.start;
      let theta2 = theta1 + dtheta;

      for( let index = 0; index < ringCommands.length; index++ ){
        let command = ringCommands[index];

        if( command.fillColor ){
          c2d.fillStyle = command.fillColor;
        }
        c2d.beginPath();
        if( ringI === 0 ){
          c2d.moveTo(cx, cx);
          c2d.arc(cx, cx, outer, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
        } else {
          c2d.arc(cx, cx, outer, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
          c2d.arc(cx, cx, inner, 2*Math.PI - theta2, 2*Math.PI - theta1, false);
        }
        c2d.closePath();
        c2d.fill();

        theta1 += dtheta;
        theta2 += dtheta;

        c2d.fillStyle = options.fillColor;
      }

      // draw separators between items (a trailing one as well for segments)
      c2d.globalCompositeOperation = 'destination-out';
      c2d.strokeStyle = 'white';
      c2d.lineWidth = options.separatorWidth;
      theta1 = layout.start;
      theta2 = theta1 + dtheta;

      let separatorCount = layout.full ? ringCommands.length : ringCommands.length + 1;

      for( let i = 0; i < separatorCount; i++ ){
        let cosT = Math.cos(theta1);
        let sinT = Math.sin(theta1);
        c2d.beginPath();
        c2d.moveTo(cx + inner * cosT, cx - inner * sinT);
        c2d.lineTo(cx + outer * cosT, cx - outer * sinT);
        c2d.closePath();
        c2d.stroke();

        theta1 += dtheta;
        theta2 += dtheta;
      }

      // draw a separator arc between successive rings (span only, for segments)
      if( ringI > 0 ){
        let spanStart = layout.start;
        let spanEnd = layout.start + ringCommands.length * dtheta;
        c2d.beginPath();
        c2d.arc(cx, cx, inner, 2*Math.PI - spanStart, 2*Math.PI - spanEnd, true);
        c2d.stroke();
      }

      c2d.globalCompositeOperation = 'source-over';
    }

    c2d.fillStyle = 'white';
    c2d.globalCompositeOperation = 'destination-out';
    c2d.beginPath();
    c2d.arc(cx, cx, rspotlight + options.spotlightPadding, 0, Math.PI*2, true);
    c2d.closePath();
    c2d.fill();

    c2d.globalCompositeOperation = 'source-over';
  }

  function queueDrawCommands( rx, ry, radius, theta, rspotlight ){
    redrawQueue.drawCommands = [ rx, ry, radius, theta, rspotlight ];
  }

  // Loading-circle indicator for the freeze/release countdown: outline starts
  // at 12 o'clock and closes clockwise (unwinds during release); a lock icon
  // sits in the center.  Placed on the center node.
  function drawPinIndicator( progress ){
    let cx = rTotal + options.activePadding;
    let radius = 12;
    let x = cx; // centered on the node
    let y = cx;

    let fraction = progress.kind === 'release'
      ? 1 - progress.fraction // unwind while releasing
      : progress.fraction;

    // backdrop
    c2d.globalCompositeOperation = 'source-over';
    c2d.fillStyle = options.fillColor;
    c2d.beginPath();
    c2d.arc(x, y, radius, 0, 2*Math.PI, false);
    c2d.closePath();
    c2d.fill();

    // progress outline: 12 o'clock, clockwise until closed
    c2d.strokeStyle = options.activeFillColor;
    c2d.lineWidth = 2.5;
    c2d.beginPath();
    c2d.arc(x, y, radius - 1.5, -Math.PI/2, -Math.PI/2 + fraction * 2*Math.PI, false);
    c2d.stroke();

    // lock icon: shackle + body
    c2d.strokeStyle = options.itemColor;
    c2d.fillStyle = options.itemColor;
    c2d.lineWidth = 1.5;
    c2d.beginPath();
    c2d.arc(x, y - 1, 3, Math.PI, 2*Math.PI, false);
    c2d.stroke();
    c2d.fillRect(x - 4.5, y - 1, 9, 6.5);
  }

  function drawCommands( rx, ry, radius, theta, rs ){
    if( activeCommandI === undefined || activeRingI === undefined ){ return; }

    let cx = rTotal + options.activePadding;
    let rings = visibleRings();
    let ring = rings[activeRingI];

    if( !ring ){ return; }

    let layouts = ringLayouts(rings);
    let dtheta = layouts[activeRingI].dtheta;
    let theta1 = layouts[activeRingI].start + dtheta * activeCommandI;
    let theta2 = theta1 + dtheta;

    let radii = ringRadii(activeRingI, radius, ringWidth);
    let isOutmost = activeRingI === rings.length - 1;
    let outer = radii.outer + (isOutmost ? options.activePadding : 0);

    c2d.fillStyle = options.activeFillColor;
    c2d.strokeStyle = 'black';
    c2d.lineWidth = 1;
    c2d.beginPath();
    if( activeRingI === 0 ){
      c2d.moveTo(cx, cx);
      c2d.arc(cx, cx, outer, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
    } else {
      c2d.arc(cx, cx, outer, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
      c2d.arc(cx, cx, radii.inner, 2*Math.PI - theta2, 2*Math.PI - theta1, false);
    }
    c2d.closePath();
    c2d.fill();

    c2d.fillStyle = 'white';
    c2d.globalCompositeOperation = 'destination-out';

    if( activeRingI === 0 ){
      let tx = cx + rx/radius*(rs + options.spotlightPadding - options.indicatorSize/4);
      let ty = cx + ry/radius*(rs + options.spotlightPadding - options.indicatorSize/4);
      let rot = Math.PI/4 - theta;

      c2d.translate( tx, ty );
      c2d.rotate( rot );

      // clear the indicator
      // The indicator size (arrow) depends on the node size as well. If the indicator size is bigger and the rendered node size + padding,
      // use the rendered node size + padding as the indicator size.
      let indicatorSize = options.indicatorSize > rs + options.spotlightPadding ? rs + options.spotlightPadding : options.indicatorSize;
      c2d.beginPath();
      c2d.fillRect(-indicatorSize/2, -indicatorSize/2, indicatorSize, indicatorSize);
      c2d.closePath();
      c2d.fill();

      c2d.rotate( -rot );
      c2d.translate( -tx, -ty );

      // clear the spotlight
      c2d.beginPath();
      c2d.arc(cx, cx, rs + options.spotlightPadding, 0, Math.PI*2, true);
      c2d.closePath();
      c2d.fill();
    }

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
  let lastDrawBg = null;
  let lastDrawCommands = null;

  let raf = (
    window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.msRequestAnimationFrame
    || (fn => setTimeout(fn, 16))
  );

  let redraw = function(){
    let pinning = options.submenuDefaults.pinning === true;

    if( ringState && pinning ){
      // advance freeze / release countdowns
      ringState = tick( ringState, Date.now(), options.submenuDefaults.pinDelay, options.submenuDefaults.stillDelay );
    }

    if( ringState && ringState.frozen ){
      // gestures are live while frozen: keep the menu anchored to the node
      reanchorFrozenMenu();
    }

    if( ringState && computeRingsKey() !== ringsKey ){
      syncRingLayout();
    }

    let progress = ringState && pinning ? pinProgress( ringState, Date.now(), options.submenuDefaults.pinDelay, options.submenuDefaults.stillDelay ) : null;
    let animatePin = progress !== null;

    if( redrawQueue.drawBg ){
      lastDrawBg = redrawQueue.drawBg;
    }

    if( redrawQueue.drawCommands ){
      lastDrawCommands = redrawQueue.drawCommands;
    }

    // while a pin countdown runs, redraw every frame so the outline animates
    if( redrawQueue.drawBg || (animatePin && lastDrawBg) ){
      drawBg.apply( null, redrawQueue.drawBg || lastDrawBg );
    }

    if( redrawQueue.drawCommands || (animatePin && lastDrawCommands) ){
      drawCommands.apply( null, redrawQueue.drawCommands || lastDrawCommands );
    }

    if( animatePin ){
      drawPinIndicator( progress );
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

  // Follow the target node while the menu is frozen and pan/zoom/drag are
  // enabled: re-center and re-scale the menu when the node's rendered
  // position or size changed.
  function reanchorFrozenMenu(){
    if( !target || target === cy ){ return; }
    if( !(target.isNode instanceof Function) || !target.isNode() || target.isParent() || options.atMouse ){ return; }

    let rp = target.renderedPosition();
    let rw = target.renderedOuterWidth();
    let newR = rw/2 + menuRadiusValue();

    if( rp.x === ctrx && rp.y === ctry && newR === r ){ return; }

    ctrx = rp.x;
    ctry = rp.y;
    r = newR;
    rs = rw/2;
    rs = !options.adaptativeNodeSpotlightRadius && options.minSpotlightRadius ? Math.max(rs, options.minSpotlightRadius): rs;
    rs = !options.adaptativeNodeSpotlightRadius && options.maxSpotlightRadius ? Math.min(rs, options.maxSpotlightRadius): rs;
    ringWidth = Math.max(1, ringWidthValue());
    offset = getOffset(container);

    syncRingLayout();
  }

  // resize the canvas + container to cover all rings and rebuild items
  function syncRingLayout(){
    ringsKey = computeRingsKey();

    let ringCount = ringState ? ringState.rings.length : 1;
    rTotal = r + (ringCount - 1) * ringWidth;
    containerSize = (rTotal + options.activePadding)*2;
    updatePixelRatio();

    setStyles(parent, {
      width: containerSize + 'px',
      height: containerSize + 'px',
      left: (ctrx - rTotal) + 'px',
      top: (ctry - rTotal) + 'px'
    });

    createMenuItems(r, rs);
    queueDrawBg(r, rs);
  }

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
    let hoverOn;

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

    let disableGestures = function(){
      zoomEnabled = cy.userZoomingEnabled();
      cy.userZoomingEnabled( false );

      panEnabled = cy.userPanningEnabled();
      cy.userPanningEnabled( false );

      boxEnabled = cy.boxSelectionEnabled();
      cy.boxSelectionEnabled( false );

      grabbable = target && target.grabbable && target.grabbable();
      if( grabbable ){
        target.ungrabify();
      }
    };

    // re-engaging anywhere on a frozen menu starts the release countdown
    let engageFrozen = function(e){
      if( !(ringState && ringState.frozen) ){ return false; }

      let rp = e.renderedPosition || e.cyRenderedPosition;

      if( rp ){
        let dx = rp.x - ctrx;
        let dy = rp.y - ctry;

        if( Math.sqrt(dx*dx + dy*dy) > rTotal + options.activePadding ){
          return false; // outside the frozen menu
        }
      }

      disableGestures(); // gestures were live while parked

      ringState = beginRelease( ringState, Date.now() );
      inGesture = true;
      gestureStartEvent = e;

      return true;
    };

    bindings
      .on('resize', function(){
        updatePixelRatio();
      })

      // background taps over a frozen menu
      .on(options.openMenuEvents, 'core', function(e){
        engageFrozen(e);
      })

      .on(options.openMenuEvents, options.selector, function(e){
        if( engageFrozen(e) ){ return; } // frozen: re-engage instead of reopening

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

          disableGestures();

          let rp, rw, rh;
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
          r = rw/2 + menuRadiusValue();
          ringWidth = Math.max(1, ringWidthValue());

          ringState = createState(commands);
          ringsKey = '';
          activeCommandI = undefined;
          activeRingI = undefined;

          syncRingLayout();

          parent.style.display = 'block';

          inGesture = true;
          gestureStartEvent = e;
        }
      })

      .on('cxtdrag tapdrag', options.selector, dragHandler = function(e){

        if( !inGesture ){ return; }
        e.preventDefault(); // Otherwise, on mobile, the pull-down refresh gesture gets activated

        if( ringState && ringState.frozen ){
          // movement while engaged releases the pin immediately
          ringState = releaseNow( ringState );
        }

        let origE = e.originalEvent;
        let isTouch = origE.touches && origE.touches.length > 0;

        let pageX = (isTouch ? origE.touches[0].pageX : origE.pageX) - window.pageXOffset;
        let pageY = (isTouch ? origE.touches[0].pageY : origE.pageY) - window.pageYOffset;

        let prevRingI = activeRingI;
        let prevCommandI = activeCommandI;

        activeCommandI = undefined;
        activeRingI = undefined;

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

        r = rw/2 + menuRadiusValue();
        ringWidth = Math.max(1, ringWidthValue());

        let ringCount = ringState ? ringState.rings.length : 1;
        rTotal = r + (ringCount - 1) * ringWidth;

        if( d < rs + options.spotlightPadding
            || (typeof options.outsideMenuCancel === "number" && d > rTotal + options.activePadding + options.outsideMenuCancel)){ //

          if( ringState ){
            // close submenu rings and drop the dwell when the pointer retreats
            ringState = leaveCommand( ringState, 1 );
          }

          queueDrawBg(r, rs);
          return;
        }
        queueDrawBg(r, rs);

        let rx = dx*r / d;
        let ry = dy*r / d;

        if( dy > 0 ){
          theta = Math.PI + Math.abs(theta - Math.PI);
        }

        let pickCommandI = function(level){
          let layout = ringLayouts(ringState.rings)[level];

          return layout.full
            ? commandIndexAtAngle(theta, layout.count)
            : commandIndexAtAngleInSegment(theta, layout.start, layout.dtheta, layout.count);
        };

        let level = Math.min( ringLevelForDistance(d, r, ringWidth), ringState.rings.length - 1 );
        let ring = ringState.rings[level];
        let commandI = pickCommandI(level);
        let command = commandI === null ? null : ring.commands[commandI];

        let changed = level !== prevRingI || commandI !== prevCommandI;

        if( command === null ){
          // angularly outside a segment ring: drop rings at/beyond that level
          ringState = leaveCommand( ringState, Math.max(level, 1) );
          return;
        }

        if( command.disabled === true || command.enabled === false ){
          queueDrawCommands( rx, ry, r, theta, rs );
          return;
        }

        if( changed ){
          // truncate the chain to this ring and open the command's submenu (if any)
          ringState = enterCommand(ringState, level, commandI, childCommands(command), Date.now());
        } else {
          // movement within the same command: restart the stillness anchor,
          // so the freeze countdown only runs while the pointer rests
          ringState = restartDwell(ringState, Date.now());
        }

        activeRingI = level;
        activeCommandI = commandI;

        queueDrawCommands( rx, ry, r, theta, rs );
      })

      .on('tapdrag', dragHandler)

      .on('mousemove', function () {
        if (activeCommandI !== undefined && activeRingI !== undefined && ringState) {
          let ring = ringState.rings[activeRingI];
          let command = ring && ring.commands[activeCommandI];
          let hovered = command && command.hover;
          let hoverKey = activeRingI + ':' + activeCommandI;
          if (hovered) {
            if (hoverOn !== hoverKey) {
              hovered.apply(target, [target, gestureStartEvent]);
            }
            hoverOn = hoverKey;
          }
        }
      })

      .on('cxttapend tapend', function(){
        if( ringState && ringState.frozen ){
          // frozen: the menu stays open; an unfinished release countdown is
          // cancelled; gestures come back so the canvas can be panned/zoomed
          // and the node dragged while the menu is parked
          ringState = cancelRelease( ringState );
          activeCommandI = undefined;
          activeRingI = undefined;
          hoverOn = undefined;
          inGesture = false;
          restoreGestures();
          return;
        }

        parent.style.display = 'none';
        if( activeCommandI !== undefined && activeRingI !== undefined && ringState ){
          let ring = ringState.rings[activeRingI];
          let command = ring && ring.commands[activeCommandI];
          let select = command && command.select;

          if( select ){
            select.apply( target, [target, gestureStartEvent] );
          }
        }

        activeCommandI = undefined;
        activeRingI = undefined;
        ringState = null;
        ringsKey = '';
        lastDrawBg = null;
        lastDrawCommands = null;

        hoverOn = undefined;

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

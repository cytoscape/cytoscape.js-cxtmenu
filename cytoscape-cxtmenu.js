;(function( $ ){ 'use strict';

  var defaults = {
    menuRadius: 100, // the radius of the circular menu in pixels
    selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
    commands: [ // an array of commands to list in the menu
      /*
      { // example command
        content: 'a command name' // html/text content to be displayed in the menu
        select: function(){ // a function to execute when the command is selected
          console.log( this.id() ) // `this` holds the reference to the active element
        }
      }
      */
    ], 
    fillColor: 'rgba(0, 0, 0, 0.75)', // the background colour of the menu
    activeFillColor: 'rgba(92, 194, 237, 0.75)', // the colour used to indicate the selected command
    activePadding: 20, // additional size in pixels for the active command
    indicatorSize: 24, // the size in pixels of the pointer to the active command
    separatorWidth: 3, // the empty spacing in pixels between successive commands
    spotlightPadding: 4, // extra spacing in pixels between the element and the spotlight
    minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight
    maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight
    itemColor: 'white', // the colour of text in the command's content
    itemTextShadowColor: 'black', // the text shadow colour of the command's content
    zIndex: 9999 // the z-index of the ui div
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape, $ ){
    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    cytoscape('core', 'cxtmenu', function(params){
      var options = $.extend(true, {}, defaults, params);
      var fn = params;
      var cy = this;
      var $container = $( cy.container() );
      var target;
      
      function getOffset( $ele ){
        var offset = $ele.offset();

        offset.left += parseFloat( $ele.css('padding-left') );
        offset.left += parseFloat( $ele.css('border-left-width') );

        offset.top += parseFloat( $ele.css('padding-top') );
        offset.top += parseFloat( $ele.css('border-top-width') );

        return offset;
      }
      
      var data = {
        options: options,
        handlers: []
      };
      var $wrapper = $('<div class="cxtmenu"></div>'); data.$container = $wrapper;
      var $parent = $('<div></div>');
      var $canvas = $('<canvas></canvas>');
      var c2d = $canvas[0].getContext('2d');
      var r = options.menuRadius;
      var containerSize = (r + options.activePadding)*2;
      var activeCommandI = undefined;
      var offset;

      $container.append( $wrapper );
      $wrapper.append( $parent );
      $parent.append( $canvas );

      $wrapper.css({
        position: 'absolute',
        zIndex: options.zIndex
      });

      $parent.css({
        width: containerSize + 'px',
        height: containerSize + 'px',
        position: 'absolute',
        zIndex: 1,
        marginLeft: - options.activePadding + 'px',
        marginTop: - options.activePadding + 'px'
      }).hide();

      $canvas[0].width = containerSize;
      $canvas[0].height = containerSize;

      var commands = options.commands;
      var dtheta = 2*Math.PI/(commands.length);
      var theta1 = commands.length % 2 !== 0 ? Math.PI/2 : 0;
      var theta2 = theta1 + dtheta;
      var $items = [];

      for( var i = 0; i < commands.length; i++ ){
        var command = commands[i];

        var midtheta = (theta1 + theta2)/2;
        var rx1 = 0.66 * r * Math.cos( midtheta );
        var ry1 = 0.66 * r * Math.sin( midtheta );

        // console.log(rx1, ry1, theta1, theta2)

        var $item = $('<div class="cxtmenu-item"></div>');
        $item.css({
          color: options.itemColor,
          cursor: 'default',
          display: 'table',
          'text-align': 'center',
          //background: 'red',
          position: 'absolute',
          'text-shadow': '-1px -1px ' + options.itemTextShadowColor + ', 1px -1px ' + options.itemTextShadowColor + ', -1px 1px ' + options.itemTextShadowColor + ', 1px 1px ' + options.itemTextShadowColor,
          left: '50%',
          top: '50%',
          'min-height': r * 0.66,
          width: r * 0.66,
          height: r * 0.66,
          marginLeft: rx1 - r * 0.33,
          marginTop: -ry1 -r * 0.33
        });
        
        var $content = $('<div class="cxtmenu-content">' + command.content + '</div>');
        $content.css({
          'width': r * 0.66,
          'height': r * 0.66,
          'vertical-align': 'middle',
          'display': 'table-cell'
        });
        
        $parent.append( $item );
        $item.append( $content );


        theta1 += dtheta;
        theta2 += dtheta;
      }

      // Left click hides menu and triggers command
      $(document).on('click', function() {
        $parent.hide();
      });

      $wrapper.on('click', function() {
        if (activeCommandI !== undefined && !!target) {
          var select = options.commands[activeCommandI].select;

          if (select) {
              select.apply(target);
          }
        }
      });


      function drawBg( rspotlight ){
        rspotlight = rspotlight !== undefined ? rspotlight : rs;

        c2d.globalCompositeOperation = 'source-over';

        c2d.clearRect(0, 0, containerSize, containerSize);

        c2d.fillStyle = options.fillColor;
        c2d.beginPath();
        c2d.arc(r + options.activePadding, r + options.activePadding, r, 0, Math.PI*2, true); 
        c2d.closePath();
        c2d.fill();

        c2d.globalCompositeOperation = 'destination-out';
        c2d.strokeStyle = 'white';
        c2d.lineWidth = options.separatorWidth;
        var commands = options.commands;
        var dtheta = 2*Math.PI/(commands.length);
        var theta1 = commands.length % 2 !== 0 ? Math.PI/2 : 0;
        var theta2 = theta1 + dtheta;

        for( var i = 0; i < commands.length; i++ ){
          var command = commands[i];

          var rx1 = r * Math.cos(theta1);
          var ry1 = r * Math.sin(theta1);
          c2d.beginPath();
          c2d.moveTo(r + options.activePadding, r + options.activePadding);
          c2d.lineTo(r + options.activePadding + rx1, r + options.activePadding - ry1);
          c2d.closePath();
          c2d.stroke();

          // var rx2 = r * Math.cos(theta2);
          // var ry2 = r * Math.sin(theta2);
          // c2d.moveTo(r, r);
          // c2d.lineTo(r + rx2, r + ry2);
          // c2d.stroke();

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
      
      var lastCallTime = 0;
      var minCallDelta = 1000/30;
      var endCallTimeout;
      var firstCall = true;
      function rateLimitedCall( fn ){
        var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        var now = +new Date;

        clearTimeout( endCallTimeout );

        if( firstCall || now >= lastCallTime + minCallDelta ){
          requestAnimationFrame(fn);
          lastCallTime = now;
          firstCall = false;
        } else {
          endCallTimeout = setTimeout(function(){
            requestAnimationFrame(fn);
            lastCallTime = now;
          }, minCallDelta * 2);
        }
      }

      var ctrx, ctry, rs;
      var tapendHandler;

      var bindings = {
        on: function(events, selector, fn){
          data.handlers.push({
            events: events,
            selector: selector,
            fn: fn
          });

          cy.on(events, selector, fn);

          return this;
        }
      };

      function addEventListeners(){
        bindings
          .on('cxttapstart', options.selector, function(e){
            target = this; // Remember which node the context menu is for
            var ele = this;

            var rp, rw, rh;
            if( ele.isNode() ){
              rp = ele.renderedPosition();
              rw = ele.renderedWidth();
              rh = ele.renderedHeight();
            } else {
              rp = e.cyRenderedPosition;
              rw = 1;
              rh = 1;
            }

            var scrollLeft = $(window).scrollLeft();
            var scrollTop = $(window).scrollTop();
            offset = getOffset( $container );

            ctrx = rp.x;
            ctry = rp.y;

            $parent.show().css({
              'left': rp.x - r + 'px',
              'top': rp.y - r + 'px'
            });

            rs = Math.max(rw, rh)/2;
            rs = Math.max(rs, options.minSpotlightRadius);
            rs = Math.min(rs, options.maxSpotlightRadius);

            drawBg();

            activeCommandI = undefined;
          })

          .on('cxtdrag', options.selector, function(e){ rateLimitedCall(function(){

            var dx = e.originalEvent.pageX - offset.left - ctrx;
            var dy = e.originalEvent.pageY - offset.top - ctry;

            if( dx === 0 ){ dx = 0.01; }

            var d = Math.sqrt( dx*dx + dy*dy );
            var cosTheta = (dy*dy - d*d - dx*dx)/(-2 * d * dx);
            var theta = Math.acos( cosTheta );

            activeCommandI = undefined;

            if( d < rs + options.spotlightPadding ){
              drawBg();
              return;
            }

            drawBg();

            var rx = dx*r / d;
            var ry = dy*r / d;
            
            if( dy > 0 ){
              theta = Math.PI + Math.abs(theta - Math.PI);
            }

            var commands = options.commands;
            var dtheta = 2*Math.PI/(commands.length);
            var theta1 = commands.length % 2 !== 0 ? Math.PI/2 : 0;
            var theta2 = theta1 + dtheta;

            for( var i = 0; i < commands.length; i++ ){
              var command = commands[i];


              // console.log(i, theta1, theta, theta2);

              var inThisCommand = theta1 <= theta && theta <= theta2
                || theta1 <= theta + 2*Math.PI && theta + 2*Math.PI <= theta2;

              if( inThisCommand ){
                // console.log('in command ' + i)
                
                c2d.fillStyle = options.activeFillColor;
                c2d.strokeStyle = 'black';
                c2d.lineWidth = 1;
                c2d.beginPath();
                c2d.moveTo(r + options.activePadding, r + options.activePadding);
                c2d.arc(r + options.activePadding, r + options.activePadding, r + options.activePadding, 2*Math.PI - theta1, 2*Math.PI - theta2, true);
                c2d.closePath();
                c2d.fill();
                //c2d.stroke();

                activeCommandI = i;

                break;
              }

              theta1 += dtheta;
              theta2 += dtheta;
            }

            c2d.fillStyle = 'white';
            c2d.globalCompositeOperation = 'destination-out';

            // clear the indicator
            c2d.beginPath();
            //c2d.arc(r + rx/r*(rs + options.spotlightPadding), r + ry/r*(rs + options.spotlightPadding), options.indicatorSize, 0, 2*Math.PI, true);
          
            c2d.translate( r + options.activePadding + rx/r*(rs + options.spotlightPadding - options.indicatorSize/4), r + options.activePadding + ry/r*(rs + options.spotlightPadding - options.indicatorSize/4) );
            c2d.rotate( Math.PI/4 - theta );
            c2d.fillRect(-options.indicatorSize/2, -options.indicatorSize/2, options.indicatorSize, options.indicatorSize);
            c2d.closePath();
            c2d.fill();

            c2d.setTransform(1, 0, 0, 1, 0, 0);

            // clear the spotlight
            c2d.beginPath();
            c2d.arc(r + options.activePadding, r + options.activePadding, rs + options.spotlightPadding, 0, Math.PI*2, true); 
            c2d.closePath();
            c2d.fill();

            c2d.globalCompositeOperation = 'source-over';
          }) })

          .on('cxttapend', options.selector, function(e){
            var ele = this;
            $parent.hide();

            if( activeCommandI !== undefined ){
              var select = options.commands[ activeCommandI ].select;

              if( select ){
                select.apply( ele );
              }
            }
          })

          .on('cxttapend', function(e){
            $parent.hide();
          })
        ;
      }
        
      addEventListeners();

    });

  }; // reg

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-cxtmenu', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape, $ );
  }

})( jQuery );
let defaults = {
  menuRadius: function(ele){ return 100 }, // the radius of the circular menu in pixels
  selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
  commands: [ // an array of commands to list in the menu or a function that returns the array (may also return a promise of the array)
    /*
    { // example command; all options shown
      content: 'a command name', // html/text content to be displayed in the menu (string or HTMLElement)
      contentStyle: {}, // css key:value pairs to set the command's css in js if you want
      fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item; defaults to the menu-level `fillColor`
      select: function(ele, gestureStartEvent){ // a function to execute when the command is selected
        console.log( ele.id() ) // `ele` holds the reference to the active element; `gestureStartEvent` is the event that opened the menu
      },
      hover: function(ele, gestureStartEvent){ // optional: a function to execute when the command is hovered
        console.log( ele.id() )
      },
      enabled: true, // whether the command is selectable; false renders it with the `cxtmenu-disabled` class
      disabled: false, // alternative flag: true also disables the command (either works)
      subcommands: [] // optional: nested commands (same shape as this one) shown as an additional concentric ring; each may nest further via its own `subcommands`; omit for a plain command
    }
    */
  ], // function( ele ){ return [ ... ] }, // example function for commands
  fillColor: 'rgba(0, 0, 0, 0.75)', // the background colour of the menu
  activeFillColor: 'rgba(1, 105, 217, 0.75)', // the colour used to indicate the selected command
  activePadding: 20, // additional size in pixels for the active command
  indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size, 
  separatorWidth: 3, // the empty spacing in pixels between successive commands
  spotlightPadding: 4, // extra spacing in pixels between the element and the spotlight
  adaptativeNodeSpotlightRadius: false, // specify whether the spotlight radius should adapt to the node size
  minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
  maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
  openMenuEvents: 'cxttapstart taphold', // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
  itemColor: 'white', // the colour of text in the command's content
  itemTextShadowColor: 'transparent', // the text shadow colour of the command's content
  zIndex: 9999, // the z-index of the ui div
  atMouse: false, // draw menu at mouse position
  outsideMenuCancel: false, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
  submenuDefaults: { // defaults for all submenu rings
    pinning: false, // true: resting the pointer freezes the whole menu — the pointer may disengage (mouseup / finger off) and the menu stays as-is while panning/zooming/node-dragging remain possible (the menu follows its node); re-engaging anywhere on the frozen menu (taphold / clickhold) starts a `pinDelay` release countdown after which the menu reacts normally again; moving while engaged releases immediately
    pinDelay: 500, // freeze countdown in ms once the pointer has been still, and release countdown on re-engage (a loading-circle indicator with a lock icon on the center node visualizes both)
    stillDelay: 300, // the pointer must rest at one location for this many ms before the freeze countdown (and its indicator) starts; any movement restarts it
    ringWidth: 300, // radial width in pixels of each submenu ring (number or function(ele)); false defaults to menuRadius
    segmentThreshold: 6 // submenus with fewer commands than this render as a ring segment next to their owner command instead of a full ring; 0 disables segments
  }
};

module.exports = defaults;

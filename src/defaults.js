let defaults = {
  menuRadius: function(ele){ return 100 }, // the radius of the circular menu in pixels
  selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
  commands: [ // an array of commands to list in the menu or a function that returns the array
    /*
    { // example command
      fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item
      content: 'a command name' // html/text content to be displayed in the menu
      contentStyle: {}, // css key:value pairs to set the command's css in js if you want
      hover: function(ele){ // a function to execute when the command is hovered
        console.log( ele.id() ) // `ele` holds the reference to the active element
      },
      select: function(ele){ // a function to execute when the command is selected
        console.log( ele.id() ) // `ele` holds the reference to the active element
      },
      enabled: true // whether the command is selectable
    }
    */
  ], // function( ele ){ return [ /*...*/ ] }, // example function for commands
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
  outsideMenuCancel: false // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
};

module.exports = defaults;

cytoscape-cxtmenu
================================================================================

![Preview](https://raw.githubusercontent.com/cytoscape/cytoscape.js-cxtmenu/master/img/preview.png)

## Description

A context menu for Cytoscape.js

This plugin creates a widget that lets the user operate circular context menus on nodes in Cytoscape.js.  The user swipes along the circular menu to select a menu item and perform a command on the node of interest.


## Dependencies

 * Cytoscape.js >= 2.2
 * jQuery >= 1.4


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-cxtmenu`,
 * via bower: `bower install cytoscape-cxtmenu`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var jquery = require('jquery');
var cxtmenu = require('cytoscape-cxtmenu');

cxtmenu( cytoscape, jquery ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-cxtmenu', 'jquery'], function( cytoscape, cxtmenu, jquery ){
  cxtmenu( cytoscape, jquery ); // register extension
});
```

Note that `jquery` must point to a jQuery object if any sort of `require()` is used.

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## CSS

You can style the font of the command text with the `cxtmenu-content` class, and you can style disabled entries with the `cxtmenu-disabled` class.


## API

You initialise the plugin on the same HTML DOM element container used for Cytoscape.js:

```js

var cy = cytoscape({
	container: document.getElementById('cy'),
	/* ... */
});

// the default values of each option are outlined below:
var defaults = {
  menuRadius: 100, // the radius of the circular menu in pixels
  selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
  commands: [ // an array of commands to list in the menu or a function that returns the array
    /*
    { // example command
      fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item
      content: 'a command name', // html/text content to be displayed in the menu
      select: function(ele){ // a function to execute when the command is selected
        console.log( ele.id() ) // `ele` holds the reference to the active element
      },
      disabled: false // disables the item on true
    }
    */
  ], // function( ele ){ return [ /*...*/ ] }, // example function for commands
  fillColor: 'rgba(0, 0, 0, 0.75)', // the background colour of the menu
  activeFillColor: 'rgba(92, 194, 237, 0.75)', // the colour used to indicate the selected command
  activePadding: 20, // additional size in pixels for the active command
  indicatorSize: 24, // the size in pixels of the pointer to the active command
  separatorWidth: 3, // the empty spacing in pixels between successive commands
  spotlightPadding: 4, // extra spacing in pixels between the element and the spotlight
  minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight
  maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight
  openMenuEvents: 'cxttapstart taphold', // cytoscape events that will open the menu (space separated)
  itemColor: 'white', // the colour of text in the command's content
  itemTextShadowColor: 'black', // the text shadow colour of the command's content
  zIndex: 9999, // the z-index of the ui div
  atMouse: false // draw menu at mouse position
};

var cxtmenuApi = cy.cxtmenu( defaults );
```

You get access to the cxtmenu API as the returned value of calling the extension.  You can use this to clean up and destroy the menu instance:

```js
var cxtmenuApi = cy.cxtmenu( someOptions );

cxtmenuApi.destroy();
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-cxtmenu https://github.com/cytoscape/cytoscape.js-cxtmenu.git`

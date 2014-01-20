cytoscape.js-cxtmenu
====================

![Preview](https://raw2.github.com/cytoscape/cytoscape.js-cxtmenu/master/img/preview.png)

## Description

This plugin creates a widget that lets the user operate circular context menus on nodes in Cytoscape.js.  The user swipes along the circular menu to select a menu item and perform a command on the node of interest.


## Dependencies

 * jQuery >=1.4
 * Cytoscape.js >=2.0


## Initialisation

You initialise the plugin on the same HTML DOM element container used for Cytoscape.js:

```js

$('#cy').cytoscape({
	/* ... */
});

// the default values of each option are outlined below:
$('#cy').cytoscapeCxtmenu({
	menuRadius: 100, // the radius of the circular menu in pixels
	selector: 'node', // nodes matching this Cytoscape.js selector will trigger cxtmenus
	commands: [ // an array of commands to list in the menu
		/*
		{ // example command
			content: 'a command name' // html/text content to be displayed in the menu
			select: function(){ // a function to execute when the command is selected
				console.log( this.id() ) // `this` holds the reference to the active node
			}
		}
		*/
	], 
	fillColor: 'rgba(0, 0, 0, 0.75)', // the background colour of the menu
	activeFillColor: 'rgba(92, 194, 237, 0.75)', // the colour used to indicate the selected command
	activePadding: 20, // additional size in pixels for the active command
	indicatorSize: 24, // the size in pixels of the pointer to the active command
	separatorWidth: 3, // the empty spacing in pixels between successive commands
	spotlightPadding: 4, // extra spacing in pixels between the node and the spotlight
	minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight
	maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight
	itemColor: 'white', // the colour of text in the command's content
	itemTextShadowColor: 'black', // the text shadow colour of the command's content
	zIndex: 9999 // the z-index of the ui div
});

```
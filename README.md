cytoscape.js-cxtmenu
====================



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
$('#cy').cytoscapeCxtmenu();

```
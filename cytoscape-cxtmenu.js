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

;(function () {
	'use strict';

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

	// Object.assign Polyfill for IE
	if (typeof Object.assign != 'function') {
		(function () {
			Object.assign = function (target) {
				'use strict';
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

	var removeEles = function (query, ancestor) {
		var els = [].slice.call(ancestor.querySelectorAll(query));

		ancestor = ancestor || document;

		for (var i = 0, l = els.length; i < l; i++) {
			els[i].remove();
		}
	};

	var setStyles = function (el, style) {
		var props = Object.keys(style);

		for (var i = 0, l = props.length; i < l; i++) {
			el.style[props[i]] = style[props[i]];
		}
	};

	var createElement = function (options) {
		options = options || {};

		var el = document.createElement(options.tag || 'div');

		el.className = options.class || '';

		if (options.style) {
			setStyles(el, options.style);
		}

		return el;
	};

	// registers the extension on a cytoscape lib ref
	var register = function (cytoscape) {
		if (!cytoscape) {
			return;
		} // can't register if cytoscape unspecified

		cytoscape('core', 'cxtmenu', function (params) {

			var options = Object.assign({}, defaults, params);
			var fn = params;
			var cy = this;
			var container = cy.container();
			var target;

			function getOffset(el) {
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
			var containerSize = (r + options.activePadding) * 2;
			var activeCommandI = [];
			var offset,
				canvasSize = containerSize,
				activePadding = options.activePadding,
				hasSubCommand = !!options.commands.find(function (menu) {
					return !!menu.subCommands
				}),
				offsetSize = hasSubCommand ? 2 * r : r;
			hasSubCommand && (containerSize = canvasSize = canvasSize + r * 2);
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
				marginLeft: -activePadding + 'px',
				marginTop: -activePadding + 'px'
			});

			canvas.width = canvasSize;
			canvas.height = canvasSize;

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
						'text-shadow': '-1px -1px ' + options.itemTextShadowColor + ', 1px -1px ' + options.itemTextShadowColor + ', -1px 1px ' + options.itemTextShadowColor + ', 1px 1px ' + options.itemTextShadowColor,
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

					// Render sub commands
					(function (subCommands, thetaRange, thetaStart) {
						if (!subCommands || !subCommands.length) return;
						var
							id = 0,
							sl = subCommands.length,
							dTheta = thetaRange / sl,
							theta1 = thetaStart,
							theta2 = theta1 + dTheta,
							midTheta, subCommand, rx_1, ry_1, $subItem, $subContent;
						for (; id < sl; id++) {
							subCommand = subCommands[id];
							midTheta = (theta1 + theta2) / 2;
							rx_1 = 1.66 * r * Math.cos(midTheta);
							ry_1 = 1.66 * r * Math.sin(midTheta);
							$subItem = createElement({class: 'cxtmenu-sub-item'});
							setStyles($subItem, {
								color: options.itemColor,
								cursor: 'default',
								display: 'table',
								'text-align': 'center',
								//background: 'red',
								position: 'absolute',
								'text-shadow': '-1px -1px ' + options.itemTextShadowColor + ', 1px -1px ' + options.itemTextShadowColor + ', -1px 1px ' + options.itemTextShadowColor + ', 1px 1px ' + options.itemTextShadowColor,
								/*  left: '50%',
								 top: '50%',*/
								'min-height': r * 0.66,
								width: r * 0.66,
								height: r * 0.66,
								marginLeft: ((rx_1 - r * 0.33) - ( rx1 - r * 0.33)) + "px",
								marginTop: ((-ry_1 - r * 0.33) - ( -ry1 - r * 0.33)) + "px"
							});
							$subContent = createElement({class: 'cxtmenu-sub-content'});
							//$subContent = $('<div class="cxtmenu-sub-content">' + subCommand.content + '</div>');
							setStyles($subContent, {
								'transform': 'transform: rotate(' + (Math.PI / 2 - midTheta) * (180 / Math.PI) + 'deg)',
								'width': r * 0.66,
								'height': r * 0.66,
								'vertical-align': 'middle',
								'display': 'table-cell'
							});
							$subContent.innerHTML = subCommand.content;

							if (subCommand.disabled) {
								$subContent.classList.add('cxtmenu-disabled');
							}
							$subItem.appendChild($subContent);
							item.appendChild($subItem);
							theta1 += dTheta;
							theta2 += dTheta;
						}

					})(command.subCommands, dtheta, theta1);

					parent.appendChild(item);
					item.appendChild(content);

					theta1 += dtheta;
					theta2 += dtheta;
				}
			}

			function queueDrawBg(rspotlight) {
				redrawQueue.drawBg = [rspotlight];
			}

			function drawBg(rspotlight) {
				rspotlight = rspotlight !== undefined ? rspotlight : rs;

				c2d.globalCompositeOperation = 'source-over';

				c2d.clearRect(0, 0, canvasSize, canvasSize);

				c2d.fillStyle = options.fillColor;
				c2d.beginPath();
				c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r * 1, 0, Math.PI * 2, true);
				c2d.closePath();
				c2d.fill();

				c2d.globalCompositeOperation = 'destination-out';
				c2d.strokeStyle = 'white';
				c2d.lineWidth = options.separatorWidth;
				var commands = options.commands;
				var dtheta = 2 * Math.PI / (commands.length);
				var theta1 = Math.PI / 2;
				var theta2 = theta1 + dtheta;

				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];

					var rx1 = r * Math.cos(theta1);
					var ry1 = r * Math.sin(theta1);
					c2d.beginPath();
					c2d.moveTo(offsetSize + activePadding, offsetSize + activePadding);
					c2d.lineTo(offsetSize + activePadding + rx1, offsetSize + activePadding - ry1);
					c2d.closePath();
					c2d.stroke();

					// Render sub commands
					(function (subCommands, thetaRange, thetaStart, thetaEnd) {
						if (!subCommands || !subCommands.length) return;
						var
							id = 0,
							sl = subCommands.length,
							dTheta = thetaRange / sl,
							theta1 = thetaStart,
							theta2 = theta1 + dTheta,
							rx1, ry1, rx2, ry2;
						c2d.globalCompositeOperation = "source-over";


						for (; id < sl; id++) {
							rx1 = r * Math.cos(theta1);
							ry1 = r * Math.sin(theta1);
							rx2 = (r * 2) * Math.cos(theta1);
							ry2 = (r * 2) * Math.sin(theta1);


							//The background of Two level's menu
							c2d.beginPath();
							//c2d.strokeStyle = 'white';
							c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r, -theta1, -theta2, true);
							c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r * 2, -theta2, -theta1, false);
							c2d.closePath();
							c2d.fill();

							c2d.beginPath();
							c2d.strokeStyle = "white";
							c2d.moveTo(offsetSize + activePadding + rx1, offsetSize + activePadding - ry1);
							//c2d.arc(offsetSize + activePadding + rx1,offsetSize + activePadding - ry1, 20 , 0, Math.PI * 2, false);
							c2d.lineTo(offsetSize + activePadding + rx2, offsetSize + activePadding - ry2);

							c2d.stroke();
							//c2d.closePath();

							theta1 += dTheta;
							theta2 += dTheta;
						}

					})(command.subCommands, dtheta, theta1, theta2);

					theta1 += dtheta;
					theta2 += dtheta;
				}

				c2d.fillStyle = 'white';
				c2d.globalCompositeOperation = 'destination-out';
				c2d.beginPath();
				c2d.arc(offsetSize + activePadding, offsetSize + activePadding, rspotlight + options.spotlightPadding, 0, Math.PI * 2, true);
				c2d.closePath();
				c2d.fill();

				c2d.beginPath();
				c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r * 1, 0, Math.PI * 2, true);
				c2d.closePath();
				c2d.stroke();
				c2d.globalCompositeOperation = 'source-over';
			}

			function queueDrawCommands(rx, ry, theta, dx, dy) {
				redrawQueue.drawCommands = [rx, ry, theta, dx, dy];
			}

			function drawCommands(rx, ry, theta, dx, dy) {
				var dtheta = 2 * Math.PI / (commands.length);
				/*        var theta1 = Math.PI/2;
				 var theta2 = theta1 + dtheta;*/
				var theta1 = Math.PI / 2;
				var theta2 = theta1 + dtheta;
				var mouseR = Math.sqrt(dx * dx + dy * dy);
				var activeId = activeCommandI[0];
				theta1 += dtheta * activeId;
				theta2 += dtheta * activeId;

				c2d.fillStyle = options.activeFillColor;
				c2d.strokeStyle = 'black';
				c2d.lineWidth = 1;
				c2d.beginPath();
				c2d.moveTo(offsetSize + activePadding, offsetSize + activePadding);
				c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r, 2 * Math.PI - theta1, 2 * Math.PI - theta2, true);
				//c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r, 0, Math.PI/2, true);
				c2d.closePath();
				c2d.fill();
				activeId !== undefined && (function (subCommands, thetaRange, thetaStart, thetaEnd) {
					if (!subCommands || !subCommands.length) return;
					var
						id = 0,
						sl = subCommands.length,
						dTheta = thetaRange / sl,
						theta1 = thetaStart,
						theta2 = theta1 + dTheta,
						rx1, ry1, rx2, ry2, parseTheta;

					parseTheta = theta < Math.PI ? theta + Math.PI * 2 : theta;

					for (; id < sl; id++) {
						rx1 = r * Math.cos(theta1);
						ry1 = r * Math.sin(theta1);
						rx2 = (r * 2) * Math.cos(theta1);
						ry2 = (r * 2) * Math.sin(theta1);

						if (
							(
								(theta2 < Math.PI * 2) && ( theta1 < theta && theta < theta2)
								|| (theta2 > Math.PI * 2) && ( theta1 < parseTheta && parseTheta < theta2)
							)
							&& ( r < mouseR && mouseR < 2 * r)
						) {
							activeCommandI[1] = id;

							//level2's background
							c2d.beginPath();
							//c2d.strokeStyle = 'white';
							c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r, -theta1, -theta2, true);
							c2d.arc(offsetSize + activePadding, offsetSize + activePadding, r * 2, -theta2, -theta1, false);
							c2d.closePath();
							c2d.fill();
						}

						theta1 += dTheta;
						theta2 += dTheta;
					}

				})(commands[activeId].subCommands, dtheta, theta1, theta2);
				c2d.fillStyle = 'black';
				c2d.globalCompositeOperation = 'destination-out';

				// clear the indicator
				c2d.beginPath();
				c2d.translate(offsetSize + activePadding + rx / r * (rs + options.spotlightPadding - options.indicatorSize / 4), offsetSize + activePadding + ry / r * (rs + options.spotlightPadding - options.indicatorSize / 4));
				c2d.rotate(Math.PI / 4 - theta);
				c2d.fillRect(-options.indicatorSize / 2, -options.indicatorSize / 2, options.indicatorSize, options.indicatorSize);
				c2d.closePath();
				c2d.fill();

				c2d.setTransform(1, 0, 0, 1, 0, 0);

				// clear the spotlight
				c2d.beginPath();
				c2d.arc(offsetSize + options.activePadding, offsetSize + options.activePadding, rs + options.spotlightPadding, 0, Math.PI * 2, true);
				c2d.closePath();
				c2d.fill();

				c2d.globalCompositeOperation = 'source-over';
			}

			var redrawing = true;
			var redrawQueue = {};
			var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
			var redraw = function () {
				if (redrawQueue.drawBg) {
					drawBg.apply(null, redrawQueue.drawBg);
				}

				if (redrawQueue.drawCommands) {
					drawCommands.apply(null, redrawQueue.drawCommands);
				}

				redrawQueue = {};

				if (redrawing) {
					raf(redraw);
				}
			};

			redraw(); // kick off

			var ctrx, ctry, rs;

			var bindings = {
				on: function (events, selector, fn) {

					var _fn = fn;
					if (selector === 'core') {
						_fn = function (e) {
							if (e.cyTarget === cy) { // only if event target is directly core
								return fn.apply(this, [e]);
							}
						};
					}

					data.handlers.push({
						events: events,
						selector: selector,
						fn: _fn
					});

					if (selector === 'core') {
						cy.on(events, _fn);
					} else {
						cy.on(events, selector, _fn);
					}

					return this;
				}
			};

			function addEventListeners() {
				var grabbable;
				var inGesture = false;
				var dragHandler;
				var zoomEnabled;
				var panEnabled;
				var gestureStartEvent;

				var restoreZoom = function () {
					if (zoomEnabled) {
						cy.userZoomingEnabled(true);
					}
				};

				var restoreGrab = function () {
					if (grabbable) {
						target.grabify();
					}
				};

				var restorePan = function () {
					if (panEnabled) {
						cy.userPanningEnabled(true);
					}
				};

				bindings
					.on(options.openMenuEvents, options.selector, function (e) {
						console.log(options.openMenuEvents);
						target = this; // Remember which node the context menu is for
						var ele = this;
						var isCy = this === cy;

						if (inGesture) {
							parent.style.display = 'none';

							inGesture = false;

							restoreGrab();
							restoreZoom();
							restorePan();
						}

						if (typeof options.commands === 'function') {
							commands = options.commands(target);
						} else {
							commands = options.commands;
						}

						if (!commands || commands.length == 0) {
							return;
						}

						zoomEnabled = cy.userZoomingEnabled();
						cy.userZoomingEnabled(false);

						panEnabled = cy.userPanningEnabled();
						cy.userPanningEnabled(false);

						grabbable = target.grabbable && target.grabbable();
						if (grabbable) {
							target.ungrabify();
						}

						var rp, rw, rh;
						if (!isCy && ele.isNode() && !ele.isParent() && !options.atMouse) {
							rp = ele.renderedPosition();
							rw = ele.renderedWidth();
							rh = ele.renderedHeight();
						} else {
							rp = e.cyRenderedPosition;
							rw = 1;
							rh = 1;
						}

						offset = getOffset(container);

						ctrx = rp.x;
						ctry = rp.y;

						createMenuItems();

						setStyles(parent, {
							display: 'block',
							left: (rp.x - offsetSize) + 'px',
							top: (rp.y - offsetSize) + 'px'
						});

						rs = Math.max(rw, rh) / 2;
						rs = Math.max(rs, options.minSpotlightRadius);
						rs = Math.min(rs, options.maxSpotlightRadius);

						queueDrawBg();

						activeCommandI = [];

						inGesture = true;
						gestureStartEvent = e;
					})

					.on('cxtdrag tapdrag', options.selector, dragHandler = function (e) {
						if (!inGesture) {
							return;
						}

						var origE = e.originalEvent;
						var isTouch = origE.touches && origE.touches.length > 0;

						var pageX = isTouch ? origE.touches[0].pageX : origE.pageX;
						var pageY = isTouch ? origE.touches[0].pageY : origE.pageY;

						activeCommandI = [];

						var dx = pageX - offset.left - ctrx;
						var dy = pageY - offset.top - ctry;

						if (dx === 0) {
							dx = 0.01;
						}

						var d = Math.sqrt(dx * dx + dy * dy);
						var cosTheta = (dy * dy - d * d - dx * dx) / (-2 * d * dx);
						var theta = Math.acos(cosTheta);

						if (d < rs + options.spotlightPadding) {
							queueDrawBg();
							return;
						}

						queueDrawBg();

						var rx = dx * r / d;
						var ry = dy * r / d;

						if (dy > 0) {
							theta = Math.PI + Math.abs(theta - Math.PI);
						}

						var dtheta = 2 * Math.PI / (commands.length);
						var theta1 = Math.PI / 2;
						var theta2 = theta1 + dtheta;

						for (var i = 0; i < commands.length; i++) {
							var command = commands[i];

							var inThisCommand = theta1 <= theta && theta <= theta2
								|| theta1 <= theta + 2 * Math.PI && theta + 2 * Math.PI <= theta2;

							if (command.disabled) {
								inThisCommand = false;
							}

							if (inThisCommand) {
								activeCommandI = [i];
								break;
							}

							theta1 += dtheta;
							theta2 += dtheta;
						}
						queueDrawCommands(rx, ry, theta, dx, dy);
					})

					.on('tapdrag', dragHandler)

					.on('cxttapend tapend', options.selector, function (e) {
						console.log("cxttapend tapend");
						var ele = this, commands = options.commands, subCommands, select;
						parent.style.display = 'none';
						if (activeCommandI[0] !== undefined) {
							subCommands = commands[activeCommandI[0]]["subCommands"];
							select = activeCommandI[1] !== undefined && subCommands ? subCommands[activeCommandI[1]].select : commands[activeCommandI[0]].select;

							if (select) {
								select.apply(ele, [ele, gestureStartEvent]);
								activeCommandI = [];
							}
						}

						inGesture = false;

						restoreGrab();
						restoreZoom();
						restorePan();
					})

					.on('cxttapend tapend', function (e) {
						console.log("cxttapend tapend2");
						parent.style.display = 'none';

						inGesture = false;

						restoreGrab();
						restoreZoom();
						restorePan();
					})
				;
			}

			function removeEventListeners() {
				var handlers = data.handlers;

				for (var i = 0; i < handlers.length; i++) {
					var h = handlers[i];

					if (h.selector === 'core') {
						cy.off(h.events, h.fn);
					} else {
						cy.off(h.events, h.selector, h.fn);
					}
				}
			}

			function destroyInstance() {
				redrawing = false;

				removeEventListeners();

				wrapper.remove();
			}

			addEventListeners();

			return {
				destroy: function () {
					destroyInstance();
				}
			};

		});

	}; // reg

	if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
		module.exports = register;
	}

	if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
		define('cytoscape-cxtmenu', function () {
			return register;
		});
	}

	if (typeof cytoscape !== typeof undefined) { // expose to global cytoscape (i.e. window.cytoscape)
		register(cytoscape);
	}

})();

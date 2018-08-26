/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		window.scope.askForPermission = {};
		scope = window.scope.askForPermission;
	}
	
	const {parseErrorStack} = require("./callingStack");
	
	// Check canvas appearance
	function canvasAppearance(window, api, context){
		var oldBorder = false;
		var canvas = false;
		var inDOM = null;
		if (api === "canvas" && context){
			var nodeName;
			try {
				nodeName = context.nodeName;
			}
			catch (e){
				nodeName = "";
			}
			if (nodeName === "CANVAS"){
				canvas = context;
			}
			else if (
				context instanceof window.CanvasRenderingContext2D ||
				context instanceof window.WebGLRenderingContext
			){
				canvas = context.canvas;
			}
		}
		if (canvas){
			oldBorder = canvas.style.border;
			canvas.style.border = "2px solid red";
			inDOM = canvas.ownerDocument.contains(canvas);
		}
		return {
			canvas: canvas,
			askCategory: canvas? (inDOM? "visible": "invisible"): (api === "canvas"? "nocanvas": api),
			get text(){
				var text = canvas? (this.visible? "visible": "invisible"): (api === "canvas"? "nocanvas": api);
				Object.defineProperty(this, "text", {value: text});
				return text;
			},
			inDom: inDOM,
			get visible(){
				var visible = inDOM;
				if (inDOM){
					canvas.scrollIntoView();
					var rect = canvas.getBoundingClientRect();
					var foundEl = window.document.elementFromPoint(
						rect.left + rect.width / 2,
						rect.top + rect.height / 2
					);
					visible = (foundEl === canvas);
				}
				Object.defineProperty(this, "visible", {value: visible});
				return visible;
			},
			reset: function(){
				if (canvas){
					canvas.style.border = oldBorder;
				}
			}
		};
	}
	
	var modes = new WeakMap();
	function getAskMode(window, type, _){
		var mode = modes.get(window);
		if (mode){
			return mode[type];
		}
		else {
			mode = {
				context: {
					askText: {
						visible: _("askForVisiblePermission"),
						invisible: _("askForInvisiblePermission"),
						nocanvas: _("askForPermission"),
						audio: _("askForAudioPermission"),
						history: _("askForHistoryPermission"),
						window: _("askForWindowPermission")
					},
					askStatus: {
						alreadyAsked: {},
						answer: {}
					}
				},
				input: {
					askText: {
						visible: _("askForVisibleInputPermission"),
						invisible: _("askForInvisibleInputPermission"),
						nocanvas: _("askForInputPermission"),
						audio: _("askForAudioInputPermission"),
						history: _("askForHistoryInputPermission"),
						window: _("askForWindowInputPermission")
					},
					askStatus: {
						alreadyAsked: {},
						answer: {}
					}
				},
				readout: {
					askText: {
						visible: _("askForVisibleReadoutPermission"),
						invisible: _("askForInvisibleReadoutPermission"),
						nocanvas: _("askForReadoutPermission"),
						audio: _("askForAudioReadoutPermission"),
						history: _("askForHistoryReadoutPermission"),
						window: _("askForWindowReadoutPermission")
					},
					askStatus: {
						alreadyAsked: {},
						answer: {}
					}
				}
			};
			modes.set(window, mode);
			return mode[type];
		}
	}
	
	scope.ask = function({window, type, api, canvas, errorStack}, {_, prefs}){
		var answer;
		var askMode = getAskMode(window, type, _);
		var askStatus = askMode.askStatus;
		var appearance = canvasAppearance(window, api, canvas);
		var category = appearance.askCategory;
		if (prefs("askOnlyOnce") !== "no" && askStatus.alreadyAsked[category]){
			// already asked
			appearance.reset();
			return askStatus.answer[category];
		}
		else {
			let imgContainer = null;
			if (type === "readout" && prefs("showCanvasWhileAsking") && canvas){
				try {
					let content = canvas.toDataURL();
					let document = window.top.document;
					imgContainer = document.createElement("div");
					imgContainer.style.cssText = `
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background-color: rgba(0, 0, 0, 0.7);
						color: white;
						text-align: center;
						z-index: 100000000000000;
						padding: 1em;`;
					
					let heading = document.createElement("h1");
					heading.textContent = "CanvasBlocker";
					imgContainer.appendChild(heading);
					
					let text = document.createElement("div");
					text.style.margin = "0.5em auto";
					text.textContent = browser.i18n.getMessage("showCanvasWhileAsking_message");
					imgContainer.appendChild(text);
					
					let img = document.createElement("img");
					img.style.backgroundColor = "white";
					img.style.border = "2px solid lightgray";
					img.src = HTMLCanvasElement.prototype.toDataURL.call(canvas);
					imgContainer.appendChild(img);
					document.body.appendChild(imgContainer);
				}
				catch (e){
					// unable to read the canvas
				}
			}
			// asking
			var msg = askMode.askText[appearance.text];
			
			// visible vs invisible is only calculated here correctly
			category = appearance.text;
			if (prefs("showCallingFile")){
				msg += parseErrorStack(errorStack).toString(_);
			}
			answer = window.top.confirm(msg)? "allow": prefs("askDenyMode");
			if (imgContainer && imgContainer.parentNode){
				imgContainer.parentNode.removeChild(imgContainer);
			}

			if (prefs("askOnlyOnce") === "combined"){
				["context", "readout", "input"].forEach(function(type){
					var askMode = getAskMode(window, type, _);
					var askStatus = askMode.askStatus;
					askStatus.alreadyAsked[category] = true;
					askStatus.answer[category] = answer;
				});
			}
			else {
				askStatus.alreadyAsked[category] = true;
				askStatus.answer[category] = answer;
			}
			appearance.reset();
			return answer;
		}
	};
}());
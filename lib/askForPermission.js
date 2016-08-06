/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const {parseErrorStack} = require("./callingStack");
	
	// Check canvas appearance
	function canvasAppearance(window, context){
		var oldBorder = false;
		var canvas = false;
		var inDOM = null;
		if (context){
			var nodeName;
			try {
				nodeName = context.nodeName;
			}
			catch (e){}
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
			askCategory: canvas? (inDOM? "visible": "invisible"): "nocanvas",
			get text(){
				var text = canvas? (this.visible? "visible": "invisible"): "nocanvas";
				Object.defineProperty(this, "text", {value: text});
				return text;
			},
			inDom: inDOM,
			get visible(){
				var visible = inDOM;
				if (inDOM){
					canvas.scrollIntoView();
					var rect = canvas.getBoundingClientRect();
					var foundEl = window.document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
						nocanvas: _("askForPermission")
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
						nocanvas: _("askForReadoutPermission")
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
	
	exports.ask = function({window, type, canvas, errorStack}, {_, prefs}){
		var answer;
		var askMode = getAskMode(window, type, _);
		var askStatus = askMode.askStatus;
		var appearance = canvasAppearance(window, canvas);
		if (prefs("askOnlyOnce") && askStatus.alreadyAsked[appearance.askCategory]){
			// already asked
			appearance.reset();
			return askStatus.answer[appearance.askCategory];
		}
		else {
			// asking
			var msg = _(askMode.askText[appearance.text]);
			if (prefs("showCallingFile")){
				msg += parseErrorStack(errorStack).toString(_);
			}
			answer = window.confirm(msg)? "allow": "block";
			askStatus.alreadyAsked[appearance.text] = true;
			askStatus.answer[appearance.text] = answer;
			appearance.reset();
			return answer;
		}
	};
}());
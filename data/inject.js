/* global self, window, CanvasRenderingContext2D, WebGLRenderingContext, console, unsafeWindow, exportFunction, cloneInto, checkURL, getDomainRegExpList */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var settings = {
		showCallingFile: false,
		showCompleteCallingStack: false
	};
	var blockMode = {
		getContext: {
			name: "getContext",
			status: "block",
			askText: {
				visible: "askForVisiblePermission",
				invisible: "askForInvisiblePermission",
				nocanvas: "askForPermission"
			},
			askStatus: {
				askOnce: false,
				alreadyAsked: {},
				answer: {}
			}
		},
		readAPI: {
			name: "readAPI",
			status: "allow",
			askText: {
				visible: "askForVisibleReadoutPermission",
				invisible: "askForInvisibleReadoutPermission",
				nocanvas: "askForReadoutPermission"
			},
			askStatus: {
				askOnce: false,
				alreadyAsked: {},
				answer: {}
			}
		}
	};
	
	var undef;
	
	
	// Stack parsing
	function parseStackEntry(entry){
		var m = /@(.*):(\d*):(\d*)$/.exec(entry) || ["", entry, "--", "--"];
		return {
			url: m[1],
			line: m[2],
			column: m[3],
			raw: entry
		};
	}
	
	// parse calling stack
	function errorToCallingStackMsg(error){
		var msg = "";
		var callers = error.stack.trim().split("\n");
		//console.log(callers);
		var findme = callers.shift(); // Remove us from the stack
		findme = findme.replace(/(:[0-9]+){1,2}$/, ""); // rm line & column
		// Eliminate squashed stack. stack may contain 2+ stacks, but why...
		var inDoubleStack = false;
		callers = callers.filter(function(caller){
			var doubleStackStart = caller.search(findme) !== -1;
			inDoubleStack = inDoubleStack || doubleStackStart;
			return !inDoubleStack;
		});
		msg += "\n\n" + _("sourceOutput") + ": ";
		if (settings.showCompleteCallingStack){
			msg += callers.reduce(function(stack, c){
				return stack + "\n\t" + _("stackEntryOutput", parseStackEntry(c));
			}, "");
		}
		else{
			msg += _("stackEntryOutput", parseStackEntry(callers[0]));
		}
		
		return msg;
	}
	
	// Check canvas appearance
	function canvasAppearance(context){
		var oldBorder = false;
		var canvas = false;
		var inDOM = null;
		if (context){
			if (context.nodeName === "CANVAS"){
				canvas = context;
			}
			else if (
				context instanceof CanvasRenderingContext2D ||
				context instanceof WebGLRenderingContext
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
					var foundEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
	
	function getFakeCanvas(original){
		var imageData = changedFunctions.getImageData.fake(0, 0, this.width, this.height);
		var canvas = this.cloneNode(true);
		var context = canvas.getContext("2d");
		context.putImageData(imageData, 0, 0);
		return canvas;
	}
	// changed functions and their fakes
	var changedFunctions = {
		getContext: {
			mode: blockMode.getContext,
			object: unsafeWindow.HTMLCanvasElement
		},
		toDataURL: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement,
			fake: function toDataURL(){
				return window.HTMLCanvasElement.prototype.toDataURL.apply(getFakeCanvas(this), arguments);
			}
		},
		toBlob: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement,
			fake: function toBlob(callback){
				window.HTMLCanvasElement.prototype.toBlob.apply(getFakeCanvas(this), arguments);
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement
		},
		getImageData: {
			mode: blockMode.readAPI,
			object: unsafeWindow.CanvasRenderingContext2D,
			fake: function getImageData(sx, sy, sw, sh){
				var l = sw * sh * 4;
				var data = new Uint8ClampedArray(l);
				for (var i = 0; i < l; i += 1){
					data[i] = Math.floor(
						Math.random() * 256
					);
				}
				var imageData = new window.ImageData(sw, sh);
				imageData.data.set(cloneInto(data, unsafeWindow));
				return imageData;
			}
		},
		readPixels: {
			mode: blockMode.readAPI,
			object: unsafeWindow.WebGLRenderingContext,
			fake: function readPixels(x, y, width, height, format, type, pixels){
				// fake not working due to XRay copy restrictions...
				// for (var i = 0; i < pixels.length; i += 1){
					// pixels[i] = Math.floor(
						// Math.random() * 256
					// );
				// }
			}
		}
	};
	
	// do the replacements
	Object.keys(changedFunctions).forEach(function(name){
		var changedFunction = changedFunctions[name];
		var original = changedFunction.object.prototype[name];
		var fake = changedFunction.fake?
			exportFunction(
				changedFunction.fake,
				unsafeWindow,
				changedFunction.exportOptions
			):
			undef;
		Object.defineProperty(
			changedFunction.object.prototype,
			name,
			{
				enumerable: true,
				configureable: false,
				get: exportFunction(function(){
					var status = changedFunction.mode.status;
					var callingStackMsg = errorToCallingStackMsg(new Error());
					if (status === "ask"){
						var askStatus = changedFunction.mode.askStatus;
						var appearance = canvasAppearance(this);
						if (askStatus.askOnce && askStatus.alreadyAsked[appearance.askCategory]){
							// already asked
							status = askStatus.answer[appearance.askCategory];
						}
						else {
							// asking
							var msg = _(changedFunction.mode.askText[appearance.text]);
							if (settings.showCallingFile){
								msg += callingStackMsg;
							}
							status = window.confirm(msg) ? "allow": "block";
							askStatus.alreadyAsked[appearance.text] = true;
							askStatus.answer[appearance.text] = status;
							appearance.reset();
						}
					}
					self.port.emit("accessed " + changedFunction.mode.name, status, callingStackMsg);
					switch (status){
						case "allow":
							return original;
						case "fake":
							return fake;
						//case "block":
						default:
							return undef;
					}
				}, unsafeWindow)
			}
		);
	});
	
	// Translation
	var _ = function(name, replace){
		var str = self.options.translations[name] || name;
		if (replace){
			// replace generic content in the transation by given parameter
			Object.keys(replace).forEach(function(name){
				str = str.replace(new RegExp("{" + name + "}", "g"), replace[name]);
			});
		}
		return str;
	};
	
	// Communication with main.js
	
	function setStatus(mode, askOnce){
		switch (mode){
			case "block":
				blockMode.getContext.status = "block";
				blockMode.readAPI.status = "block";
				break;
			case "ask":
				blockMode.getContext.status = "ask";
				blockMode.getContext.askStatus.askOnce = askOnce;
				blockMode.readAPI.status = "allow";
				break;
			case "blockReadout":
				blockMode.getContext.status = "allow";
				blockMode.readAPI.status = "block";
				break;
			case "fakeReadout":
				blockMode.getContext.status = "allow";
				blockMode.readAPI.status = "fake";
				break;
			case "askReadout":
				blockMode.getContext.status = "allow";
				blockMode.readAPI.status = "ask";
				blockMode.readAPI.askStatus.askOnce = askOnce;
				break;
			case "unblock":
				blockMode.getContext.status = "allow";
				blockMode.readAPI.status = "allow";
				break;
			case "detach":
				blockMode.getContext.status = "allow";
				blockMode.readAPI.status = "allow";
				break;
		}
	}
	["block", "ask", "blockReadout", "fakeReadout", "askReadout", "unblock", "detach"].forEach(function(mode){
		self.port.on(mode, function(askOnce){
			setStatus(mode, askOnce);
		});
	});
	
	// initial status setting
	setStatus(
		checkURL(
			location,
			self.options.blockMode,
			getDomainRegExpList(self.options.whiteList),
			getDomainRegExpList(self.options.blackList)
		),
		self.options.askOnce
	);
	
	// settings passthrough
	self.port.on("set", function(name, value){
		settings[name] = value;
	});
}());

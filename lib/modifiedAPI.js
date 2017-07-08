/* jslint moz: true */
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
		window.scope.modifiedAPI = {};
		scope = window.scope.modifiedAPI;
	}
	
	// let Cu = require("chrome").Cu;
	
	var randomSupply = null;
	
	function getContext(window, canvas){
		return window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl2") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl2");
	}
	function getImageData(window, context){
		var imageData;
		var source;
		if ((context.canvas.width || 0) * (context.canvas.height || 0) === 0){
			imageData  = new window.wrappedJSObject.ImageData(0, 0);
			source  = new window.wrappedJSObject.ImageData(0, 0);
		}
		else if (context instanceof window.CanvasRenderingContext2D){
			imageData = window.CanvasRenderingContext2D.prototype.getImageData.call(context, 0, 0, context.canvas.width, context.canvas.height);
			source = imageData.data;
		}
		else {
			imageData  = new window.wrappedJSObject.ImageData(context.canvas.width, context.canvas.height);
			source = new Uint8Array(imageData.data.length);
			window.WebGLRenderingContext.prototype.readPixels.call(
				context,
				0, 0, context.canvas.width, context.canvas.height,
				context.RGBA, context.UNSIGNED_BYTE,
				source
			);
		}
		return {
			imageData,
			source
		};
	}
	
	function getFakeCanvas(window, original){
		try {
			// original may not be a canvas -> we must not leak an error
			var context = getContext(window, original);
			var {imageData, source} = getImageData(window, context);
			var desc = imageData.data;
			var l = desc.length;
			var rng = randomSupply.getRng(l, window);
			
			for (var i = 0; i < l; i += 1){
				desc[i] = rng(source[i], i);
			}
			var canvas = original.cloneNode(true);
			context = window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d");
			context.putImageData(imageData, 0, 0);
			return canvas;
		}
		catch (e){
			return original;
		}
	}
	function randomMixImageData(window, imageData1, imageData2){
		var data1 = imageData1.data;
		var data2 = imageData2.data;
		var l = data1.length;
		if (l === data2.length){
			var rng = randomSupply.getRng(l, window);
			
			for (var i = 0; i < l; i += 1){
				if (data1[i] > data2[i]){
					data2[i] = data1[i] - rng(data1[i] - data2[i], i);
				}
				else if (data1[i] < data2[i]){
					data2[i] = data1[i] + rng(data2[i] - data1[i], i);
				}
			}
		}
		return imageData2;
	}
	
	function hasType(status, type){
		return status.type.indexOf(type) !== -1;
	}
	
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	var canvasContextType = new WeakMap();
	// changed functions and their fakes
	scope.changedFunctions = {
		getContext: {
			type: "context",
			getStatus: function(obj, status){
				if (hasType(status, "internal")){
					return {
						mode: "allow",
						type: status.type,
						active: false
					}
				}
				else if (hasType(status, "context") || hasType(status, "input")){
					return {
						mode: (status.mode === "block")? "block": "fake",
						type: status.type,
						active: true
					};
				}
				else {
					var status = Object.create(status);
					status.active = false;
					return status;
				}
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(prefs, notify, window, original){
				return function(context, contextAttributes){
					canvasContextType.set(this, context);
					return original.apply(this, window.Array.from(arguments));
				};
			}
		},
		toDataURL: {
			type: "readout",
			getStatus: function(obj, status){
				var status = Object.create(status);
				if (hasType(status, "input")){
					var contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				else {
					status.active = hasType(status, "readout");
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(prefs, notify, window, original){
				return function toDataURL(){
					notify.call(this, "fakedReadout");
					return original.apply(getFakeCanvas(window, this), window.Array.from(arguments));
				};
			}
		},
		toBlob: {
			type: "readout",
			getStatus: function(obj, status){
				var status = Object.create(status);
				if (hasType(status, "input")){
					var contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				else {
					status.active = hasType(status, "readout");
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(prefs, notify, window, original){
				return function toBlob(callback){
					notify.call(this, "fakedReadout");
					return original.apply(getFakeCanvas(window, this), window.Array.from(arguments));
				};
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			type: "readout",
			getStatus: function(obj, status){
				var status = Object.create(status);
				if (hasType(status, "input")){
					var contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				else {
					status.active = hasType(status, "readout");
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(prefs, notify, window, original){
				return function mozGetAsFile(callback){
					notify.call(this, "fakedReadout");
					return original.apply(getFakeCanvas(window, this), window.Array.from(arguments));
				};
			}
		},
		getImageData: {
			type: "readout",
			getStatus: function(obj, status){
				var status = Object.create(status);
				if (hasType(status, "input")){
					var contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				else {
					status.active = hasType(status, "readout");
				}
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(prefs, notify, window, original){
				var maxSize = prefs("maxFakeSize") || Number.POSITIVE_INFINITY;
				return function getImageData(sx, sy, sw, sh){
					if (sw * sh > maxSize){
						return original.apply(this, window.Array.from(arguments));
					}
					else {
						notify.call(this, "fakedReadout");
						var fakeCanvas;
						var context = this;
						if (this && this.canvas) {
							fakeCanvas = getFakeCanvas(window, this.canvas);
						}
						if (fakeCanvas && fakeCanvas !== this.canvas){
							context = window.HTMLCanvasElement.prototype.getContext.call(
								getFakeCanvas(window, this.canvas),
								"2d"
							);
						}
						return original.apply(context, window.Array.from(arguments));
					}
				};
			}
		},
		fillText: {
			type: "input",
			getStatus: function(obj, status){
				var status = Object.create(status);
				status.active = hasType(status, "input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(prefs, notify, window, original){
				return function fillText(str, x, y){
					notify.call(this, "fakedInput");
					var oldImageData;
					try {
						// "this" is not trustable - it may be not a context
						oldImageData = getImageData(window, this).imageData;
					}
					catch (e){}
					// if "this" is not a correct context the next line will throw an error
					var ret = original.apply(this, window.Array.from(arguments));
					var newImageData = getImageData(window, this).imageData;
					this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
					return ret;
				};
			}
		},
		strokeText: {
			type: "input",
			getStatus: function(obj, status){
				var status = Object.create(status);
				status.active = hasType(status, "input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(prefs, notify, window, original){
				return function strokeText(str, x, y){
					notify.call(this, "fakedInput");
					var oldImageData;
					try {
						// "this" is not trustable - it may be not a context
						oldImageData = getImageData(window, this).imageData;
					}
					catch (e){}
					// if "this" is not a correct context the next line will throw an error
					var ret = original.apply(this, window.Array.from(arguments));
					var newImageData = getImageData(window, this).imageData;
					this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
					return ret;
				};
			}
		},
		readPixels: {
			type: "readout",
			getStatus: function(obj, status){
				var status = Object.create(status);
				status.active = hasType(status, "readout") || hasType(status, "input");
				return status;
			},
			object: ["WebGLRenderingContext", "WebGL2RenderingContext"],
			fakeGenerator: function(prefs, notify, window, original){
				return function readPixels(x, y, width, height, format, type, pixels){
					// not able to use the getFakeCanvas function because the context type is wrong...
					notify.call(this, "fakedReadout");
					var xPixels = pixels;
					var ret = original.apply(this, window.Array.from(arguments));
					var l = xPixels.length;
					var rng = randomSupply.getRng(l, window);
					
					for (var i = 0; i < l; i += 1){
						xPixels[i] = rng(xPixels[i], i);
					}
					
					return ret;
				};
			}
		}
	};
}());
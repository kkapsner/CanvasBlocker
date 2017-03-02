/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let Cu = require("chrome").Cu;
	
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
		if (context instanceof window.CanvasRenderingContext2D){
			imageData = window.CanvasRenderingContext2D.prototype.getImageData.call(context, 0, 0, context.canvas.width, context.canvas.height);
			source = imageData.data;
		}
		else {
			var imageData  = new window.wrappedJSObject.ImageData(context.canvas.width, context.canvas.height);
			var source = new Uint8Array(imageData.data.length);
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
	
	function getWindow(canvas){
		return canvas.ownerDocument.defaultView;
	}
	function hasType(status, type){
		return status.type.indexOf(type) !== -1;
	}
	
	exports.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	var canvasContextType = new WeakMap();
	// changed functions and their fakes
	exports.changedFunctions = {
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
			fakeGenerator: function(prefs, notify){
				return function(context, contextAttributes){
					var window = getWindow(this);
					canvasContextType.set(this, context);
					return window.HTMLCanvasElement.prototype.getContext.apply(this, arguments);
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
			fakeGenerator: function(prefs, notify){
				return function toDataURL(){
					notify("fakedReadout");
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.toDataURL.apply(getFakeCanvas(window, this), arguments);
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
			fakeGenerator: function(prefs, notify){
				return function toBlob(callback){
					notify("fakedReadout");
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.toBlob.apply(getFakeCanvas(window, this), arguments);
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
			fakeGenerator: function(prefs, notify){
				return function mozGetAsFile(callback){
					notify("fakedReadout");
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.mozGetAsFile.apply(getFakeCanvas(window, this), arguments);
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
			fakeGenerator: function(prefs, notify, original){
				var maxSize = prefs("maxFakeSize") || Number.POSITIVE_INFINITY;
				return function getImageData(sx, sy, sw, sh){
					var window = getWindow(this.canvas);
					if (sw * sh > maxSize){
						return original.apply(this, window.Array.from(arguments));
					}
					else {
						notify("fakedReadout");
						var context = window.HTMLCanvasElement.prototype.getContext.call(
							getFakeCanvas(window, this.canvas),
							"2d"
						);
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
			fakeGenerator: function(prefs, notify){
				return function fillText(str, x, y){
					notify("fakedInput");
					var window = getWindow(this.canvas);
					var oldImageData = getImageData(window, this).imageData;
					var ret = window.CanvasRenderingContext2D.prototype.fillText.apply(this, arguments);
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
			fakeGenerator: function(prefs, notify){
				return function strokeText(str, x, y){
					notify("fakedInput");
					var window = getWindow(this.canvas);
					var oldImageData = getImageData(window, this).imageData;
					var ret = window.CanvasRenderingContext2D.prototype.strokeText.apply(this, arguments);
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
			fakeGenerator: function(prefs, notify){
				return function readPixels(x, y, width, height, format, type, pixels){
					// not able to use the getFakeCanvas function because the context type is wrong...
					notify("fakedReadout");
					var xPixels = Cu.waiveXrays(pixels);
					var window = getWindow(this.canvas);
					var ret = window.WebGLRenderingContext.prototype.readPixels.apply(this, arguments);
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
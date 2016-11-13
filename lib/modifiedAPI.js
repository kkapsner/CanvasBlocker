/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var randomSupply = null;
	
	function getContext(window, canvas){
		return window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl2") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl2");
	}
	function getImageData(window, context){
		if (context instanceof window.CanvasRenderingContext2D){
			return window.CanvasRenderingContext2D.prototype.getImageData.call(context, 0, 0, context.canvas.width, context.canvas.height);
		}
		else {
			var imageData  = new window.wrappedJSObject.ImageData(context.canvas.width, context.canvas.height);
			window.WebGLRenderingContext.prototype.readPixels.call(
				context,
				0, 0, context.canvas.width, context.canvas.height,
				context.RGBA, context.UNSIGNED_BYTE,
				imageData.data
			);
			return imageData;
		}
	}
	
	function getFakeCanvas(window, original){
		var context = getContext(window, original);
		var imageData = getImageData(window, context);
		var data = imageData.data;
		var l = data.length;
		var rng = randomSupply.getRng(l, window);
		
		for (var i = 0; i < l; i += 1){
			data[i] = rng(data[i], i);
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
			getStatus: function(obj, status){
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
			getStatus: function(obj, status){
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
			getStatus: function(obj, status){
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
			getStatus: function(obj, status){
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
			fakeGenerator: function(prefs, notify){
				var maxSize = prefs("maxFakeSize") || Number.POSITIVE_INFINITY;
				return function getImageData(sx, sy, sw, sh){
					var window = getWindow(this.canvas);
					var context;
					if (sw * sh > maxSize){
						context = this;
					}
					else {
						notify("fakedReadout");
						context = window.HTMLCanvasElement.prototype.getContext.call(
							getFakeCanvas(window, this.canvas),
							"2d"
						);
					}
					var data = window.CanvasRenderingContext2D.prototype.getImageData.apply(context, arguments).data;
					
					var imageData = new window.wrappedJSObject.ImageData(sw, sh);
					for (var i = 0, l = data.length; i < l; i += 1){
						imageData.data[i] = data[i];
					}
					return imageData;
				};
			}
		},
		fillText: {
			getStatus: function(obj, status){
				status.active = hasType(status, "input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(prefs, notify){
				return function fillText(str, x, y){
					notify("fakedInput");
					var window = getWindow(this.canvas);
					var oldImageData = getImageData(window, this);
					var ret = window.CanvasRenderingContext2D.prototype.fillText.apply(this, arguments);
					var newImageData = getImageData(window, this);
					this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
					return ret;
				};
			}
		},
		strokeText: {
			getStatus: function(obj, status){
				status.active = hasType(status, "input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(prefs, notify){
				return function strokeText(str, x, y){
					notify("fakedInput");
					var window = getWindow(this.canvas);
					var oldImageData = getImageData(window, this);
					var ret = window.CanvasRenderingContext2D.prototype.strokeText.apply(this, arguments);
					var newImageData = getImageData(window, this);
					this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
					return ret;
				};
			}
		},
		readPixels: {
			getStatus: function(obj, status){
				status.active = hasType(status, "readout") || hasType(status, "input");
				return status;
			},
			object: "WebGLRenderingContext",
			fakeGenerator: function(prefs, notify){
				return function readPixels(x, y, width, height, format, type, pixels){
					notify("fakedReadout");
					var window = getWindow(this.canvas);
					var context = window.HTMLCanvasElement.prototype.getContext.call(getFakeCanvas(window, this.canvas), "webGL");
					return window.WebGLRenderingContext.prototype.readPixels.apply(context, arguments);
				};
			}
		}
	};
}());
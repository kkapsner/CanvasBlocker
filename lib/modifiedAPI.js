/* jslint moz: true, bitwise: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const rnd = {};
	function getFakeCanvas(window, original){
		var domain = window.document.location.host;
		if (!rnd[domain]){
			rnd[domain] = new Uint8Array(128);
			for (var i = 0; i < rnd[domain].length; i += 1){
				rnd[domain][i] = Math.floor(Math.random() * 0xFF);
			}
			console.log("created new rnd for domain", domain);
		}
		var context = window.HTMLCanvasElement.prototype.getContext.call(original, "2d");
		var imageData, data, source;
		if (context){
			imageData = window.CanvasRenderingContext2D.prototype.getImageData.call(context, 0, 0, original.width, original.height);
			source = imageData.data;
		}
		else {
			context = 
				window.HTMLCanvasElement.prototype.getContext.call(original, "webgl") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "experimental-webgl") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "webgl2") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "experimental-webgl2");
			imageData = new window.wrappedJSObject.ImageData(original.width, original.height);
			source = new window.wrappedJSObject.Uint8Array(imageData.data.length);
			window.WebGLRenderingContext.prototype.readPixels.call(
				context,
				0, 0, original.width, original.height,
				context.RGBA, context.UNSIGNED_BYTE,
				source
			);
		}
		data = imageData.data;
		var l = data.length;
		
		for (var i = 0; i < l; i += 1){
			var value = source[i];
			var index = value & 0x7F;
			var bitIndex = ((i & 0x03) << 1) | (value >>> 7);
			var bit = (rnd[domain][index] >>> bitIndex) & 0x01;
			if (bitIndex % 2) console.log(rnd[domain][index], index, bitIndex, bit);
			data[i] = value ^ bit;
		}
		var canvas = original.cloneNode(true);
		context = window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d");
		context.putImageData(imageData, 0, 0);
		return canvas;
	}
	function getWindow(canvas){
		return canvas.ownerDocument.defaultView;
	}
	// changed functions and their fakes
	exports.changedFunctions = {
		getContext: {
			type: "context",
			object: "HTMLCanvasElement"
		},
		toDataURL: {
			type: "readout",
			object: "HTMLCanvasElement",
			fake: function toDataURL(){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.toDataURL.apply(getFakeCanvas(window, this), arguments);
			}
		},
		toBlob: {
			type: "readout",
			object: "HTMLCanvasElement",
			fake: function toBlob(callback){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.toBlob.apply(getFakeCanvas(window, this), arguments);
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			type: "readout",
			object: "HTMLCanvasElement",
			mozGetAsFile: function mozGetAsFile(callback){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.mozGetAsFile.apply(getFakeCanvas(window, this), arguments);
			}
		},
		getImageData: {
			type: "readout",
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
						notify();
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
				}
			}
		},
		readPixels: {
			type: "readout",
			object: "WebGLRenderingContext",
			fake: function readPixels(x, y, width, height, format, type, pixels){
				var window = getWindow(this.canvas);
				var context = window.HTMLCanvasElement.prototype.getContext.call(getFakeCanvas(window, this.canvas), "webGL");
				return window.WebGLRenderingContext.prototype.readPixels.apply(context, arguments);
				
			}
		}
	};
}());
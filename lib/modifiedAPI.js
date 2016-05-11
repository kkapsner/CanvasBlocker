/* jslint moz: true, bitwise: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	var hashModule = require("./sha256");
	var prngModule = require("./prng");

	/*
	 *  Convert binary data to hex encoded string
	 */
	function bin2hex(buf) {
		var x = "";
		for (var i = 0, l = buf.length; i < l; i+=1)
		{
			x += ("0"+(Number(buf[i]).toString(16))).slice(-2);
		}
		return x.toUpperCase();
	}

	function getFakeCanvas(window, original, profileSeed){
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

		var rng = Math.random

		// Optionally replace noise generator with a seeded PRNG
		if (profileSeed.length > 0)
		{
			// Mix in a hex representation of the canvas ensure the PRNG sequence is different for each challenge..
			var canvasSeed = hashModule.hash(bin2hex(data) + profileSeed);
			// console.log("Persistent profile fingerprint: profile " + profileSeed + ", canvas seed " + canvasSeed);
			rng = new prngModule.prng(canvasSeed);
		}

		// Mix in noise using a correlated function.
		for (var i = 0, l = data.length; i < l; i += 1){
			var value = source[i];
			if (value >= 0x80){
				value = value ^ Math.floor(rng() * 0x20);
			}
			else if (value >= 0x40){
				value = value ^ Math.floor(rng() * 0x10);
			}
			else if (value >= 0x20){
				value = value ^ Math.floor(rng() * 0x08);
			}
			else if (value >= 0x10){
				value = value ^ Math.floor(rng() * 0x04);
			}
			else if (value >= 0x08){
				value = value ^ Math.floor(rng() * 0x02);
			}
			else if (value >= 0x04){
				value = value ^ Math.floor(rng() * 0x01);
			}
			data[i] = value;
		}
		var canvas = original.cloneNode(true);
		context = window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d");
		context.putImageData(imageData, 0, 0);
		return canvas;
	}

	function getWindow(canvas){
		return canvas.ownerDocument.defaultView;
	}

	function getChangedFunctions(profileSeed) {
		return {
			getContext: {
				type: "context",
				object: "HTMLCanvasElement"
			},
			toDataURL: {
				type: "readout",
				object: "HTMLCanvasElement",
				fake: function toDataURL() {
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.toDataURL.apply(getFakeCanvas(window, this, profileSeed), arguments);
				}
			},
			toBlob: {
				type: "readout",
				object: "HTMLCanvasElement",
				fake: function toBlob(callback) {
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.toBlob.apply(getFakeCanvas(window, this, profileSeed), arguments);
				},
				exportOptions: {allowCallbacks: true}
			},
			mozGetAsFile: {
				type: "readout",
				object: "HTMLCanvasElement",
				mozGetAsFile: function mozGetAsFile(callback) {
					var window = getWindow(this);
					return window.HTMLCanvasElement.prototype.mozGetAsFile.apply(getFakeCanvas(window, this, profileSeed), arguments);
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
				fake: function readPixels(x, y, width, height, format, type, pixels) {
					var window = getWindow(this.canvas);
					var context = window.HTMLCanvasElement.prototype.getContext.call(getFakeCanvas(window, this.canvas, profileSeed), "webGL");
					return window.WebGLRenderingContext.prototype.readPixels.apply(context, arguments);

				}
			}
		};
	}

	exports.getChangedFunctions = getChangedFunctions;

}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const scope = ((typeof exports) !== "undefined")? exports: require.register("./modifiedCanvasAPI");
	const colorStatistics = require("./colorStatistics");
	const logging = require("./logging");
	const extension = require("./extension");
	const webgl = require("./webgl");
	const {checkerWrapper} = require("./modifiedAPIFunctions");
	
	let randomSupply = null;
	
	function getContext(window, canvas){
		return window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "webgl2") ||
			window.HTMLCanvasElement.prototype.getContext.call(canvas, "experimental-webgl2");
	}
	function getImageData(window, context){
		let imageData;
		let source;
		if ((context.canvas.width || 0) * (context.canvas.height || 0) === 0){
			imageData = new (extension.getWrapped(window).ImageData)(0, 0);
			source = new (extension.getWrapped(window).ImageData)(0, 0);
		}
		else if (context instanceof window.CanvasRenderingContext2D){
			imageData = window.CanvasRenderingContext2D.prototype.getImageData.call(
				context,
				0, 0,
				context.canvas.width, context.canvas.height
			);
			source = imageData.data;
		}
		else {
			imageData = new (extension.getWrapped(window).ImageData)(context.canvas.width, context.canvas.height);
			source = new Uint8Array(imageData.data.length);
			(
				context instanceof window.WebGLRenderingContext?
					window.WebGLRenderingContext:
					window.WebGL2RenderingContext
			).prototype.readPixels.call(
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
	
	const canvasCache = Object.create(null);
	function getFakeCanvas(window, original, prefs){
		try {
			let originalDataURL;
			if (prefs("useCanvasCache")){
				originalDataURL = original.toDataURL();
				const cached = canvasCache[originalDataURL];
				if (cached){
					return cached;
				}
			}
			// original may not be a canvas -> we must not leak an error
			let context = getContext(window, original);
			const {imageData, source} = getImageData(window, context);
			const desc = imageData.data;
			const l = desc.length;
			
			let ignoredColors = {};
			let statistic;
			if (prefs("ignoreFrequentColors")){
				statistic = colorStatistics.compute(source);
				ignoredColors = statistic.getMaxColors(prefs("ignoreFrequentColors"));
			}
			if (prefs("minColors")){
				if (!colorStatistics.hasMoreColors(source, prefs("minColors"), statistic)){
					return original;
				}
			}
			
			const rng = randomSupply.getPixelRng(l, window, ignoredColors);
			const fakeAlphaChannel = prefs("fakeAlphaChannel");
			for (let i = 0; i < l; i += 4){
				const [r, g, b, a] = rng(
					source[i + 0],
					source[i + 1],
					source[i + 2],
					source[i + 3],
					i / 4
				);
				desc[i + 0] = r;
				desc[i + 1] = g;
				desc[i + 2] = b;
				desc[i + 3] = fakeAlphaChannel? a: source[i + 3];
			}
			const canvas = original.cloneNode(true);
			context = window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d");
			context.putImageData(imageData, 0, 0);
			if (prefs("useCanvasCache")){
				canvasCache[originalDataURL] = canvas;
				canvasCache[canvas.toDataURL()] = canvas;
			}
			return canvas;
		}
		catch (error){
			logging.warning("Error while faking:", error);
			return original;
		}
	}
	function randomMixImageData(window, imageData1, imageData2){
		const data1 = imageData1.data;
		const data2 = imageData2.data;
		const l = data1.length;
		if (l === data2.length){
			const rng = randomSupply.getPixelRng(l, window, {});
			
			for (let i = 0; i < l; i += 4){
				const signR = data1[i + 0] > data2[i + 0]? -1: 1;
				const signG = data1[i + 1] > data2[i + 1]? -1: 1;
				const signB = data1[i + 2] > data2[i + 2]? -1: 1;
				const signA = data1[i + 3] > data2[i + 3]? -1: 1;
				
				const [deltaR, deltaG, deltaB, deltaA] = rng(
					signR * (data2[i + 0] - data1[i + 0]),
					signG * (data2[i + 1] - data1[i + 1]),
					signB * (data2[i + 2] - data1[i + 2]),
					signA * (data2[i + 3] - data1[i + 3]),
					i / 4
				);
				data2[i + 0] = data1[i + 0] + signR * deltaR;
				data2[i + 1] = data1[i + 1] + signG * deltaG;
				data2[i + 2] = data1[i + 2] + signB * deltaB;
				data2[i + 3] = data1[i + 3] + signA * deltaA;
			}
		}
		return imageData2;
	}
	
	function canvasSizeShouldBeFaked(canvas, prefs){
		if (canvas){
			const size = canvas.height * canvas.width;
			const maxSize = prefs("maxFakeSize") || Number.POSITIVE_INFINITY;
			const minSize = prefs("minFakeSize") || 0;
			return size > minSize && size <= maxSize;
		}
		else {
			return true;
		}
	}
	
	function getProtectedPartChecker(pref, url){
		const protectedPart = pref("protectedCanvasPart", url);
		if (protectedPart === "everything"){
			return function(){
				return true;
			};
		}
		else if (protectedPart === "nothing"){
			return function(){
				return false;
			};
		}
		else {
			return function(parts){
				if (Array.isArray(parts)){
					return parts.some(function(part){
						return part === protectedPart;
					});
				}
				else {
					return parts === protectedPart;
				}
			};
		}
	}
	
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
		webgl.setRandomSupply(supply);
	};
	
	
	const canvasContextType = new WeakMap();
	// changed functions and their fakes
	scope.changedFunctions = {
		getContext: {
			type: "context",
			getStatus: function(obj, status, prefs){
				if (status.internal){
					return {
						mode: "allow",
						type: status.type,
						active: false
					};
				}
				else if (getProtectedPartChecker(prefs, status.url)("input")){
					return {
						mode: status.mode,
						type: status.type,
						active: true
					};
				}
				else {
					status = Object.create(status);
					status.active = false;
					return status;
				}
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(checker){
				return function(context, contextAttributes){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {window, original} = check;
						canvasContextType.set(this, context);
						return original.apply(this, window.Array.from(args));
					});
				};
			}
		},
		toDataURL: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				if (!status.active && protectedPartChecker("input")){
					const contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(checker){
				return function toDataURL(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (canvasSizeShouldBeFaked(this, prefs)){
							const fakeCanvas = getFakeCanvas(window, this, prefs);
							if (fakeCanvas !== this){
								notify("fakedReadout");
							}
							return original.apply(fakeCanvas, window.Array.from(args));
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		toBlob: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				if (!status.active && protectedPartChecker("input")){
					const contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(checker){
				return function toBlob(callback){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (canvasSizeShouldBeFaked(this, prefs)){
							const fakeCanvas = getFakeCanvas(window, this, prefs);
							if (fakeCanvas !== this){
								notify("fakedReadout");
							}
							return original.apply(fakeCanvas, window.Array.from(args));
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				if (!status.active && protectedPartChecker("input")){
					const contextType = canvasContextType.get(obj);
					status.active = contextType !== "2d";
				}
				return status;
			},
			object: "HTMLCanvasElement",
			fakeGenerator: function(checker){
				return function mozGetAsFile(callback){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (canvasSizeShouldBeFaked(this, prefs)){
							const fakeCanvas = getFakeCanvas(window, this, prefs);
							if (fakeCanvas !== this){
								notify("fakedReadout");
							}
							return original.apply(fakeCanvas, window.Array.from(args));
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		getImageData: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(checker){
				return function getImageData(sx, sy, sw, sh){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (!this || canvasSizeShouldBeFaked(this.canvas, prefs)){
							let fakeCanvas;
							let context = this;
							if (this && this.canvas) {
								fakeCanvas = getFakeCanvas(window, this.canvas, prefs);
							}
							if (fakeCanvas && fakeCanvas !== this.canvas){
								notify("fakedReadout");
								context = window.HTMLCanvasElement.prototype.getContext.call(
									fakeCanvas,
									"2d"
								);
							}
							return original.apply(context, window.Array.from(args));
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		isPointInPath: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(checker){
				return function isPointInPath(x, y){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {notify, window, original} = check;
						const rng = randomSupply.getValueRng(1, window);
						const originalValue = original.apply(this, window.Array.from(args));
						if ((typeof originalValue) === "boolean"){
							notify("fakedReadout");
							const index = x + this.width * y;
							return original.call(this, rng(x, index), rng(y, index), args[2]);
						}
						else {
							return originalValue;
						}
					});
				};
			}
		},
		isPointInStroke: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("readout");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(checker){
				return function isPointInStroke(x, y){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {notify, window, original} = check;
						const rng = randomSupply.getValueRng(1, window);
						const originalValue = original.apply(this, window.Array.from(args));
						if ((typeof originalValue) === "boolean"){
							notify("fakedReadout");
							if (x instanceof window.Path2D){
								let path = x;
								x = y;
								y = args[2];
								let index = x + this.width * y;
								return original.call(this, path, rng(x, index), rng(y, index));
							}
							else {
								let index = x + this.width * y;
								return original.call(this, rng(x, index), rng(y, index));
							}
						}
						else {
							return originalValue;
						}
					});
				};
			}
		},
		fillText: {
			type: "input",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(checker){
				return function fillText(str, x, y){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (!this || canvasSizeShouldBeFaked(this.canvas, prefs)){
							notify("fakedInput");
							let oldImageData;
							try {
								// "this" is not trustable - it may be not a context
								oldImageData = getImageData(window, this).imageData;
							}
							catch (error){
								// nothing to do here
							}
							// if "this" is not a correct context the next line will throw an error
							const ret = original.apply(this, window.Array.from(args));
							const newImageData = getImageData(window, this).imageData;
							this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
							return ret;
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		strokeText: {
			type: "input",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker("input");
				return status;
			},
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(checker){
				return function strokeText(str, x, y){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (!this || canvasSizeShouldBeFaked(this.canvas, prefs)){
							notify("fakedInput");
							let oldImageData;
							try {
								// "this" is not trustable - it may be not a context
								oldImageData = getImageData(window, this).imageData;
							}
							catch (error){
								// nothing to do here
							}
							// if "this" is not a correct context the next line will throw an error
							const ret = original.apply(this, window.Array.from(args));
							const newImageData = getImageData(window, this).imageData;
							this.putImageData(randomMixImageData(window, oldImageData, newImageData), 0, 0);
							return ret;
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		readPixels: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker(["readout", "input"]);
				return status;
			},
			object: ["WebGLRenderingContext", "WebGL2RenderingContext"],
			fakeGenerator: function(checker){
				// eslint-disable-next-line max-params
				return function readPixels(x, y, width, height, format, type, pixels){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						if (!this || canvasSizeShouldBeFaked(this.canvas, prefs)){
							notify("fakedReadout");
							const fakeCanvas = getFakeCanvas(window, this.canvas, prefs);
							const {context} = webgl.copyCanvasToWebgl(
								window,
								fakeCanvas,
								this instanceof window.WebGLRenderingContext? "webgl": "webgl2"
							);
							return original.apply(context, window.Array.from(args));
						}
						else {
							return original.apply(this, window.Array.from(args));
						}
					});
				};
			}
		},
		getParameter: {
			type: "readout",
			getStatus: function(obj, status, prefs){
				const protectedPartChecker = getProtectedPartChecker(prefs, status.url);
				status = Object.create(status);
				status.active = protectedPartChecker(["readout", "input"]);
				return status;
			},
			object: ["WebGLRenderingContext", "WebGL2RenderingContext"],
			fakeGenerator: function(checker){
				webgl.initializeParameterDefinitions();
				return function getParameter(pname){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						const originalValue = original.apply(this, window.Array.from(args));
						if (webgl.parameterChangeDefinition[pname]){
							const definition = webgl.parameterChangeDefinition[pname];
							const {value, faked} = definition.fake(originalValue, window, prefs);
							if (faked){
								notify("fakedReadout");
							}
							return value;
						}
						else {
							return originalValue;
						}
					});
				};
			}
		}
	};
	Object.keys(scope.changedFunctions).forEach(function(key){
		scope.changedFunctions[key].api = "canvas";
	});
}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const logging = require("./logging");
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./webgl", {});
	}
	
	scope.copyCanvasToWebgl = function copyCanvasToWebgl(window, canvas, webGLVersion = "webgl"){
		const webGlCanvas = canvas.cloneNode(true);
		const context =
			window.HTMLCanvasElement.prototype.getContext.call(webGlCanvas, webGLVersion) ||
			window.HTMLCanvasElement.prototype.getContext.call(webGlCanvas, "experimental-" + webGLVersion);
		if (!context){
			// unable to get a context...
			logging.warning("unable to create webgl context.");
			return {canvas: false, context: false};
		}
		
		context.viewport(0, 0, webGlCanvas.width, webGlCanvas.height);
		
		const program = context.createProgram();
		
		const vertexShader = context.createShader(context.VERTEX_SHADER);
		const vertex = "attribute vec4 a_position;\nattribute vec2 a_texCoord;\nvarying vec2 v_texCoord;\n" +
			"void main(){\n\tgl_Position = a_position;\n\tv_texCoord = a_texCoord;\n}";
		context.shaderSource(vertexShader, vertex);
		context.compileShader(vertexShader);
		if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)){
			context.deleteShader(vertexShader);
			logging.warning("webgl: failed to compile vertex shader.");
			return {canvas: false, context: false};
		}
		context.attachShader(program, vertexShader);
		
		const fragmentShader = context.createShader(context.FRAGMENT_SHADER);
		const fragmenter = "precision mediump float;\nuniform sampler2D u_image;\nvarying vec2 v_texCoord;\n" +
			"void main(){\n\tgl_FragColor = texture2D(u_image, v_texCoord);\n}";
		context.shaderSource(fragmentShader, fragmenter);
		context.compileShader(fragmentShader);
		if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)){
			context.deleteShader(fragmentShader);
			logging.warning("webgl: failed to compile fragmenter shader.");
			return {canvas: false, context: false};
		}
		context.attachShader(program, fragmentShader);
		
		context.linkProgram(program);
		if (!context.getProgramParameter(program, context.LINK_STATUS)){
			context.deleteProgram(program);
			logging.warning("webgl: failed to link program.");
			return {canvas: false, context: false};
		}
		
		context.useProgram(program);
		
		const positionBuffer = context.createBuffer();
		context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
		context.bufferData(context.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			-1,  1,
			 1, -1,
			 1,  1,
			-1,  1,
			 1, -1
		]), context.STATIC_DRAW);
		
		const positionAttributeLocation = context.getAttribLocation(program, "a_position");
		context.enableVertexAttribArray(positionAttributeLocation);
		const size = 2;             // 2 components per iteration
		const type = context.FLOAT; // the data is 32bit floats
		const normalize = false;    // don't normalize the data
		const stride = 0;           // 0 = move forward size * sizeof(type) each iteration to get the next position
		const offset = 0;           // start at the beginning of the buffer
		context.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
		
		const texCoordLocation = context.getAttribLocation(program, "a_texCoord");
		
		// provide texture coordinates for the rectangle.
		const texCoordBuffer = context.createBuffer();
		context.bindBuffer(context.ARRAY_BUFFER, texCoordBuffer);
		context.bufferData(context.ARRAY_BUFFER, new Float32Array([
			0, 1,
			0, 0,
			1, 1,
			1, 0,
			0, 0,
			1, 1
		]), context.STATIC_DRAW);
		context.enableVertexAttribArray(texCoordLocation);
		context.vertexAttribPointer(texCoordLocation, 2, context.FLOAT, false, 0, 0);
		
		context.bindTexture(context.TEXTURE_2D, context.createTexture());
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
		context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, canvas);
		
		context.drawArrays(context.TRIANGLES /*primitiveType*/, 0 /*triangleOffset*/, 6 /*count*/);
		
		return {webGlCanvas, context};
	};
	
	const webglRandom = require("./webglRandom");
	let randomSupply = null;
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
		webglRandom.setRandomSupply(supply);
	};
	
	function getNumber({originalValue, max, index, window}){
		const bitLength = Math.floor(Math.log2(max) + 1);
		const rng = randomSupply.getBitRng(bitLength, window);
		let value = 0;
		for (let i = 0; i < bitLength; i += 1){
			value <<= 1;
			value ^= rng(originalValue, index + i);
		}
		return value;
	}
	
	const parameterFakeTypes = {
		preference: function(originalValue, definition, window, prefs){
			const settingValue = prefs(definition.preferenceName) || originalValue;
			switch (settingValue){
				case "{undefined}":
					return undefined;
				case "{false}":
					return false;
				case "{empty}":
					return "";
				case "{disabled}":
					return null;
				case "{random vendor}":
					return webglRandom.getRandomVendor(window);
				case "{random renderer}":
					return webglRandom.getRandomRenderer(window);
			}
			if (settingValue.startsWith("<") && settingValue.endsWith(">")){
				return webglRandom.pickOneFromTree(settingValue, window);
			}
			return settingValue;
		},
		decimal: function(originalValue, definition, window){
			const int = Math.floor(originalValue);
			if (int !== originalValue){
				const decimal = originalValue - int;
				const rng = randomSupply.getRng(1, window);
				const newDecimal = decimal * (rng(definition.pname) / 0xFFFFFFFF);
				return int + newDecimal;
			}
			else {
				return originalValue;
			}
		},
		shift: function(originalValue, definition, window){
			const value = getNumber({originalValue, max: definition.max, index: definition.pname, window});
			return originalValue >>> value;
		},
		"-": function(originalValue, definition, window){
			const value = getNumber({originalValue, max: definition.max, index: definition.pname, window}) *
				(definition.factor || 1);
			if (value > originalValue){
				return 0;
			}
			return originalValue - value;
		}
	};
	const parameterChangeDefinition = {
		2928: {name: "DEPTH_RANGE", type: "decimal", isArray: true},
		3379: {name: "MAX_TEXTURE_SIZE", type: "shift", max: 1},
		3386: {name: "MAX_VIEWPORT_DIMS", type: "shift", max: 1, isArray: true},
		32883: {name: "MAX_3D_TEXTURE_SIZE", type: "shift", max: 1},
		33000: {name: "MAX_ELEMENTS_VERTICES", type: "-", max: 3, factor: 50},
		33001: {name: "MAX_ELEMENTS_INDICES", type: "-", max: 3, factor: 50},
		33901: {name: "ALIASED_POINT_SIZE_RANGE", type: "decimal", isArray: true},
		33902: {name: "ALIASED_LINE_WIDTH_RANGE", type: "decimal", isArray: true},
		34024: {name: "MAX_RENDERBUFFER_SIZE", type: "shift", max: 1},
		34045: {name: "MAX_TEXTURE_LOD_BIAS", type: "-", max: 1, factor: 1},
		34076: {name: "MAX_CUBE_MAP_TEXTURE_SIZE", type: "shift", max: 1},
		34921: {name: "MAX_VERTEX_ATTRIBS", type: "shift", max: 1},
		34930: {name: "MAX_TEXTURE_IMAGE_UNITS", type: "shift", max: 1},
		35071: {name: "MAX_ARRAY_TEXTURE_LAYERS", type: "shift", max: 1},
		35371: {name: "MAX_VERTEX_UNIFORM_BLOCKS", type: "-", max: 1, factor: 1},
		35373: {name: "MAX_FRAGMENT_UNIFORM_BLOCKS", type: "-", max: 1, factor: 1},
		35374: {name: "MAX_COMBINED_UNIFORM_BLOCKS", type: "-", max: 3, factor: 1},
		35375: {name: "MAX_UNIFORM_BUFFER_BINDINGS", type: "-", max: 3, factor: 1},
		35376: {name: "MAX_UNIFORM_BLOCK_SIZE", type: "shift", max: 1},
		35377: {name: "MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS", type: "-", max: 7, factor: 10},
		35379: {name: "MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS", type: "-", max: 7, factor: 10},
		35657: {name: "MAX_FRAGMENT_UNIFORM_COMPONENTS", type: "shift", max: 1},
		35658: {name: "MAX_VERTEX_UNIFORM_COMPONENTS", type: "shift", max: 1},
		35659: {name: "MAX_VARYING_COMPONENTS", type: "shift", max: 1},
		35660: {name: "MAX_VERTEX_TEXTURE_IMAGE_UNITS", type: "shift", max: 1},
		35661: {name: "MAX_COMBINED_TEXTURE_IMAGE_UNITS", type: "-", max: 1, factor: 2},
		35968: {name: "MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS", type: "shift", max: 1},
		35978: {name: "MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS", type: "shift", max: 1},
		36203: {name: "MAX_ELEMENT_INDEX", type: "-", max: 15, factor: 1},
		36347: {name: "MAX_VERTEX_UNIFORM_VECTORS", type: "shift", max: 1},
		36348: {name: "MAX_VARYING_VECTORS", type: "shift", max: 1},
		36349: {name: "MAX_FRAGMENT_UNIFORM_VECTORS", type: "shift", max: 1},
		37154: {name: "MAX_VERTEX_OUTPUT_COMPONENTS", type: "shift", max: 1},
		37157: {name: "MAX_FRAGMENT_INPUT_COMPONENTS", type: "shift", max: 1},
		7936: {name: "VENDOR", type: "preference", preferenceName: "webGLVendor"},
		7937: {name: "RENDERER", type: "preference", preferenceName: "webGLRenderer"},
		37445: {name: "UNMASKED_VENDOR_WEBGL", type: "preference", preferenceName: "webGLUnmaskedVendor"},
		37446: {name: "UNMASKED_RENDERER_WEBGL", type: "preference", preferenceName: "webGLUnmaskedRenderer"}
	};
	
	scope.initializeParameterDefinitions = function(){
		function singleFake(originalValue, window, prefs){
			const value = parameterFakeTypes[this.type](originalValue, this, window, prefs);
			const faked = value !== originalValue;
			this.fake = function(){
				return {value, faked};
			};
			return {value, faked};
		}
		function arrayFake(originalValue, window, prefs){
			let faked = false;
			let fakedValue = [];
			for (let i = 0; i < originalValue.length; i += 1){
				fakedValue[i] = parameterFakeTypes[this.type](originalValue[i], this, window, prefs);
				faked = faked || originalValue[i] !== fakedValue[i];
				originalValue[i] = fakedValue[i];
			}
			this.fake = function(originalValue){
				if (faked){
					for (let i = 0; i < originalValue.length; i += 1){
						originalValue[i] = fakedValue[i];
					}
				}
				return {
					value: originalValue,
					faked
				};
			};
			return {
				value: originalValue,
				faked
			};
		}
		Object.keys(parameterChangeDefinition).forEach(function(parameterName){
			const definition = parameterChangeDefinition[parameterName];
			definition.pname = parameterName;
			if (!definition.fake){
				definition.fake = definition.isArray? arrayFake: singleFake;
			}
		});
	};
	scope.parameterChangeDefinition = parameterChangeDefinition;
}());
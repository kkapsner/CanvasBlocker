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
		const size = 2;          // 2 components per iteration
		const type = context.FLOAT;   // the data is 32bit floats
		const normalize = false; // don't normalize the data
		const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
		const offset = 0;        // start at the beginning of the buffer
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
}());
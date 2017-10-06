/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var logging = require("./logging");
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		window.scope.webgl = {};
		scope = window.scope.webgl;
	}
	
	scope.copyCanvasToWebgl = function copyCanvasToWebgl(window, canvas, webGLVersion = "webgl"){
		var webGlCanvas = canvas.cloneNode(true);
		var success;
		var context =
			window.HTMLCanvasElement.prototype.getContext.call(webGlCanvas, webGLVersion) ||
			window.HTMLCanvasElement.prototype.getContext.call(webGlCanvas, "experimental-" + webGLVersion);
		if (!context){
			// unable to get a context...
			logging.warning("unable to create webgl context.");
			return {canvas: false, context: false};
		}
		
		context.viewport(0, 0, webGlCanvas.width, webGlCanvas.height);

		var program = context.createProgram();

		var shader = context.createShader(context.VERTEX_SHADER);
		var vertex = "attribute vec4 a_position;\nattribute vec2 a_texCoord;\nvarying vec2 v_texCoord;\n" +
			"void main(){\n\tgl_Position = a_position;\n\tv_texCoord = a_texCoord;\n}";
		context.shaderSource(shader, vertex);
		context.compileShader(shader);
		success = context.getShaderParameter(shader, context.COMPILE_STATUS);
		if (!success){
			context.deleteShader(shader);
			logging.warning("webgl: failed to compile vertex shader.");
			return {canvas: false, context: false};
		}
		context.attachShader(program, shader);
		
		shader = context.createShader(context.FRAGMENT_SHADER);
		var fragmenter = "precision mediump float;\nuniform sampler2D u_image;\nvarying vec2 v_texCoord;\n" +
			"void main(){\n\tgl_FragColor = texture2D(u_image, v_texCoord);\n}";
		context.shaderSource(shader, fragmenter);
		context.compileShader(shader);
		success = context.getShaderParameter(shader, context.COMPILE_STATUS);
		if (!success){
			context.deleteShader(shader);
			logging.warning("webgl: failed to compile fragmenter shader.");
			return {canvas: false, context: false};
		}
		context.attachShader(program, shader);
		
		context.linkProgram(program);
		success = context.getProgramParameter(program, context.LINK_STATUS);
		if (!success){
			context.deleteProgram(program);
			logging.warning("webgl: failed to link program.");
			return {canvas: false, context: false};
		}
		
		context.useProgram(program);
		
		var positionAttributeLocation = context.getAttribLocation(program, "a_position");
		var positionBuffer = context.createBuffer();
		context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
		context.bufferData(context.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			-1,  1,
			 1, -1,
			 1,  1,
			-1,  1,
			 1, -1
			 
		]), context.STATIC_DRAW);
		
		context.enableVertexAttribArray(positionAttributeLocation);
		var size = 2;          // 2 components per iteration
		var type = context.FLOAT;   // the data is 32bit floats
		var normalize = false; // don't normalize the data
		var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
		var offset = 0;        // start at the beginning of the buffer
		context.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
		
		var texCoordLocation = context.getAttribLocation(program, "a_texCoord");
		
		// provide texture coordinates for the rectangle.
		var texCoordBuffer = context.createBuffer();
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

		var texture = context.createTexture();
		context.bindTexture(context.TEXTURE_2D, texture);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
		context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, canvas);

		var primitiveType = context.TRIANGLES;
		var triangleOffset = 0;
		var count = 6;
		context.drawArrays(primitiveType, triangleOffset, count);
		
		return {webGlCanvas, context};
	};
}());
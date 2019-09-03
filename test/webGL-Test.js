(function(){
	"use strict";
	
	["webgl", "webgl2"].forEach(function(context, index){
		var output = document.createElement("div");
		document.getElementById("output").appendChild(output);
		try {
			var canvas = document.createElement("canvas");
			canvas.width = 11;
			canvas.height = 13;
			var gl = canvas.getContext(context) || canvas.getContext("experimental-" + context);
			
			// paint it completely black
			gl.clearColor(index * 0.25, index * 0.25, index * 0.25, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			
			var pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
			gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			var values = {};
			var max = 0;
			for (var i = 0; i < pixels.length; i += 1){
				values[pixels[i]] = (values[pixels[i]] || 0) + 1;
				max = Math.max(max, values[pixels[i]]);
			}

			output.textContent = context + ": " + (max !== 3 * values[255]? "": "not ") + "supported";
			output.title = JSON.stringify(values);
		}
		catch (e){
			output.textContent = context + ": ERROR";
			output.title = e;
		}
	});
}());
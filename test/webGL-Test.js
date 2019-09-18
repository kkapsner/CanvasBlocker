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
			const parameters = [];
			for (var name in gl){
				if (name.toUpperCase() === name){
					var value = gl.getParameter(gl[name]);
					if (value !== null){
						parameters.push({name: name, value: value});
					}
				}
			}
			const debugExtension = gl.getExtension("WEBGL_debug_renderer_info");
			
			for (name in debugExtension){
				if (name.toUpperCase() === name){
					value = gl.getParameter(debugExtension[name]);
					if (value !== null){
						parameters.push({name: name, value: value});
					}
				}
			}
			var frontParameters = ["VENDOR", "RENDERER", "UNMASKED_VENDOR_WEBGL", "UNMASKED_RENDERER_WEBGL"];
			parameters.sort(function(a, b){
				var frontA = frontParameters.indexOf(a.name);
				var frontB = frontParameters.indexOf(b.name);
				if (frontA !== -1){
					if (frontB !== -1){
						return frontA - frontB;
					}
					else {
						return -1;
					}
				}
				else {
					if (frontB !== -1){
						return 1;
					}
					else {
						return a.name < b.name? -1: 1;
					}
				}
			});
			if (context === "webgl2"){
				var parameterOutput = document.createElement("table");
				document.getElementById("parameters").appendChild(parameterOutput);
				parameters.forEach(function(parameter){
					var parameterRow = document.createElement("tr");
					parameterRow.innerHTML = "<td>" + parameter.name + "</td><td>" + parameter.value + "</td>";
					parameterOutput.appendChild(parameterRow);
				});
			}
			crypto.subtle.digest("SHA-256", new TextEncoder("utf-8").encode(parameters.map(function(parameter){
				return parameter.name + ": " + parameter.value;
			}).join(",")))
				.then(function(hash){
					var chunks = [];
					(new Uint32Array(hash)).forEach(function(num){
						chunks.push(num.toString(16));
					});
					return chunks.map(function(chunk){
						return "0".repeat(8 - chunk.length) + chunk;
					}).join("");
				}).then(function(hash)  {
					output.textContent = context + ": " +
						(max !== 3 * values[255]? "": "not ") + "supported " +
						"(parameter hash: " + hash + ")";
					output.title = JSON.stringify(values);
				});
		}
		catch (e){
			output.textContent = context + ": ERROR";
			output.title = e;
		}
	});
}());
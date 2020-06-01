/* globals testAPI */
(function(){
	"use strict";
	
	function getParameters(context){
		const parameters = [];
		for (let name in context){
			if (name.toUpperCase() === name){
				const value = context.getParameter(context[name]);
				if (value !== null){
					parameters.push({name: name, value: value});
				}
			}
		}
		const debugExtension = context.getExtension("WEBGL_debug_renderer_info");
		
		for (let name in debugExtension){
			if (name.toUpperCase() === name){
				const value = context.getParameter(debugExtension[name]);
				if (value !== null){
					parameters.push({name: name, value: value});
				}
			}
		}
		const frontParameters = ["VENDOR", "RENDERER", "UNMASKED_VENDOR_WEBGL", "UNMASKED_RENDERER_WEBGL"];
		parameters.sort(function(a, b){
			const frontA = frontParameters.indexOf(a.name);
			const frontB = frontParameters.indexOf(b.name);
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
		return parameters;
	}
	
	function createHashRow(hashTable, rowName){
		const row = document.createElement("tr");
		hashTable.appendChild(row);
		
		const nameCell = document.createElement("th");
		nameCell.textContent = rowName;
		row.appendChild(nameCell);
		
		const valueCell = document.createElement("td");
		valueCell.innerHTML = "<i>computing</i>";
		row.appendChild(valueCell);
		
		return valueCell;
	}
	
	function fillWebGlContext(context){
		// taken from https://github.com/Valve/fingerprintjs2/blob/master/fingerprint2.js
		const vertexShaderTemplate = "attribute vec2 attrVertex;varying vec2 varyingTexCoordinate;" +
			"uniform vec2 uniformOffset;void main(){varyingTexCoordinate=attrVertex+uniformOffset;" +
			"gl_Position=vec4(attrVertex,0,1);}";
		const fragmentShaderTemplate = "precision mediump float;varying vec2 varyingTexCoordinate;" +
			"void main() {gl_FragColor=vec4(varyingTexCoordinate,0,1);}";
		const vertexPosBuffer = context.createBuffer();
		context.bindBuffer(context.ARRAY_BUFFER, vertexPosBuffer);
		const vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0]);
		context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);
		vertexPosBuffer.itemSize = 3;
		vertexPosBuffer.numItems = 3;
		const program = context.createProgram();
		const vertexShader = context.createShader(context.VERTEX_SHADER);
		context.shaderSource(vertexShader, vertexShaderTemplate);
		context.compileShader(vertexShader);
		const fragmentShader = context.createShader(context.FRAGMENT_SHADER);
		context.shaderSource(fragmentShader, fragmentShaderTemplate);
		context.compileShader(fragmentShader);
		context.attachShader(program, vertexShader);
		context.attachShader(program, fragmentShader);
		context.linkProgram(program);
		context.useProgram(program);
		program.vertexPosAttrib = context.getAttribLocation(program, "attrVertex");
		program.offsetUniform = context.getUniformLocation(program, "uniformOffset");
		context.enableVertexAttribArray(program.vertexPosArray);
		context.vertexAttribPointer(program.vertexPosAttrib, vertexPosBuffer.itemSize, context.FLOAT, !1, 0, 0);
		context.uniform2f(program.offsetUniform, 1, 1);
		context.drawArrays(context.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems);
	}
	
	async function testSupport(context, index){
		const canvas = document.createElement("canvas");
		canvas.width = 11;
		canvas.height = 13;
		
		const output = document.createElement("div");
		document.getElementById("output").appendChild(output);
		try {
			const gl = canvas.getContext(context) || canvas.getContext("experimental-" + context);
			
			// paint it completely black
			gl.clearColor(index * 0.25, index * 0.25, index * 0.25, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			
			const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
			gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			const values = {};
			let max = 0;
			for (let i = 0; i < pixels.length; i += 1){
				values[pixels[i]] = (values[pixels[i]] || 0) + 1;
				max = Math.max(max, values[pixels[i]]);
			}
			
			output.textContent = context + ": " +
				(max !== 3 * values[255]? "": "not ") + "supported ";
			output.title = JSON.stringify(values);
		}
		catch (error){
			output.textContent = context + ": ERROR";
			output.title = error;
		}
	}
	
	async function testParameters(context, hashTable){
		const canvas = document.createElement("canvas");
		canvas.width = 11;
		canvas.height = 13;
		
		const hashCell = createHashRow(hashTable, "parameter");
		
		try {
			const gl = canvas.getContext(context) || canvas.getContext("experimental-" + context);
			
			const parameters = getParameters(gl);
			if (context === "webgl2"){
				const parameterOutput = document.createElement("table");
				document.getElementById("parameters").appendChild(parameterOutput);
				parameters.forEach(function(parameter){
					const parameterRow = document.createElement("tr");
					parameterRow.innerHTML = "<td>" + parameter.name + "</td><td>" + parameter.value + "</td>";
					parameterOutput.appendChild(parameterRow);
				});
			}
			
			hashCell.textContent = await testAPI.hash(parameters.map(function(parameter){
				return parameter.name + ": " + parameter.value;
			}).join(","));
		}
		catch (error){
			hashCell.textContent = "ERROR";
			hashCell.title = error;
		}
	}
	
	const drawImage = location.search !== "?noDraw";
	
	async function createImageHash(context, hashTable){
		return Promise.all([function(){
			const canvas = document.createElement("canvas");
			canvas.width = 300;
			canvas.height = 150;
			return canvas;
		}, function(){
			if (window.OffscreenCanvas){
				return new OffscreenCanvas(300, 150);
			}
			return null;
		}].map(async function(getter){
			const canvas = getter();
			if (canvas){
				const hashCell = createHashRow(hashTable, "image" + (canvas.toDataURL? "": " (offscreen)"));
				try {
					if (drawImage){
						const gl = canvas.getContext(context) || canvas.getContext("experimental-" + context);
						fillWebGlContext(gl);
					}
					if (canvas.convertToBlob || canvas.toBlob){
						const blob = await (canvas.convertToBlob? canvas.convertToBlob(): (canvas.toBlob.length?
							new Promise(function(resolve){canvas.toBlob(resolve);}):
							canvas.toBlob()
						));
						hashCell.textContent = await testAPI.hash(await testAPI.readBlob(blob));
					}
				}
				catch (error){
					console.log(error);
				}
			}
			return false;
		}));
	}
	
	async function createWorkerImageHash(context, hashTable){
		if (window.Worker && window.OffscreenCanvas){
			const hashCell = createHashRow(hashTable, "image (offscreen worker)");
			const url = new URL("./testAPI.js", location);
			hashCell.textContent = await testAPI.runInWorker(async function getHash(contextType, drawImage){
				const canvas = new OffscreenCanvas(300, 150);
				if (drawImage){
					const context = canvas.getContext(contextType);
					fillWebGlContext(context);
				}
				return await testAPI.hash(
					await testAPI.readBlob(
						canvas.convertToBlob?
							await canvas.convertToBlob():
							await canvas.toBlob()
					)
				);
			}, [context, drawImage], [url, fillWebGlContext]);
		}
	}
	
	["webgl", "webgl2"].forEach(async function(context, index){
		testSupport(context, index);
		
		const hashOutput = document.createElement("div");
		document.getElementById("hashes").appendChild(hashOutput);
		
		hashOutput.textContent = context + ": ";
		const table = document.createElement("table");
		hashOutput.appendChild(table);
		
		testParameters(context, table);
		createImageHash(context, table);
		createWorkerImageHash(context, table);
	});
}());
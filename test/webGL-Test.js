(function(){
	var canvas = document.createElement('canvas');
	canvas.width = 11;
	canvas.height = 13;
	var gl = canvas.getContext('webgl');
	
	// paint it completely black
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	var pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
	gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	var values = {};
	for (var i = 0; i < pixels.length; i += 1){
		values[pixels[i]] = (values[pixels[i]] || 0) + 1;
	}
	document.getElementById("output").textContent = JSON.stringify(values);
}());
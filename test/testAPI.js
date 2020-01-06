const testAPI = function(){
	"use strict";
	
	function bufferToString(hash){
		const chunks = [];
		(new Uint32Array(hash)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	
	
	return {
		hash: async function(input){
			const buffer = ((typeof input) === "string")?
				new TextEncoder("utf-8").encode(input):
				input;
			const hash = await crypto.subtle.digest("SHA-256", buffer);
			return bufferToString(hash);
		}
	};
}();
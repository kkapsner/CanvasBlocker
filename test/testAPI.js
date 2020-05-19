const testAPI = function(){
	"use strict";
	
	const digest = crypto.subtle? crypto.subtle.digest.bind(crypto.subtle, "SHA-256"): function(buffer){
		return new Uint32Array(buffer.buffer);
	};
	
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
		runInWorker: async function(func, args = [], scripts = []){
			return new Promise(function(resolve, reject){
				const apis = scripts.map(function(script){
					switch (typeof script){
						case "function":
							return script.toString();
						case "string":
						case "object":
							return "self.importScripts(" + JSON.stringify(script.toString()) + ")";
						default:
							return "";
					}
				}).join(";\n");
				const code = `${apis};
				${func.toString()}
				async function run(){
					return ${func.name}(${args.map(JSON.stringify).join(", ")});
				}
				run().then(function(result){
					self.postMessage({result});
				}).catch(function(error){
					console.log(error);
					self.postMessage({error: error.message || error.toString()});
				});`;
				const blob = new Blob([code], {type: "text/javascript"});
				
				const blobWorker = new Worker(URL.createObjectURL(blob), {name: "BlobWorker"});
				blobWorker.addEventListener("message", function(event){
					if (event.data.error){
						reject(event.data.error);
					}
					else {
						resolve(event.data.result);
					}
					blobWorker.terminate();
				});
			});
		},
		readBlob: async function(blob){
			const reader = new FileReader();
			return new Promise(function(resolve, reject){
				reader.addEventListener("error", reject);
				reader.addEventListener("load", function(){
					resolve(reader.result);
				});
				reader.readAsDataURL(blob);
			});
		},
		hash: async function(input){
			const buffer = ((typeof input) === "string")?
				new TextEncoder("utf-8").encode(input):
				input;
			const hash = await digest(buffer);
			return bufferToString(hash);
		}
	};
}();
(function(){
	"use strict";
	function byteArrayToHex(arrayBuffer){
		var chunks = [];
		(new Uint32Array(arrayBuffer)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	const container = document.getElementById("tests");
	const iframe = document.getElementById("iframe");
	const template = document.querySelector(".test");
	template.parentElement.removeChild(template);
	
	function getElements(){
		const doc = iframe.contentDocument;
		
		return Array.from(doc.querySelectorAll("*[id^=rect]"));
	}
	
	function createTest(title, callback){
		const properties = ["x", "y", "width", "height", "top", "left", "right", "bottom"];
		function performTest(){
			const rects = getElements().map(callback);
			const data = new Float64Array(rects.length * properties.length);
			rects.forEach(function(rect, i){
				properties.forEach(function(property, j){
					data[i * properties.length + j] = rect[property];
				});
			});
			
			crypto.subtle.digest("SHA-256", data)
				.then(function(hash){
					output.querySelector(".hash").textContent = byteArrayToHex(hash);
				});
			
			output.querySelector(".data").innerHTML = "<table><tr><th></th>" +
				rects.map(function(rect, i){
					return "<th>rect " + (i + 1) + "</th>";
				}).join("") +
				"</tr>" +
				properties.map(function(property){
					return "<tr><th>" + property + "</th>" + rects.map(function(rect, i){
						return "<td>" + rect[property] + "</td>";
					}).join("") + "</tr>";
				}).join("") +
				"</table>";
			
		}
		const output = template.cloneNode(true);
		output.querySelector(".title").textContent = title;
		output.querySelector("button").addEventListener("click", performTest);
		
		container.appendChild(output);
		performTest();
	}
	iframe.addEventListener("load", function(){
		createTest("getClientRects", function(element){
			return element.getClientRects()[0];
		});
		createTest("getBoundingClientRect", function(element){
			return element.getBoundingClientRect();
		});
	});
}());
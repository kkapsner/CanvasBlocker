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
		
		return Array.from(doc.querySelectorAll(".testRect"));
	}
	
	function createTest(title, callback){
		const properties = ["x", "y", "width", "height", "top", "left", "right", "bottom"];
		function performTest(){
			const rects = getElements().map(function(element){
				return {
					name: element.dataset.name,
					data: callback(element)
				};
			});
			const data = new Float64Array(rects.length * properties.length);
			rects.forEach(function(rect, i){
				properties.forEach(function(property, j){
					data[i * properties.length + j] = rect.data[property];
				});
			});
			
			crypto.subtle.digest("SHA-256", data)
				.then(function(hash){
					output.querySelector(".hash").textContent = byteArrayToHex(hash);
				});
			
			function formatNumber(number){
				const str = number.toString();
				return "<span class=small>" + str.substring(0, str.length - 2) + "</span>" +
					str.substring(str.length - 2);
			}
			var dataNode = output.querySelector(".data");
			dataNode.innerHTML = "<table><tr><th></th>" +
				rects.map(function(rect){
					return "<th>" + rect.name + "</th>";
				}).join("") +
				"</tr><tr><th>hash</th>" +
				rects.map(function(rect){
					return "<td class=\"rectHash\" data-name=\"" + rect.name + "\"></td>";
				}).join("") +
				"</tr>" +
				properties.map(function(property){
					return "<tr><th>" + property + "</th>" + rects.map(function(rect){
						return "<td class=\"value\" title=\"" + rect.data[property] + "\">" +
							formatNumber(rect.data[property]) +
							"</td>";
					}).join("") + "</tr>";
				}).join("") +
				"</table>";
			rects.forEach(function(rect){
				const data = new Float64Array(properties.length);
				properties.forEach(function(property, i){
					data[i] = rect.data[property];
				});
				
				crypto.subtle.digest("SHA-256", data).then(function(hash){
					dataNode.querySelector(
						".rectHash[data-name=\"" + rect.name + "\"]"
					).textContent = byteArrayToHex(hash);
				});
			});
		}
		const output = template.cloneNode(true);
		output.querySelector(".title").textContent = title;
		output.querySelector(".refresh").addEventListener("click", performTest);
		output.querySelector(".performance").addEventListener("click", function(){
			let count = 200;
			return function(){
				let duration = 0;
				let i = 0;
				while (duration < 1000){
					const start = Date.now();
					for (; i < count; i += 1){
						const rects = getElements().map(function(element){
							return {
								name: element.dataset.name,
								data: callback(element)
							};
						});
						const data = new Float64Array(rects.length * properties.length);
						rects.forEach(function(rect, i){
							properties.forEach(function(property, j){
								data[i * properties.length + j] = rect.data[property];
							});
						});
					}
					duration += Date.now() - start;
					if (duration < 1000){
						count += Math.ceil(
							count * (1000 - duration) / 1000
						);
					}
				}
				alert(
					(count / (duration / 1000)).toFixed(2) + " tests/s\n" +
					(duration * 1000 / count).toFixed(2) + " µs/test\n" +
					"(" + count + " samples)"
				);
			};
		}());
		
		container.appendChild(output);
		performTest();
	}
	iframe.addEventListener("load", function(){
		createTest("Element.getClientRects", function(element){
			return element.getClientRects()[0];
		});
		createTest("Element.getBoundingClientRect", function(element){
			return element.getBoundingClientRect();
		});
		createTest("Range.getClientRects", function(element){
			var range = document.createRange();
			range.selectNode(element);
			return range.getClientRects()[0];
		});
		createTest("Range.getBoundingClientRect", function(element){
			var range = document.createRange();
			range.selectNode(element);
			return range.getBoundingClientRect();
		});
	});
}());
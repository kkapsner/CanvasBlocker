(function(){
	"use strict";
	function byteArrayToHex(arrayBuffer){
		const chunks = [];
		(new Uint32Array(arrayBuffer)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	const container = document.getElementById("tests");
	const iframe = document.getElementById("iframe");
	const noIframe = document.getElementById("noIframe");
	const template = document.querySelector(".test");
	template.parentElement.removeChild(template);
	
	function getElements(useIframe = true){
		const doc = useIframe? iframe.contentDocument: noIframe;
		
		return Array.from(doc.querySelectorAll(".testRect"));
	}
	
	function formatNumber(number){
		const str = number.toString();
		return "<span class=small>" + str.substring(0, str.length - 2) + "</span>" +
			str.substring(str.length - 2);
	}

	const properties = ["x", "y", "width", "height", "top", "left", "right", "bottom"];
	async function performTest(output, callback, useIframe = true){
		const rects = getElements(useIframe).map(function(element){
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
		
		const hash = await crypto.subtle.digest("SHA-256", data);
		output.querySelector(".hash").textContent = byteArrayToHex(hash);
		
		const dataNode = output.querySelector(".data");
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
		rects.forEach(async function(rect){
			const data = new Float64Array(properties.length);
			properties.forEach(function(property, i){
				data[i] = rect.data[property];
			});
			
			const hash = await crypto.subtle.digest("SHA-256", data);
			dataNode.querySelector(
				".rectHash[data-name=\"" + rect.name + "\"]"
			).textContent = byteArrayToHex(hash);
		});
	}
	
	function createTest(title, callback, useIframe){
		const output = template.cloneNode(true);
		output.querySelector(".title").textContent = title + (useIframe? " (iframe)": "");
		output.querySelector(".refresh").addEventListener("click", function(){
			performTest(output, callback, useIframe);
		});
		output.querySelector(".performance").addEventListener("click", function(){
			let count = 200;
			let totalCount = 0;
			let totalDuration = 0;
			return function(){
				let duration = 0;
				let i = 0;
				while (duration < 1000){
					const start = Date.now();
					for (; i < count; i += 1){
						const rects = getElements(useIframe).map(function(element){
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
				totalCount += count;
				totalDuration += duration;
				alert(
					(totalCount / (totalDuration / 1000)).toFixed(2) + " tests/s\n" +
					(totalDuration * 1000 / totalCount).toFixed(2) + " µs/test\n" +
					"(" + totalCount + " samples)"
				);
			};
		}());
		
		container.appendChild(output);
		performTest(output, callback, useIframe);
	}
	iframe.addEventListener("load", function(){
		[true, false].forEach(function(useIframe){
			createTest("Element.getClientRects", function(element){
				return element.getClientRects()[0];
			}, useIframe);
			createTest("Element.getBoundingClientRect", function(element){
				return element.getBoundingClientRect();
			}, useIframe);
			createTest("Range.getClientRects", function(element){
				const range = document.createRange();
				range.selectNode(element);
				return range.getClientRects()[0];
			}, useIframe);
			createTest("Range.getBoundingClientRect", function(element){
				const range = document.createRange();
				range.selectNode(element);
				return range.getBoundingClientRect();
			}, useIframe);
		});
		
		document.querySelectorAll(".content-hidable").forEach(function(parentNode){
			parentNode.querySelector(".toggle").addEventListener("click", function(){
				parentNode.classList.toggle("content-hidden");
			});
		});
	});
}());
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
	const svg = document.getElementById("svg");
	const noIframe = document.getElementById("noIframe");
	const template = document.querySelector(".test");
	template.parentElement.removeChild(template);
	
	function getElements(useIframe = true){
		const doc = useIframe? (useIframe === "svg"? svg.contentDocument: iframe.contentDocument): noIframe;
		
		return Array.from(doc.querySelectorAll(".testRect"));
	}
	
	function formatNumber(number){
		const str = number.toString();
		return "<span class=small>" + str.substring(0, str.length - 2) + "</span>" +
			str.substring(str.length - 2);
	}

	const properties = ["x", "y", "width", "height", "top", "left", "right", "bottom"];
	async function performTest(output, callback, useIframe = true){
		const rects = (await Promise.all(getElements(useIframe).map(async function(element){
			return {
				name: element.dataset.name,
				data: await callback(element)
			};
		}))).filter(function(rect){
			return rect.data;
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
					const value = rect.data[property];
					if ((typeof value) === "number"){
						return "<td class=\"value\" title=\"" + rect.data[property] + "\">" +
							formatNumber(rect.data[property]) +
							"</td>";
					}
					else {
						return "<td class=\"value unavailable\">not available</td>";
					}
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
		output.querySelector(".title").textContent = title +
			(useIframe? " (" + (useIframe === "svg"? "svg": "iframe") + ")": "");
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
	async function getIntersectionEntryValue(parentElement, element, property){
		if (!(element instanceof Element)){
			return null;
		}
		
		return new Promise(function(resolve){
			const timeout = window.setTimeout(function(){
				resolve(null);
			}, 1000);
			const observer = new IntersectionObserver(function(entries){
				window.clearTimeout(timeout);
				resolve(entries[0][property]);
			}, {
				root: parentElement,
				rootMargin: "1000px",
			});
			observer.observe(element);
		});
	}
	iframe.addEventListener("load", function(){
		[true, false].forEach(function(useIframe){
			createTest("Element.getClientRects", function(element){
				return element.getClientRects()[0];
			}, useIframe);
			createTest("Element.getBoundingClientRect", function(element){
				return element.getBoundingClientRect();
			}, useIframe);
			createTest("Element.getBoxQuads", function(element){
				const quad = element.getBoxQuads();
				return quad[0].getBounds();
			}, useIframe);
			createTest("IntersectionObserverEntry.intersectionRect", function(element){
				return getIntersectionEntryValue(element.parentElement, element, "intersectionRect");
			}, useIframe);
			createTest("IntersectionObserverEntry.boundingClientRect", function(element){
				return getIntersectionEntryValue(element.parentElement, element, "boundingClientRect");
			}, useIframe);
			createTest("IntersectionObserverEntry.rootBounds", function(element){
				return getIntersectionEntryValue(element, element.firstChild, "rootBounds");
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
		createTest("SVGGraphicsElement.getBBox", function(element){
			return element.getBBox();
		}, "svg");
		createTest("SVGTextContentElement.getExtentOfChar", function(element){
			return element.getEndPositionOfChar? element.getExtentOfChar(element.textContent.length - 1): null;
		}, "svg");
		createTest("SVGTextContentElement.get(Start|End)OfChar", function(element){
			if (!element.getStartPositionOfChar){
				return null;
			}
			const start = element.getStartPositionOfChar(element.textContent.length - 1);
			const end = element.getEndPositionOfChar(element.textContent.length - 1);
			return new DOMRect(start.x, start.y, end.x - start.x, end.y - start.y);
		}, "svg");
		createTest("SVGGeometryElement.getPointAtLength", function(element){
			if (!element.getPointAtLength){
				return null;
			}
			const start = element.getPointAtLength(Math.E);
			const end = element.getPointAtLength(Math.PI);
			return new DOMRect(start.x, start.y, end.x - start.x, end.y - start.y);
		}, "svg");
		
		document.querySelectorAll(".content-hidable").forEach(function(parentNode){
			parentNode.querySelector(".toggle").addEventListener("click", function(){
				parentNode.classList.toggle("content-hidden");
			});
		});
	});
}());
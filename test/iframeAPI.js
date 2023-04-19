const iframeAPI = function(){
	"use strict";
	
	const methods = [
		{
			name: "own window",
			prepare: function(){
				return {
					window,
					cleanup: function(){}
				};
			}
		},
		{
			name: "simple",
			prepare: function(){
				const iframe = document.createElement("iframe");
				iframe.style.display = "none";
				document.body.appendChild(iframe);
				
				return {
					window: iframe.contentWindow,
					cleanup: function(){
						iframe.parentNode.removeChild(iframe);
					}
				};
			}
		},
		{
			name: "window.frames",
			prepare: function(){
				const iframe = document.createElement("iframe");
				document.body.appendChild(iframe);
				const window = frames[frames.length - 1];
				return {
					window,
					cleanup: function(){
						document.body.removeChild(iframe);
					}
				};
			}
		},
		{
			name: "window[window.length - 1]",
			prepare: function(){
				const iframe = document.createElement("iframe");
				document.body.appendChild(iframe);
				const iframeWindow = window[window.length - 1];
				return {
					window: iframeWindow,
					cleanup: function(){
						document.body.removeChild(iframe);
					}
				};
			}
		},
		{
			name: "sneaky window[...]",
			prepare: function(){
				const index = window.length;
				const iframe = document.createElement("iframe");
				document.body.appendChild(iframe);
				const iframeWindow = window[index];
				return {
					window: iframeWindow,
					cleanup: function(){
						document.body.removeChild(iframe);
					}
				};
			}
		},
		{
			name: "nested iFrames",
			prepare: function(){
				const index = window.length;
				const iframe = document.createElement("iframe");
				document.body.appendChild(iframe);
				const iframeWindow = window[index];
				iframeWindow.document.write("<iframe></iframe>");
				return {
					window: iframeWindow[0],
					cleanup: function(){
						document.body.removeChild(iframe);
					}
				};
			}
		},
		{
			name: "removed iframe",
			prepare: async function openWindow(){
				const iframe = document.createElement("iframe");
				document.body.appendChild(iframe);
				const iframeWindow = iframe.contentWindow;
				document.body.removeChild(iframe);
				console.log("window of iframe directly after removing", iframeWindow);
				return new Promise(function(resolve){
					window.setTimeout(function(){
						console.log("window of iframe in timeout", iframeWindow);
						resolve(iframeWindow);
					}, 1000);
				});
			}
		},
	];
	
	["/", "about:blank", "about:blank#"].forEach(function(url){
		methods.push({
			name: "window.open " + url,
			prepare: async function openWindow(){
				const newWindow = window.open(url);
				if (newWindow){
					return {
						window: newWindow,
						cleanup: function(){
							newWindow.close();
						}
					};
				}
				else {
					return new Promise(function(resolve){
						window.addEventListener("click", function openWindowEventListener(){
							window.removeEventListener("click", openWindowEventListener);
							resolve(openWindow());
						});
					});
				}
			}
		});
	});
	
	function getPerformer(callback){
		return async function perform(method){
			console.log("run iframe method", method.name);
			const api = await method.prepare();
			callback(api.window, method.name);
			api.cleanup();
		};
	}
	
	return {
		forEachMethod: function(callback){
			methods.forEach(getPerformer(callback));
		},
		performMethod: function(callback, name){
			methods.filter(function(method){
				return method.name === name;
			}).forEach(getPerformer(callback));
		}
	};
}();
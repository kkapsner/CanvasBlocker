/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(){
	"use strict";

	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./gui", {});
	}
	
	const logging = require("../lib/logging");
	const extension = require("../lib/extension");

	scope.createCollapser = function(){
		const messages = {
			more: extension.getTranslation("more"),
			less: extension.getTranslation("less")
		};

		return function createCollapser(container){
			const collapser = document.createElement("span");
			collapser.className = "collapser";

			["more", "less"].forEach(function(type){
				const span = document.createElement("span");
				span.className = type;
				span.textContent = messages[type];
				collapser.appendChild(span);
			});

			container.appendChild(collapser);
			collapser.addEventListener("click", function(){
				container.classList.toggle("collapsed");
			});
			container.classList.add("collapsible");
			container.classList.add("collapsed");
		};
	}();

		
	scope.createActionButtons = function createActionButtons(container, actions, data, horizontal){
		actions.forEach(function(action){
			const button = document.createElement("button");
			button.className = action.name + " action";
			button.title = extension.getTranslation(action.name);
			if (action.isIcon || action.icon){
				button.classList.add("isIcon");
				const img = document.createElement("img");
				button.appendChild(img);
				img.src = "../icons/" + (action.icon || `pageAction-${action.name}.svg`);
			}
			else {
				button.textContent = button.title;
			}
			button.addEventListener("click", action.callback.bind(undefined, data));
			container.appendChild(button);
			if (horizontal){
				container.appendChild(document.createElement("br"));
			}
		});
	};
	
	scope.modalChoice = function modalChoice(messageText, choices){
		logging.message("open modal choice");
		return new Promise(function(resolve){
			document.body.innerHTML = "";
			document.body.className = "modal";
			document.body.appendChild(document.createTextNode(messageText));
			const stack = document.createElement("div");
			stack.className = "stackedInputs";
			choices.forEach(function(choice){
				const button = document.createElement("button");
				button.addEventListener("click", function(){
					resolve(choice.value || choice);
					logging.message("modal choice closed with value", choice.value || choice);
				});
				button.appendChild(document.createTextNode(choice.text || choice));
				stack.appendChild(button);
			});
			document.body.append(stack);
		});
	};
	
	scope.modalPrompt = function modalPrompt(messageText, defaultValue){
		logging.message("open modal prompt");
		return new Promise(function(resolve){
			document.body.innerHTML = "";
			document.body.className = "modal";
			document.body.appendChild(document.createTextNode(messageText));
			const stack = document.createElement("div");
			stack.className = "stackedInputs";
			const input = document.createElement("input");
			input.value = defaultValue;
			stack.appendChild(input);
			const button = document.createElement("button");
			button.textContent = "OK";
			button.addEventListener("click", function(){
				resolve(input.value);
				logging.message("modal prompt closed with value", input.value);
			});
			stack.appendChild(button);
			document.body.append(stack);
		});
	};
}());
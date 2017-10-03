/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(){
	"use strict";

	const scope = window.scope.gui = {};
	
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = require("./logging");

	scope.createCollapser = function(){
		const more = browser.i18n.getMessage("more");
		const less = browser.i18n.getMessage("less");

		return function createCollapser(container){
			var collapser = document.createElement("span");
			collapser.className = "collapser";

			collapser.innerHTML = `<span class="more">${more}</span><span class="less">${less}</span>`;

			container.appendChild(collapser);
			collapser.addEventListener("click", function(){
				container.classList.toggle("collapsed");
			});
			container.classList.add("collapsable");
			container.classList.add("collapsed");
		};
	}();

		
	scope.createActionButtons = function createActionButtons(container, actions, data){
		actions.forEach(function(action, i){
			var button = document.createElement("button");
			button.className = action.name;
			button.textContent = browser.i18n.getMessage(action.name);
			button.addEventListener("click", action.callback.bind(undefined, data));
			container.appendChild(button);
			if (i % 3 === 2){
				container.appendChild(document.createElement("br"));
			}
		});
	};

	
	
	scope.modalPrompt = function modalPrompt(messageText, defaultValue){
		message("open modal prompt");
		return new Promise(function(resolve, reject){
			document.body.innerHTML = "";
			document.body.appendChild(document.createTextNode(messageText));
			var input = document.createElement("input");
			input.value = defaultValue;
			document.body.appendChild(input);
			var button = document.createElement("button");
			button.textContent = "OK";
			button.addEventListener("click", function(){
				resolve(input.value);
				message("modal prompt closed with value", input.value);
			});
			document.body.appendChild(button);
		});
	};
}());
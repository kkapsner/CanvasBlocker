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
		scope = require.register("./modal", {});
	}
	
	const extension = require("./extension");
	
	function getGlobalOffsetTop(node){
		if (node){
			return node.offsetTop + getGlobalOffsetTop(node.offsetParent);
		}
		else {
			return 0;
		}
	}
	function getGlobalScrollTop(node){
		if (node && node.scrollTop){
			return node.scrollTop + getGlobalScrollTop(node.parentNode);
		}
		else {
			return window.scrollY;
		}
	}
	
	function openDialog(text, buttons, parent = document.body){
		if (!(parent instanceof Node)){
			const parentSelector = parent.selector;
			parent = parent.node;
			while (parent && !parent.matches(parentSelector)){
				parent = parent.parentNode;
			}
			if (!parent){
				parent = document.body;
			}
		}
		const container = document.createElement("div");
		container.className = "modal";
		parent.appendChild(container);
		
		const overlay = document.createElement("div");
		overlay.className = "overlay";
		container.appendChild(overlay);
		
		const dialogPosition = document.createElement("div");
		dialogPosition.className = "dialogPosition";
		container.appendChild(dialogPosition);
		
		const dialog = document.createElement("div");
		dialog.className = "dialog";
		dialogPosition.appendChild(dialog);
		
		const textNode = document.createElement("span");
		textNode.className = "text";
		textNode.textContent = text;
		dialog.appendChild(textNode);
		
		const buttonsNode = document.createElement("div");
		buttonsNode.className = "buttons";
		dialog.appendChild(buttonsNode);
		
		let defaultButton;
		buttons.forEach(function(button){
			const buttonNode = document.createElement("button");
			buttonNode.textContent = button.text;
			buttonNode.addEventListener("click", function(){
				close();
				button.callback();
			});
			buttonsNode.appendChild(buttonNode);
			if (button.focused){
				buttonNode.focus();
			}
			if (button.default){
				defaultButton = button;
			}
		});
		
		function closeOnEscape(event){
			if (event.keyCode === 27){
				close();
				if (defaultButton){
					defaultButton.callback();
				}
			}
		}
		function positionDialog(){
			const parentTop = getGlobalOffsetTop(parent) - getGlobalScrollTop(parent);
			const parentHeight = parent.offsetHeight;
			const height = dialog.offsetHeight;
			const top = Math.max(0,
				Math.min(
					container.offsetHeight - height,
					parentTop + parentHeight / 2 - height / 2
				)
			);
			dialogPosition.style.top = top + "px";
		}
		function close(){
			window.removeEventListener("keydown", closeOnEscape);
			window.removeEventListener("scroll", positionDialog);
			window.removeEventListener("resize", positionDialog);
			parent.removeChild(container);
		}
		window.addEventListener("keydown", closeOnEscape);
		
		if (parent !== document.body){
			positionDialog();
			window.addEventListener("scroll", positionDialog);
			window.addEventListener("resize", positionDialog);
		}
		
		return container;
	}
	
	scope.confirm = function(text, parent){
		return new Promise(function(resolve){
			openDialog(text, [
				{text: extension.getTranslation("cancel"), default: true, callback: ()=>resolve(false)},
				{text: extension.getTranslation("OK"), focused: true, callback: ()=>resolve(true)}
			], parent);
		});
	};
	
	scope.select = function(text, options, parent){
		return new Promise(function(resolve, reject){
			const select = document.createElement("select");
			options.forEach(function(option){
				const optionNode = document.createElement("option");
				optionNode.text = option.name;
				optionNode.object = option.object;
				select.appendChild(optionNode);
			});
			
			const container = openDialog(text, [
				{
					text: extension.getTranslation("cancel"),
					default: true,
					callback: () => reject(false)
				},
				{
					text: extension.getTranslation("OK"),
					focused: true,
					callback: () => resolve(select.options[select.selectedIndex].object)
				}
			], parent);
			container.querySelector(".text").insertAdjacentElement("afterend", select);
		});
	};
}());
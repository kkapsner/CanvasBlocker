/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const {createCollapser, createActionButtons} = require("./gui");

	const actions = [];
	const addAction = function addAction(action){
		actions.push(action);
	};

	class Notification{
		constructor(data){
			Object.entries(data).forEach(function(entry){
				const [key, value] = entry;
				this[key] = value;
			}, this);
		}

		node(){
			const node = document.createElement("li");

			node.appendChild(document.createTextNode(this.timestamp.toLocaleString() + ": "));
			node.appendChild(this.textNode());
			if (this.dataURL){
				node.className = "notification collapsible collapsed";
				node.appendChild(document.createElement("br"));
				createCollapser(node);
				const img = document.createElement("img");
				img.src = this.dataURL;
				img.className = "fakedCanvasContent collapsing";
				node.appendChild(img);
			}

			this.node = function(){
				return node;
			};
			return node;
		}

		textNode(){
			const node = document.createElement("span");
			node.className = "text hasHiddenActions";
			this.textNode = function(){
				return node;
			};
			node.textContent = this.functionName;
			node.title = this.url.href;
			node.appendChild(this.actionsNode());
	
			return node;
		}

		actionsNode(){
			const node = document.createElement("div");

			node.className = "actions";
			createActionButtons(node, actions, this);

			if (this.dataURL){
				node.classList.add("imageAvailable");
			}

			this.actionsNode = function(){
				return node;
			};
			return node;
		}

		update(){}
	}
	Notification.addAction = addAction;
	
	if ((typeof module) !== "undefined"){
		module.exports = Notification;
	}
	else {
		require.register("./Notification", Notification);
	}
}());
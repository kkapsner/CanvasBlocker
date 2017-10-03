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

			node.appendChild(document.createTextNode(this.timestamp.toLocaleString() + ": " + this.functionName + " "));
			if (this.dataURL){
				node.className = "notification collapsable collapsed";
				createCollapser(node);
				const img = document.createElement("img");
				img.src = this.dataURL;
				img.className = "collapsing";
				node.appendChild(img);
			}
			node.appendChild(this.actionsNode());

			this.node = function(){
				return node;
			};
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
	window.scope.Notification = Notification;
}());
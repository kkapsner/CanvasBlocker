/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const {createCollapser, createActionButtons} = require("./gui");
	const extension = require("../lib/extension");

	const actions = [];
	const addAction = function addAction(action){
		actions.push(action);
	};
	
	const addToContainer = function(){
		const container = document.getElementById("prints");
		container.querySelector("li").textContent = extension.getTranslation("pleaseWait");
		let first = true;

		return function addToContainer(domainNotification){
			if (first){
				container.innerHTML = "";
				first = false;
			}
			container.appendChild(domainNotification.node());
		};
	}();

	const DomainNotification = function DomainNotification(domain, messageId, count = 0, api = ""){
		if (domain instanceof URL){
			this.urls().add(domain.href);
			domain = domain.hostname;
		}
		this.domain = domain;
		this.messageId = messageId;
		this.count = count;
		this.api = api;
		this.extraNotifications = 0;
		addToContainer(this);
		this.update();
	};
	
	DomainNotification.prototype.urls = function urls(){
		const urls = new Set();
		this.urls = function(){
			return urls;
		};
		return urls;
	};
	
	DomainNotification.prototype.notifications = function notifications(){
		const notifications = [];
		this.notifications = function(){
			return notifications;
		};
		return notifications;
	};

	DomainNotification.prototype.addNotification = function addNotification(notification){
		if (this.notifications().length > 250){
			this.addMore();
		}
		else {
			this.notifications().push(notification);
			this.urls().add(notification.url.href);
			this.notificationsNode().appendChild(notification.node());
		}
		this.update();
	};
	
	DomainNotification.prototype.addMore = function addMore(){
		this.notificationsNode().appendChild(document.createTextNode("..."));
		this.extraNotifications += 1;
		this.addMore = function addMore(){
			this.extraNotifications += 1;
		};
	};

	// DOM node creation functions

	DomainNotification.prototype.node = function node(){
		const node = document.createElement("li");
		node.className = "domainPrints collapsible collapsed";
		node.appendChild(this.textNode());
		node.appendChild(document.createElement("br"));
		createCollapser(node);
		node.appendChild(this.notificationsNode());
		
		this.node = function(){
			return node;
		};
		return node;
	};
	DomainNotification.prototype.update = function update(){
		this.updateTextNode();
		this.node().classList[this.notifications().length? "remove": "add"]("empty");
		this.notifications().forEach(function(notification){
			notification.update();
		});
	};

	DomainNotification.prototype.textNode = function textNode(){
		const node = document.createElement("span");
		node.className = "text";
		this.textNode = function(){
			return node;
		};
		const messageParts = extension.getTranslation(this.messageId).split(/\{url\}/g);
		node.appendChild(document.createTextNode(messageParts.shift()));
		while (messageParts.length){
			const urlSpan = document.createElement("span");
			urlSpan.textContent = this.domain || extension.getTranslation("localFile");
			urlSpan.className = "url hasHiddenActions";
			urlSpan.appendChild(this.actionsNode());
			node.appendChild(urlSpan);
			node.appendChild(document.createTextNode(messageParts.shift()));
		}
		node.appendChild(document.createTextNode(" ("));
		const countSpan = document.createElement("span");
		countSpan.className = "count";
		countSpan.textContent = "0";
		node.appendChild(countSpan);
		node.appendChild(document.createTextNode(") "));

		return node;
	};
	DomainNotification.prototype.updateTextNode = function updateTextNode(){
		const node = this.textNode();
		const notifications = this.notifications();
		const urls = Array.from(this.urls()).join("\n");
		node.querySelectorAll(".url").forEach((urlSpan) => {
			urlSpan.title = urls;
		});
		
		node.title = notifications.map(function(notification){
			return notification.timestamp + ": " + notification.functionName;
		}).join("\n") + (this.extraNotifications? "\n...": "");

		node.querySelectorAll(".count").forEach((countSpan) => {
			if (this.count){
				countSpan.textContent = this.count;
			}
			else {
				countSpan.textContent = notifications.length + this.extraNotifications;
			}
		});
	};

	DomainNotification.prototype.actionsNode = function actionsNode(){
		const node = document.createElement("div");
		node.className = "actions";
		createActionButtons(node, actions, {domain: this.domain, urls: this.urls(), api: this.api});
		this.actionsNode = function(){
			return node;
		};
		return node;
	};

	DomainNotification.prototype.notificationsNode = function notificationsNode(){
		const node = document.createElement("ul");
		node.className = "notifications collapsing";
		this.notificationsNode = function(){
			return node;
		};
		return node;
	};

	const domains = new Map();
	const domainNotification = function(url, messageId, count = 0, api = ""){
		const domain = url.hostname;
		let domainNotification = domains.get(domain + messageId);
		if (!domainNotification){
			domainNotification = new DomainNotification(url, messageId, count, api);
			domains.set(domain + messageId, domainNotification);
		}
		else {
			domainNotification.count += count;
			domainNotification.urls().add(url.href);
			domainNotification.update();
		}
		return domainNotification;
	};
	domainNotification.addAction = addAction;
	if ((typeof module) !== "undefined"){
		module.exports = domainNotification;
	}
	else {
		require.register("./domainNotification", domainNotification);
	}
}());
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
	
	const addToContainer = function(){
		const container = document.getElementById("prints");
		var first = true;

		return function addToContainer(domainNotification){
			if (first){
				container.innerHTML = "";
				first = false;
			}
			container.appendChild(domainNotification.node());
		};
	}();

	const DomainNotification = function DomainNotification(domain, messageId){
		this.domain = domain;
		this.messageId = messageId;
		addToContainer(this);
		this.update();
	};
	
	DomainNotification.prototype.notifications = function notifications(){
		const notifications = [];
		this.notifications = function(){
			return notifications;
		};
		return notifications;
	};

	DomainNotification.prototype.addNotification = function addNotification(notification){
		this.notifications().push(notification);
		this.notificationsNode().appendChild(notification.node());
		this.update();
	};

	// DOM node creation functions

	DomainNotification.prototype.node = function node(){
		const node = document.createElement("li");
		node.className = "domainPrints collapsable collapsed";
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
		var messageParts = browser.i18n.getMessage(this.messageId).split(/\{url\}/g);
		node.appendChild(document.createTextNode(messageParts.shift()));
		while (messageParts.length){
			var urlSpan = document.createElement("span");
			urlSpan.textContent = this.domain;
			urlSpan.className = "url hasHiddenActions";
			urlSpan.appendChild(this.actionsNode());
			node.appendChild(urlSpan);
			node.appendChild(document.createTextNode(messageParts.shift()));
		}
		node.appendChild(document.createTextNode(" ("));
		var countSpan = document.createElement("span");
		countSpan.className = "count";
		countSpan.textContent = "0";
		node.appendChild(countSpan);
		node.appendChild(document.createTextNode(") "));

		return node;
	};
	DomainNotification.prototype.updateTextNode = function updateTextNode(){
		const node = this.textNode();
		const notifications = this.notifications();
		const urls = notifications.map(function(not){
			return not.url;
		}).filter(function(url, i, urls){
			return urls.indexOf(url) === i;
		}).join("\n");
		node.querySelectorAll(".url").forEach(function(urlSpan){
			urlSpan.title = urls;
		});
		
		node.title = notifications.map(function(notification){
			return notification.timestamp + ": " + notification.functionName;
		}).join("\n");

		node.querySelectorAll(".count").forEach(function(countSpan){
			countSpan.textContent = notifications.length;
		});
	};

	DomainNotification.prototype.actionsNode = function actionsNode(){
		const node = document.createElement("div");
		node.className = "actions";
		createActionButtons(node, actions, this.domain);
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
	const domainNotification = function(domain, messageId){
		var domainNotification = domains.get(domain + messageId);
		if (!domainNotification){
			domainNotification = new DomainNotification(domain, messageId);
			domains.set(domain + messageId, domainNotification);
		}
		return domainNotification;
	};
	domainNotification.addAction = addAction;
	window.scope.domainNotification = domainNotification;
}());
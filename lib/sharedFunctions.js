function getDomainRegExpList(domainList){
	var list = domainList
		.split(",")
		.map(function(entry){
			return entry.replace(/^\s+|\s+$/g, "");
		})
		.filter(function(entry){
			return !!entry.length;
		})
		.map(function(entry){
			var regExp;
			var domain = !!entry.match(/^[\w.]+$/);
			if (domain){
				regExp = new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i");
			}
			else {
				regExp = new RegExp(entry, "i");
			}
			return {
				match: function(url){
					if (domain){
						return url.hostname.match(regExp);
					}
					else {
						return url.href.match(regExp);
					}
				}
			};
		});
		
		list.match = function(url){
			return this.some(function(entry){
				return entry.match(url);
			});
		};
		
		return list;
}

function checkURL(url, blockMode, whiteList, blackList){
	var mode = "block";
	switch (blockMode){
		case "blockEverything":
			mode = "block";
			break;
		case "allowOnlyWhiteList":
			if (url && whiteList.match(url)){
				mode = "unblock";
			}
			else {
				mode = "block";
			}
			break;
		case "ask":
		case "blockReadout":
		case "fakeReadout":
		case "askReadout":
			if (url && whiteList.match(url)){
				mode = "unblock";
			}
			else if (url && blackList.match(url)){
				mode = "block";
			}
			else {
				mode = blockMode;
			}
			break;
		case "blockOnlyBlackList":
			if (url && blackList.match(url)){
				mode = "block";
			}
			else {
				mode = "unblock";
			}
			break;
		case "allowEverything":
			mode = "unblock";
			break;
		default:
			console.log("Unknown blocking mode (" + blockMode + "). Default to block everything.");
	}
	return mode;
}

try {
	exports.getDomainRegExpList = getDomainRegExpList;
	exports.checkURL = checkURL;
}
catch(e){}
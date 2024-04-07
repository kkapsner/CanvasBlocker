const child_process = require("child_process");
const path = require("path");
const yargs = require("yargs");
const args = yargs
	.options("type", {
		alias: "t",
		describe: "Type of the build",
		choices: ["alpha", "rc", "release"],
		default: "alpha",
	})
	.help()
	.alias("help", "h")
	.argv;

const fs = require("fs");

const versionsPath = path.join(__dirname, "..", "versions");

function getXPIFileName(id, version){
	"use strict";
	return `${id}-${version}.xpi`;
}

async function addAlphaVersionToUpdatesJSON(version){
	"use strict";
	const updatesPath = path.join(versionsPath, "updates.json");
	const data = JSON.parse(await fs.promises.readFile(updatesPath));
	const versions = data.addons["CanvasBlocker-Beta@kkapsner.de"].updates;
	if (versions.some(function(entry){
		return entry.version === version;
	})){
		return;
	}
	versions.push({
		version,
		update_link: `https://canvasblocker.kkapsner.de/versions/${getXPIFileName("canvasblocker_beta", version)}`
	});
	await fs.promises.writeFile(updatesPath, JSON.stringify(data, undefined, "\t"));
}

async function getAlphaVersion(manifest){
	"use strict";
	function f(n){
		if (n < 10) return "0" + n.toString(10);
		return n.toString(10);
	}
	const now = new Date();
	const date = `${now.getFullYear()}${f(now.getMonth() + 1)}${f(now.getDate())}`;
	const versionParts = manifest.version.split(".");
	while (versionParts.length > 2){
		versionParts.pop();
	}
	const baseVersion = `${versionParts.join(".")}.${date}`;
	if (!fs.existsSync(path.join(versionsPath, getXPIFileName("canvasblocker_beta", baseVersion)))){
		return baseVersion;
	}
	
	let dayTry = 1;
	while (fs.existsSync(path.join(versionsPath, getXPIFileName("canvasblocker_beta", `${baseVersion}.${dayTry}`)))){
		dayTry += 1;
	}
	
	return `${baseVersion}.${dayTry}`;
}
function getRCVersion(manifest){
	"use strict";
	throw "not implemented";
}
function getReleaseVersion(manifest){
	"use strict";
	return manifest.version.replace(/^([\d.]+).*$/, "$1");
}

async function run(){
	"use strict";
	const manifestPath = path.join(__dirname, "../manifest.json");
	
	const oldManifest = await fs.promises.readFile(manifestPath);
	const manifest = require(manifestPath);
	if (args.type === "alpha" || args.type === "rc"){
		manifest.name = "CanvasBlocker-Beta";
		["gecko", "gecko_android"].forEach(function(browserType){
			if (!manifest.browser_specific_settings[browserType]) return;
			manifest.browser_specific_settings[browserType].id = "CanvasBlocker-Beta@kkapsner.de";
		});
	}
	else {
		manifest.name = "CanvasBlocker";
		["gecko", "gecko_android"].forEach(function(browserType){
			if (!manifest.browser_specific_settings[browserType]) return;
			manifest.browser_specific_settings[browserType].id = "CanvasBlocker@kkapsner.de";
			delete manifest.browser_specific_settings[browserType].update_url;
		});
	}
	if (args.type === "alpha"){
		manifest.version = await getAlphaVersion(manifest);
		addAlphaVersionToUpdatesJSON(manifest.version);
	}
	else if (args.type === "rc"){
		manifest.version = getRCVersion(manifest);
	}
	else {
		manifest.version = getReleaseVersion(manifest);
	}
	
	await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, "\t"));
	
	const childArgs = [
		"build",
		"--overwrite-dest",
		"--ignore-files",
		"test",
		"--ignore-files",
		"versions",
		"--ignore-files",
		"crowdin.yml",
		"--ignore-files",
		"package*"
	];
	const child = child_process.spawn("web-ext", childArgs, {stdio: "inherit"});
	child.on("close", function(){
		fs.promises.writeFile(manifestPath, oldManifest);
	});
}
run();
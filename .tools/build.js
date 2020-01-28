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

function getAlphaVersion(manifest){
	"use strict";
	const now = new Date();
	const date = now.toISOString().substr(0, 10).replace(/-/g, "");
	return manifest.version.replace(/^([\d.]+).*$/, "$1Alpha" + date);
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
		manifest.applications.gecko.id = "CanvasBlocker-Beta@kkapsner.de";
	}
	else {
		manifest.name = "CanvasBlocker";
		manifest.applications.gecko.id = "CanvasBlocker@kkapsner.de";
		delete manifest.applications.gecko.update_url;
	}
	if (args.type === "alpha"){
		manifest.version = getAlphaVersion(manifest);
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
		"package*"
	];
	const child = child_process.spawn("web-ext", childArgs, {stdio: "inherit"});
	child.on("close", function(){
		fs.promises.writeFile(manifestPath, oldManifest);
	});
}
run();
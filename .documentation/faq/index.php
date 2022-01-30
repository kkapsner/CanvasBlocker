<!DOCTYPE html>
<html>
	<head>
		<title>
			CanvasBlocker FAQs
		</title>
		<link rel="stylesheet" href="../default.css" type="text/css">
	</head>
	<body>
		<header><h1>CanvasBlocker FAQs</h1></header>
		<?php
		include_once("../../kamiKatze/autoload.php");
		$parser = new MarkdownParser();
		foreach (new DirectoryIterator("./") as $file){
			if (!$file->isDot() && !$file->isDir() && $file->getExtension() === "md"){
				$markdown = $parser->parse(file_get_contents($file->getPathname()));
				echo preg_replace("/<h2/", "<h2 id=\"" . str_replace(".md", "", $file->getFilename()) . "\"", $markdown->view("html"), 1);
			}
		}
		?>
	</body>
</html>
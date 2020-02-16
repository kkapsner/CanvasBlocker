<!DOCTYPE html>
<html>
	<head>
		<title>
			CanvasBlocker FAQs
		</title>
	</head>
	<body>
		<header><h1>CanvasBlocker FAQs</h1></header>
		<?php
		include_once("../../kamiKatze/autoload.php");
		$parser = new MarkdownParser();
		foreach (new DirectoryIterator("./") as $file){
			if (!$file->isDot() && !$file->isDir() && $file->getExtension() === "md"){
				$markdown = $parser->parse(file_get_contents($file->getPathname()));
				echo $markdown->view("html");
			}
		}
		?>
	</body>
</html>
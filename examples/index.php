<!DOCTYPE HTML>
<html>
<head>
    <title>Amm Examples Index</title>
</head>
<body>
    <h1>Amm Examples Index</h1>
<?php foreach (glob(__DIR__.'/*.php') as $f) { ?>
<?php   if (!is_numeric(($file = basename($f))[0])) continue; ?>
        <p><a href="<?php echo $file; ?>">
<?php           $title = $file; $prefix = ""; ob_start(); require($file); ob_end_clean(); echo $prefix.$title; ?>
            </a>
        </p>
<?php   } ?>    
</body>
</html>
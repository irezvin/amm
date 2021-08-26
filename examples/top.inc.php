<?php
    if (!isset($file)) {
        $data = parse_url($_SERVER['REQUEST_URI']);
        $file = basename($data['path']);
    }
    if (preg_match('/^[0-9]+/', $file, $matches)) {
        $prefix = (int) $matches[0].'. ';
    } else {
        $prefix = '';
    }
?>
<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title><?php echo $prefix.$title; ?> &mdash; A.M.M. Examples</title>
        <meta name="viewport" content="width=device-width">
        <meta charset='utf-8' />
<?php   if (!(isset($skipExampleCss) && $skipExampleCss)) { ?>
            <link rel="stylesheet" type="text/css" href="example.css" /> 
<?php   } ?>
        <script src="../vendor/jquery.js"></script>
        <script src="../vendor/relaxed-json.js"></script>
<?php 
        require_once(__DIR__.'/../build/amm-utils.php'); 
        $builder = new \Amm\Builder;
        $builder->distDir = __DIR__.'/../dist';
        $loader = new \Amm\Loader($builder);
        $loader->jsUrl = '../js/classes';
        $loader->distUrl = '../dist';
        $loader->showScripts();

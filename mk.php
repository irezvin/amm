#!/usr/bin/php
<?php

function mkJsProps(array $props = array(), $withSignal = false) {
    foreach ($props as $i => $prop) {
        $props[$i][0] = strtolower($props[$i][0]);
    }
?>
<?php foreach ($props as $i => $prop) { $p = '_'.$prop; $u = ucfirst($prop); ?>

    <?php echo $p; ?>: null,
<?php } ?>
<?php foreach ($props as $prop) { $p = '_'.$prop; $u = ucfirst($prop); ?>

    set<?php echo $u; ?>: function(<?php echo $prop; ?>) {
        var old<?php echo $u; ?> = this.<?php echo $p; ?>;
        if (old<?php echo $u; ?> === <?php echo $prop; ?>) return;
        this.<?php echo $p; ?> = <?php echo $prop; ?>;
<?php   if ($withSignal) { ?>
        this.out<?php echo $u; ?>Change(<?php echo $prop; ?>, old<?php echo $u; ?>);
<?php   } ?>
        return true;
    },

    get<?php echo $u; ?>: function() { return this.<?php echo $p; ?>; },
<?php   if ($withSignal) { ?>

    out<?php echo $u; ?>Change: function(<?php echo $prop; ?>, old<?php echo $u; ?>) {
        this._out('<?php echo $prop; ?>Change', <?php echo $prop; ?>, old<?php echo $u; ?>);
    },
<?php   } ?>
<?php } ?>

<?php
}

function mkJsClass($class, $baseClass, array $props = array(), $save = false) {

    ob_start();

?>
/* global Amm */

<?php echo $class; ?> = function(options) {
    <?php echo $baseClass; ?>.call(this, options);
};

<?php echo $class; ?>.prototype = {

    '<?php echo $class; ?>': '__CLASS__', 
<?php mkJsProps($props); ?>
};

Amm.extend(<?php echo $class; ?>, <?php echo $baseClass; ?>);

<?php

    $res = ob_get_clean();
    if ($save) {
        if ($save === true) $dir = dirname(__FILE__).'/js/classes';
        else $dir = $save;
        if (!is_dir($dir)) throw new Exception ("Dir '{$dir}' not found");
        $file = $dir.'/'.str_replace('.', '/', $class).'.js';
        $fileDir = dirname($file);
        if (!is_dir($fileDir)) mkdir($fileDir, 0755, true);
        else if (is_file($file)) throw new Exception ("File '{$file}' already exists");
        file_put_contents($file, $res);
    }
    return $res;

}

if (!count(debug_backtrace())) {
    $vv = array_slice($_SERVER['argv'], 1);
    
    if (in_array('-p', $vv)) {
        $vv = array_diff($vv, array('-p'));
    
        if (in_array('-c', $vv)) {
            $sig = true;
            $vv = array_diff($vv, array('-c'));
        } else {
            $sig = false;
        }
        mkJsProps($vv, $sig);
        die();
    }
    
    if (count($vv) < 2) {
        die("Usage: ".basename($_SERVER['argv'][0])." Class.Name base.Class.Name [prop1, prop2...]\n");
    }
    $dir = explode('/js/classes/', getcwd());
    if (count($dir) > 1 && strpos($vv[0], '.') === false) {
        $vv[0] = str_replace('/', '.', $dir[1]).'.'.$vv[0];
    }
    $props = array_slice($vv, 2);
    
    mkJsClass($vv[0], $vv[1], $props, true);
}

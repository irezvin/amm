#!/bin/php
<?php

if (isset($_SERVER['argv'][1])) {
    $dir = $_SERVER['argv'][1];
} else {
    $dir = null;
}

require(dirname(__FILE__).'/list.php');
$r = listAmmFiles($dir, null, false);

if (strlen($dir)) {
    foreach ($r as $i => $item)
        $r[$i] = rtrim($dir, '/').'/'.$item;
}

echo implode("\n", $r);
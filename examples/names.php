<?php

if (PHP_SAPI === 'cli') {
    parse_str(implode("&", array_slice($_SERVER['argv'], 1)), $_REQUEST);
}
$n = explode("\n", file_get_contents(__DIR__.'/names.txt'));
header('content-type: text/json');
//sleep(1);
if (isset($_REQUEST['limit'])) $limit = (int) $_REQUEST['limit'];
else $limit = 25;
if (isset($_REQUEST['offset'])) $offset = (int) $_REQUEST['offset'];
else $offset = 0;
if (isset($_REQUEST['q'])) $q = $_REQUEST['q'];
else $q = '';
if (strlen($q)) $names = preg_grep('/'.preg_quote($q).'/ui', $n);
else $names = $n;
if (!$limit) $limit = count($names);
if (isset($_REQUEST['v'])) $v = $_REQUEST['v'];
else $v = array();
if (!is_array($v)) $v = strlen($v)? array($v) : array();
$names = array_slice($names, $offset, $limit);
if ($v) {
    $names = array_diff($names, $v);
    array_splice($names, 0, 0, $v); // prepend with selected values
}
echo json_encode($names);
<?php

header('content-type: text/json');
ini_set('html_errors', 0);

$start = microtime(true);
$items = array();
$allFields = array();

$pretty = (isset($_REQUEST['pretty']) && $_REQUEST['pretty']);
$jsonFlags = $pretty? JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES : 0;

foreach (explode("\n", gzdecode(file_get_contents('data.json.gz'))) as $item) {
    $item = json_decode($item, true);
    if (!is_array($item)) continue;
    $items[] = $item;
    $allFields = array_unique(array_merge($allFields, array_keys($item)));
}
if (isset($_REQUEST['listFields']) && $_REQUEST['listFields']) {
    // return list of fields
    echo json_encode($allFields, $jsonFlags);
    die();
}
if (isset($_REQUEST['limit'])) $limit = (int) $_REQUEST['limit'];
    else $limit = 25;
if (isset($_REQUEST['offset'])) $offset = (int) $_REQUEST['offset'];
    else $offset = 0;
if ($limit === -1) $limit = count($items);
if (isset($_REQUEST['f']) && is_array($_REQUEST['f'])) {
    $filter = $_REQUEST['f'];
} else {
    $filter = array();
}
if (isset($_REQUEST['c']) && $_REQUEST['c']) {
    $columns = $_REQUEST['c'];
    if (!is_array($columns)) $columns = array($columns);
        else $columns = array_unique($columns);
} else {
    $columns = array();
}
if (isset($_REQUEST['h']) && $_REQUEST['h']) {
    $hideColumns = $_REQUEST['h'];
    if (!is_array($hideColumns)) $hideColumns = array($hideColumns);
        else $hideColumns = array_unique($hideColumns);
} else {
    $hideColumns = array();
}
$sort = false;
$desc = false;
if (isset($_REQUEST['sort']) && $_REQUEST['sort']) {
    $sort = trim($_REQUEST['sort']);
}
if (isset($_REQUEST['desc'])) {
    $desc = (bool) $_REQUEST['desc'];
}
if ($sort) { 
    usort($items, function($a, $b) use ($sort) {
        $aVal = isset($a[$sort])? $a[$sort] : '';
        $bVal = isset($b[$sort])? $b[$sort] : '';
        if (is_numeric($aVal) && is_numeric($bVal)) return $aVal <=> $bVal;
        elseif (is_string($aVal) && is_string($bVal)) return strnatcmp ($aVal, $bVal);
        else return 0;
    });
}
if ($desc) $items = array_reverse($items);

$res = array();
$pat = array();
foreach ($filter as $field => $val) {
    if (!is_array($val)) {
        if (!strlen($val)) {
            unset($filter[$field]);
            continue;
        }
        $val = array($val);
    }
    $filter[$field] = $val;
    $val = array_diff($val, array(''));
    $pat[$field] = '/'.str_replace('%', '.+', implode('|', array_map('preg_quote', $val))).'/i';
}
if ($filter) {
    foreach ($items as $item) {
        $pass = false;
        $vals = array_intersect_key($item, $filter);
        if (count($vals) < count($filter)) continue; // some keys not present - item doesn't pass
        foreach ($vals as $field => $vals) {
            if (!is_array($vals)) $vals = array($vals);
            $pass = array_intersect($vals, $filter[$field]) || isset($pat[$field]) && preg_grep($pat[$field], $vals);
            if (!$pass) continue 2;
        }
        $res[] = $item;
    }
} else {
    $res = $items;
}
if ($columns || $hideColumns) {
    if (!$columns) $columns = $allFields;
    if ($hideColumns) $columns = array_diff($columns, $hideColumns);
    foreach ($res as $i => $tmp) {
        $item = array();
        foreach ($columns as $col) {
            if (array_key_exists($col, $tmp)) $item[$col] = $tmp[$col];
        }
        $res[$i] = $item;
    }
}

$slice = array_slice($res, $offset, $limit);
$result = array(
    'total' => count($res),
    'offset' => $offset,
    'limit' => $limit,
    'items' => $slice,
);

if (isset($_REQUEST['fieldValues']) && $_REQUEST['fieldValues']) {
    $fieldValues = array();
    foreach ($res as $item) {
        foreach ($item as $col => $val) {
            if (!is_scalar($val)) continue;
            $val = ''.$val;
            if (!isset($fieldValues[$col][$val])) $fieldValues[$col][$val] = 1;
            else $fieldValues[$col][$val]++;
        }
    }
    foreach ($fieldValues as $field => $values) {
        $result['values'][$field] = array_keys($values);
        $result['frequency'][$field] = $values;
    }
}

echo json_encode($result, $jsonFlags);


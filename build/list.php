<?php

function listTests($dir = null) {
    if (is_null($dir)) $dir = __DIR__.'/../js/tests';
    $directory = new RecursiveDirectoryIterator($dir);
    $iterator = new RecursiveIteratorIterator($directory);
    $regex = new RegexIterator($iterator, '/^.+\.js$/i', RecursiveRegexIterator::GET_MATCH);
    // class name => file name
    foreach ($regex as $v) {
        $f = $v[0];
        $jsName = str_replace(DIRECTORY_SEPARATOR, '.', substr($f, strlen($dir) + 1));
        $res[] = $jsName;
    }
    sort($res);
    return $res;
}

function listAmmFiles($dir = null, $cacheFile = null, $minify = null, $prefix = 'Amm', $buildDir = null) {
    if (is_null($dir)) $dir = __DIR__.'/../js/classes';
    if (is_null($buildDir)) $buildDir = __DIR__;
    $directory = new RecursiveDirectoryIterator($dir);
    $iterator = new RecursiveIteratorIterator($directory);
    $regex = new RegexIterator($iterator, '/^.+\.js$/i', RecursiveRegexIterator::GET_MATCH);
    // class name => file name
    $files = array();
    foreach ($regex as $v) {
        $f = $v[0];
        $relativePath = substr($f, strlen($dir));
        $relativePath = substr($relativePath, 0, -3);
        $relativePath = ltrim($relativePath, DIRECTORY_SEPARATOR);
        $jsName = str_replace(DIRECTORY_SEPARATOR, '.', $relativePath);
        $files[$jsName] = $f;
    }
    $res = false;
    if ($cacheFile !== false) {
        $ts = max(array_map('filemtime', array_merge($files, array(__FILE__))));
        if ($cacheFile === null) $cacheFile = $buildDir.'/.cache';
        if (is_file($cacheFile) && filemtime($cacheFile) > $ts) {
            $res = preg_split("/[\n\r]+/", file_get_contents($cacheFile));
        }
    }
    if ($res === false) {
        $res = array();
        foreach ($files as $f) {
            foreach (array_merge(getDeps($f, $files, array(), $prefix), array($f)) as $dep) {
                if (!in_array($dep, $res)) $res[] = $dep;
            }
        }
        foreach ($res as $i => $f) $res[$i] = ltrim(substr($res[$i], strlen($dir)), DIRECTORY_SEPARATOR);
        if (strlen($cacheFile)) file_put_contents($cacheFile, implode("\n", $res));
    }
    if ($minify || $minify === null && !(isset($_REQUEST['no_minify']) && $_REQUEST['no_minify'])) {
        $srcPaths = array();
        foreach ($res as $item) $srcPaths[] = $dir.$item;
        $minFile = strtolower($prefix).'.min.js';
        $filename = $buildDir.'/'.$minFile;
        if (!isset($ts)) $ts = max(array_map('filemtime', $files));
        if (!is_file($filename) || filemtime($filename) < $ts) {
            $cmd = 'uglifyjs --mangle --source-map --output '.escapeshellarg($filename).' '.implode(' ', array_map('escapeshellarg', $srcPaths));
            exec($cmd, $output, $return);
            echo "<!--\n".$cmd."\n-->";
            if ($return) throw new Exception("Cannot run uglifyjs: ".implode("\n", $output)."\n; command was:\n".$cmd);
        }
        return array('../../build/'.$minFile.'?t='.$ts);
    }
    return $res;
}

function getDeps($file, $allFiles, $stack = array(), $prefix = 'Amm') {
    static $cache = array();
    if (isset($cache[$file])) {
        $deps = $cache[$file];
    } else {
        if (in_array($file, $stack)) throw new Exception("Circular reference found: ".implode(" -> ", $stack));
        array_push($stack, $file);
        $cnt = file_get_contents($file);
        $deps = array();
        $qPrefix = preg_quote($prefix);
        preg_match_all($rx = '/\b('.$qPrefix.'(\.[A-Z]\w+)*)(\.[A-Z]\w+)\.prototype\b/u', $cnt, $matches);
        if ($matches[1]) $deps = array_merge($deps, $matches[1]);
        $matches = array();
        preg_match_all('/\bAmm\.extend\s*\(\s*[\w.]+\s*,\s*([\w.]+)/u', $cnt, $matches);
        if ($matches[1]) {
            $realDeps = preg_grep('/^'.$qPrefix.'(\.|$)/', $matches[1]);
            $deps = array_merge($deps, $realDeps);
        }
        $deps = array_unique($deps);
        if ($d = array_diff($deps, array_keys($allFiles))) {
            throw new Exception("Unknown class(es): ".implode(", ", $d)." in ".$file);
        }
        $cache[$file] = $deps;
    }
    $res = array();
    foreach ($deps as $dep) {
        $file = $allFiles[$dep];
        foreach (array_merge(getDeps($file, $allFiles, $stack, $prefix), array($file)) as $f) {
            if (!in_array($f, $res)) $res[] = $f;
        }
    }
    return $res;
}



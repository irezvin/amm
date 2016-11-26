<?php

function listTests($dir = null) {
    if (is_null($dir)) $dir = dirname(__FILE__).'/../js/tests';
    $directory = new RecursiveDirectoryIterator($dir);
    $iterator = new RecursiveIteratorIterator($directory);
    $regex = new RegexIterator($iterator, '/^.+\.js$/i', RecursiveRegexIterator::GET_MATCH);
    // class name => file name
    $files = array();
    foreach ($regex as $v) {
        $f = $v[0];
        $jsName = str_replace(DIRECTORY_SEPARATOR, '.', substr($f, strlen($dir) + 1));
        $res[] = $jsName;
    }
    return $res;
}

function listAmmFiles($dir = null, $cacheFile = null) {
    if (is_null($dir)) $dir = dirname(__FILE__).'/../js/classes';
    $directory = new RecursiveDirectoryIterator($dir);
    $iterator = new RecursiveIteratorIterator($directory);
    $regex = new RegexIterator($iterator, '/^.+\.js$/i', RecursiveRegexIterator::GET_MATCH);
    // class name => file name
    $files = array();
    foreach ($regex as $v) {
        $f = $v[0];
        $jsName = str_replace(DIRECTORY_SEPARATOR, '.', substr($f, strlen($dir) + 1, -strlen('.js')));
        $files[$jsName] = $f;
    }
    $res = false;
    if ($cacheFile === false) $cached = false;
    else {
        $ts = max(array_map('filemtime', $files));
        if ($cacheFile === null) $cacheFile = dirname(__FILE__).'/.cache';
        if (is_file($cacheFile) && filemtime($cacheFile) > $ts) {
            $res = preg_split("/[\n\r]+/", file_get_contents($cacheFile));
        }
    }
    if ($res === false) {
        $res = array();
        foreach ($files as $f) {
            foreach (array_merge(getDeps($f, $files), array($f)) as $dep) {
                if (!in_array($dep, $res)) $res[] = $dep;
            }
        }
        foreach ($res as $i => $f) $res[$i] = substr($res[$i], strlen($dir) + 1);
        if (strlen($cacheFile)) file_put_contents($cacheFile, implode("\n", $res));
    }
    return $res;
}

function getDeps($file, $allFiles, $stack = array()) {
        static $cache = array();
        if (isset($cache[$file])) {
            $deps = $cache[$file];
        } else {
            if (in_array($file, $stack)) throw new Exception("Ciruclar reference found: ".implode(" -> ", $stack));
            array_push($stack, $file);
            $cnt = file_get_contents($file);
            $deps = array();
            preg_match_all('/\b(Amm(\.[A-Z]\w+)*)(\.[A-Z]\w+)\.prototype\b/u', $cnt, $matches);
            $deps = array_merge($deps, $matches[1]);
            preg_match_all('/\bAmm\.extend\s*\(\s*[\w.]+\s*,\s*([\w.]+)/u', $cnt, $matches);
            $deps = array_merge($deps, $matches[1]);
            $deps = array_unique($deps);
            if ($d = array_diff($deps, array_keys($allFiles))) {
                throw new Exception("Unknown class(es): ".implode(", ", $d)." in ".$file);
            }
            $cache[$file] = $deps;
        }
        $res = array();
        foreach ($deps as $dep) {
            $file = $allFiles[$dep];
            foreach (array_merge(getDeps($file, $allFiles, $stack), array($file)) as $f) {
                if (!in_array($f, $res)) $res[] = $f;
            }
        }
        return $res;   
}



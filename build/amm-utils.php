<?php

namespace Amm;
use Exception, RecursiveIteratorIterator, RecursiveDirectoryIterator, RegexIterator,
 RecursiveRegexIterator;

/**
 * Checks source files in js/classes.
 * 
 */
class Builder {
    
    // location of dist/ directory
    var $distDir = "../dist"; 
    
    // location of javascript dir relative to dist/ directory
    var $jsDir = "../js/classes"; 

    var $namespace = 'Amm';
    
    // default to strtolower($this->namespace)
    var $targetFilePrefix = null;
    
    // whether to check files for changes
    var $autoScan = true;
    
    // generate map file with single and/or min file
    var $genMap = true;
    
    // generate single file
    var $genSingle = false;
        
    // generate minified file
    var $genMin = false;
    
    // cache list of files
    var $useCache = true;
    
    // cache file lifetime in seconds, if null then cache will last forever
    var $cacheLifetime = null;
   
    // path to cache file relative to distDir
    var $cacheFilePath = '../build/.cache';
    
    // rebuild only if target file is older than source
    var $smartRebuild = true;
    
    protected $depCache = [];
    
    // stack to protect against circular dependencies
    protected $stack = [];
    
    protected $classFiles = null;
    
    protected $lastTs = null;
    
    static function concatPaths($path1, $path2) {
        $res = rtrim($path1, '/');
        for ($i = 1; $i < func_num_args(); $i++)
            $res .= '/'.ltrim(func_get_arg($i), '/');
        return $res;
    }
    
    function getLastTs() {
        if (is_null($this->lastTs)) $this->listClassFiles();
        return $this->lastTs;
    }
    
    function getJsDir() {
        return self::concatPaths($this->distDir, $this->jsDir);
    }
    
    function getTargetFilePrefix() {
        if ($this->targetFilePrefix) return $this->targetFilePrefix;
        return strtolower($this->namespace);
    }
    
    function getTargetFile() {
        $res = self::concatPaths($this->distDir, $this->getTargetFilePrefix());
        if ($this->genMin) $res .= '.min';
        $res .= '.js';
        return $res;
    }
    
    function build($target = null, $returnCmdOnly = false) {
        if (is_null($target)) $target = $this->getTargetFile();
        if ($this->smartRebuild && !$returnCmdOnly 
            && is_file($target) && filemtime($target) >= $this->getLastTs()) {
            
            return $target;
        }
        $cmd = 'uglifyjs';
        if ($this->genMin) $cmd .= ' --compress --mangle';
        if ($this->genMap) $cmd .= ' --source-map';
        $cmd .= ' --output '.escapeshellarg($target);
        $files = $this->listClassFiles();
        foreach ($files as $f) $cmd .= ' '.escapeshellarg(self::concatPaths($this->jsDir, $f));
        if ($returnCmdOnly) return $cmd;
        if (!is_dir($this->distDir)) {
            throw new Exception("\$distDir '{$this->distDir}' does not exist");
        }
        chdir($this->distDir);
        exec($cmd.' 2>&1', $output, $return);
        if ($return) {
            throw new Exception("uglifyjs returned non-zero exit code ({$return}), command was '{$cmd}'", $return);
        }
        file_put_contents($target, "\n//# sourceMappingURL=".(basename($target).".map"), FILE_APPEND);
        return $target;
    }
    
    /**
     * @return array of class files sorted with respect to dependencies
     * 
     * if ($this->autoScan === FALSE && $this->useCache === TRUE), cache content is returned immediately
     * if ($this->autoScan === TRUE && $this->useCache === TRUE), files will be checked and 
     */
    function listClassFiles($again = false) {
        if (!is_null($this->classFiles) && !$again) return $this->classFiles;
        if ($this->autoScan === false && ($cacheData = $this->getCacheData())) {
            $this->classFiles = $cacheData;
            $this->lastTs = filemtime($this->getCacheFilePath());
            return $this->classFiles;
        }
        $dir = $this->getJsDir();
        if (!is_dir($dir)) throw new Excepition("JS sources directory '{$dir}' does not exist");
        $directory = new RecursiveDirectoryIterator($dir);
        $iterator = new RecursiveIteratorIterator($directory);
        $regex = new RegexIterator($iterator, '/^.+\.js$/i', RecursiveRegexIterator::GET_MATCH);
        
        // class name => file name
        $files = [];
        foreach ($regex as $v) {
            $f = $v[0];
            $relativePath = substr($f, strlen($dir));
            $relativePath = substr($relativePath, 0, -3);
            $relativePath = ltrim($relativePath, DIRECTORY_SEPARATOR);
            $jsName = str_replace(DIRECTORY_SEPARATOR, '.', $relativePath);
            $files[$jsName] = $f;
        }
        
        $cacheFile = $this->getCacheFilePath(true);
        
        if ($cacheFile) {
            $cachedList = explode(PHP_EOL, file_get_contents($cacheFile));
            $ts = max(array_map('filemtime', array_merge($files, [__FILE__])));
            $this->lastTs = $ts;
            if (filemtime($cacheFile) > $ts && count($cachedList) == count($files)) {
                $this->classFiles = $cachedList;
                return $this->classFiles;
            }
        }
        
        $this->stack = [];
        $res = [];
        foreach ($files as $f) {
            $dependencies = $this->calcDependencies($f, $files);
            foreach (array_merge($dependencies, [$f]) as $dep) {
                if (!in_array($dep, $res)) $res[] = $dep;
            }
        }
        foreach ($res as $i => $f) $res[$i] = ltrim(substr($res[$i], strlen($dir)), DIRECTORY_SEPARATOR);
        
        $this->putCacheData($res);

        $this->classFiles = $res;
        return $res;
    }
    
    /**
     * @return array
     */
    function getCacheData() {
        if ($f = $this->getCacheFilePath(true)) return explode(PHP_EOL, file_get_contents($f));
    }
    
    function putCacheData(array $data) {
        if ($f = $this->getCacheFilePath()) {
            file_put_contents($f, implode(PHP_EOL, $data));
        }
    }
    
    /**
     * Returns path to cache file
     * @param boolean $checkActual Return null if cache file doesn't exist, is old, or if cache is disabled
     * @return string|null
     */
    function getCacheFilePath($checkActual = false) {
        if (!$this->useCache) return null;
        if (substr($this->cacheFilePath, 0, 1) === '/') {
            $filePath = $this->cacheFilePath;
        } else {
            $filePath = self::concatPaths($this->distDir, $this->cacheFilePath);
        }
        if (!$checkActual) return $filePath;
        if (!is_file($filePath)) return null;
        if ($this->cacheLifetime > 0) {
            if (filemtime($filePath) < (time() - $this->cacheLifetime)) return null;
        }
        return $filePath;
    }
    
    protected function getDirectDependencies($classFile, array $allFiles) {
        if (isset($this->depCache[$classFile])) return $this->depCache[$classFile];
        $cnt = file_get_contents($classFile);
        $deps = [];
        $qPrefix = preg_quote($this->namespace);
        preg_match_all($rx = '/\b('.$qPrefix.'(\.[A-Z]\w+)*)(\.[A-Z]\w+)\.prototype\b/u', $cnt, $matches);
        if ($matches[1]) $deps = array_merge($deps, $matches[1]);
        $matches = [];
        
        // we look for "Amm.extends" to detect inheritance
        preg_match_all('/\bAmm\.extend\s*\(\s*[\w.]+\s*,\s*([\w.]+)/u', $cnt, $matches);
        if ($matches[1]) {
            $realDeps = preg_grep('/^'.$qPrefix.'(\.|$)/', $matches[1]);
            $deps = array_merge($deps, $realDeps);
        }
        $deps = array_unique($deps);
        if ($d = array_diff($deps, array_keys($allFiles))) {
            throw new Exception("Unknown class(es): ".implode(", ", $d)." in ".$classFile);
        }
        $this->depCache[$classFile] = $deps;
        return $deps;
    }
    
    protected function calcDependencies($classFile, array $allFiles) {
        if (in_array($classFile, $this->stack)) {
            throw new Exception("Circular reference found: ".implode(" -> ", array_merge($this->stack, [$classFile])));
        }
        array_push($this->stack, $classFile);
        $deps = $this->getDirectDependencies($classFile, $allFiles);
        $res = [];
        foreach ($deps as $dep) {
            $classFile = $allFiles[$dep];
            foreach (array_merge($this->calcDependencies($classFile, $allFiles), [$classFile]) as $f) {
                if (!in_array($f, $res)) $res[] = $f;
            }
        }
        array_pop($this->stack);
        return $res;
    }
    
}

class Loader {
    
    // whether to add single-file script by default
    var $loadSingle = false;
    
    // whether to add minified single-file script by default
    var $loadMin = false;
    
    // request parameter to override default "loadSingle"
    var $singleRequestParam = '_single';
    
    var $minRequestParam = '_min';
    
    var $urlPathPrefix = '';
    
    // default to builder settings
    var $jsUrl = null;
    
    // default to builder settings
    var $distUrl = null;
    
    /**
     * @var Builder
     */
    protected $builder = null;
    
    function __construct(Builder $builder) {
        $this->builder = $builder;
        $this->jsUrl = $builder->jsDir;
        $this->distUrl = $builder->distDir;
    }
    
    /**
     * @return Builder
     */
    function getBuilder() {
        return $this->builder;
    }
    
    function isSingle() {
        $res = $this->loadSingle;
        if ($this->singleRequestParam && isset($_REQUEST[$this->singleRequestParam])) 
            $res = (bool) $_REQUEST[$this->singleRequestParam];
        return $res;
    }
    
    function isMin() {
        $res = $this->loadMin;
        if ($this->minRequestParam && isset($_REQUEST[$this->minRequestParam])) 
            $res = (bool) $_REQUEST[$this->minRequestParam];
        return $res;
    }
    
    protected $list = null;

    function reset() {
        $this->list = null;
    }
    
    /**
     * @return array
     */ 
    function getList() {
        if (!is_null($this->list)) return $this->list;
        $this->list = [];
        $this->builder->genMin = $this->isMin();
        if ($this->isSingle() || $this->isMin()) {
            $dFile = $this->builder->build();
            $base = basename($dFile);
            $ts = filemtime($dFile);
            $this->list[] = Builder::concatPaths($this->distUrl, $base)."?{$ts}";
        } else {
            foreach ($this->builder->listClassFiles() as $f) {
                $this->list[] = Builder::concatPaths($this->jsUrl, $f);
            }
        }
        return $this->list;
    }
    
    function showScripts($indent = 4) {
        $ind = str_repeat(" ", $indent);
        foreach ($this->getList() as $l) {
            $l = htmlspecialchars($l);
            echo "\n{$ind}<script type=\"text/javascript\" src=\"{$l}\"></script>";
        }
        echo "\n";
    }
    
    
    
}

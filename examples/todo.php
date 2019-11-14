<?php

class TodoApi {

    var $origFile;
    
    var $liveFile;
    
    protected $handle = false;
    
    protected $data = false;
    
    function __construct() {
        $this->origFile = __DIR__.'/todo-original.json';
        $this->liveFile = __DIR__.'/todo.json';
    }
    
    // lock'n'load
    function load() {
        $this->handle = fopen($this->liveFile, "c+");
        if (!flock($this->handle, LOCK_EX)) throw new Exception("Cannot get the lock");
        $buf = '';
        $n = 0;
        while(strlen($s = fread($this->handle, 20480))) {
            $n++;
            $buf .= $s;
        }
        if (strlen($buf)) $this->data = json_decode($buf, true);
        if (!is_array($this->data)) $this->data = json_decode(file_get_contents($this->origFile), true);
        if (!is_array($this->data)) $this->data = array();
    }
    
    function save() {
        if (!$this->handle) return;
        fseek($this->handle, 0);
        ftruncate($this->handle, 0);
        fputs($this->handle, json_encode(array_values($this->data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ));
    }
    
    function indexData($data) {
        if (!is_array($data)) return $data;
        $res = array();
        foreach ($data as $item) {
            $res[$item['id']] = $item;
        }
        return $res;
    }
    
    function g($param, $req = false) {
        if (isset($_REQUEST[$param])) return $_REQUEST[$param];
        else if ($req) throw new Exception("Bad request: parameter '{$param}' missing");
    }

    function execute() {
        $filter = $this->g('filter');
        $completed = $this->g('completed');
        $id = $this->g('id');
        if ($id) {
            if (isset($this->data[$id]))
                return $this->data[$id];
            return null;
        }
        if (!strlen($filter)) {
            return $this->data;
        }
        $res = array();
        foreach ($this->data as $item) {
            if (!preg_match('/'.preg_quote($filter).'/i', $item['task'])) continue;
            if ($completed === 'true' && !$item['completed']) continue;
            if ($completed === 'false' && $item['completed']) continue;
            $res[] = $item;
        }
        return $res;
    }
    
    function getErrors(array & $rec = array()) {
        $errors = array();
        if (!strlen($this->g('task'))) $errors['task']['required'] = 'Task must be provided';
        if (!strlen($this->g('priority'))) $errors['priority']['required'] = 'Priority must be provided';
        else if (!is_numeric($this->g('priority'))) $errors['priority']['format'] = 'Priority must be a number';
        if ($this->g('priority') < 0) $errors['priority']['format'] = 'Priority must be >= 0';
        if ($this->g('completed') && !in_array($this->g('completed'), array('true', 'false'))) 
            $errors['completed']['format'] = 'Completed must be either "true" or "false"';
        if (!$errors) {
            $rec['task'] = $this->g('task');
            $p = $this->g('priority');
            if (strval(round($p)) === strval($p)) $p = round($p);
            $rec['priority'] = $p;
            $c = $this->g('completed');
            if (!$c || $c === 'false') $c = false;
            else $c = true;
            $rec['completed'] = $c;
        }
        return $errors;
    }
    
    function executeCreate() {
        $rec = array();
        $err = $this->getErrors($rec);
        if ($err) {
            return array('error' => $err);
        }
        $maxId = (int) max(array_keys($this->data)) + 1;
        $rec['id'] = $maxId;
        $this->data[$rec['id']] = $rec;
        $this->save();
        return $rec;
    }
    
    function executeUpdate() {
        $id = $this->g('id', true);
        if (!isset($this->data[$id])) {
            return array('error' => 'Record not found');
        }
        $rec = $this->data[$id];
        $err = $this->getErrors($rec);
        if ($err) {
            return array('error' => $err);
        }
        $this->data[$id] = $rec;
        $this->save();
        return $rec;
    }
    
    function executeDelete() {
        $id = $this->g('id', true);
        if (!isset($this->data[$id])) {
            return array('error' => 'Record not found');
        }
        unset($this->data[$id]);
        $this->save();
        return array('status' => 'success');
    }
    
    function handleRequest($method = false, $action = false) {
        
        if ($this->data === false) $this->load();
        
        if ($method === false) {
            if (isset($_SERVER['REQUEST_METHOD'])) $method = strtolower($_SERVER['REQUEST_METHOD']);
            $method = '';
        }
        if (!in_array($method, $a = array('get', 'post', 'put', 'delete'))) {
            throw new Exception("Bad invalid method: '{$method}'; allowed values are: ".implode(', ', $a));
        }
        
        if ($action === false) {
            if (method_exists($this, $m = 'execute'.$this->g('action'))) $res = $this->$m();
            else throw new Exception("Bad request");
        }
            
        header('content-type: text/json; charset=utf-8');
        echo json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
    }
    
    function __destruct() {
        if ($this->handle) {
            flock($this->handle, LOCK_UN);
            fclose($this->handle);
        }
    }

}

$api = new TodoApi;
$api->handleRequest();
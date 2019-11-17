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
        $this->data = $this->indexData($this->data);
    }
    
    function save() {
        if (!$this->handle) throw new Exception("Cannot save");
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
        if (isset($_GET[$param])) return $_GET[$param];
        else if ($req) throw new Exception("Bad request: GET parameter '{$param}' missing");
    }
    
    function p($param, $req = false) {
        if (isset($_POST[$param])) return $_POST[$param];
        else if ($req) throw new Exception("Bad request: POST parameter '{$param}' missing");
    }
    
    function r($param, $req = false) {
        if (isset($_REQUEST[$param])) return $_REQUEST[$param];
        else if ($req) throw new Exception("Bad request: REQUEST parameter '{$param}' missing");
    }

    function execute() {
        $u = basename($_SERVER['SCRIPT_NAME']);
        $res = array(
            "description" => "Simple TODO app RESTish backend for demo purposes",
            "usage" => array(
                "GET " => array(
                    "{$u}" => "return this help information",
                    "{$u}?action=list" => "returns all items",
                    "{$u}?action=list&filter=<substring>&completed={true|false}" => "filter items by `task` field substring and/or completed status",
                    "{$u}?action=list[&id=<id>" => "retrieve ONE item (result is hash instead of array, NULL if not found)"
                ),
                "POST {$u}?id=<id>" => array(
                    "purpose" => "updates an item",
                    "params" => array(
                        "task" => "TODO item title; string; required",
                        "priority" => "TODO item priority; integer or float; required",
                        "completed" => "is item completed? boolean; not required",
                    ),
                    "returns" => array(
                        "success" => "item JSON (with `id`)",
                        "failure" => array(
                            "description" => "associative array with validation errors on per-field basis",
                            "example" => array(
                                "status" => "error",
                                "error" => array(
                                    "task" => array("required" => array("Task must be provided"))
                                )
                            ),
                        )
                    ),
                ),
                "PUT {$u}" => array(
                    "purpose" => "creates an item",
                    "params" => "@see POST",
                    "returns" => "@see POST",
                ),
                "DELETE {$u}?id=<id>" => array(
                    "purpose" => "deletes an item",
                    "returns" => array(
                        "success" => array("status" => "success"),
                        "failure" => array('status' => 'error', 'error' => array('id' => array('notFound' => 'Record not found')))
                    )
                ),
                    
                
            ),
        );
        return $res;
    }
    
    function executeList() {
        $filter = $this->g('filter');
        $completed = $this->g('completed');
        $id = $this->g('id');
        if ($id) {
            if (isset($this->data[$id]))
                return [$this->data[$id]];
            return [];
        }
        if (!strlen($filter) && !strlen($completed)) {
            return array_values($this->data);
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
        if (!strlen($this->p('task')))
            $errors['task']['required'] = 'Task must be provided';
        if (!strlen($this->p('priority')))
            $errors['priority']['required'] = 'Priority must be provided';
        else if (!is_numeric($this->p('priority')))
            $errors['priority']['format'] = 'Priority must be a number';
        if ($this->p('priority') < 0)
            $errors['priority']['format'] = 'Priority must be >= 0';
        if ($this->p('completed') && !in_array($this->p('completed'), array('true', 'false'))) 
            $errors['completed']['format'] = 'Completed must be either "true" or "false"';
        if (!$errors) {
            $rec['task'] = $this->p('task');
            $p = $this->p('priority');
            if (strval(round($p)) === strval($p)) $p = round($p);
            $rec['priority'] = $p;
            $c = $this->p('completed');
            if (!$c || $c === 'false') $c = false;
            else $c = true;
            $rec['completed'] = $c;
        }
        return $errors;
    }
    
    function methodPut() {
        $rec = array();
        $err = $this->getErrors($rec);
        if ($err) {
            return array('status' => 'error', 'error' => $err);
        }
        $maxId = (int) max(array_keys($this->data)) + 1;
        $rec['id'] = $maxId;
        $this->data[$rec['id']] = $rec;
        $this->save();
        return array('status' => 'success', 'record' => $rec);
    }
    
    function methodPost() {
        $id = $this->g('id', true);
        if (!isset($this->data[$id])) {
            return array('status' => 'error', 'error' => array('id' => array('notFound' => 'Record not found')));
        }
        $rec = $this->data[$id];
        $err = $this->getErrors($rec);
        if ($err) {
            return array('status' => 'error', 'error' => $err);
        }
        $this->data[$id] = $rec;
        $this->save();
        return array('status' => 'success', 'record' => $rec);
    }
    
    function methodDelete() {
        $id = $this->g('id', true);
        if (!isset($this->data[$id])) {
            return array('status' => 'error', 'error' => array('id' => array('notFound' => 'Record not found')));
        }
        unset($this->data[$id]);
        $this->save();
        return array('status' => 'success');
    }
    
    function handleRequest($method = false, $action = false) {
        
        if ($this->data === false) $this->load();
        
        if ($method === false) {
            $method = '';
            if (isset($_SERVER['REQUEST_METHOD'])) $method = strtolower($_SERVER['REQUEST_METHOD']);
        }
        if (!in_array($method, $a = array('get', 'post', 'put', 'delete'))) {
            throw new Exception("Bad invalid method: '{$method}'; allowed values are: ".implode(', ', $a));
        }
        
        if ($action === false) {
            // execute_get<Action>
            $m1 = 'method'.$method.$this->g('action');
            if (method_exists($this, $m1)) $res = $this->$m1();
            // execute<Action> (all methods_
            else if (method_exists($this, $m = 'execute'.$this->g('action'))) $res = $this->$m();
            else throw new Exception("Bad request");
        }
            
        header('content-type: text/json; charset=utf-8');
        echo json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
    }
    
    function __destruct() {
        if ($this->handle) {
            flock($this->handle, LOCK_UN);
            fclose($this->handle);
            $this->handle = false;
        }
    }

}
        
ini_set('html_errors', 0);
$api = new TodoApi;

if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'POST'))) {
    $entityBody = file_get_contents('php://input');
    if (strlen($entityBody)) {
        parse_str($entityBody, $_POST);
        foreach ($_POST as $k => $v) {
            $_REQUEST[$k] = $v;
        }
    }
}
$api->handleRequest();
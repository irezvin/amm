<?php

header('content-type: text/json; charset=utf-8');
usleep(50*1000); // make 50-ms delay to allow tests to pass
$result = $_REQUEST;
if (isset($_REQUEST['time']) && $_REQUEST['time'] && is_string($_REQUEST['time'])) {
    $format = is_numeric($_REQUEST['time'])? 'Y-m-d H:i:s' : $_REQUEST['time'];
    $result['time'] = date($format);
}
echo json_encode($result);
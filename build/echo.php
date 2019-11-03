<?php

header('content-type: text/json; charset=utf-8');
usleep(50*1000); // make 50-ms delay to allow tests to pass
echo json_encode($_REQUEST);
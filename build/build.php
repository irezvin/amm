#!/bin/php
<?php

require(__DIR__.'/amm-utils.php');
$b = new \Amm\Builder;
$b->distDir = __DIR__.'/../dist';
$b->build();
$b->genMin = true;
$b->build();

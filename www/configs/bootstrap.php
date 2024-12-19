<?php
use Illuminate\Database\Capsule\Manager as Capsule;
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__ . '/../../.env');
$dotenv->load();



require   __DIR__ . '/../vendor/autoload.php';

$capsule = new Capsule;

$capsule->addConnection([
    'driver'=>'mysql',
    'host'=>'127.0.0.1',
    'database'  => $_ENV['MYSQL_DATABASE'],
    'username'  => $_ENV['MYSQL_USER'],
    'password' => $_ENV['MYSQL_PASSWORD'],
    'charset'   => 'utf8',
    'collation' => 'utf8_unicode_ci',
    'prefix'    => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();


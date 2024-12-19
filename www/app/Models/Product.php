<?php

namespace Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model {
    protected $fillable = ['name','stock','purchase_price'];
}
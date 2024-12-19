<?php

namespace Models;

use Illuminate\Database\Eloquent\Model;

class Sales extends Model {
    protected $fillable = ['product_id', 'sales_channel_id', 'sale_price', 'quantity', 'profit'];

}
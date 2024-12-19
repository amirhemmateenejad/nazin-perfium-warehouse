<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    protected $fillable = ['product_id', 'quantity', 'purchase_price'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; 
use Illuminate\Notifications\Notifiable;                
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    
    
    
    use HasFactory, Notifiable;

    
    
    protected $fillable = [
        'name',            
        'email',           
        'password',        
        'face_image_path', 
    ];

    
    
    protected $hidden = [
        'password',
        'remember_token',
    ];

    
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime', 
            'password'          => 'hashed',   
        ];
    }

    
    
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    
    public function games()
    {
        return $this->hasMany(Game::class);
    }

    
    public function gameSessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }
}
<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class NotificarNuevaPR implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $data;

    
    public function __construct(array $data = [])
    {
        $this->data = $data ?: [
            "event" => "pull_request.opened",
            "repository" => "plataforma-juegos",
            "branch" => "feature/reverb-chat",
            "author" => "developer2"
        ];
    }

    
    public function handle(): void
    {
        Log::info('Notificación de RabbitMQ enviada:', $this->data);
        
        
    }
}
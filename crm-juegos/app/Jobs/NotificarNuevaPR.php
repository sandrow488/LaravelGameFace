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

    /**
     * Create a new job instance.
     * 
     * @param array $data Structure: ['event' => '...', 'repository' => '...', 'branch' => '...', 'author' => '...']
     */
    public function __construct(array $data = [])
    {
        $this->data = $data ?: [
            "event" => "pull_request.opened",
            "repository" => "plataforma-juegos",
            "branch" => "feature/reverb-chat",
            "author" => "developer2"
        ];
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('Notificación de RabbitMQ enviada:', $this->data);
        // Aquí es donde Laravel enviaría el evento a RabbitMQ automáticamente 
        // gracias a la configuración QUEUE_CONNECTION=rabbitmq en el .env
    }
}

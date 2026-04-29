import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Evita que el frontend se quede en blanco si faltan variables de entorno de Reverb.
const reverbAppKey = import.meta.env.VITE_REVERB_APP_KEY;
const reverbHost = import.meta.env.VITE_REVERB_HOST;
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';

if (reverbAppKey && reverbHost) {
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: reverbAppKey,
        wsHost: reverbHost,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: reverbScheme === 'https',
        enabledTransports: reverbScheme === 'https' ? ['wss'] : ['ws'],
    });
} else {
    window.Echo = null;
    console.warn('Reverb no configurado: faltan VITE_REVERB_APP_KEY o VITE_REVERB_HOST');
}

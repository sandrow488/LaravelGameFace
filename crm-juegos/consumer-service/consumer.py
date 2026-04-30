import pika  # Librería de Python para comunicarse con RabbitMQ (protocolo AMQP)
import json  # Para parsear los mensajes JSON que llegan de la cola

# Callback: función que se ejecuta cada vez que llega un mensaje nuevo a la cola
def callback(ch, method, properties, body):
    # ch: canal de comunicación con RabbitMQ
    # method: metadatos de la entrega (nombre de la cola, etc.)
    # properties: propiedades del mensaje (tipo de contenido, prioridad, etc.)
    # body: el contenido del mensaje en bytes

    print("¡Nuevo evento recibido de RabbitMQ!")

    try:
        # Intenta parsear el cuerpo del mensaje como JSON
        # body es bytes, json.loads lo convierte a un diccionario Python
        data = json.loads(body)

        # Imprime el JSON formateado con indentación de 4 espacios para facilitar la lectura
        # ensure_ascii=False permite mostrar caracteres especiales como tildes o ñ
        print(json.dumps(data, indent=4, ensure_ascii=False))

    except:
        # Si el mensaje no es JSON válido, lo imprime tal cual (como bytes o texto plano)
        print(body)

# Main: función principal que configura y arranca el consumidor
def main():
    # Crea una conexión TCP al servidor RabbitMQ que corre en localhost (127.0.0.1)
    # BlockingConnection significa que el programa se bloquea esperando mensajes
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))

    # Crea un canal de comunicación dentro de la conexión
    # Los canales permiten múltiples operaciones sobre una sola conexión TCP
    channel = connection.channel()

    # Declara la cola 'test' para asegurarse de que exista antes de intentar consumirla
    # durable=True significa que la cola sobrevive si RabbitMQ se reinicia
    channel.queue_declare(queue='test', durable=True)

    print("Esperando mensajes en la cola 'test'...")

    # Configura el consumidor: cuando llegue un mensaje a 'test', llama a la función callback
    # auto_ack=True confirma automáticamente la recepción del mensaje (no requiere confirmación manual)
    channel.basic_consume(queue='test', on_message_callback=callback, auto_ack=True)

    # Inicia el bucle de escucha infinito (bloquea el programa hasta que se interrumpa con Ctrl+C)
    channel.start_consuming()

# Punto de entrada del script: solo ejecuta main() si el archivo se corre directamente
# (no cuando se importa como módulo en otro archivo)
if __name__ == "__main__":
    main()
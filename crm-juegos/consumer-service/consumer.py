import pika
import json

# Callback
def callback(ch, method, properties, body):
    print("¡Nuevo evento recibido de RabbitMQ!")
    try:
        data = json.loads(body)
        print(json.dumps(data, indent=4, ensure_ascii=False))
    except:
        print(body)

# Main
def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
    channel = connection.channel()

    channel.queue_declare(queue='test', durable=True)

    print("Esperando mensajes en la cola 'test'...")
    
    channel.basic_consume(queue='test', on_message_callback=callback, auto_ack=True)
    channel.start_consuming()

if __name__ == "__main__":
    main()
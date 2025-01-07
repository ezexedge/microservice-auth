import amqp, { ConsumeMessage } from "amqplib";


class Rabbitmq {
  // Updated connection parameters for Kubernetes
  private connectionUri: string = 'amqp://guest:guest@rabbitmq-srv:5672';
  private exchangeName: string = 'your-exchange-name';
  private exchangeType: string = 'direct';
  private routingKey: string = 'your-routing-key';
  private queue: string = 'your-queue-name';

  private connection!: amqp.Connection;
  private channel!: amqp.Channel;

  async init() {
    try {
      console.log('Attempting to connect to RabbitMQ with URI:', this.connectionUri);
      
      // Establish connection with more robust options
      this.connection = await amqp.connect(this.connectionUri, {
        heartbeat: 60,
        timeout: 5000
      });

      // Error handling
      this.connection.on("error", (err: any) => {
        console.error("RabbitMQ error: closing server", err);
        process.exit(1);
      });

      this.connection.on("close", () => {
        console.error("RabbitMQ disconnected: closing server");
        process.exit(1);
      });

      // Create channel
      this.channel = await this.connection.createChannel();

      // Assert queue
      await this.channel.assertQueue(this.queue, {
        durable: true,
        autoDelete: false,
        exclusive: false,
      });

      // Assert exchange
      this.channel.assertExchange(this.exchangeName, this.exchangeType);

      // Bind queue to exchange
      await this.channel.bindQueue(this.queue, this.exchangeName, this.routingKey);

      // Set prefetch
      await this.channel.prefetch(1);

      console.info("RabbitMQ connected... Ok!");

      return this.connection;
    } catch (error) {
      console.error("Failed to initialize RabbitMQ connection", error);
      throw error;
    }
  }
  async publish(message: any) {
    try {
      // Convertir mensaje a Buffer
      const content = Buffer.from(JSON.stringify(message));
  
      // Publicar mensaje usando los valores por defecto de la clase
      const result = this.channel.publish(
        this.exchangeName, 
        this.routingKey, 
        content, 
        { 
          persistent: true, 
          timestamp: Date.now(), 
          contentType: 'application/json' 
        }
      );
  
      console.log(`Message published to exchange ${this.exchangeName} with routing key ${this.routingKey}`);
      console.log("result",message)
      return result;
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  async subscribe() {
    this.channel.consume(this.queue, async (message: any) => {
      await this.messageHandler(message);
    });

    console.info(`RabbitMQ consuming from: ${this.queue}`);
  }

  async messageHandler(message: ConsumeMessage | null) {
    try {
      if (message) {
        console.log("Received message:", message);
        this.channel.ack(message);
      }
    } catch (error) {
      console.error(error);
      this.channel.nack(message as ConsumeMessage, false, false);
    }
  }

  async getRabbitMQData() {
    const { product, version } = this.connection.connection.serverProperties;
    return { product, version };
  }
}

const rabbit = new Rabbitmq();
export default rabbit;
import amqp, { ConsumeMessage } from 'amqplib';

export class Rabbitmq {
  private connectionUri: string = 'amqp://guest:guest@rabbitmq-srv:5672';
  private exchangeName: string = 'your-fanout-exchange';
  private exchangeType: string = 'fanout';

  private connection: any = null;
  private channel: any = null;

  constructor() {}

  async init(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ...');
      const retries = 5;
      for (let i = 0; i < retries; i++) {
        try {
          this.connection = await amqp.connect(this.connectionUri);
          break;
        } catch (err) {
          console.warn(`Retrying RabbitMQ (${retries - i - 1} tries left)`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      if (!this.connection) {
        throw new Error('Could not establish connection');
      }

      this.connection.on('error', (err: Error) => {
        console.error('RabbitMQ connection error:', err);
        process.exit(1);
      });

      this.connection.on('close', () => {
        console.error('RabbitMQ connection closed');
        process.exit(1);
      });

      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: false,
      });

      console.log('RabbitMQ is ready and connected to fanout exchange!');
    } catch (error) {
      console.error('RabbitMQ init failed:', error);
      throw error;
    }
  }

  async consume(callback: (msg: ConsumeMessage | null) => void): Promise<void> {
    try {
      if (!this.channel) throw new Error('Channel not ready');

      // Crear cola exclusiva y temporal
      const q = await this.channel.assertQueue('', { exclusive: true });

      // Enlazar la cola al exchange tipo fanout (routingKey vacío)
      await this.channel.bindQueue(q.queue, this.exchangeName, '');

      await this.channel.prefetch(1);

      await this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            await callback(msg);
            
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error in consume callback:", error);
            const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
            if (retryCount < 2) {
              console.log(`Retrying message (attempt ${retryCount + 1}/2)`);
              msg.properties.headers = {
                ...(msg.properties.headers || {}),
                'x-retry-count': retryCount + 1,
              };
              this.channel.nack(msg, false, true);
            } else {
              console.error('Max retries reached, discarding message');
              this.channel.ack(msg);
            }
          }
        }
      });

      console.log(`Consumer started (fanout exchange: ${this.exchangeName})`);
    } catch (error) {
      console.error("Error setting up consumer:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log('RabbitMQ connection closed gracefully.');
  }
}

const rabbit = new Rabbitmq();
export default rabbit;

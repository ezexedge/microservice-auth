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

      if (!this.connection) throw new Error('Could not establish connection');

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

      console.log('RabbitMQ is ready!');
    } catch (error) {
      console.error('RabbitMQ init failed:', error);
      throw error;
    }
  }

  async publish(message: any): Promise<boolean> {
    if (!this.channel) throw new Error('Channel not ready');

    const content = Buffer.from(JSON.stringify(message));

    const sent = this.channel.publish(
      this.exchangeName,
      '', // fanout ignora routingKey
      content,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      }
    );

    console.log('Message published:', message);
    return sent;
  }

  async subscribe(): Promise<void> {
    if (!this.channel) throw new Error('Channel not ready');

    const q = await this.channel.assertQueue('', { exclusive: true });

    await this.channel.bindQueue(q.queue, this.exchangeName, '');

    await this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
      await this.messageHandler(msg);
    });

    console.log(`Subscribed to fanout exchange: ${this.exchangeName}`);
  }

  private async messageHandler(message: ConsumeMessage | null): Promise<void> {
    if (message && this.channel) {
      const data = JSON.parse(message.content.toString());
      console.log('Received message:', data);

      // TODO: procesar mensaje

      this.channel.ack(message);
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

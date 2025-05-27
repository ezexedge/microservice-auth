import express, { Express, NextFunction, Request, Response } from "express";
import rabbit from "./services/RabbitService";

export default class App {
    public app: Express | null = null;
    public port = 3000;
    public host = "0.0.0.0";

    private clients: Response[] = []; // Lista de clientes SSE conectados

    // Función para limpiar clientes desconectados
    private cleanDisconnectedClients(): void {
        this.clients = this.clients.filter(client => !client.destroyed && client.writable);
    }

    // Función para enviar mensaje a todos los clientes activos
    private sendToAllClients(data: any): void {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        let sentCount = 0;
        
        this.clients.forEach((client, index) => {
            try {
                if (!client.destroyed && client.writable) {
                    client.write(message);
                    sentCount++;
                }
            } catch (error) {
                console.error(`Error enviando mensaje al cliente ${index}:`, error);
            }
        });

        // Limpiar clientes desconectados después de enviar
        this.cleanDisconnectedClients();
        
        if (sentCount > 0) {
            console.log(`📤 Mensaje enviado a ${sentCount} cliente(s) SSE`);
        }
    }

    async run() {
        this.app = express();

        this.app.use(express.json());
        this.app.set("json spaces", 2);
        this.app.use(express.urlencoded({ extended: false }));

      await rabbit.init();

        // ===== ENDPOINT SSE =====
        this.app.get('/api/mailing/events', async(req: Request, res: Response) => {
            console.log('🔌 Nueva conexión SSE iniciada');

            // Headers SSE optimizados para mantener conexión más tiempo
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('X-Accel-Buffering', 'no');
            res.setHeader('X-Proxy-Buffering', 'no');
            
            // Sin timeout para mantener conexión indefinidamente
            res.setTimeout(0);
            req.setTimeout(0);

            res.flushHeaders();

            // Enviar comentario inicial para establecer la conexión
            res.write(': SSE connection established\n\n');

            // Enviar mensaje de bienvenida
            const welcomeMessage = {
                type: 'connection',
                message: 'Conectado exitosamente - SSE activo por tiempo indefinido',
                timestamp: new Date().toISOString(),
                clientId: Date.now(),
                info: 'Esta conexión enviará mensajes cada segundo mientras esté activa'
            };

            try {
              
                      await rabbit.consume(async (msg) => {
            if (msg && msg.content) {
                try {
                    const data = JSON.parse(msg.content.toString());
                   res.write(`data: ${JSON.stringify(data)}\n\n`);

                    // Enviar mensaje de RabbitMQ a todos los clientes SSE
                    this.sendToAllClients({
                        type: 'rabbitmq',
                        message: 'Mensaje desde RabbitMQ',
                        data: data,
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    throw error;
                }
            } else {
                console.warn('Received message without content');
            }
        });
                res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
                console.log('✅ Mensaje de bienvenida enviado');
            } catch (error) {
                console.error('❌ Error enviando mensaje de bienvenida:', error);
                return;
            }

            this.clients.push(res);
            console.log(`🔌 Cliente SSE conectado. Total activos: ${this.clients.length}`);

            // Enviar ping inmediato para mantener viva la conexión
            setTimeout(() => {
                if (!res.destroyed && res.writable) {
                    const pingMessage = {
                        type: 'ping',
                        message: 'Conexión establecida - Esperando mensajes cada segundo',
                        timestamp: new Date().toISOString()
                    };
                    res.write(`data: ${JSON.stringify(pingMessage)}\n\n`);
                    console.log('📡 Ping inicial enviado');
                }
            }, 500);

            // Manejar desconexión
            req.on('close', () => {
                this.clients = this.clients.filter(client => client !== res);
                console.log(`🔌 Cliente SSE desconectado. Total activos: ${this.clients.length}`);
            });

            req.on('error', (error) => {
                console.error('❌ Error en la conexión SSE:', error);
                this.clients = this.clients.filter(client => client !== res);
            });

            res.on('error', (error) => {
                console.error('❌ Error en la respuesta SSE:', error);
                this.clients = this.clients.filter(client => client !== res);
            });
        });

        // Inicializar RabbitMQ
    


        // Iniciar servidor
        this.app.listen(this.port, this.host, () => {
            console.log(`🚀 Servidor escuchando en http://${this.host}:${this.port}`);
            console.log(`📡 Endpoint SSE: http://${this.host}:${this.port}/api/events`);
        });

        // Enviar mensaje cada segundo a todos los clientes conectados
        setInterval(() => {
            if (this.clients.length > 0) {
                const periodicMessage = {
                    type: 'periodic',
                    message: '🟢 Conectado - Mensaje cada segundo',
                    timestamp: new Date().toISOString(),
                    activeClients: this.clients.length,
                    serverUptime: Math.floor(process.uptime())
                };

                console.log(`🔄 Enviando mensaje periódico a ${this.clients.length} cliente(s)`);
                this.sendToAllClients(periodicMessage);
            }
        }, 1000);

        // Limpiar clientes desconectados cada 30 segundos
        setInterval(() => {
            const beforeCount = this.clients.length;
            this.cleanDisconnectedClients();
            const afterCount = this.clients.length;
            
            if (beforeCount !== afterCount) {
                console.log(`🧹 Limpieza: ${beforeCount - afterCount} cliente(s) desconectado(s) removido(s)`);
            }
        }, 30000);

        console.log('✅ Aplicación iniciada correctamente');
        console.log('📋 Funcionalidades:');
        console.log('   - Endpoint SSE: GET /api/events');
        console.log('   - Mensajes cada segundo cuando hay clientes');
        console.log('   - Integración con RabbitMQ');
        console.log('   - Limpieza automática de conexiones');
    }
}

const app = new App();
app.run();
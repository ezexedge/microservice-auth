import express , {Express, NextFunction, Request} from "express"
import rabbit from "./services/RabbitService";



export default class App{
    public app: Express | null = null;


    public port = 3000
    
    public host = "0.0.0.0"


      

    async run(){
        this.app = express();

        this.app.use(express.json());
        this.app.set("json spaces", 2);
        this.app.use(express.urlencoded({ extended: false }));

      
        await rabbit.init()
    
        await rabbit.consume(async (msg) => {
            if (msg && msg.content ) {
                try {
           
                    const data = JSON.parse(msg.content.toString());
                    
                    
                    console.log('Message processed successfully',data);
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    throw error; // Permitir retry
                }
            } else {
                console.warn('Received message without content');
            }
        });

this.app.listen(3000, '0.0.0.0', () => {
  console.log('Listening on port 3000 xxx!!');
});
    }
}

const app = new App()

app.run()


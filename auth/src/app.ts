import express , {Express, NextFunction, Request} from "express"
import Route from "./route";
import { Connection } from "mongoose";
import db from "./db";
import errorHandler from "./middleware/error.middleware";
import rabbit from "./services/RabbitService";



export default class App{
    public app: Express | null = null;

    public connection: Connection;

    public port = 3000
    
    public host = "0.0.0.0"

    public routes = new Route()

      

    async run(){
        this.app = express();

        this.app.use(express.json());
        this.app.set("json spaces", 2);
        this.app.use(express.urlencoded({ extended: false }));

        this.app.use(errorHandler);
      
        await rabbit.init()

        this.connection = await db.connectDb()
        
        await this.routes.main(this.app);

this.app.listen(3000, '0.0.0.0', () => {
  console.log('Listening on port 3000!!');
});
    }
}

const app = new App()

app.run()


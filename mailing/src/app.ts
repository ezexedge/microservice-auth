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

        
this.app.listen(3000, '0.0.0.0', () => {
  console.log('Listening on port 3000!!');
});
    }
}

const app = new App()

app.run()


// src/Route.ts
import express, { Router, Express, Request, Response, NextFunction } from "express";
import AuthController from "./controllers/AuthController";

export default class Route{

    public controller: AuthController;
    public router: Router;

    constructor(){
        this.controller = new AuthController();
        this.router = express.Router();
    }

    async main(app: Express): Promise<void>{

        this.router.post(
            "/signup",
            async (req: Request, res: Response, next: NextFunction) => {
                await this.controller.signup(req, res).catch((e) => next(e));
            },
        );
        
        app.use("/api/auth", this.router);
    }
}

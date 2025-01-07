import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import rabbit from "../services/RabbitService";


class AuthController{

    private service: AuthService;

    constructor(){
        this.service = new AuthService();
    }


    async signup(req:Request,res:Response){

        const { password, email } = req.body; 

        console.log("req.body;",req.body)

        const user = await this.service.signup(req,email,password)

        await rabbit.publish({message:"hoolaaaaaaaxxxxx"})

        res.status(201).json({
            message: "Usuario registrado exitosamente",
            data: {
                user
            },
          });


    }

}

export default AuthController
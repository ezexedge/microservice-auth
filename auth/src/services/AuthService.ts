import { Request } from "express";
import { User } from "../entities/user.entity";
import BaseException from "../exceptions/BaseException";
import jwt from 'jsonwebtoken';

export default class AuthService {
    async signup(req: Request, email: string, password: string): Promise<User> {
        // Check if user already exists
        const userExist = await User.findOne({ email });
console.log("process.env.JWT_KEY",process.env.JWT_KEY)
        if (userExist) {
            throw new BaseException(
                "User already exists with this email",  // Mensaje más apropiado
                409,  // Código más apropiado para conflicto
                "SignupError",  // Nombre de error más específico
            );
        }

        try {
            // Create new user
            const user = User.build({ email, password });
            await user.save();

            // Generate JWT
            const userJwt = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_KEY!
            );

            // Set session
            req.session = {
                jwt: userJwt
            };

            return user;
        } catch (error) {
            console.error("Signup error:", error);
            throw new BaseException(
                "Error creating user account",
                500,
                "SignupError",
            );
        }
    }
}
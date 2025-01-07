import mongoose, { Connection } from "mongoose";

class DBClass {
  private connection: Connection | null = null;

  async connectDb(): Promise<Connection> {

    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/my_database";

    if (!this.connection) {
      try {
        const mongoConnection = await mongoose.connect(mongoUri);

        this.connection = mongoConnection.connection;

        console.log("Conectado a MongoDB");
      } catch (error) {
        console.error("Error al conectar a MongoDB", error);
        throw error;
      }
    }

    return this.connection;
  }

  getConnection(): Connection | null {
    return this.connection;
  }
}

const db = new DBClass();
export default db;

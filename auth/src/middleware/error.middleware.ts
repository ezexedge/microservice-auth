import { Request, Response, NextFunction } from "express";
import BaseException from "../exceptions/BaseException";

function errorHandler(err: Error, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  const error: BaseException =
    err instanceof BaseException
      ? err
      : new BaseException(
          err.message || "Internal Server Error",
          500,
          "genericError",
          err.stack || undefined,
          err
        );

  // Manejo de errores críticos
  if (
    error.statusCode === 510 ||
    error.message.includes("connection timed out") ||
    error.message.includes("MongoNetworkError")
  ) {
    console.error("App crashed due to a critical error. Exiting...");
    process.exit(1); // Finaliza el proceso
  }

  res.status(error.statusCode || 500).json({
    status: "Error",
    code: error.statusCode,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    },
    codeMessageLanguage: error.codeMessageLanguage,
  });
}

export default errorHandler;

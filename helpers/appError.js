export class AppError extends Error {
  constructor(msg, statusCode) {
    super(msg);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith("4") ? "failed" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

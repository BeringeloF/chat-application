import { AppError } from "../helpers/appError.js";
const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    //RENDERED WEBSITE
    console.log("error mine", err);
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res
        .status(err.statusCode)
        .json({ status: err.status, message: err.message });
    }
    console.log("error mine", err);
    return res.status(500).json({
      status: "error",
      message: "something went wrong!",
    });
  }
  //RENDERED WEBSITE

  if (err.isOperational) {
    console.log("error mine", err);
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }
  console.log("error mine", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: "Please try again later!",
  });
};

const handleCastErrorDB = function (err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = function (err) {
  const message = `Duplicate fields values: ${Object.values(err.keyValue)}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = function (err) {
  const errors = Object.values(err.errors)
    .map((el) => el.message)
    .join(". ");
  const message = `invalid input data. ${errors}`;
  return new AppError(message, 400);
};
const handleJWTError = (err) => new AppError(err.message, 401);

const handleJWTExpiredError = () => new AppError("expired token", 401);

export function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  // NODE_ENV=production nodemon server.js
  console.log(err);
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);
    if (err.name === "JsonWebTokenError") error = handleJWTError(error);
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (err.message === "jwt malformed")
      error.message = "You are not logged in!";

    sendErrorProd(error, req, res);
  }
}

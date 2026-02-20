import AppError from "../utils/appError.js";

const handleJWTError = () =>
  new AppError("Invalid Token! Please login again.", 401);
const handleJWTExpiredError = () =>
  new AppError("Token Expired!. Please login again.", 401);

const handleCastErrorDb = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDb = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.toUpperCase()}: ${value}  is already used.Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(" ")}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.log("Error!!!!!");

    res.status(500).json({
      status: "error",
      message: "Something went very wrong.",
    });
  }
};

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    console.error("Error caught:", err);
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    console.error("Error caught:", err);
    let error = Object.create(err);
    if (error.name == "CastError") error = handleCastErrorDb(error);
    if (error.code == 11000) error = handleDuplicateFieldsDb(error);
    if (error.name == "ValidationError") error = handleValidationErrorDB(error);
    if (error.name == "JsonWebTokenError") error = handleJWTError();
    if (error.name == "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

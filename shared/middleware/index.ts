import { createErrorResponse } from "../utils";
import { logError, ServiceError } from "../types";
import { Request, Response, NextFunction } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const errors: Record<string, string[]> = {};

      error.details.forEach((detail: any) => {
        const field = detail.path.join(".");
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(detail.message);
      });

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    return next();
  };
}

export function errorHandler(
  error: ServiceError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logError(error, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json(createErrorResponse(message));
  next();
}

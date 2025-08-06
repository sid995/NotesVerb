import { Request, Response } from "express";
import { asyncHandler } from "@shared/middleware";
import { AuthService } from "./authService";
import { createSuccessResponse } from "@shared/utils";

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tokens = await authService.register(email, password);

  res
    .status(201)
    .json(createSuccessResponse(tokens, "User registered successfully"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tokens = await authService.login(email, password);

  res
    .status(200)
    .json(createSuccessResponse(tokens, "User logged in successfully"));
});

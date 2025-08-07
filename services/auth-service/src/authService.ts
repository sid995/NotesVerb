import jwt, { SignOptions } from "jsonwebtoken";
import { AuthTokens } from "../../../shared/types";
import bcrypt from "bcryptjs";
import prisma from "./database";
import { createServiceResponse } from "../../../shared/utils";
import { StringValue } from "ms";

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly bcryptRounds: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error("JWT secrets are not defined in environment variables");
    }
  }

  async register(email: string, password: string): Promise<AuthTokens> {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw createServiceResponse("User already exists", 409);
    }

    const hashPassword = await bcrypt.hash(password, this.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword,
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createServiceResponse("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createServiceResponse("Invalid email or password", 401);
    }

    return this.generateTokens(user.id, user.email);
  }

  private async generateTokens(
    userId: string,
    email: string
  ): Promise<AuthTokens> {
    const patyload = { userId, email };
    const accessTokenOptions: SignOptions = {
      expiresIn: this.jwtExpiresIn as StringValue,
    };

    const accessToken = jwt.sign(
      patyload,
      this.jwtSecret,
      accessTokenOptions
    ) as string;

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.jwtRefreshExpiresIn as StringValue,
    };

    const refreshToken = jwt.sign(
      patyload,
      this.jwtRefreshSecret,
      refreshTokenOptions
    ) as string;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

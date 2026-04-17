import type { NextFunction, Request, Response } from "express";
import { User } from "@hilda/db";

export interface AuthenticatedRequest extends Request {
  authUser: {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
  };
}

export async function devAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const email = "dev@hilda.local";

  let user = await User.findOne({ where: { email } });

  if (!user) {
    user = await User.create({
      email,
      name: "HILDA Dev User",
      roles: ["admin"],
    });
  }

  (req as AuthenticatedRequest).authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
  };

  next();
}

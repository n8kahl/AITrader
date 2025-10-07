import type { Request, Response, NextFunction } from "express";

export function bearerAuth(req: Request, res: Response, next: NextFunction) {
  const token = process.env.API_BEARER_TOKEN;
  if (!token) return next();
  const header = req.headers.authorization || "";
  const expected = `Bearer ${token}`;
  if (header === expected) return next();
  return res.status(401).json({ error: "unauthorized" });
}

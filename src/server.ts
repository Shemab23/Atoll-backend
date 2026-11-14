import express, { Express, Request, Response } from "express";
import { db } from "./db";
import { profile } from "./db/schema/profiles";

const app: Express = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello world");
});

app.get("/users", async (req: Request, res: Response) => {
  const users = await db
    .select({ name: profile.displayName, role: profile.role })
    .from(profile);
  res.json(users);
});

app.listen(3001, () => console.log("url: http://localhost:3001"));

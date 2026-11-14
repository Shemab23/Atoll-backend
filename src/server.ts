import express, { Express, Request, Response } from "express";
import { db } from "./db";
import { profile } from "./db/schema/profiles";

export const app: Express = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello world");
});
app.get("/health", (req: Request, res: Response) => {
  res.send("the server is ok");
});

app.get("/users", async (req: Request, res: Response) => {
  const users = await db
    .select({ name: profile.displayName, role: profile.role })
    .from(profile);
  res.json(users);
});

const PORT = Number(process.env.PORT) || 3001;
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0:${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

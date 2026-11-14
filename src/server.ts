import express, { Express, Request, Response } from "express";

const app: Express = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello world");
});

app.listen(3001, () => console.log("url: http://localhost:3001"));

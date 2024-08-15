import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { router as userRouter } from "./routes/userRoutes.js";
import { router as viewRouter } from "./routes/viewRoutes.js";
import {errorHandler} from "./controllers/errorController.js";

dotenv.config({ path: "./config.env" });

const app = express();
const server = createServer(app);

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configura o Pug como engine de visualização
app.set("view engine", "pug");
app.set("views", join(__dirname, "views"));

console.log(join(__dirname, "views"));

// Configura o diretório para arquivos estáticos
app.use(express.static(join(__dirname, "public")));

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use("/", viewRouter);
app.use("/api/v1/users", userRouter);

app.use(errorHandler);

export default server;

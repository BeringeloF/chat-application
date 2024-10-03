import passport from "passport";
import passportGoogle from "passport-google-oauth20";
import User from "../db/userModel.js";
import { redis } from "./socketController.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "path";
import { dirname, join } from "node:path";
import axios from "axios";
import fs from "fs";

const GoogleStrategy = passportGoogle.Strategy;

dotenv.config({ path: "./config.env" });

const __dirname = dirname(fileURLToPath(import.meta.url));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://chat-application-n87o.onrender.com/oauth/google",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extrai os dados do perfil
        const { id, displayName, emails, photos } = profile;

        console.log(id, displayName, emails, photos);

        // Verifica se o usuário já existe
        let user = await User.findOne({ googleId: id });

        if (!user) {
          // Baixar a imagem
          const imageName = `${id}-${Date.now()}.jpg`;

          // Cria um novo usuário se ele não existir
          user = await User.create({
            googleId: id,
            name: displayName,
            email: emails[0].value,
            photo: imageName,
          });

          const imageUrl = photos[0].value;
          const imagePath = path.join(
            __dirname,
            "../public/img/users",
            imageName
          );
          const response = await axios({
            url: imageUrl,
            responseType: "stream",
          });

          // Salvar a imagem no servidor
          const writer = fs.createWriteStream(imagePath);
          response.data.pipe(writer);

          // Espera a imagem ser salva
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          const resp = await redis.get(user._id.toString());
          console.log(user._id.toString());
          console.log(resp);
          if (!resp) {
            const userObj = {
              name: user.name,
              image: user.photo,
              id: user._id.toString(),
              rooms: [],
              chatNotifications: [],
              serverNotifications: [],
            };

            await redis.set(user._id.toString(), JSON.stringify(userObj));
          } else {
            console.log(resp);
          }
        }

        done(null, user); // Passa o usuário para o Passport
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;

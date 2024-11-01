import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import helmet from 'helmet';
import * as authController from './controllers/authController.js';
import cookieParser from 'cookie-parser';
import { router as userRouter } from './routes/userRoutes.js';
import { router as viewRouter } from './routes/viewRoutes.js';
import { router as privaterRoomRouter } from './routes/privateRoomRoutes.js';
import { router as groupRoomRouter } from './routes/groupRoomRoutes.js';
import { errorHandler } from './controllers/errorController.js';
import passport from './passport-setup.js';
import { sanitizeXss } from './middleware/sanitizeXss.js';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { AppError } from './helpers/appError.js';

const app = express();
const server = createServer(app);

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configura o Pug como engine de visualização
app.set('view engine', 'pug');
app.set('views', join(__dirname, 'views'));

console.log(join(__dirname, 'views'));

// Configura o diretório para arquivos estáticos
app.use(express.static(join(__dirname, 'public')));

//setting cors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permite qualquer origem
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Métodos permitidos
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  ); // Cabeçalhos permitidos

  // Se for uma requisição OPTIONS, responde com status 200 (OK)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

//setting security headers
app.use(helmet());
//parsing the cookies
app.use(cookieParser());

app.use(passport.initialize());

// parsing the body
app.use(express.json({ limit: '10kb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);

app.use(sanitizeXss);

app.use(compression());

app.use(ExpressMongoSanitize());

app.use('/', viewRouter);

app.get(
  '/oauth/google',
  passport.authenticate('google', { session: false }),
  authController.loginWithGoogle
);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/chats', privaterRoomRouter);
app.use('/api/v1/groups', groupRoomRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});

function fatalHandler(err) {
  console.log('------------------------------');
  console.log('uncaughtException or unhandledRejection SHUTING DOWN');
  console.log(err.name, err.message);
  process.exit(1);
}
process.on('uncaughtException', fatalHandler);
process.on('unhandledRejection', fatalHandler);

app.use(errorHandler);

export default server;

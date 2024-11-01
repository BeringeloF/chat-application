import { promisify } from 'util';
import User from '../db/userModel.js';
import catchAsync from '../helpers/catchAsync.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../helpers/appError.js';

import { redis } from './socketController.js';
import xssFilters from 'xss-filters';
import GroupRoom from '../db/groupRoomModel.js';
import PrivateRoom from '../db/userToUserRoomModel.js';

const singToken = (id, refresh = false) => {
  if (!refresh) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      //Esta opcao serve para dizer por quanto tempo o token sera valido, ou seja assim que acabar a validade o user sera logout
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

/**
 *
 * @param {object} user userDocument
 * @param {number} statusCode
 * @param {object} res response Object
 * @param {boolean} sendResponse True by defualt. if false won´t send the response to the client
 *
 */
const createSendToken = function (user, statusCode, res, redirect = false) {
  const token = singToken(user._id);

  //Aqui nos iremos implementar cookies, eles sao texto que nos envimos com alguma informaçao sensivel que apenas o navegador pode acessar e nao pode ser modificado
  //Ex nosso json web token

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIES_EXPIRES_IN) * 60 * 1000
    ),
    secure: true,
    httpOnly: true,
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  if (redirect) {
    res.redirect('/');
  }

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const singup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: xssFilters.inHTMLData(req.body.name),
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const userObj = {
    name: newUser.name,
    image: newUser.photo,
    id: newUser._id.toString(),
    rooms: [],
    chatNotifications: [],
    serverNotifications: [],
  };

  await redis.set(
    newUser._id.toString(),
    JSON.stringify(userObj),
    'EX',
    60 * 60 * 24 * 5
  );

  createSendToken(newUser, 201, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //verify if email and password are exist
  if (!email || !password)
    return next(new AppError('missing email or password!', 400));
  console.log(email);
  const user = await User.findOne({ email: email }).select('+password');

  //check if email exist and password is correct
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('incorrect email or password!', 400));

  const resp = await redis.get(user._id.toString());

  //if user does not exist on redis, get the user data from mongoDB and save on redis
  if (!resp) {
    const id = user._id;
    const [groupRooms, privateRooms] = await Promise.all([
      GroupRoom.find({ participants: new mongoose.Types.ObjectId(id) }),
      PrivateRoom.find({
        'participants.user': new mongoose.Types.ObjectId(id),
      }),
    ]);

    const userObj = {
      name: user.name,
      image: user.photo,
      id: user._id.toString(),
      rooms: [
        ...groupRooms.map((el) => el._id),
        ...privateRooms.map((el) => el._id),
      ],
      chatNotifications: user.chatNotifications,
      serverNotifications: user.serverNotifications,
    };

    await redis.set(
      user._id.toString(),
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    );
  }
  // if everything is correct send access token
  createSendToken(user, 200, res);
});

export const loginWithGoogle = catchAsync(async (req, res, next) => {
  createSendToken(req.user, 200, res, true);
});

export const logout = catchAsync(async (req, res, next) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 500),
    secure: true,
    httpOnly: true,
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', 'logout', cookieOptions);
  res.status(200).send('loging out');
});

export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) return res.redirect('/login');
  console.log(token);
  //verification token
  //Aqui nos iremos verificar se o token e valido usando o verify que aceita como primeiro argumento o token e segundo o secret
  //E como terceiro argumento uma callback function que é executada assim que sua acao for finalizada ou seja este verify é um aync method
  //como nos estamos usando async await nos podemos promissify este metodo
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if the user still exist
  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    return next(
      new AppError('the user belonging to this token no loger exist', 401)
    );

  //cheke if the user change password after the token was issued
  //Aqui nos checamos se o usuario mudou a senha depois do toker ter sido emitido, neste caso
  // nos nao quermos liberar o accesso a  este usuario
  //no fazemos isso usando o instace metodo que nos criamos e passomos nele o timestamp de quando o token foi criado

  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently chanded password!, please log in again', 401)
    );

  //granted access to the protected route
  //caso tenha checado ate sem erro significa que podemos liberar o acesso ao user
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

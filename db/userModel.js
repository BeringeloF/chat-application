import mongoose from "mongoose";
import crypto from "crypto";
import validator from "validator";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provid a name"],
  },
  email: {
    type: String,
    required: [true, "Please provid an email"],
    unique: true,
    lowerCase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },

  phone: {
    type: String,
    unique: true,
    validate: [validator.isMobilePhone],
  },
  password: {
    type: String,
    required: [true, "Please provid a password"],
    minLength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  photo: {
    type: String,
    default: "default.jpg",
  },

  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      //ISSO APENAS FUNCIONA EM SAVE/CREATE  E NAO EM UPDATE
      validator: function (val) {
        return this.password === val;
      },
      message: "Passwords are not the same!",
    },
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,

  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: Date,
});

//quando trabalhamos como senhas nos nunca devemos deixalas amostra no dataBase por isso nos iremos criptogafar a senha antes de
//salva-la no database
//Para isso nos usamos um algoritomo para  criptogafar neste caso o bcript
userSchema.pre("save", async function (next) {
  //em todo documento nos temos acesso a uma propriedade chamada isModified() que diz se documeto foi modificado

  if (!this.isModified("password")) next();
  //é aqui onde é feito a criptografia da senha, nos usamo hash que aceita como primeiro parametro a string e como segundo
  //pode pode ser dizer o nivel da criptografia que é padra ser 10 quanto maior o numero melhor a segurança mais tambem
  //vai necessitar mais uso do cpu
  this.password = await bcrypt.hash(this.password, 12);

  //delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

//middleware para setar o horario de modificaçao da senha
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  //Aqui nos usamos menos 1000 ms pois, o servidor pode demorar um tempo para chegar ate esta parte, emtao para que o codigo funcione corrretamente
  //Nos tiramos um segundo para garantir
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//Query middleware para nao mostrar usuarios nao ativos
userSchema.pre(/^find/, function (next) {
  //como este é um query middleware o this aponta para o queryObj

  this.find({ active: { $ne: false } });
  next();
});

//Aqui nos iremos criar um instance method no userSchme
//Este metodo serve para verificar se a senha fornecida esta correta
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  //Primeiro checar se a senha foi mudada
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);

    //retornar true se a data em que token foi criado é menor do que a data em que a senha foi modificada
    //e neste caso como o token foi emitido antes da senha ser modificada nos NAO iremos liberar o acesso
    //CASO RETORNE FALSE, NESTE CASO NOS IREMOS LEBERAR O ACESSO, ja que o token foi emitido depois da senha ser alterada
    return JWTTimestamp < changedTimestamp;
  }

  //Por padrao retorna false
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //Por nao ser realmente uma senha nos nao precisamos criar uma cryptografia muito forte entao podemos criar este token com built in module crypto
  //Porem por este token funcionar como uma especie de senha ainda não é bom deixar amostra sem protecao estao iremo cryptografa-lo ainda

  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = new mongoose.model("User", userSchema);

export default User;

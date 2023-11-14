const mongoose = require("mongoose");
const User = require("../models/User");
const OrderItem = require("../models/OrderItem");
const Order = require("../models/Order");
const JWT = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/index");
const sendEmail = require("../utils/sendMail");
const bcrypt = require("bcryptjs");
const emailExistence = require("email-existence");
const Otp = require("../models/Otp");
const moment = require("moment");
const encodeToken = (userId) => {
  return JWT.sign(
    {
      iss: "Duong",
      sub: userId, // sub 1 truong duy nhat phan biet cac user
      iat: new Date().getTime(),
      exp: new Date().setDate(new Date().getDate() + 7), // set thoi gian het han token
    },
    JWT_SECRET
  );
};

const signUp = async (req, res, next) => {
  const { username, email, admin, password } = req.body;
  // check if there is o user with the some user
  const foundUser = await User.findOne({ email });
  // console.log(foundUser);
  if (foundUser)
    return res
      .status(403)
      .json({ error: { message: "Email is already in use" } });
  const foundUserName = await User.findOne({ username });
  // console.log(foundUser);
  if (foundUserName)
    return res
      .status(403)
      .json({ error: { message: "UserName is already in use" } });
  const newUser = new User({ username, email, admin, password });
  console.log("new User", newUser);
  newUser
    .save()
    .then(() => {
      console.log("thanh cong");
    })
    .catch((error) => {
      console.log(error);
    });
  const token = encodeToken(newUser._id);
  res.setHeader("Authorization", token);
  return res.status(201).json({ success: true });
};

const signin = async (req, res, next) => {
  // assign a token
  const token = encodeToken(req.user._id); // user nay duoc nhan tu ben passport o ham done
  res.setHeader("Authorization", token);
  // console.log(req.user);
  return res.status(200).json({ success: true, token: token, info: req.user });
};

const secret = async (req, res, next) => {
  const users = await User.findById(req.user._id);
  //    console.log(users);

  return res
    .status(200)
    .json({ resourse: true, _id: users._id, username: users.username });
};

const getUser = async (req, res, next) => {
  try {
    const users = await User.find({}).lean();
    // console.log(users)
    res.status(200).json({ success: true, users, total: users.length });
  } catch (error) {
    next(error);
  }
};

const getUserBin = async (req, res, next) => {
  try {
    const users = await User.findWithDeleted({ deleted: true }).lean();
    // console.log(users)
    res.status(200).json({ success: true, users, total: users.length });
  } catch (error) {
    next(error);
  }
};
const deleteUser = async (req, res, next) => {
  try {
    const { _id } = { ...req.body };
    // console.log("_id ",_id)
    await User.delete({ _id: _id });
    const orderId = await Order.find({ user: _id });
    await OrderItem.delete({ order: { $in: orderId } });
    await Order.delete({ user: _id });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const { _id } = { ...req.body };
    await User.restore({ _id: _id, deleted: true });
    // const user= await User.find({_id})
    const orderId = await Order.find({ user: _id });
    await OrderItem.restore({ order: { $in: orderId } });
    await Order.restore({ user: _id });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const resetPass = async (req, res, next) => {
  try {
    const { userId, currentPass, newPass } = { ...req.body };
    const userFound = await User.findById(userId);
    if (!userFound || !userFound._id) {
      var err = new Error("User not exists!");
      err.status(404);
      return next(err);
    }

    const isCorrectPassword = await userFound.isValidPassword(currentPass);
    if (!isCorrectPassword) {
      var err = new Error("Current password is not correct!");
      err.status(404);
      return next(err);
    }
    console.log("ok");
    const salt = await bcrypt.genSalt(10);
    // generate a password hash (salt + hash)
    const passwordHashed = await bcrypt.hash(newPass, salt);
    console.log("passwordH :", passwordHashed);
    // console.log("new Pass: ", newPass)
    await User.findByIdAndUpdate(userId, {
      $set: { password: passwordHashed },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

const editAvatar = async (req, res, next) => {
  const { userId, avatar } = { ...req.body, ...req.params };
  console.log("userId: ", userId);
  const docFound = await User.findById(userId);
  if (!docFound || !docFound._id) {
    var err = new Error("User not exists!");
    res.status(404);
    return next(err);
  }
  if (avatar.trim().length < 1) {
    var err = new Error("Incorrect format !");
    res.status(404);
    return next(err);
  }
  const docUpdate = await User.findByIdAndUpdate(
    userId,
    { avatar },
    { new: true }
  );
  return res.status(200).json({ success: true, docUpdate });
};

const sendOtp = async (req, res, next) => {
  try {
    console.log("call senotp")
    const { email } = { ...req.body };
    const docFound = await User.findOne({ email });
    if (!docFound || !docFound._id) {
      var err = new Error("Email not exists!");
      res.status(404);
      return next(err);
    }
    console.log("email: ",email)
    const string =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let OTP = "";
    const len = string.length;
    for (let i = 0; i < 6; i++) {
      OTP += string[Math.floor(Math.random() * len)];
    }
    let otp = await Otp.findOne({ user: docFound._id });

    if (otp && otp._id) {
      const dateNow = new Date().getTime();
      const dateUpdated = new Date(otp.updatedAt.toLocaleString()).getTime();
      const newDate = dateNow - dateUpdated;
      if (newDate / 1000 < 120) {
        var err = new Error("you can only get otp every 2 minutes");
        res.status(404);
        return next(err);
      }
      otp.otp = OTP;
      otp.save();
    } else {
      otp = await new Otp({
        user: docFound._id,
        otp: OTP,
      }).save();
    }

    // await setTimeout(()=>{
    //     console.log("ok")
    // },5000)
     await sendEmail(email, "OTP forgot password",OTP);
    res.status(200).json({ success: true });
  } catch (error) {
    // console.log(error);
    next(error);
  }
};

const forgotPass = async (req, res, next) => {
  try {
    const { email, otp, newPass } = { ...req.body };
    const userFound = await User.findOne({ email });
    if (!userFound || !userFound._id) {
      var err = new Error("user not exists!");
      res.status(404);
      return next(err);
    }
    const otpFound = await Otp.findOne({ user: userFound._id });
    if (!otpFound || !otpFound._id) {
      var err = new Error("otp not exists!");
      res.status(404);
      return next(err);
    }
    if (otpFound.otp.toString() !== otp.toString()) {
      var err = new Error("Incorrect otp!");
      res.status(404);
      return next(err);
    }
    const salt = await bcrypt.genSalt(10);
    // generate a password hash (salt + hash)
    const passwordHashed = await bcrypt.hash(newPass, salt);
    await Otp.deleteOne({user:userFound._id})
    await User.findByIdAndUpdate(userFound._id, {
      $set: { password: passwordHashed },
    });
    res.status(200).json({success:true,message:"Change password successfully"})
  } catch (error) {
    next(error);
  }
};
module.exports = {
  signUp,
  signin,
  secret,
  getUser,
  deleteUser,
  getUserBin,
  restoreUser,
  resetPass,
  editAvatar,
  sendOtp,
  forgotPass
};

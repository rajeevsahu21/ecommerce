import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import {
  logInBodyValidation,
  signUpBodyValidation,
} from "../utils/validationSchema.js";
import sendEmail from "../utils/sendEmail.js";

const login = async (req, res) => {
  try {
    const { error } = logInBodyValidation(req.body);
    if (error) {
      return res
        .status(400)
        .json({ status: "failure", message: error.details[0].message });
    }
    const user_name = req.body.user_name.replace(/\s/g, "").toLowerCase();
    const user = await User.findOne(
      { user_name, deletedAt: { $exists: false } },
      { name: 1, user_name: 1, status: 1, password: 1 }
    );
    if (!user) {
      return res
        .status(404)
        .json({ status: "failure", message: "User does not exist" });
    }
    if (user.status != "active") {
      return res.status(400).send({
        status: "failure",
        message: "Pending Account. Please Verify Your Email",
      });
    }
    const verifiedPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!verifiedPassword) {
      return res.status(400).json({
        status: "failure",
        message: "Incorrect user name or password",
      });
    }
    const token = await generateToken(user);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      accesstoken: token,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const signUp = async (req, res) => {
  try {
    const { error } = signUpBodyValidation(req.body);
    if (error) {
      return res
        .status(400)
        .json({ status: "failure", message: error.details[0].message });
    }
    const { password, verification_code: otp, name } = req.body;
    if (!password && !otp) {
      return res.status(400).json({
        status: "failure",
        message: "Password or verification code is missing",
      });
    }
    const user_name = req.body.user_name.replace(/\s/g, "").toLowerCase();
    const oldUser = await User.findOne({
      user_name,
      deletedAt: { $exists: false },
    });
    if (password) {
      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const hashPassword = await bcrypt.hash(password, salt);
      const confirmationCode = generateOTP(6);
      if (!oldUser) {
        await User.create({
          name,
          user_name,
          password: hashPassword,
          confirmationCode,
          confirmationExpires: Date.now() + 300000,
        });
      } else if (oldUser.status === "active") {
        return res.status(400).json({
          status: "failure",
          message: "User account already exist",
        });
      } else {
        oldUser.password = hashPassword;
        oldUser.confirmationCode = confirmationCode;
        oldUser.confirmationExpires = Date.now() + 300000;
        await oldUser.save();
      }
      const mailOptions = {
        from: `"no-reply" ${process.env.FROM_EMAIL_ADDRESS}`,
        to: user_name,
        subject: "Please confirm your account",
        text: `your account confirmation code is ${confirmationCode}`,
      };
      sendEmail(mailOptions);

      return res.status(201).json({
        status: "success",
        message:
          "Signup request successful. Verification code sent to email address",
      });
    }
    if (!oldUser) {
      return res
        .status(400)
        .json({ status: "failure", message: "User does not exist" });
    }
    if (
      oldUser.confirmationCode !== otp ||
      oldUser.confirmationExpires < Date.now()
    ) {
      return res.status(400).json({
        status: "failure",
        message: "Verification code is incorrect or expired",
      });
    }
    oldUser.confirmationExpires = null;
    oldUser.confirmationCode = null;
    oldUser.status = "active";
    await oldUser.save();
    const token = await generateToken(oldUser);
    res.status(201).json({
      status: "success",
      message: "User confirmation successful",
      accesstoken: token,
      user: oldUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { error } = signUpBodyValidation(req.body);
    if (error) {
      return res
        .status(400)
        .json({ status: "failure", message: error.details[0].message });
    }
    const user_name = req.body.user_name.replace(/\s/g, "").toLowerCase();
    const user = await User.findOne({
      user_name,
      deletedAt: { $exists: false },
    });
    if (!user) {
      return res
        .status(404)
        .json({ status: "failure", message: "User does not exist" });
    }
    if (!req.body.password && !req.body.verification_code) {
      const confirmationCode = generateOTP(6);
      user.confirmationCode = confirmationCode;
      user.confirmationExpires = Date.now() + 300000;
      user.save();
      const mailOptions = {
        from: `"no-reply" ${process.env.FROM_EMAIL_ADDRESS}`,
        to: user_name,
        subject: "Password Change Request",
        text: `your password change verification code is ${confirmationCode}`,
      };
      sendEmail(mailOptions);
      return res.status(200).json({
        status: "success",
        message: "You will get a verification code on your registered",
      });
    }
    const { verification_code: otp, password } = req.body;
    if (!password || !otp) {
      return res.status(400).json({
        status: "failure",
        message: "Password or verification code is missing",
      });
    }
    if (user.confirmationCode !== otp || user.confirmationExpires < Date.now())
      return res.status(400).json({
        status: "failure",
        message: "Verification code is incorrect or expired",
      });
    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(password, salt);
    user.password = hashPassword;
    user.confirmationCode = null;
    user.confirmationExpires = null;
    user.status = "active";
    await user.save();
    res.status(200).json({
      status: "success",
      message: "Forgot password confirmation successful",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

export { login, signUp, forgotPassword, generateOTP };

const generateToken = async (user) => {
  try {
    const payload = { _id: user._id };
    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_PRIVATE_KEY, {
      expiresIn: "30d",
    });

    return Promise.resolve(token);
  } catch (err) {
    return Promise.reject(err);
  }
};

const generateOTP = (otpLength) => {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < otpLength; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

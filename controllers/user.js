import sendEmail from "../utils/sendEmail.js";
import { generateOTP } from "./auth.js";

const getUser = async (req, res) => {
  try {
    const { _id: user_id, name, user_name, status } = req.user;
    res.status(200).json({ user_id, name, user_name, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;
    user.name = name;
    user.save();
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { verification_code: otp } = req.query;
    const user = req.user;
    if (!otp) {
      const otp = generateOTP(6);
      user.confirmationCode = otp;
      user.confirmationExpires = Date.now() + 300000;
      user.save();
      const mailOptions = {
        from: `"no-reply" ${process.env.FROM_EMAIL_ADDRESS}`,
        to: user.user_name,
        subject: "Account Deletion Request",
        text: `your account deletion request verification code is ${otp}`,
      };
      sendEmail(mailOptions);
      return res.status(200).json({
        status: "success",
        message: "Verification code sent",
      });
    }
    if (
      user.confirmationCode !== otp ||
      user.confirmationExpires < Date.now()
    ) {
      return res.status(400).json({
        status: "failure",
        message: "Verification code is incorrect",
      });
    }
    user.deletedAt = new Date();
    user.confirmationCode = null;
    user.confirmationExpires = null;
    user.save();
    res.status(200).json({ status: "success", message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

export { getUser, updateUser, deleteUser };

import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";

import { promisify } from "util";
import sendEmail from "../../common/utils/email.js";
import User from "./../user/user_model.js";
import crypto from "crypto";

const signAccessToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  });
};

const createSendToken = async (user, statusCode, res) => {
  const access_token = signAccessToken(user._id);
  const refresh_token = signRefreshToken(user._id);

  user.refresh_token = refresh_token;
  user.access_token = access_token;
  await user.save({ validateBeforeSave: false });

  user.password = undefined;
  user.__v = undefined;
  const expiresAt = new Date(
    Date.now() + parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN) * 1000,
  ).toISOString();

  res.status(statusCode).json({
    status: "success",
    data: {
      user_id: user._id,
      username: user.name,
      email: user.email,
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: expiresAt,
      role: user.role,
      active: user.active,
      is_verified: user.is_verified,
    },
    message: "Login Success!",
  });
};

const generateAndSendOTP = async (user, method = "email") => {
  const otp = user.createVerificationOTP(method);
  await user.save({ validateBeforeSave: false });

  console.log(otp);

  // await sendEmail({
  //   email: user.email,
  //   subject: "Your Email Verification OTP",
  //   message: `Your OTP is ${otp}. It will expire in 10 minutes.`,
  // });

  await sendEmail({
    email: user.email,
    subject: "Your Email Verification OTP",
    message: `
Hello,

Your OTP is ${otp}. It will expire in 10 minutes.

Click the link below to verify your email automatically:

https://bot3a.github.io/verifyEmail?email=${user.email}&otp=${otp}
`,
  });

  return otp;
};

const AuthController = {
  token: catchAsync(async (req, res, next) => {
    const refresh_token = req.body.refresh_token;
    if (!refresh_token) {
      return next(new AppError("No token Provided", 401));
    }
    const user = await User.findOne({ refresh_token });
    if (!user) {
      return next(new AppError("Invalid User Token", 401));
    }

    try {
      const decoded = await promisify(jwt.verify)(
        refresh_token,
        process.env.JWT_REFRESH_TOKEN_SECRET,
      );
      if (decoded.id !== user._id.toString()) {
        return next(new AppError("Token is invalid or expired", 403));
      }
    } catch (err) {
      return next(new AppError("Token is invalid or expired", 403));
    }

    const newAccessToken = signAccessToken(user._id);
    res.status(200).json({
      status: "success",
      access_token: newAccessToken,
      message: "",
    });
  }),

  //Token Res
  signIn: catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password!", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    if (!user.is_verified) {
      return next(new AppError("Please verify your account first", 403));
    }

    createSendToken(user, 200, res);
  }),
  verifyAccount: catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email,
      verificationOTP: hashedOTP,
      verificationOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    user.is_verified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    user.verificationMethod = undefined;

    await user.save({ validateBeforeSave: false });
    createSendToken(user, 200, res);
  }),

  signUp: catchAsync(async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;

    if (!name || !email || !password || !passwordConfirm) {
      return next(new AppError("All fields are required", 400));
    }

    if (password !== passwordConfirm) {
      return next(new AppError("Passwords do not match!", 400));
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(
        new AppError("User already exists. Please login instead.", 409),
      );
    }

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      passwordConfirm,
      authProvider: "local",
    });

    await generateAndSendOTP(newUser);

    res.status(201).json({
      status: "success",
      message: "Account created. OTP sent to email.",
    });
  }),

  googleSignUp: catchAsync(async (req, res, next) => {
    const { uid, name, email, photoUrl, phoneNumber } = req.body;

    if (!uid || !email || !name) {
      return next(new AppError("UID, name, and email are required", 400));
    }

    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    // 🆕 CREATE GOOGLE USER
    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        phoneNumber,
        photo: photoUrl,
        authProvider: "google",
        firebaseUid: uid,
        is_verified: true,
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = uid;
      user.authProvider = "google";
      user.is_verified = true;

      if (photoUrl) user.photo = photoUrl;

      await user.save({ validateBeforeSave: false });
    }
    if (!user.active) {
      return next(new AppError("Account is disabled.", 429));
    }

    createSendToken(user, 200, res);
  }),

  resendOTP: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const cooldownPeriod =
      process.env.NODE_ENV === "development" ? 5 * 1000 : 10 * 1000;

    const now = new Date();

    // Attempt atomic update if cooldown passed or not set
    const user = await User.findOneAndUpdate(
      {
        email,
        $or: [
          { lastOTPRequestedAt: { $lt: new Date(now - cooldownPeriod) } },
          { lastOTPRequestedAt: { $exists: false } },
        ],
      },
      { lastOTPRequestedAt: now },
      { new: true },
    );

    if (!user) {
      // Fetch user to check remaining cooldown
      const existingUser = await User.findOne({ email });

      if (!existingUser) {
        return next(new AppError("No user found with this email.", 404));
      }

      const lastRequested = existingUser.lastOTPRequestedAt
        ? new Date(existingUser.lastOTPRequestedAt).getTime()
        : 0;

      const waitTime = Math.ceil(
        (cooldownPeriod - (now.getTime() - lastRequested)) / 1000,
      );

      if (waitTime > 0) {
        return next(
          new AppError(
            `Please wait ${waitTime} seconds before requesting a new OTP.`,
            429,
          ),
        );
      }

      // Edge case: lastOTPRequestedAt exists but cooldown passed
      existingUser.lastOTPRequestedAt = now;
      await existingUser.save();

      await generateAndSendOTP(existingUser);

      return res.status(200).json({
        status: "success",
        message: "OTP sent successfully. Cooldown started.",
      });
    }

    // Send OTP if atomic update succeeded
    await generateAndSendOTP(user);

    res.status(200).json({
      status: "success",
      message: "OTP sent successfully. Cooldown started.",
    });
  }),

  /* ///////////////////NEED REFACTOR/////////////////////////////////////////////// */

  resetPassword: catchAsync(async (req, res, next) => {
    const { email, otp, password, passwordConfirm } = req.body;

    if (!email || !otp || !password || !passwordConfirm) {
      return next(
        new AppError(
          "Email, OTP, password and confirm password are required",
          400,
        ),
      );
    }

    if (password !== passwordConfirm) {
      return next(new AppError("Passwords do not match", 400));
    }

    const hashedOTP = createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      verificationOTP: hashedOTP,
      verificationOTPExpires: { $gt: Date.now() },
    });

    // const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    // const user = await User.findOne({
    //   email,
    //   passwordResetOTP: hashedOTP,
    //   passwordResetOTPExpires: { $gt: Date.now() },
    // });

    if (!user) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    // ✅ Update password
    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    user.lastOTPRequestedAt = undefined;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password reset Successful",
    });
  }),

  forgotPassword: catchAsync(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError("No user found with this email", 404));
    }

    const OTP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
    const OTP_EXPIRE_MS = 10 * 60 * 1000; // 10 minutes

    // ⏱ Cooldown check
    if (
      user.lastOTPRequestedAt &&
      Date.now() - user.lastOTPRequestedAt < OTP_COOLDOWN_MS
    ) {
      return next(
        new AppError("Please wait 5 minutes before requesting a new OTP", 429),
      );
    }

    // 🔢 Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔒 Hash OTP
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    // ✅ Save hashed OTP and expiry in correct fields
    user.verificationOTP = hashedOTP;
    user.verificationOTPExpires = Date.now() + OTP_EXPIRE_MS;
    user.lastOTPRequestedAt = Date.now();

    await user.save({ validateBeforeSave: false });

    const message = `
    Your password reset OTP is: ${otp}

    This OTP is valid for 10 minutes.
    If you did not request this, please ignore this email.
  `;
    console.log("Email:", user.email);
    console.log("OTP (send to email):", otp);

    try {
      // await sendEmail({
      //   email: user.email,
      //   subject: "Password Reset OTP",
      //   message,
      // });

      res.status(200).json({
        status: "success",
        message: "OTP sent to email",
      });
    } catch (err) {
      // rollback: use correct fields
      user.verificationOTP = undefined;
      user.verificationOTPExpires = undefined;
      user.lastOTPRequestedAt = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new AppError("Failed to send OTP. Try again later.", 500));
    }
  }),

  /* ///////////////////NEED REFACTOR/////////////////////////////////////////////// */

  protect: catchAsync(async (req, res, next) => {
    // 1) Get token from headers
    let access_token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      access_token = req.headers.authorization.split(" ")[1];
    }

    if (!access_token) {
      return next(new AppError("You are not logged in. Please log in!", 401));
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = await promisify(jwt.verify)(
        access_token,
        process.env.JWT_ACCESS_TOKEN_SECRET,
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AppError("JWT expired. Please log in again.", 401));
      }
      if (err.name === "JsonWebTokenError") {
        return next(new AppError("Invalid token. Please log in.", 401));
      }
      return next(err); // fallback for unexpected errors
    }

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).select(
      "+stripeCustomerId",
    );
    if (!currentUser) {
      return next(
        new AppError("User for this access token no longer exists!", 401),
      );
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changePasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "User recently changed password. Please log in again.",
          401,
        ),
      );
    }

    // Grant access
    req.user = currentUser;
    next();
  }),

  restrictTo: (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        console.log("Current user role:", req.user.role);
        return next(
          new AppError("You dont have permission to perform this action.", 403),
        );
      }
      next();
    };
  },

  logout: catchAsync(async (req, res, next) => {
    const refresh_token = req.body.refresh_token;
    if (!refresh_token) return res.sendStatus(204);

    const user = await User.findOne({ refresh_token });

    if (!user) return res.sendStatus(204);

    user.refresh_token = null;
    user.access_token = null;
    await user.save({ validateBeforeSave: false });

    res.sendStatus(200);
  }),
};

export default AuthController;

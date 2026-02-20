import { randomBytes, createHash } from "crypto";
import { Schema, model } from "mongoose";
import { hash, compare } from "bcryptjs";
import validator from "validator";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter name"],
    },

    email: {
      type: String,
      required: [true, "Please enter email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },

    photo: String,
    phoneNumber: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    firebaseUid: {
      type: String,
      select: false,
    },
    stripeCustomerId: {
      type: String,
      select: false,
    },

    password: {
      type: String,
      minlength: 5,
      select: false,
    },

    passwordConfirm: {
      type: String,
      validate: {
        validator: function (el) {
          if (!this.password) return true; // Google users
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },

    passwordChangedAt: Date,

    /* ============== PASSWORD RESET ============== */

    passwordResetToken: String,
    passwordResetExpires: Date,

    /* ============== VERIFICATION ============== */

    verificationOTP: String,
    verificationOTPExpires: Date,
    lastOTPRequestedAt: {
      type: Date,
      select: false,
    },
    verificationMethod: {
      type: String,
      enum: ["email", "phone"],
      default: "email",
    },

    is_verified: {
      type: Boolean,
      default: false,
    },

    /* ============== TOKENS ============== */

    access_token: {
      type: String,
      select: false,
    },

    refresh_token: {
      type: String,
      select: false,
    },

    /* ============== STATUS ============== */

    active: {
      type: Boolean,
      default: true,
    },
  },
  mongooseOptions,
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await hash(this.password, 10);
  this.passwordConfirm = undefined;

  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});
userSchema.pre("validate", function (next) {
  if (this.authProvider === "local" && !this.password) {
    this.invalidate("password", "Password is required");
  }
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.createVerificationOTP = function (method = "email") {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.verificationOTP = createHash("sha256").update(otp).digest("hex");

  this.verificationOTPExpires = Date.now() + 60 * 60 * 1000;
  this.verificationMethod = method;
  this.lastOTPRequestedAt = Date.now();

  return otp;
};

userSchema.methods.correctPassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await compare(candidatePassword, this.password);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    return JWTTimestamp < this.passwordChangedAt.getTime() / 1000;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = randomBytes(32).toString("hex");

  this.passwordResetToken = createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = model("User", userSchema);

export default User;

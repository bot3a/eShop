import factory from "../../common/controllers/handler_controller.js";
import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "./../../common/utils/appError.js";
import User from "./user_model.js";

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

const UserController = {
  getUser: catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("Document doesn't exist!", 404));
    }

    res.status(200).json({
      status: "success",
      data: user,
      message: "User fetched successfully.",
    });
  }),

  updateUser: catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError("Route not for password. Use /updateMyPassword", 400),
      );
    }
    const filteredBody = filterObj(
      req.body,
      "name",
      "email",
      "photo",
      "phoneNumber",
    );

    const user = req.params.id || req.user._id;

    const updatedUser = await User.findByIdAndUpdate(user, filteredBody, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: "success",
      data: updatedUser,
      message: "User Updated Succesfully",
    });
  }),

  deleteMe: catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
      status: "success",
      data: null,
    });
  }),

  updateUserPassword: catchAsync(async (req, res, next) => {
    const { password, passwordConfirm, passwordCurrent } = req.body;
    if (!password || !passwordConfirm || !passwordCurrent) {
      return next(new AppError("Password Fields missing", 401));
    }
    if (password != passwordConfirm) {
      return next(new AppError("Password dont match!", 401));
    }
    const user = await User.findById(req.user.id).select("+password");

    if (
      !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return next(new AppError("Your password is wrong!", 401));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user, 200, res);
  }),

  deleteUser: catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { active: false });
    res.status(204).json({
      status: "success",
      data: null,
    });
  }),

  getAllUsers: factory.getAllUsers(User, "+active"),

  activeUser: catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { active: true });
    res.status(200).json({
      status: "success",
      data: null,
    });
  }),
  getAllUsers: factory.getAllUsers(User, "+active"),
};

export default UserController;

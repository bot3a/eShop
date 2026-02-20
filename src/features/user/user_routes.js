import { Router } from "express";
import AuthController from "./../auth/auth_controller.js";
import UserController from "./user_controller.js";
const UserRoutes = Router();

UserRoutes.use(AuthController.protect);

UserRoutes.route("/me")
  .get(UserController.getUser)
  .patch(UserController.updateUser)
  .delete(UserController.deleteMe);

UserRoutes.patch("/updateMyPassword", UserController.updateUserPassword);

UserRoutes.use(AuthController.restrictTo("admin"));

UserRoutes.route("/:id")
  .get(UserController.getUser)

  .patch(UserController.updateUser)
  .patch(UserController.activeUser)
  .delete(UserController.deleteUser);

UserRoutes.route("/").get(UserController.getAllUsers);
export default UserRoutes;

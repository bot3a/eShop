import { Router } from "express";
import AddressController from "./address_controller.js";
import AuthController from "./../auth/auth_controller.js";

const AddressRoutes = Router();

// Protect all routes
AddressRoutes.use(AuthController.protect);

// User addresses
AddressRoutes.route("/me")
  .get(AddressController.getMyAddresses)
  .post(AddressController.createAddress);

AddressRoutes.route("/:id")
  .get(AddressController.getAddress)
  .patch(AddressController.updateAddress)
  .delete(AddressController.deleteAddress);

// Set default
AddressRoutes.patch("/:id/set-default", AddressController.setDefaultAddress);

// Admin route: get all addresses of all users
AddressRoutes.get(
  "/admin/all",
  AuthController.restrictTo("admin"),
  AddressController.getAllAddressForAdmin,
);

export default AddressRoutes;

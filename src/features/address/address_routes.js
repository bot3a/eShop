import { Router } from "express";
import AddressController from "./address_controller.js";
import AuthController from "./../auth/auth_controller.js";

const AddressRoutes = Router();

AddressRoutes.use(AuthController.protect);

AddressRoutes.route("/me")
  .get(AddressController.getMyAddresses)
  .post(AddressController.createAddress);

AddressRoutes.route("/:id")
  .get(AddressController.getAddress)
  .patch(AddressController.updateAddress)
  .delete(AddressController.deleteAddress);

AddressRoutes.patch("/:id/set-default", AddressController.setDefaultAddress);

AddressRoutes.use(AuthController.restrictTo("admin"));

AddressRoutes.get("/admin/all", AddressController.getAllAddressForAdmin);

export default AddressRoutes;

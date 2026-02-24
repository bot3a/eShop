import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import Address from "./address_model.js";

const MAX_ADDRESS = 5;

const AddressController = {
  getMyAddresses: catchAsync(async (req, res, next) => {
    const addresses = await Address.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      status: "success",
      data: addresses,
      message: addresses.length ? undefined : "Your address list is empty",
    });
  }),

  getAllAddressForAdmin: catchAsync(async (req, res, next) => {
    const addresses = await Address.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      data: addresses,
      message: "Address Fetch successfully!",
    });
  }),

  getAddress: catchAsync(async (req, res, next) => {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!address) return next(new AppError("Address not found", 404));

    res.status(200).json({
      status: "success",
      data: address,
    });
  }),

  createAddress: catchAsync(async (req, res, next) => {
    const addressCount = await Address.countDocuments({ user: req.user._id });
    if (addressCount >= MAX_ADDRESS) {
      return next(
        new AppError(`You can only have ${MAX_ADDRESS} addresses`, 400),
      );
    }

    const makeDefault = addressCount === 0 || req.body.is_default || false;

    if (makeDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { is_default: false },
        { runValidators: true },
      );
    }

    req.body.user = req.user._id;
    req.body.is_default = makeDefault;

    const address = await Address.create(req.body);

    res.status(201).json({
      status: "success",
      data: address,
    });
  }),

  updateAddress: catchAsync(async (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(
        new AppError("Please provide address details to update", 400),
      );
    }

    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) return next(new AppError("Address not found", 404));

    if (req.body.is_default) {
      await Address.updateMany(
        { user: req.user._id },
        { is_default: false },
        { runValidators: true },
      );
      address.is_default = true;
    } else {
      const defaultCount = await Address.countDocuments({
        user: req.user._id,
        is_default: true,
      });
      if (
        defaultCount === 1 &&
        address.is_default &&
        req.body.is_default === false
      ) {
        req.body.is_default = true;
      }
    }

    const allowedFields = [
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "postalCode",
      "country",
      "optionalRemarks",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) address[field] = req.body[field];
    });

    await address.save();

    const allAddresses = await Address.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      data: allAddresses,
    });
  }),

  deleteAddress: catchAsync(async (req, res, next) => {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!address) return next(new AppError("Address not found", 404));

    if (address.is_default) {
      const firstAddress = await Address.findOne({ user: req.user._id }).sort({
        createdAt: 1,
      });
      if (firstAddress) {
        firstAddress.is_default = true;
        await firstAddress.save();
      }
    }

    await Address.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(204).send();
  }),

  setDefaultAddress: catchAsync(async (req, res, next) => {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) return next(new AppError("Address not found", 404));

    if (address.is_default) {
      return res.status(200).json({
        status: "success",
        data: { address },
      });
    }

    await Address.updateMany(
      { user: req.user._id },
      { $set: { is_default: false } },
    );

    address.is_default = true;
    await address.save();

    res.status(200).json({
      status: "success",
      data: address,
    });
  }),
};

export default AddressController;

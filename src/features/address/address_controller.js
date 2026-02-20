import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import Address from "./address_model.js";

const MAX_ADDRESS = 5;

const AddressController = {
  // Get all addresses for logged-in user
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

  // Admin: Get all addresses of all users
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

  // Create a new address
  createAddress: catchAsync(async (req, res, next) => {
    const addressCount = await Address.countDocuments({ user: req.user._id });
    if (addressCount >= MAX_ADDRESS) {
      return next(
        new AppError(`You can only have ${MAX_ADDRESS} addresses`, 400),
      );
    }

    // Determine if this should be default
    const makeDefault = addressCount === 0 || req.body.is_default || false;

    if (makeDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { is_default: false },
        { runValidators: true },
      );
    }

    // Attach user ID and default flag
    req.body.user = req.user._id;
    req.body.is_default = makeDefault;

    // Create the new address
    const address = await Address.create(req.body);

    // Return only the newly created address
    res.status(201).json({
      status: "success",
      data: address,
    });
  }),

  // Update an address
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

    // Handle default address
    if (req.body.is_default) {
      // If user wants this address to be default, unset default from all others
      await Address.updateMany(
        { user: req.user._id },
        { is_default: false },
        { runValidators: true },
      );
      address.is_default = true;
    } else {
      // Ensure the user doesn't accidentally remove the default
      const defaultCount = await Address.countDocuments({
        user: req.user._id,
        is_default: true,
      });
      if (
        defaultCount === 1 &&
        address.is_default &&
        req.body.is_default === false
      ) {
        // Prevent unsetting the only default
        req.body.is_default = true; // force it to stay default
      }
    }

    // Update other fields
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

  // Delete an address
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

    // If already default, just return it
    if (address.is_default) {
      return res.status(200).json({
        status: "success",
        data: { address },
      });
    }

    // Unset all other default addresses
    await Address.updateMany(
      { user: req.user._id },
      { $set: { is_default: false } },
    );

    // Set selected address as default
    address.is_default = true;
    await address.save();

    // Return ONLY the updated address
    res.status(200).json({
      status: "success",
      data: address,
    });
  }),
  // Set default address
  // setDefaultAddress: catchAsync(async (req, res, next) => {
  //   const address = await Address.findOne({
  //     _id: req.params.id,
  //     user: req.user._id,
  //   });

  //   if (!address) return next(new AppError("Address not found", 404));

  //   // If already default, ignore
  //   if (address.is_default) {
  //     const allAddresses = await Address.find({ user: req.user._id }).sort({
  //       createdAt: -1,
  //     });
  //     return res.status(200).json({
  //       status: "success",
  //       data: { address: address },
  //     });
  //   }

  //   // Unset all other defaults
  //   await Address.updateMany(
  //     { user: req.user._id },
  //     { $set: { is_default: false } },
  //   );

  //   // Set this one as default
  //   address.is_default = true;
  //   await address.save();

  //   // Return updated addresses
  //   const allAddresses = await Address.find({ user: req.user._id }).sort({
  //     createdAt: -1,
  //   });

  //   res.status(200).json({
  //     status: "success",
  //     data: allAddresses,
  //   });
  // }),
};

export default AddressController;

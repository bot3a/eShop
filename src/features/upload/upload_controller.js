import cloudinary from "../../common/config/cloudinary.js";
import AppError from "../../common/utils/appError.js";
import catchAsync from "../../common/utils/catchAsync.js";

export const uploadImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No images uploaded", 400));
  }

  const uploadedUrls = [];

  for (const file of req.files) {
    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder: "products", // optional folder
    });
    uploadedUrls.push(result.secure_url);
  }

  res.status(200).json({
    status: "success",
    urls: uploadedUrls,
  });
});

import catchAsync from "../../common/utils/catchAsync.js";
import Product from "./product_model.js";
import AppError from "./../../common/utils/appError.js";
import factory from "./../../common/controllers/handler_controller.js";
import cloudinary from "../../common/config/cloudinary.js";
import APIFeatures from "./../../common/utils/api_features.js";

const ProductController = {
  validateProductFields: (req, res, next) => {
    let {
      title,
      description,
      price,
      stock,
      discount,
      is_featured,
      categoryId,
    } = req.body;

    if (
      !title ||
      !description ||
      !price ||
      discount == null ||
      is_featured == null ||
      !categoryId
    ) {
      return next(
        new AppError(
          "Title, description, price, discount, is_featured, and categoryId are required",
          400,
        ),
      );
    }

    price = Number(price);
    stock = stock != null ? Number(stock) : 0;
    discount = Number(discount);
    is_featured = is_featured === "true" || is_featured === true;

    if (isNaN(price) || price < 0)
      return next(new AppError("Invalid price", 400));
    if (isNaN(discount) || discount < 0 || discount > 100)
      return next(new AppError("Discount must be 0-100", 400));
    if (isNaN(stock) || stock < 0)
      return next(new AppError("Invalid stock", 400));
    if (typeof is_featured !== "boolean")
      return next(new AppError("is_featured must be true or false", 400));

    req.body.title = title;
    req.body.description = description;
    req.body.price = price;
    req.body.stock = stock;
    req.body.discount = discount;
    req.body.is_featured = is_featured;

    next();
  },

  createProduct: catchAsync(async (req, res, next) => {
    const {
      title,
      description,
      price,
      stock,
      discount,
      is_featured,
      categoryId,
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return next(new AppError("At least 1 image is required.", 400));
    }
    if (req.files.length > 3) {
      return next(new AppError("Maximum 3 images allowed.", 400));
    }

    const uploadResults = await Promise.all(
      req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "products" }),
      ),
    );
    const imageUrls = uploadResults.map((r) => r.secure_url);

    const product = await Product.create({
      category: categoryId,
      title,
      description,
      price,
      discount,
      stock,
      is_featured,
      images: imageUrls,
    });

    await product.populate({ path: "category", select: "title" });

    res.status(201).json({
      status: "success",
      data: product,
    });
  }),

  updateProduct: catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    const {
      title,
      description,
      price,
      stock,
      discount,
      is_featured,
      categoryId,
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discount !== undefined) product.discount = Number(discount);
    if (stock !== undefined) product.stock = Number(stock);
    if (is_featured !== undefined) {
      product.is_featured = is_featured === "1";
    }

    if (categoryId) {
      product.category = categoryId;
    } else if (req.category) {
      product.category = req.category._id;
    }

    if (req.files && req.files.length > 0) {
      if (req.files.length > 3) {
        return next(new AppError("Maximum 3 images allowed.", 400));
      }

      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, {
          folder: "products",
        }),
      );

      const uploadResults = await Promise.all(uploadPromises);
      product.images = uploadResults.map((result) => result.secure_url);
    }

    await product.save();
    await product.populate({ path: "category", select: "title" });

    res.status(200).json({
      status: "success",
      data: product,
    });
  }),

  getProductStats: catchAsync(async (req, res, next) => {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          numProducts: { $sum: 1 },
          numRatings: { $sum: "$ratings.quantity" },
          avgRating: { $avg: "$ratings.average" },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalRevenue: { $sum: { $multiply: ["$price", "$units_sold"] } },
          totalUnitsSold: { $sum: "$units_sold" },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        stats: stats[0] || {},
      },
    });
  }),

  topFeaturedProduct: catchAsync(async (req, res, next) => {
    req.apiInjectedQuery = {
      limit: "5",
      sort: "-ratingsAverage,price",
      is_featured: "true",
    };
    next();
  }),

  aliasTopProduct: catchAsync(async (req, res, next) => {
    req.apiInjectedQuery = {
      limit: "5",
      sort: "-ratingsAverage,price",
    };
    next();
  }),

  searchProducts: catchAsync(async (req, res, next) => {
    const queryToUse = req.apiInjectedQuery || req.query;

    const baseQuery = Product.find();

    const features = new APIFeatures(baseQuery, queryToUse)
      .search(["name", "slug", "description"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    await features.computeTotalCount(Product);

    const doc = await features.query.populate({ path: "category" });

    res.status(200).json({
      status: "success",
      data: doc,
      meta: features.getMeta(),
    });
  }),

  fetchAllProducts: factory.getAllProducts(Product, { path: "category" }),

  fetchProduct: catchAsync(async (req, res, next) => {
    const doc = await Product.findById(req.params.id);

    if (!doc) {
      return next(new AppError("Document doesnt exists!", 404));
    }
    return res.status(200).json({
      status: "success",
      data: doc,
    });
  }),

  deleteProduct: factory.deleteOne(Product),

  fetchProductByCategory: catchAsync(async (req, res, next) => {
    const categoryId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const products = await Product.find({ category: categoryId })
      .skip((page - 1) * limit)
      .limit(limit);

    if (!products.length) {
      return next(new AppError("No products found for this category.", 404));
    }

    const totalCount = await Product.countDocuments({ category: categoryId });

    return res.status(200).json({
      status: "success",
      data: products,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  }),
};

export default ProductController;

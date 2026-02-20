import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "./../../common/utils/appError.js";
import APIFeatures from "./../../common/utils/api_features.js";

const factory = {
  getAllUsers: (Model, selectOptions) =>
    catchAsync(async (req, res, next) => {
      let query = Model.find();
      const data = req.baseUrl.split("/").filter(Boolean).pop();

      if (selectOptions) {
        query = query.select(selectOptions);
      }
      const doc = await query;
      if (!doc) {
        return next(new AppError("Document doesnt exists!", 404));
      }
      return res.status(200).json({
        status: "success",
        users_count: doc.length,
        data: doc,
      });
    }),

  getOne: (Model, popOptions) =>
    catchAsync(async (req, res, next) => {
      const data = req.baseUrl.split("/").filter(Boolean).pop();

      let query = Model.findById(req.params.id);

      if (popOptions) query = query.populate(popOptions);
      const doc = await query;
      if (!doc) {
        return next(new AppError("Document doesnt exists!", 404));
      }
      return res.status(200).json({
        status: "success",
        data: doc,
      });
    }),

  getAllProducts: (Model, searchFields = ["name", "slug", "description"]) =>
    catchAsync(async (req, res, next) => {
      const queryToUse = req.apiInjectedQuery || req.query;
      const baseQuery = Model.find();

      const features = new APIFeatures(baseQuery, queryToUse)
        .search(searchFields)
        .filter()
        .sort()
        .limitFields()
        .paginate();

      await features.computeTotalCount(Model);

      const doc = await features.query;

      res.status(200).json({
        status: "success",
        data: doc,
        meta: features.getMeta(),
      });
    }),

  getAll: (Model) =>
    catchAsync(async (req, res, next) => {
      const data = req.baseUrl.split("/").filter(Boolean).pop();
      const doc = await Model.find();
      return res.status(200).json({
        status: "success",
        data: {
          [data]: doc,
        },
      });
    }),

  createOne: (Model) =>
    catchAsync(async (req, res, next) => {
      const doc = await Model.create(req.body);
      const data = req.baseUrl.split("/").filter(Boolean).pop();
      console.log("eeeeeeeeeeeee");
      console.log(data);
      console.log("eeeeeeeeeeeee");

      if (!doc) {
        return next(new AppError("Document doesnt exists!", 404));
      }
      res.status(201).json({
        status: "success",
        data: {
          [data]: doc,
        },
      });
    }),

  updateOne: (Model) =>
    catchAsync(async (req, res, next) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      const data = req.baseUrl.split("/").filter(Boolean).pop();
      console.log("checkcheck");
      console.log(data);
      console.log("checkcheck");
      if (!doc) {
        return next(new AppError("Document doesnt exists!", 404));
      }
      return res.status(200).json({
        status: "success",
        data: {
          [data]: doc,
        },
      });
    }),

  deleteOne: (Model) =>
    catchAsync(async (req, res, next) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) {
        return next(new AppError("Document doesnt exists!", 404));
      }

      return res.status(204).send();
    }),
};
export default factory;

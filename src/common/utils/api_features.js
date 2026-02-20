class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.page = 1;
    this.limit = 10;
    this.totalCount = 0;
    this.searchFields = ["name", "slug", "description"]; // Default search fields
  }

  // Add search method
  search(searchFields = ["name", "slug", "description"]) {
    if (this.queryString.q) {
      const searchQuery = this.queryString.q;
      this.searchFields = searchFields;

      // Create regex search for each field
      const searchConditions = this.searchFields.map((field) => ({
        [field]: { $regex: searchQuery, $options: "i" },
      }));

      // Apply search to existing filter
      if (searchConditions.length > 0) {
        // If query already has filter conditions, use $and to combine
        const existingFilter = this.query._conditions || {};
        if (Object.keys(existingFilter).length > 0) {
          this.query = this.query.find({
            $and: [existingFilter, { $or: searchConditions }],
          });
        } else {
          this.query = this.query.find({ $or: searchConditions });
        }
      }
    }
    return this;
  }

  // Update filter method to work with search
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "limit", "sort", "fields", "q"]; // Add 'q'
    excludedFields.forEach((el) => delete queryObj[el]);

    const filterObj = {};

    // Transform queries like ratings.average[gte]=2.5 into MongoDB format
    Object.keys(queryObj).forEach((key) => {
      const value = queryObj[key];
      const match = key.match(/^(.+)\[(gte|gt|lte|lt)\]$/);
      if (match) {
        const field = match[1];
        const operator = `$${match[2]}`;
        filterObj[field] = { [operator]: parseFloat(value) };
      } else {
        filterObj[key] = value;
      }
    });

    // Apply filter if it exists
    if (Object.keys(filterObj).length > 0) {
      this.query = this.query.find(filterObj);
    }

    return this;
  }

  // Update computeTotalCount to handle search
  async computeTotalCount(model) {
    // Build filter from query string (excluding pagination/sort fields)
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "limit", "sort", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    let filterObj = {};

    // Handle regular filters
    Object.keys(queryObj).forEach((key) => {
      const value = queryObj[key];
      const match = key.match(/^(.+)\[(gte|gt|lte|lt)\]$/);
      if (match) {
        const field = match[1];
        const operator = `$${match[2]}`;
        filterObj[field] = { [operator]: parseFloat(value) };
      } else if (key !== "q") {
        // Don't include 'q' in regular filter
        filterObj[key] = value;
      }
    });

    // Handle search separately if 'q' exists
    if (this.queryString.q) {
      const searchConditions = this.searchFields.map((field) => ({
        [field]: { $regex: this.queryString.q, $options: "i" },
      }));

      if (searchConditions.length > 0) {
        if (Object.keys(filterObj).length > 0) {
          // Combine search with other filters
          filterObj = {
            $and: [filterObj, { $or: searchConditions }],
          };
        } else {
          filterObj = { $or: searchConditions };
        }
      }
    }

    this.totalCount = await model.countDocuments(filterObj);
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    this.page = this.queryString.page * 1 || 1;
    this.limit = this.queryString.limit * 1 || 50;
    const skip = (this.page - 1) * this.limit;

    this.query = this.query.skip(skip).limit(this.limit);
    return this;
  }

  getMeta() {
    const totalPages = Math.ceil(this.totalCount / this.limit);
    return {
      page: this.page,
      limit: this.limit,
      total_count: this.totalCount,
      total_pages: totalPages,
    };
  }
}

export default APIFeatures;

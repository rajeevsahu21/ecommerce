import Product from "../models/Product.js";
import { nodeCache } from "../app.js";
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;
    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cacheResults = nodeCache.get(cacheKey);
    if (cacheResults) {
      return res.status(200).json(cacheResults);
    }
    const skip = (page - 1) * limit;
    let query = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    };
    const total = await Product.countDocuments(query);
    const products = await Product.aggregate([
      { $match: query },
      {
        $project: {
          product_id: "$_id",
          title: 1,
          description: 1,
          price: 1,
          _id: 0,
        },
      },
      { $skip: skip },
      { $limit: +limit },
    ]);
    nodeCache.set(
      cacheKey,
      {
        status: "success",
        description: "Products found successfully",
        total,
        pageCount: Math.ceil(total / limit),
        data: products,
      },
      3600
    );
    res.status(200).json({
      status: "success",
      description: "Products found successfully",
      total,
      pageCount: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `products:${id}`;
    const cacheResults = await nodeCache.get(cacheKey);
    if (cacheResults) {
      return res.status(200).json(JSON.parse(cacheResults));
    }
    const product = await Product.findOne({ _id: id });
    nodeCache.set(cacheKey, JSON.stringify(product), 3600);
    if (!product)
      return res
        .status(404)
        .json({ status: "failure", description: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      description: err.message || "Internal Server Error",
    });
  }
};

export { getProducts, getProduct };

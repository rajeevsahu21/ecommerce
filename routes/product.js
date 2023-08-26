import { Router } from "express";
import { getProduct, getProducts } from "../controllers/product.js";

const productRoutes = Router();

productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProduct);

export default productRoutes;

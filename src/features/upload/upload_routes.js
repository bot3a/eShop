import express from "express";
import multer from "multer";
import { uploadImages } from "./upload_controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.array("images"), uploadImages);

export default router;

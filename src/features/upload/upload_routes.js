import express from "express";
import multer from "multer";
import { uploadImages } from "./upload_controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary storage

// POST /api/v1/upload - accept multiple images
router.post("/", upload.array("images"), uploadImages);

export default router;

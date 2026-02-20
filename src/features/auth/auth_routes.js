import { Router } from "express";

import AuthController from "./auth_controller.js";
const AuthRoutes = Router();

AuthRoutes.post("/signIn", AuthController.signIn);
AuthRoutes.post("/signUp", AuthController.signUp);
AuthRoutes.post("/googleSignUp", AuthController.googleSignUp);
AuthRoutes.post("/token", AuthController.token);
AuthRoutes.delete("/logout", AuthController.logout);
AuthRoutes.post("/resend-otp", AuthController.resendOTP);
AuthRoutes.post("/forgotPassword", AuthController.forgotPassword);
AuthRoutes.post("/verifyAccount", AuthController.verifyAccount);
AuthRoutes.post("/resetPassword/", AuthController.resetPassword);

export default AuthRoutes;

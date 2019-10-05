import { Router } from "express";
import multer from "multer";
import multerConfig from "./config/multer";

import UserController from "./app/controllers/UserController";
import SessionController from "./app/controllers/SessionController";
import FileController from "./app/controllers/FileController";
import MeetupController from "./app/controllers/MeetupController";
import EnrollController from "./app/controllers/EnrollController";

import authMiddleware from "./app/middlewares/auth";

const routes = new Router();
const upload = multer(multerConfig);

routes.post("/users", UserController.store);
routes.post("/sessions", SessionController.store);

routes.use(authMiddleware);

routes.get("/meetups", MeetupController.index);
routes.get("/enrolls", EnrollController.index);

routes.post("/meetups", MeetupController.store);
routes.post("/enrolls/:meetupId", EnrollController.store);

routes.put("/users", UserController.update);
routes.put("/meetups", MeetupController.update);

routes.delete("/meetups/:id", MeetupController.delete);

routes.post("/files", upload.single("file"), FileController.store);

export default routes;

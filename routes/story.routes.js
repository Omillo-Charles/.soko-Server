import { Router } from "express";
import { createStory, getActiveStories, getMyStories, deleteStory, markUpdateAsViewed } from "../controllers/story.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import { upload } from "../config/imagekit.js";
import cacheMiddleware from "../middlewares/cache.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createStorySchema } from "../validations/story.validation.js";
import { createLimiter } from "../middlewares/limit.middleware.js";
import { validateMediaUpload } from "../middlewares/fileValidation.middleware.js";

const storyRouter = Router();

// Publicly available (but cached) feed of stories
storyRouter.get("/", cacheMiddleware(180), getActiveStories); // Cache for 3 minutes

// Authenticated endpoints for Shop owners
storyRouter.post("/", authorize, createLimiter, upload.single('media'), validateMediaUpload, validate(createStorySchema), createStory);
storyRouter.get("/my-stories", authorize, getMyStories);
storyRouter.delete("/:id", authorize, deleteStory);
storyRouter.patch("/:id/view", authorize, markUpdateAsViewed);

export default storyRouter;

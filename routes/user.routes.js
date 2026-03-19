import { Router } from "express";
import { 
    getUser, 
    getUsers, 
    updateAccountType, 
    getCurrentUser, 
    deleteAccount, 
    getUserFollowing, 
    getUserFollowers,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from "../controllers/user.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/me", authorize, getCurrentUser);
userRouter.delete("/me", authorize, deleteAccount);
userRouter.get("/", authorize, getUsers);
userRouter.get("/following/:id", authorize, getUserFollowing);
userRouter.get("/followers/:id", authorize, getUserFollowers);
// Address routes
userRouter.get("/addresses", authorize, getAddresses);
userRouter.post("/addresses", authorize, addAddress);
userRouter.put("/addresses/:addressId", authorize, updateAddress);
userRouter.delete("/addresses/:addressId", authorize, deleteAddress);
userRouter.put("/addresses/:addressId/set-default", authorize, setDefaultAddress);

userRouter.get("/:id", authorize, getUser);
userRouter.put("/update-account-type", authorize, updateAccountType);

export default userRouter;

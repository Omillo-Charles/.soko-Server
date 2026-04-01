import { Router } from "express";
import { runAllCleanupJobs } from "../jobs/cleanup.jobs.js";
import authorize from "../middlewares/auth.middleware.js";
import logger from "../utils/logger.js";

const adminRouter = Router();

/**
 * Manual cleanup trigger endpoint
 * Allows administrators to manually trigger cleanup jobs
 * In production, this should be protected with admin role check
 */
adminRouter.post("/cleanup", authorize, async (req, res, next) => {
    try {
        logger.info('Manual cleanup triggered', { 
            requestId: req.requestId,
            userId: req.user?.id 
        });
        
        // Run cleanup jobs asynchronously
        runAllCleanupJobs().catch(err => {
            logger.error('Manual cleanup failed:', err);
        });
        
        res.status(202).json({
            success: true,
            message: "Cleanup jobs started. Check logs for results."
        });
    } catch (error) {
        next(error);
    }
});

export default adminRouter;

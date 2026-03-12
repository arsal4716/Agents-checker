const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const { getLatest, refresh, getRecent, getHourlyAverages, downloadExcel } = require("../controllers/statsController");

// All stats routes require auth
router.use(requireAuth);

router.get("/:type/latest", getLatest);
router.post("/:type/refresh", refresh);
router.get("/:type/recent", getRecent);
router.get("/:type/hourly", getHourlyAverages);
router.get("/:type/download", downloadExcel);

module.exports = router;

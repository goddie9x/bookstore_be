const express = require("express");
const router = express.Router();
const StatisticalController = require("../controllers/statisticalController");
router.get("/admin", StatisticalController.getStatiscalAdmin);
router.get("/admin/user", StatisticalController.getTopUser);
router.get("/admin/test", StatisticalController.testGetTopUser);
router.get("/admin/month", StatisticalController.getStatiscalMonth);
router.get("/admin/category", StatisticalController.getCategoryByProduct);
router.get("/admin/filter", StatisticalController.filterPaginationUser);
router.get("/user/:userId", StatisticalController.getStatiscalUser);

module.exports = router;

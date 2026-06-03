const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  getAvailableInventory,
} = require("../services/inventoryAvailabilityService.cjs");

router.get("/availability", async (req, res) => {
  try {
    const availability =
      await getAvailableInventory(db, {
        item_no: req.query.item_no,
        variant_code: req.query.variant_code,
        location_code: req.query.location_code,
        exclude_sales_order_line_id:
          req.query.exclude_sales_order_line_id,
      });

    res.json(availability);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to calculate inventory availability",
    });
  }
});

module.exports =
  router;

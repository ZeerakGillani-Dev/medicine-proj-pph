const express = require("express");
const { 
  createShipment, 
  getAllShipments, 
  updateShipmentStatus,
  updateShipmentStatusWithNote,  // 🆕 New
  getShipmentDetails,           // 🆕 New
  getShipmentByTrackingId,      // 🆕 New
} = require("../controllers/shipmentController");

const router = express.Router();

// Existing routes
router.post("/add", createShipment);
router.post("/update", updateShipmentStatus);
router.get("/", getAllShipments);

// 🆕 New blockchain routes
router.post("/update-status", updateShipmentStatusWithNote);
router.get("/:trackingId/details", getShipmentDetails);
router.get("/:trackingId", getShipmentByTrackingId);

module.exports = router;
const Shipment = require("../models/Shipment");
const { Web3 } = require("web3");  // ← FIXED: Added curly braces
const dotenv = require("dotenv");

dotenv.config();

// ========== WEB3 & SMART CONTRACT SETUP ==========
const web3 = new Web3(process.env.BLOCKCHAIN_NODE_URL || "http://127.0.0.1:8545");

// Load contract ABI
let contract = null;
let contractABI = null;
let contractAddress = process.env.CONTRACT_ADDRESS;

try {
  const contractJSON = require("../../build/contracts/SupplyChain.json");
  contractABI = contractJSON.abi;
  
  if (contractAddress && contractABI) {
    contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log("✅ Shipment contract initialized");
    console.log("📝 Contract Address:", contractAddress);
  } else {
    console.warn("⚠️ Contract not initialized - check CONTRACT_ADDRESS in .env");
  }
} catch (error) {
  console.warn("⚠️ Could not load contract ABI:", error.message);
  console.warn("   Make sure to run 'truffle compile' first");
}
// ========== EXISTING FUNCTIONS ==========

/**
 * @desc    Create a new shipment
 * @route   POST /api/shipments/add
 * @access  Public
 */
exports.createShipment = async (req, res) => {
  try {
    const { medicineId, sender, receiver, trackingId } = req.body;

    if (!medicineId || !sender || !receiver || !trackingId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Save to MongoDB
    const shipment = new Shipment({
      medicineId,
      sender,
      receiver,
      trackingId,
      status: "Pending",
    });

    await shipment.save();

    res.status(201).json({ message: "Shipment created", shipment });

  } catch (error) {
    console.error("Error creating shipment:", error);
    res.status(500).json({ error: "Error creating shipment" });
  }
};

/**
 * @desc    Update shipment status (existing function)
 * @route   POST /api/shipments/update
 * @access  Public
 */
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { trackingId, status } = req.body;
    
    // Update in MongoDB
    const shipment = await Shipment.findOne({ trackingId });
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    shipment.status = status;
    await shipment.save();
    
    res.status(200).json({ 
      message: 'Shipment status updated successfully', 
      shipment 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating shipment status', 
      error 
    });
  }
};

/**
 * @desc    Get all shipments
 * @route   GET /api/shipments
 * @access  Public
 */
exports.getAllShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find();
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== 🆕 NEW BLOCKCHAIN FUNCTIONS ==========

/**
 * @desc    Update shipment status with notes on blockchain
 * @route   POST /api/shipments/update-status
 * @access  Public
 */
exports.updateShipmentStatusWithNote = async (req, res) => {
  try {
    const { trackingId, notes, fromAddress } = req.body;

    // ========== VALIDATION ==========
    if (!trackingId || !notes || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: "trackingId, notes, and fromAddress are required",
      });
    }

    // Validate Ethereum address format
    if (!web3.utils.isAddress(fromAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address format",
      });
    }

    // Validate notes length
    if (notes.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Notes must be at least 5 characters long",
      });
    }

    // Check if contract is initialized
    if (!contract) {
      return res.status(503).json({
        success: false,
        error: "Smart contract not initialized. Please check CONTRACT_ADDRESS in .env",
      });
    }

    console.log("\n📦 Updating shipment status on blockchain...");
    console.log("   Tracking ID:", trackingId);
    console.log("   Notes:", notes);
    console.log("   From Address:", fromAddress);

    // ========== BLOCKCHAIN TRANSACTION ==========
    const tx = await contract.methods
      .updateShipmentStatusWithNote(trackingId, notes.trim())
      .send({
        from: fromAddress,
        gas: 500000,
      });

    console.log("✅ Blockchain transaction successful!");
    console.log("   Transaction Hash:", tx.transactionHash);
    console.log("   Block Number:", tx.blockNumber);
    console.log("   Gas Used:", tx.gasUsed);

    // ========== UPDATE MONGODB (OPTIONAL) ==========
    // Update the shipment in MongoDB as well
    try {
      const shipment = await Shipment.findOne({ trackingId });
      if (shipment) {
        // Append note to existing notes array or field
        if (!shipment.notes) {
          shipment.notes = [];
        }
        shipment.notes.push({
          text: notes.trim(),
          updatedBy: fromAddress,
          timestamp: new Date(),
          transactionHash: tx.transactionHash,
        });
        await shipment.save();
        console.log("✅ MongoDB updated with note");
      }
    } catch (dbError) {
      console.warn("⚠️ MongoDB update failed (blockchain update succeeded):", dbError.message);
      // Don't fail the request if MongoDB fails - blockchain is source of truth
    }

    // ========== SUCCESS RESPONSE ==========
    res.status(200).json({
      success: true,
      message: "Shipment status updated successfully on blockchain",
      data: {
        trackingId: trackingId,
        transactionHash: tx.transactionHash,
        blockNumber: Number(tx.blockNumber),  // ← Convert BigInt to Number
        gasUsed: Number(tx.gasUsed),          // ← Convert BigInt to Number
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("❌ Update shipment status error:", error);

    // ========== ERROR HANDLING ==========
    let errorMessage = "Failed to update shipment status";
    let statusCode = 400;

    if (error.message) {
      if (error.message.includes("revert")) {
        // Extract the revert reason from blockchain
        const match = error.message.match(/revert (.+?)(?:"|$)/);
        if (match) {
          errorMessage = match[1];
        } else {
          errorMessage = "Transaction reverted by smart contract";
        }
        
        // Specific error messages
        if (error.message.includes("Shipment not found")) {
          errorMessage = "Shipment not found on blockchain. Please check the tracking ID.";
          statusCode = 404;
        } else if (error.message.includes("Only shipment participants")) {
          errorMessage = "Only the sender or receiver can update this shipment.";
          statusCode = 403;
        } else if (error.message.includes("Notes cannot be empty")) {
          errorMessage = "Notes cannot be empty.";
          statusCode = 400;
        }
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to complete the transaction.";
        statusCode = 400;
      } else if (error.message.includes("nonce")) {
        errorMessage = "Transaction nonce error. Please try again.";
        statusCode = 400;
      } else if (error.message.includes("gas")) {
        errorMessage = "Gas estimation failed. The transaction may fail.";
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * @desc    Get detailed shipment information from blockchain
 * @route   GET /api/shipments/:trackingId/details
 * @access  Public
 */
exports.getShipmentDetails = async (req, res) => {
  try {
    const { trackingId } = req.params;

    // ========== VALIDATION ==========
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        error: "Tracking ID is required",
      });
    }

    if (!contract) {
      return res.status(503).json({
        success: false,
        error: "Smart contract not initialized",
      });
    }

    console.log("\n📦 Fetching shipment details from blockchain...");
    console.log("   Tracking ID:", trackingId);

    // ========== GET FROM BLOCKCHAIN ==========
    const shipment = await contract.methods
      .getShipmentDetails(trackingId)
      .call();

    console.log("✅ Shipment found on blockchain");

    // Format the status
    const statusNames = ["Pending", "InTransit", "Delivered"];
    const statusName = statusNames[Number(shipment.status)] || "Unknown";

    // ========== GET FROM MONGODB (OPTIONAL) ==========
    let mongoData = null;
    try {
      mongoData = await Shipment.findOne({ trackingId });
      if (mongoData) {
        console.log("✅ Found matching data in MongoDB");
      }
    } catch (dbError) {
      console.warn("⚠️ MongoDB query failed:", dbError.message);
    }

    // ========== COMBINED RESPONSE (FIXED BIGINT) ==========
    res.status(200).json({
      success: true,
      data: {
        // Blockchain data (source of truth)
        blockchain: {
          medicineId: shipment.medicineId.toString(),  // ← FIX: Convert BigInt to string
          sender: shipment.sender,
          receiver: shipment.receiver,
          trackingId: shipment.trackingId,
          status: statusName,
          statusCode: Number(shipment.status),  // ← FIX: Convert to Number
          notes: shipment.notes || "No updates yet",
        },
        // MongoDB data (if available)
        database: mongoData ? {
          _id: mongoData._id.toString(),
          createdAt: mongoData.createdAt,
          updatedAt: mongoData.updatedAt,
          notes: mongoData.notes || [],
        } : null,
      },
    });

  } catch (error) {
    console.error("❌ Get shipment details error:", error);
    console.error("Error details:", error.message);
    
    let errorMessage = "Failed to fetch shipment details";
    let statusCode = 400;
    
    if (error.message) {
      if (error.message.includes("Shipment not found")) {
        errorMessage = "Shipment not found with the given tracking ID";
        statusCode = 404;
      } else if (error.message.includes("revert")) {
        const match = error.message.match(/revert (.+?)(?:"|$)/);
        errorMessage = match ? match[1] : "Smart contract error";
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * @desc    Get shipment by tracking ID (MongoDB)
 * @route   GET /api/shipments/:trackingId
 * @access  Public
 */
exports.getShipmentByTrackingId = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const shipment = await Shipment.findOne({ trackingId });
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: "Shipment not found in database",
      });
    }
    
    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    console.error("Error fetching shipment:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching shipment",
    });
  }
};
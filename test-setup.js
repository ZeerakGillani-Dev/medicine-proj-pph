const { Web3 } = require("./backend/node_modules/web3");  // ← Changed path
const contract = require("./build/contracts/SupplyChain.json");

const web3 = new Web3("http://127.0.0.1:8545");
const contractAddress = "0x84101173a9BEf7Feda466B9b4293617Ca8D46F98";

async function setup() {
  try {
    const accounts = await web3.eth.getAccounts();
    console.log("Available accounts:", accounts.length);
    
    const supplyChain = new web3.eth.Contract(
      contract.abi,
      contractAddress
    );
    
    console.log("\n✅ Contract loaded");
    console.log("📝 Contract Address:", contractAddress);
    console.log("👤 Owner Account:", accounts[0]);
    console.log("👤 Distributor Account:", accounts[1]);
    console.log("👤 Receiver Account:", accounts[2]);
    
    // Step 1: Add a medicine
    console.log("\n1️⃣ Adding medicine...");
    await supplyChain.methods
      .addMedicine("Aspirin 500mg", "Pain relief medication")
      .send({ from: accounts[0], gas: 500000 });
    console.log("✅ Medicine added with ID: 1");
    
    // Step 2: Register distributor
    console.log("\n2️⃣ Registering distributor...");
    await supplyChain.methods
      .addDistributor(accounts[1], "Fast Logistics", "New York")
      .send({ from: accounts[0], gas: 500000 });
    console.log("✅ Distributor registered:", accounts[1]);
    
    // Step 3: Manufacture the medicine
    console.log("\n3️⃣ Setting up medicine stages...");
    await supplyChain.methods
      .addSupplier(accounts[0], "MedSupplies Inc", "Boston")
      .send({ from: accounts[0], gas: 500000 });
    
    await supplyChain.methods
      .supplyRawMaterials(1)
      .send({ from: accounts[0], gas: 500000 });
    console.log("✅ Raw materials supplied");
    
    await supplyChain.methods
      .addManufacturer(accounts[0], "PharmaCorp", "Chicago")
      .send({ from: accounts[0], gas: 500000 });
    
    await supplyChain.methods
      .manufactureMedicine(1)
      .send({ from: accounts[0], gas: 500000 });
    console.log("✅ Medicine manufactured");
    
    await supplyChain.methods
      .distributeMedicine(1)
      .send({ from: accounts[1], gas: 500000 });
    console.log("✅ Medicine distributed");
    
    // Step 4: Create shipment
    console.log("\n4️⃣ Creating shipment...");
    await supplyChain.methods
      .createShipment(1, accounts[2], "TRACK001")
      .send({ from: accounts[1], gas: 500000 });
    console.log("✅ Shipment created: TRACK001");
    
    console.log("\n🎉 Setup complete! Now you can test the API:");
    console.log("\n📦 Test updating shipment status:");
    console.log(`
curl -X POST http://localhost:5001/api/shipments/update-status ^
  -H "Content-Type: application/json" ^
  -d "{\\"trackingId\\": \\"TRACK001\\", \\"notes\\": \\"Package received at warehouse\\", \\"fromAddress\\": \\"${accounts[1]}\\"}"
    `);
    
    console.log("\n📦 Test getting shipment details:");
    console.log(`curl http://localhost:5001/api/shipments/TRACK001/details`);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  process.exit();
}

setup();
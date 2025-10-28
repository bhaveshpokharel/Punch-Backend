import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import couchbase from "couchbase";
import { v4 as uuidv4 } from "uuid";
import moment from "moment-timezone";
 
dotenv.config();
 
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*", // or ["http://127.0.0.1:5500", "https://your-frontend.onrender.com"]
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
 
app.use(express.json());
 
// Couchbase connection setup
let cluster, bucket, collection;
 
async function connectCouchbase() {
  try {
    cluster = await couchbase.connect(process.env.COUCHBASE_CONN_STR, {
      username: process.env.COUCHBASE_USERNAME,
      password: process.env.COUCHBASE_PASSWORD,
    });
 
    bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
    const scope = bucket.scope(process.env.COUCHBASE_SCOPE);
    collection = scope.collection(process.env.COUCHBASE_COLLECTION);
 
    console.log("✅ Connected to Couchbase successfully!");
  } catch (err) {
    console.error("❌ Couchbase connection failed:", err);
  }
}
 
await connectCouchbase();
 
// POST /api/punch — Insert punch record
app.post("/api/punch", async (req, res) => {
  try {
    const { time, timestamp } = req.body;
 
    // Get current IST time
    const createdAt = moment().tz("Asia/Kolkata").format("DD/MM/YYYY HH:mm:ss");
 
    const docId = `punch::${uuidv4()}`;
    const punchDoc = { time, timestamp, createdAt };
 
    await collection.insert(docId, punchDoc);
 
    res.json({ message: "Punch recorded successfully", id: docId });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ error: err.message });
  }
});
 
// GET /api/punches — Fetch recent punches
app.get("/api/punches", async (req, res) => {
  try {
    const query = `
      SELECT META().id, time, timestamp, createdAt
      FROM \`${process.env.COUCHBASE_BUCKET}\`.\`${process.env.COUCHBASE_SCOPE}\`.\`${process.env.COUCHBASE_COLLECTION}\`
      ORDER BY createdAt DESC LIMIT 20;
    `;
    const result = await cluster.query(query);
    const punches = result.rows;
 
    res.json({ punches });
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({ error: err.message });
  }
});
 
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3000);
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME ?? "backend";
const COLLECTION_NAME = process.env.COLLECTION_NAME ?? "store_info";
if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment.");
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const client = new mongodb_1.MongoClient(MONGO_URI);
function getDb() {
    return client.db(DB_NAME);
}
function getStoresCollection() {
    return getDb().collection(COLLECTION_NAME);
}
function getCountersCollection() {
    return getDb().collection("counters");
}
function normalizeText(value) {
    return String(value ?? "").trim();
}
async function ensureCounterDocument() {
    const counters = getCountersCollection();
    await counters.updateOne({ _id: "store_id" }, { $setOnInsert: { seq: 0 } }, { upsert: true });
}
async function getNextStoreId() {
    const counters = getCountersCollection();
    const result = await counters.findOneAndUpdate({ _id: "store_id" }, { $inc: { seq: 1 } }, {
        upsert: true,
        returnDocument: "after",
    });
    if (!result || typeof result.seq !== "number") {
        throw new Error("Failed to generate unique store_id.");
    }
    return result.seq;
}
async function ensureIndexes() {
    await getStoresCollection().createIndex({ store_id: 1 }, { unique: true });
}
async function syncStoreIdCounterToMax() {
    const stores = getStoresCollection();
    const counters = getCountersCollection();
    const highestStore = await stores
        .find({}, { projection: { store_id: 1 } })
        .sort({ store_id: -1 })
        .limit(1)
        .next();
    const maxStoreId = highestStore?.store_id ?? 0;
    await counters.updateOne({ _id: "store_id" }, { $max: { seq: maxStoreId } }, { upsert: true });
    console.log(`store_id counter synced to at least ${maxStoreId}`);
}
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});
app.get("/api/stores", async (req, res) => {
    try {
        const stores = getStoresCollection();
        const query = {};
        const searchableFields = [
            "store_name",
            "address",
            "address_2",
            "city",
            "state",
            "zip",
            "phone_number",
            "country",
        ];
        searchableFields.forEach((field) => {
            const rawValue = req.query[field];
            const value = normalizeText(rawValue);
            if (value) {
                query[field] = { $regex: value, $options: "i" };
            }
        });
        const results = await stores.find(query).sort({ store_name: 1 }).toArray();
        res.json(results);
    }
    catch (error) {
        console.error("GET /api/stores failed:", error);
        res.status(500).json({ error: "Failed to fetch stores." });
    }
});
app.post("/api/stores", async (req, res) => {
    try {
        const payload = {
            store_name: normalizeText(req.body.store_name),
            address: normalizeText(req.body.address),
            address_2: normalizeText(req.body.address_2),
            city: normalizeText(req.body.city),
            state: normalizeText(req.body.state),
            zip: normalizeText(req.body.zip),
            phone_number: normalizeText(req.body.phone_number),
            country: normalizeText(req.body.country),
            sunday_hours: normalizeText(req.body.sunday_hours),
            monday_hours: normalizeText(req.body.monday_hours),
            tuesday_hours: normalizeText(req.body.tuesday_hours),
            wednesday_hours: normalizeText(req.body.wednesday_hours),
            thursday_hours: normalizeText(req.body.thursday_hours),
            friday_hours: normalizeText(req.body.friday_hours),
            saturday_hours: normalizeText(req.body.saturday_hours),
        };
        if (!payload.store_name) {
            return res.status(400).json({ error: "store_name is required." });
        }
        if (!payload.address) {
            return res.status(400).json({ error: "address is required." });
        }
        if (!payload.city) {
            return res.status(400).json({ error: "city is required." });
        }
        if (!payload.state) {
            return res.status(400).json({ error: "state is required." });
        }
        if (!payload.zip) {
            return res.status(400).json({ error: "zip is required." });
        }
        if (!payload.phone_number) {
            return res.status(400).json({ error: "phone_number is required." });
        }
        if (!payload.country) {
            return res.status(400).json({ error: "country is required." });
        }
        const stores = getStoresCollection();
        const now = new Date();
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
            attempts += 1;
            const store_id = await getNextStoreId();
            const document = {
                store_id,
                store_name: payload.store_name,
                address: payload.address,
                address_2: payload.address_2 || "",
                city: payload.city,
                state: payload.state,
                zip: payload.zip,
                phone_number: payload.phone_number,
                country: payload.country,
                sunday_hours: payload.sunday_hours || "",
                monday_hours: payload.monday_hours || "",
                tuesday_hours: payload.tuesday_hours || "",
                wednesday_hours: payload.wednesday_hours || "",
                thursday_hours: payload.thursday_hours || "",
                friday_hours: payload.friday_hours || "",
                saturday_hours: payload.saturday_hours || "",
                created_at: now,
                updated_at: now,
            };
            try {
                await stores.insertOne(document);
                return res.status(201).json({
                    success: true,
                    store_id,
                    store: document,
                });
            }
            catch (error) {
                if (error instanceof mongodb_1.MongoServerError && error.code === 11000) {
                    console.warn(`Duplicate store_id ${store_id} detected, retrying...`);
                    continue;
                }
                throw error;
            }
        }
        return res.status(409).json({
            error: "Could not generate a unique store_id after multiple attempts.",
        });
    }
    catch (error) {
        console.error("POST /api/stores failed:", error);
        return res.status(500).json({ error: "Failed to add store." });
    }
});
async function start() {
    await client.connect();
    await ensureIndexes();
    await ensureCounterDocument();
    await syncStoreIdCounterToMax();
    app.listen(PORT, () => {
        console.log(`Store Locator API running on http://localhost:${PORT}`);
        console.log(`Mongo DB: ${DB_NAME}`);
        console.log(`Collection: ${COLLECTION_NAME}`);
    });
}
void start().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
});

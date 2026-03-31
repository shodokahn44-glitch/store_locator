import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { MongoClient, MongoServerError } from "mongodb";
import type { Request, Response, NextFunction } from "express";
import type { Collection, Db } from "mongodb";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME ?? "backend";
const COLLECTION_NAME = process.env.COLLECTION_NAME ?? "store_info";

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment.");
}

app.use(cors());
app.use(express.json());

const client = new MongoClient(MONGO_URI);
const distPath = path.join(process.cwd(), "dist");

interface StoreDocument {
  store_id: number;
  store_name: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  country: string;
  sunday_hours?: string;
  monday_hours?: string;
  tuesday_hours?: string;
  wednesday_hours?: string;
  thursday_hours?: string;
  friday_hours?: string;
  saturday_hours?: string;
  created_at: Date;
  updated_at: Date;
}

interface CounterDocument {
  _id: string;
  seq: number;
}

function getDb(): Db {
  return client.db(DB_NAME);
}

function getStoresCollection(): Collection<StoreDocument> {
  return getDb().collection<StoreDocument>(COLLECTION_NAME);
}

function getCountersCollection(): Collection<CounterDocument> {
  return getDb().collection<CounterDocument>("counters");
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

async function ensureCounterDocument(): Promise<void> {
  const counters = getCountersCollection();

  await counters.updateOne(
    { _id: "store_id" },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );
}

async function getNextStoreId(): Promise<number> {
  const counters = getCountersCollection();

  const result = await counters.findOneAndUpdate(
    { _id: "store_id" },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  if (!result || typeof result.seq !== "number") {
    throw new Error("Failed to generate unique store_id.");
  }

  return result.seq;
}

async function ensureIndexes(): Promise<void> {
  await getStoresCollection().createIndex({ store_id: 1 }, { unique: true });
}

async function syncStoreIdCounterToMax(): Promise<void> {
  const stores = getStoresCollection();
  const counters = getCountersCollection();

  const highestStore = await stores
    .find({}, { projection: { store_id: 1 } })
    .sort({ store_id: -1 })
    .limit(1)
    .next();

  const maxStoreId = highestStore?.store_id ?? 0;

  await counters.updateOne(
    { _id: "store_id" },
    { $max: { seq: maxStoreId } },
    { upsert: true }
  );

  console.log(`store_id counter synced to at least ${maxStoreId}`);
}

/**
 * Redirect /index.html to /
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/index.html") {
    return res.redirect(301, "/");
  }
  next();
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/api/stores", async (req: Request, res: Response) => {
  try {
    const stores = getStoresCollection();
    const query: Record<string, unknown> = {};

    const searchableFields = [
      "store_name",
      "address",
      "address_2",
      "city",
      "state",
      "zip",
      "phone_number",
      "country",
    ] as const;

    searchableFields.forEach((field) => {
      const rawValue = req.query[field];
      const value = normalizeText(rawValue);

      if (value) {
        query[field] = { $regex: value, $options: "i" };
      }
    });

    const results = await stores.find(query).sort({ store_name: 1 }).toArray();
    res.json(results);
  } catch (error) {
    console.error("GET /api/stores failed:", error);
    res.status(500).json({ error: "Failed to fetch stores." });
  }
});

app.post("/api/stores", async (req: Request, res: Response) => {
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

      const document: StoreDocument = {
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
      } catch (error: unknown) {
        if (error instanceof MongoServerError && error.code === 11000) {
          console.warn(`Duplicate store_id ${store_id} detected, retrying...`);
          continue;
        }

        throw error;
      }
    }

    return res.status(409).json({
      error: "Could not generate a unique store_id after multiple attempts.",
    });
  } catch (error) {
    console.error("POST /api/stores failed:", error);
    return res.status(500).json({ error: "Failed to add store." });
  }
});

/**
 * Serve static frontend files from Vite build output
 */
app.use(express.static(distPath));

/**
 * SPA fallback:
 * - lets clean URLs work
 * - ignores API routes
 * - returns 404 for missing real file requests
 */
app.get("*", (req: Request, res: Response) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found." });
  }

  if (path.extname(req.path)) {
    return res.status(404).send("File not found");
  }

  return res.sendFile(path.join(distPath, "index.html"));
});

async function start(): Promise<void> {
  await client.connect();
  await ensureIndexes();
  await ensureCounterDocument();
  await syncStoreIdCounterToMax();

  app.listen(PORT, () => {
    console.log(`Store Locator running on port ${PORT}`);
    console.log(`Frontend dist path: ${distPath}`);
    console.log(`Mongo DB: ${DB_NAME}`);
    console.log(`Collection: ${COLLECTION_NAME}`);
  });
}

void start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
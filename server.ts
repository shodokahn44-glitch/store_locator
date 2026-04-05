import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import path from "path";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.MONGO_DB_NAME || "backend";
const COLLECTION_NAME =
  process.env.COLLECTION_NAME ||
  process.env.MONGO_COLLECTION_NAME ||
  "store_info";

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables.");
}

app.use(cors());
app.use(express.json());

const appRoot = path.resolve();
app.use(express.static(path.join(appRoot, "dist")));

interface StoreDocument {
  _id?: ObjectId;
  store_id?: number;
  store_name?: string;
  address?: string;
  address_2?: string;
  ["address 2"]?: string;
  city?: string;
  state?: string;
  zip?: string | number;
  phone_number?: string;
  country?: string;
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  website?: string;
  nes_quest?: boolean;
  n64_quest?: boolean;
  snes_quest?: boolean;
  nintendo_quest?: boolean;
  super_nintendo_quest?: boolean;
}

interface StoreApiResponse {
  _id?: string;
  store_id?: number;
  store_name?: string;
  address?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone_number?: string;
  country?: string;
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  website?: string;
  nes_quest?: boolean;
  n64_quest?: boolean;
  snes_quest?: boolean;
}

let client: MongoClient;
let db: Db;
let storesCollection: Collection<StoreDocument>;

async function connectToMongo(): Promise<void> {
  client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db(DB_NAME);
  storesCollection = db.collection<StoreDocument>(COLLECTION_NAME);

  console.log(
    `Connected to MongoDB database "${DB_NAME}", collection "${COLLECTION_NAME}"`,
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildContainsFilter(value?: string) {
  if (!value || !value.trim()) return undefined;
  return { $regex: escapeRegex(value.trim()), $options: "i" };
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function getAddress2Value(store: Partial<StoreDocument>): string {
  return normalizeString(store.address_2 ?? store["address 2"]);
}

function normalizeQuestFlags(store: Partial<StoreDocument>) {
  return {
    nes_quest: normalizeBoolean(store.nes_quest ?? store.nintendo_quest),
    snes_quest: normalizeBoolean(
      store.snes_quest ?? store.super_nintendo_quest,
    ),
    n64_quest: normalizeBoolean(store.n64_quest),
  };
}

function normalizeStoreDocument(doc: StoreDocument): StoreApiResponse {
  const questFlags = normalizeQuestFlags(doc);

  return {
    _id: doc._id ? String(doc._id) : undefined,
    store_id:
      typeof doc.store_id === "number"
        ? doc.store_id
        : doc.store_id !== undefined
          ? Number(doc.store_id)
          : undefined,
    store_name: normalizeString(doc.store_name),
    address: normalizeString(doc.address),
    address_2: getAddress2Value(doc),
    city: normalizeString(doc.city),
    state: normalizeString(doc.state),
    zip: normalizeString(doc.zip),
    phone_number: normalizeString(doc.phone_number),
    country: normalizeString(doc.country),
    sunday: normalizeString(doc.sunday),
    monday: normalizeString(doc.monday),
    tuesday: normalizeString(doc.tuesday),
    wednesday: normalizeString(doc.wednesday),
    thursday: normalizeString(doc.thursday),
    friday: normalizeString(doc.friday),
    saturday: normalizeString(doc.saturday),
    website: normalizeString(doc.website),
    nes_quest: questFlags.nes_quest,
    snes_quest: questFlags.snes_quest,
    n64_quest: questFlags.n64_quest,
  };
}

async function getNextStoreId(): Promise<number> {
  const lastStore = await storesCollection
    .find({}, { projection: { store_id: 1 } })
    .sort({ store_id: -1 })
    .limit(1)
    .toArray();

  const highestRaw = lastStore[0]?.store_id;
  const highest =
    typeof highestRaw === "number"
      ? highestRaw
      : highestRaw !== undefined
        ? Number(highestRaw)
        : 0;

  return Number.isFinite(highest) ? highest + 1 : 1;
}

function buildQuestFilter(questFilter: string): Record<string, unknown> | null {
  switch (questFilter) {
    case "nes_quest":
      return {
        $or: [{ nes_quest: true }, { nintendo_quest: true }],
      };
    case "snes_quest":
      return {
        $or: [{ snes_quest: true }, { super_nintendo_quest: true }],
      };
    case "n64_quest":
      return {
        $or: [{ n64_quest: true }],
      };
    default:
      return null;
  }
}

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.command({ ping: 1 });

    res.status(200).json({
      ok: true,
      db: DB_NAME,
      collection: COLLECTION_NAME,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      ok: false,
      error: "Database unavailable.",
    });
  }
});

app.get("/api/stores", async (req: Request, res: Response) => {
  try {
    const {
      store_name,
      address,
      address_2,
      city,
      state,
      zip,
      phone_number,
      country,
      quest_filter,
    } = req.query;

    const query: Record<string, unknown> = {};

    const storeNameFilter = buildContainsFilter(String(store_name ?? ""));
    const addressFilter = buildContainsFilter(String(address ?? ""));
    const address2Filter = buildContainsFilter(String(address_2 ?? ""));
    const cityFilter = buildContainsFilter(String(city ?? ""));
    const stateFilter = buildContainsFilter(String(state ?? ""));
    const zipFilter = buildContainsFilter(String(zip ?? ""));
    const phoneFilter = buildContainsFilter(String(phone_number ?? ""));
    const countryFilter = buildContainsFilter(String(country ?? ""));

    if (storeNameFilter) query.store_name = storeNameFilter;
    if (addressFilter) query.address = addressFilter;
    if (address2Filter) {
      query.$or = [
        { address_2: address2Filter },
        { "address 2": address2Filter },
      ];
    }
    if (cityFilter) query.city = cityFilter;
    if (stateFilter) query.state = stateFilter;
    if (zipFilter) query.zip = zipFilter;
    if (phoneFilter) query.phone_number = phoneFilter;
    if (countryFilter) query.country = countryFilter;

    const questFilter = String(quest_filter ?? "").trim();
    const questQuery = buildQuestFilter(questFilter);

    if (questQuery) {
      if (query.$and && Array.isArray(query.$and)) {
        (query.$and as Record<string, unknown>[]).push(questQuery);
      } else if (query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: existingOr as unknown[] }, questQuery];
      } else {
        Object.assign(query, questQuery);
      }
    }

    const stores = await storesCollection
      .find(query)
      .sort({ store_name: 1 })
      .toArray();

    const normalizedStores = stores.map(normalizeStoreDocument);

    res.status(200).json(normalizedStores);
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    res.status(500).json({ error: "Failed to fetch stores." });
  }
});

app.post("/api/stores", async (req: Request, res: Response) => {
  try {
    const {
      store_name,
      address,
      address_2,
      city,
      state,
      zip,
      phone_number,
      country,
      sunday,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      website,
      nes_quest,
      n64_quest,
      snes_quest,
      nintendo_quest,
      super_nintendo_quest,
    } = req.body ?? {};

    if (
      !normalizeString(store_name) ||
      !normalizeString(address) ||
      !normalizeString(city) ||
      !normalizeString(state) ||
      !normalizeString(zip) ||
      !normalizeString(phone_number) ||
      !normalizeString(country)
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: store_name, address, city, state, zip, phone_number, country",
      });
    }

    const nextStoreId = await getNextStoreId();

    const normalizedQuestFlags = {
      nes_quest: normalizeBoolean(nes_quest ?? nintendo_quest),
      snes_quest: normalizeBoolean(snes_quest ?? super_nintendo_quest),
      n64_quest: normalizeBoolean(n64_quest),
    };

    const newStore: Omit<StoreDocument, "_id"> = {
      store_id: nextStoreId,
      store_name: normalizeString(store_name),
      address: normalizeString(address),
      address_2: normalizeString(address_2),
      city: normalizeString(city),
      state: normalizeString(state),
      zip: normalizeString(zip),
      phone_number: normalizeString(phone_number),
      country: normalizeString(country),
      sunday: normalizeString(sunday),
      monday: normalizeString(monday),
      tuesday: normalizeString(tuesday),
      wednesday: normalizeString(wednesday),
      thursday: normalizeString(thursday),
      friday: normalizeString(friday),
      saturday: normalizeString(saturday),
      website: normalizeString(website),
      nes_quest: normalizedQuestFlags.nes_quest,
      n64_quest: normalizedQuestFlags.n64_quest,
      snes_quest: normalizedQuestFlags.snes_quest,
    };

    const result = await storesCollection.insertOne(newStore);

    return res.status(201).json({
      message: "Store added successfully.",
      store_id: nextStoreId,
      inserted_id: String(result.insertedId),
      store: normalizeStoreDocument({
        ...newStore,
        _id: result.insertedId,
      }),
    });
  } catch (error) {
    console.error("Failed to add store:", error);
    return res.status(500).json({ error: "Failed to add store." });
  }
});

app.get("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found." });
});

// SPA fallback route - keep last
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, "dist", "index.html"));
});

async function startServer(): Promise<void> {
  try {
    await connectToMongo();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

void startServer();

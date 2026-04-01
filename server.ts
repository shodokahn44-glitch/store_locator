import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, Db, Collection, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.MONGO_DB_NAME || "backend";
const COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "stores";

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables.");
}

app.use(cors());
app.use(express.json());

interface StoreDocument {
  _id?: ObjectId;
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
    `Connected to MongoDB database "${DB_NAME}", collection "${COLLECTION_NAME}"`
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildContainsFilter(value?: string) {
  if (!value || !value.trim()) return undefined;
  return { $regex: escapeRegex(value.trim()), $options: "i" };
}

async function getNextStoreId(): Promise<number> {
  const lastStore = await storesCollection
    .find({}, { projection: { store_id: 1 } })
    .sort({ store_id: -1 })
    .limit(1)
    .toArray();

  const highest = lastStore[0]?.store_id ?? 0;
  return highest + 1;
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
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
    if (address2Filter) query.address_2 = address2Filter;
    if (cityFilter) query.city = cityFilter;
    if (stateFilter) query.state = stateFilter;
    if (zipFilter) query.zip = zipFilter;
    if (phoneFilter) query.phone_number = phoneFilter;
    if (countryFilter) query.country = countryFilter;

    const questFilter = String(quest_filter ?? "").trim();

    if (
      questFilter === "nes_quest" ||
      questFilter === "snes_quest" ||
      questFilter === "n64_quest"
    ) {
      query[questFilter] = true;
    }

    const stores = await storesCollection
      .find(query)
      .sort({ store_name: 1 })
      .toArray();

    res.status(200).json(stores);
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
    } = req.body ?? {};

    if (
      !store_name ||
      !address ||
      !city ||
      !state ||
      !zip ||
      !phone_number ||
      !country
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: store_name, address, city, state, zip, phone_number, country",
      });
    }

    const nextStoreId = await getNextStoreId();

    const newStore: Omit<StoreDocument, "_id"> = {
      store_id: nextStoreId,
      store_name: String(store_name).trim(),
      address: String(address).trim(),
      address_2: String(address_2 ?? "").trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      zip: String(zip).trim(),
      phone_number: String(phone_number).trim(),
      country: String(country).trim(),
      sunday: String(sunday ?? "").trim(),
      monday: String(monday ?? "").trim(),
      tuesday: String(tuesday ?? "").trim(),
      wednesday: String(wednesday ?? "").trim(),
      thursday: String(thursday ?? "").trim(),
      friday: String(friday ?? "").trim(),
      saturday: String(saturday ?? "").trim(),
      website: String(website ?? "").trim(),
      nes_quest: Boolean(nes_quest ?? false),
      n64_quest: Boolean(n64_quest ?? false),
      snes_quest: Boolean(snes_quest ?? false),
    };

    const result = await storesCollection.insertOne(newStore);

    return res.status(201).json({
      message: "Store added successfully.",
      store_id: nextStoreId,
      inserted_id: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add store:", error);
    return res.status(500).json({ error: "Failed to add store." });
  }
});

app.listen(PORT, async () => {
  try {
    await connectToMongo();
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
});
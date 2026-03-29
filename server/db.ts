import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const URI = process.env.MONGODB_URI || "";

let cached = (global as any)._mongooseCached as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;
if (!cached) {
  cached = (global as any)._mongooseCached = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached!.conn) return cached!.conn;
  if (!cached!.promise) {
    if (!URI) throw new Error("MONGODB_URI not set");
    cached!.promise = mongoose.connect(URI, { dbName: process.env.MONGODB_DB || undefined });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}

// Rooms
const RoomSchema = new Schema(
  {
    roomNumber: { type: String, required: true, index: true, unique: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    filledCount: { type: Number, required: true, min: 0, default: 0 },
    occupants: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true },
);
export type RoomDoc = InferSchemaType<typeof RoomSchema> & { _id: any };

// Students
const StudentSchema = new Schema(
  {
    rollNumber: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    // additional profile fields from frontend store
    parentName: { type: String },
    parentContact: { type: String },
    studentContact: { type: String },
    address: { type: String },
    email: { type: String },
    totalAmount: { type: Number },
    joiningDate: { type: String },
    profilePhotoDataUrl: { type: String },
    documents: [{ name: String, dataUrl: String }],
  },
  { timestamps: true },
);
StudentSchema.index({ name: 1 });
export type StudentDoc = InferSchemaType<typeof StudentSchema> & { _id: any };

// Parcels
const ParcelSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    parcelId: { type: String, required: true, trim: true },
    dateReceived: { type: Date, required: true, default: () => new Date() },
    collected: { type: Boolean, required: true, default: false },
    collectedAt: { type: Date },
    // extra fields used in UI
    carrier: { type: String },
    otp: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);
ParcelSchema.index({ parcelId: 1 });
export type ParcelDoc = InferSchemaType<typeof ParcelSchema> & { _id: any };

// Requests (room change/leave)
const RequestSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    type: { type: String, enum: ["change", "leave"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], required: true, default: "pending" },
    targetRoomId: { type: Schema.Types.ObjectId, ref: "Room" },
    note: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);
RequestSchema.index({ status: 1, createdAt: -1 });
export type RequestDoc = InferSchemaType<typeof RequestSchema> & { _id: any };

export const Room: Model<RoomDoc> = mongoose.models.Room || mongoose.model("Room", RoomSchema);
export const Student: Model<StudentDoc> = mongoose.models.Student || mongoose.model("Student", StudentSchema);
export const Parcel: Model<ParcelDoc> = mongoose.models.Parcel || mongoose.model("Parcel", ParcelSchema);
export const Request: Model<RequestDoc> = mongoose.models.Request || mongoose.model("Request", RequestSchema);

export async function ensureRoomFilledCount(roomId: any) {
  const r = await Room.findById(roomId).lean();
  if (!r) return;
  const cnt = await Student.countDocuments({ roomId });
  if (r.filledCount !== cnt) await Room.updateOne({ _id: roomId }, { $set: { filledCount: cnt } });
}

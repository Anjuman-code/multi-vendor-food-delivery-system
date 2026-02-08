import mongoose, { Schema, Model } from "mongoose";
import { IName } from "../types";

const nameSchema = new Schema<IName>({
  name: String,
});

const Name: Model<IName> = mongoose.model<IName>("Name", nameSchema);

export default Name;

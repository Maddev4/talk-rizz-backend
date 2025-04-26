import mongoose, { Document, Schema } from "mongoose";
import { UserProfile, BasicProfile, GeneralProfile } from "../types/profile";

interface ProfileDocument extends UserProfile, Document {}

const BasicProfileSchema = new Schema<BasicProfile>({
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  location: { type: String },
  languages: [{ type: String }],
  birthday: { type: String },
  gender: { type: String },
  profilePicture: { type: String },
});

const GeneralProfileSchema = new Schema<GeneralProfile>({
  friendship: { type: String },
  professional: { type: String },
  dating: { type: String },
});

const ProfileSchema = new Schema<ProfileDocument>(
  {
    userId: { type: String, required: true, unique: true },
    basicProfile: { type: BasicProfileSchema, required: true },
    generalProfile: { type: GeneralProfileSchema, required: true },
    premiumFeatures: {
      maxMustHaves: { type: Number, default: 2 },
      maxDealBreakers: { type: Number, default: 2 },
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ "basicProfile.location": 1 });
ProfileSchema.index({ "generalProfile.interests": 1 });

export const Profile = mongoose.model<ProfileDocument>(
  "Profile",
  ProfileSchema
);

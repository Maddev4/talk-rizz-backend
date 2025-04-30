import mongoose from "mongoose";

const connectSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    random: {
      type: Object,
      default: {},
    },
    friendship: { type: Object, default: {} },
    professional: { type: Object, default: {} },
    dating: {
      lifePartner: {
        imLookingFor: { type: String, default: "" },
        mustHave: { type: [{ name: String, value: Number }], default: [] },
        dealBreakers: { type: [{ name: String, value: Number }], default: [] },
      },
      longTerm: { type: Object, default: {} },
      shortTerm: { type: Object, default: {} },
      hookUp: { type: Object, default: {} },
    },
    surpriseMe: { type: Object, default: {} },
  },
  {
    timestamps: true,
  }
);

const Connect = mongoose.model("Connect", connectSchema);

export default Connect;

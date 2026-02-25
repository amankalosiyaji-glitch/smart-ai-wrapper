import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free"
    },

    usageCount: {
      type: Number,
      default: 0
    },

    usageResetDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

/* =========================
   🔐 HASH PASSWORD BEFORE SAVE
========================= */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* =========================
   🔑 PASSWORD COMPARE METHOD
========================= */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
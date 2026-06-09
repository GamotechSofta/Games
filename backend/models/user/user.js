import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const loginDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },

    firstLoginAt: {
      type: Date,
      default: Date.now,
    },

    lastLoginAt: {
      type: Date,
      default: Date.now,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
      sparse: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true,
      match:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "bookie"],
      default: "user",
      index: true,
    },

    source: {
      type: String,
      enum: ["super_admin", "bookie"],
      default: "super_admin",
      index: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
      select: false,
    },

    lastLoginDeviceId: {
      type: String,
      default: null,
      select: false,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    accountLockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
      select: false,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,

      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      virtuals: true,
    },
  }
);





userSchema.virtual("isOnline").get(function () {
  if (!this.lastActiveAt) return false;

  return (
    Date.now() -
      new Date(this.lastActiveAt).getTime() <
    5 * 60 * 1000
  );
});






userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});






userSchema.methods.comparePassword =
  async function (
    candidatePassword
  ) {
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };






userSchema.methods.updateDevice =
  function ({
    deviceId,
    ip,
    userAgent,
  }) {
    const existing =
      this.loginDevices.find(
        (d) =>
          d.deviceId === deviceId
      );

    if (existing) {
      existing.lastLoginAt =
        new Date();

      existing.ipAddress = ip;

      existing.userAgent =
        userAgent;
    } else {
      this.loginDevices.push({
        deviceId,

        ipAddress: ip,

        userAgent,

        firstLoginAt:
          new Date(),

        lastLoginAt:
          new Date(),
      });
    }
  };






userSchema.index({
  role: 1,
  isActive: 1,
});

userSchema.index({
  createdAt: -1,
});

userSchema.index({
  referredBy: 1,
  createdAt: -1,
});

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

export default User;
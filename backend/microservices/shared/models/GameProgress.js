import mongoose from 'mongoose';

const GameProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    experiencePoints: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
    achievements: {
      type: [String],
      default: [],
    },
    progress: {
      type: String,
      default: 'Not started',
      trim: true,
    },
    failCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPlayed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

GameProgressSchema.index({ score: -1, experiencePoints: -1, level: -1 });

GameProgressSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    return returnedObject;
  },
});

export default mongoose.models.GameProgress ??
  mongoose.model('GameProgress', GameProgressSchema);

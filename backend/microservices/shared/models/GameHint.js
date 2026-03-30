import mongoose from 'mongoose';

const GameHintSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
    },
    hint: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['tip', 'warning', 'strategy'],
      default: 'tip',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

GameHintSchema.index({ level: 1 });

GameHintSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    return returnedObject;
  },
});

export default mongoose.models.GameHint ??
  mongoose.model('GameHint', GameHintSchema);

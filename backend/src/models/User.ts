import mongoose from 'mongoose';

export interface IUser {
  _id?: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt?: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, trim: true }
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);

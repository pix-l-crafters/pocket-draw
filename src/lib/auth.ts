import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";

export const registerUser = async (
  email: string,
  password: string,
) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = async (
  email: string,
  password: string,
) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return signOut(auth);
};

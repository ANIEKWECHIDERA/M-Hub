import admin from "firebase-admin";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

// Example helper to log operations
export const logFirebaseUserFetch = async (email: string) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    logger.info(`[FIREBASE] Fetched user: ${user.uid}`);
    return user;
  } catch (err) {
    logger.error(`[FIREBASE ERROR] Failed fetching user ${email}: ${err}`);
    throw err;
  }
};

export const testFirebaseConnection = async () => {
  try {
    await admin.auth().listUsers(1);
    logger.info("[INFO] Firebase connection successful");
    return true;
  } catch (err) {
    logger.error("[ERROR] Firebase connection failed:", err);
    return false;
  }
};

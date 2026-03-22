import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("69bfacdf00058015ce11");

const account = new Account(client);
const databases = new Databases(client);

// Automatically ping the Appwrite backend server to verify the setup when the app is opened
try {
  client
    .ping()
    .then(() => console.log("Successfully pinged Appwrite backend server!"))
    .catch((err) => console.error("Appwrite ping failed:", err));
} catch {
  // some SDK versions might not have ping, fallback gracefully
}

export { client, account, databases };

// Helper constants for database IDs required by Talkitive
export const appwriteConfig = {
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  channelsCollectionId: import.meta.env.VITE_APPWRITE_CHANNELS_COLLECTION_ID,
  messagesCollectionId: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID,
};

// generate-token.js
require('dotenv').config();
const { Clerk } = require('@clerk/clerk-sdk-node');

// --- ⚙️ CONFIGURATION ---
// Replace this with the Clerk User ID of the user you want a token for.
// You can find this in your Clerk Dashboard under "Users". It starts with "user_".
const USER_ID_TO_IMPERSONATE = 'user_31EwRHZqSZpnqsFLEPn9gBWGWau'; 
// --- END CONFIGURATION ---


const generateToken = async () => {
    if (!process.env.CLERK_SECRET_KEY) {
        console.error("❌ Error: CLERK_SECRET_KEY is not defined in your .env file.");
        return;
    }
    if (!USER_ID_TO_IMPERSONATE || !USER_ID_TO_IMPERSONATE.startsWith('user_')) {
        console.error("❌ Error: Please provide a valid Clerk User ID in the USER_ID_TO_IMPERSONATE variable.");
        return;
    }

    try {
        console.log(`Attempting to generate a token for user: ${USER_ID_TO_IMPERSONATE}`);
        
        const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
        
        // --- THIS IS THE CORRECT METHOD ---
        // The function is `createSignInToken` and it's on the `signInTokens` service.
        const signInToken = await clerk.signInTokens.createSignInToken({
            userId: USER_ID_TO_IMPERSONATE,
        });

        // The actual JWT is inside the 'token' property of the response
        const jwt = signInToken.token;
        // ---------------------------------

        console.log("\n✅ --- TOKEN GENERATED SUCCESSFULLY --- ✅\n");
        console.log("Copy this token and paste it into your automated-test.js script:");
        console.log(`\n${jwt}\n`);
        
    } catch (error) {
        console.error("\n❌ --- FAILED TO GENERATE TOKEN --- ❌");
        console.error("Clerk API Error:", error.message);
        if(error.errors && error.errors.length > 0) {
            // This will give a more detailed error from Clerk's API
            console.error("Details:", error.errors[0].longMessage);
        }
    }
};

generateToken();
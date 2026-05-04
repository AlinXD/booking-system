require('dotenv').config();
const { google } = require('googleapis');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getRefreshToken() {
  const code = "4/0AeoWuM_LIHlytWl_lsVRSmtV79xvjJeHTWOJTJdU0YdEpZD_Hm-6H8EhU2j2-8KIdl01UQ";
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("--- TOKENURI GENERATE ---");
    console.log(tokens); 
    // SALVEAZĂ tokens.refresh_token într-un loc sigur!
  } catch (error) {
    console.error("Eroare la obținerea token-urilor:", error.response.data);
  }
}

getRefreshToken();
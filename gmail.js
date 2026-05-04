require('dotenv').config();
const { google } = require('googleapis');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN) {
  console.error('Eroare: Lipsesc variabile de mediu obligatorii din fișierul .env (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN).');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Setează token-ul (obținut în prealabil după procesul de login)
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function sendConfirmationEmail(toEmail) {
  try {
    const subject = 'Confirmare Rezervare';
    const messageText = 'Rezervarea a fost facuta cu succes.';

    const emailLines = [
      `To: ${toEmail}`,
      'Content-type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      messageText
    ];
    
    const email = emailLines.join('\r\n');
    const base64EncodedEmail = Buffer.from(email).toString('base64url');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64EncodedEmail,
      },
    });
    console.log(`Email trimis cu succes către ${toEmail}! Message ID: ${res.data.id}`);
  } catch (error) {
    console.error('Eroare la trimiterea emailului:', error);
  }
}

// Preia adresa de email din argumentele liniei de comandă
const targetEmail = process.argv[2];
if (targetEmail) {
  sendConfirmationEmail(targetEmail);
} else {
  console.log('Te rog rulează scriptul oferind o adresă de email. Ex: node gmail.js client@exemplu.com');
}
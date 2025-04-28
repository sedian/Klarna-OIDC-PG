const { Issuer } = require('openid-client');
require('dotenv').config();
const readline = require('readline');

async function main() {
  try {
    // Discover Klarna OIDC metadata
    const klarnaIssuer = await Issuer.discover(process.env.OIDC_ISSUER);
    console.log('✅ Klarna OIDC Discovery completed.');

    // Create OIDC client
    const client = new klarnaIssuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      token_endpoint_auth_method: 'client_secret_basic',
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ['code'],
    });

    // Ask user for authorization code
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Paste the authorization code here: ', async (code) => {
      rl.close();

      try {
        const tokenSet = await client.callback(process.env.REDIRECT_URI, { code });

        console.log('✅ Token Set received:');
        console.log(tokenSet);

        const idTokenClaims = tokenSet.claims();
        console.log('🛡️ Decoded ID Token claims:');
        console.log(JSON.stringify(idTokenClaims, null, 2));

      } catch (err) {
        // Print the actual server error from Klarna
        if (err.response && err.response.body) {
          console.error('❌ Token exchange failed (Server response):');
          console.error(JSON.stringify(err.response.body, null, 2));
        } else {
          console.error('❌ Token exchange failed (Error):', err);
        }
      }
    });

  } catch (error) {
    console.error('❌ OIDC setup failed:', error);
  }
}

main();

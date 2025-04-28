const express = require('express');
require('dotenv').config();

const openid = require('openid-client');
const Issuer = openid.Issuer;

const app = express();
const port = 3000;

let client = null;

async function setupOIDCClient() {
  try {
    const klarnaIssuer = await Issuer.discover('https://login.playground.klarna.com/.well-known/openid-configuration');
    console.log('✅ Klarna issuer discovered.');

    client = new klarnaIssuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET, // <- this is your API key password
      token_endpoint_auth_method: 'client_secret_basic', // <- Klarna uses HTTP Basic Auth
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ['code'],
    });

    console.log('✅ Klarna OIDC client initialized.');
  } catch (err) {
    console.error('❌ Klarna OIDC setup failed:', err);
  }
}

app.get('/login', (req, res) => {
  if (!client) return res.send('⚠️ OIDC client not ready.');
  const url = client.authorizationUrl({
    scope: 'openid offline_access profile:name profile:email profile:date_of_birth profile:billing_address profile:shipping_address',
    state: 'teststate1234',
  });
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const sessionId = req.query.session_id;
    const expectedState = stateStore.get(sessionId);

    console.log('↩️ Returned state:', req.query.state);
    console.log('🔐 Expected state:', expectedState);

    const tokenSet = await client.callback(process.env.REDIRECT_URI, params, {
      state: expectedState,
    });

    stateStore.delete(sessionId); // clean up after use

    const userinfo = await client.userinfo(tokenSet.access_token);
    res.send(`<h1>✅ Logged in!</h1><pre>${JSON.stringify(userinfo, null, 2)}</pre>`);
  } catch (err) {
    console.error('❌ Callback error:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  setupOIDCClient();
});

import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';

const key = 'antojolink.session';
const client = new CognitoIdentityProviderClient({ region: import.meta.env.VITE_AWS_REGION || 'us-east-1' });
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!session?.token || session.expiresAt <= Date.now()) { sessionStorage.removeItem(key); return null; }
    return session;
  } catch { sessionStorage.removeItem(key); return null; }
}

function saveSession(result) {
  const auth = result.AuthenticationResult;
  if (!auth?.IdToken) throw new Error('Cognito no devolvió un token de sesión.');
  const session = { token: auth.IdToken, expiresAt: Date.now() + (auth.ExpiresIn || 3600) * 1000 };
  sessionStorage.setItem(key, JSON.stringify(session));
  return session;
}

export async function login(email, password) {
  if (!clientId) throw new Error('Configura VITE_COGNITO_CLIENT_ID.');
  const result = await client.send(new InitiateAuthCommand({ AuthFlow: 'USER_PASSWORD_AUTH', ClientId: clientId, AuthParameters: { USERNAME: email, PASSWORD: password } }));
  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') return { challenge: true, email, session: result.Session };
  return { session: saveSession(result) };
}

export async function completeTemporaryPassword(email, password, challengeSession) {
  const result = await client.send(new RespondToAuthChallengeCommand({ ClientId: clientId, ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: challengeSession, ChallengeResponses: { USERNAME: email, NEW_PASSWORD: password } }));
  return saveSession(result);
}

export function logout() { sessionStorage.removeItem(key); }

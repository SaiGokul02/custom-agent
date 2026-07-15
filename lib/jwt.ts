import { SignJWT, type JWTPayload } from 'jose';

interface UserSessionPayload extends JWTPayload {
  id: string;
  username: string;
  email: string;
}

export default async function generateToken(payload: UserSessionPayload): Promise<string> {
  const secretString = process.env.JWT_SECRET;
  
  if (!secretString) {
    throw new Error('JWT_SECRET is missing');
  }

  const secretBytes = new TextEncoder().encode(secretString);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretBytes);
}

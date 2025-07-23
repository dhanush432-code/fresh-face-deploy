import jwt from 'jsonwebtoken';

export function generateToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
}

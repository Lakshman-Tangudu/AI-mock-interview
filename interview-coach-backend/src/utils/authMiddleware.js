import { supabase } from './supabase.js';

export async function verifySupabaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user info to request
    req.user = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
    };
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ error: 'Token verification failed' });
  }
}

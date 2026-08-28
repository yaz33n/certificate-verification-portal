/**
 * DCODE CLUB — Client-Side ID & Secret Key Authentication Engine
 * SHA-256 Hashed admin credentials with instant session persistence.
 */

export const AUTHORIZED_ADMINS = [
  {
    id: 'admin',
    name: 'DCODE Super Admin',
    role: 'Club Administrator & System Owner',
    email: 'admin@dcode.club',
    // SHA-256 for: "dcode@2025"
    passHash: '433767c9c0c8ff3d85bc97f39ca2fc7636e2f1ea38ec05db518f830386cfdb82'
  },
  {
    id: 'asif',
    name: 'Syed Asif',
    role: 'DCODE President & Lead Organizer',
    email: 'syedasif111005@gmail.com',
    // SHA-256 for: "asif@dcode2025"
    passHash: '5e7090886da13a778c4a452ef95188f62fae8477d9c66914b43d2207b5a864aa'
  },
  {
    id: 'sanjivani',
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // SHA-256 for: "ssiems@2025"
    passHash: '8b456cf7b6bc303b7fa57929dcfd6bc9f000b05b821415df2e0faaa1f52b757e'
  },
  {
    id: 'yaseen',
    name: 'Yaseen Khan',
    role: 'Technical Lead & System Architect',
    email: 'ysnhun412@gmail.com',
    // SHA-256 for: "yaseen@dcode"
    passHash: '4db59aeb9f27d53b26c7104a3caea41bdf0d0b074a383d6a2a07c086d34e9e04'
  }
];

const SESSION_KEY = 'dcode_admin_session_token';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function authenticateAdmin(adminId, password) {
  const cleanId = String(adminId || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both Admin ID and Password.' };
  }

  const admin = AUTHORIZED_ADMINS.find(a => 
    a.id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!admin) {
    return { success: false, error: 'Invalid Admin ID or Email.' };
  }

  const hashedInput = await sha256(cleanPass);
  if (hashedInput !== admin.passHash) {
    return { success: false, error: 'Incorrect Password. Please try again.' };
  }

  const sessionData = {
    id: admin.id,
    name: admin.name,
    role: admin.role,
    email: admin.email,
    displayName: admin.name,
    loggedInAt: Date.now()
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Storage notice:', e);
  }

  return { success: true, user: sessionData };
}

export function getCurrentSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.loggedInAt > 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}

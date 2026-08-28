/**
 * DCODE CLUB — Client-Side ID & Secret Key Authentication Engine
 * SHA-256 Hashed admin credentials with instant session persistence.
 */

export const AUTHORIZED_ADMINS = [
  {
    id: 'yaseen',
    name: 'Yaseen Khan',
    role: 'Technical Lead & System Architect',
    email: 'ysnhun412@gmail.com',
    // 2-word passphrase: "cyber-falcon" (or "cyber falcon")
    passHashes: [
      '52d6f6c9fe7ebd0bf7fa7087f9165f0e8568ea27c1d248733078d6d0c95a580b', // cyber-falcon
      '0748446ed995d3b9d4214b5c8fc889dbc587704f9fd94b3070042bedf7ec3d3f'  // cyber falcon
    ]
  },
  {
    id: 'asif',
    name: 'Syed Asif',
    role: 'DCODE President & Lead Organizer',
    email: 'syedasif111005@gmail.com',
    // 2-word passphrase: "orbit-shield" (or "orbit shield")
    passHashes: [
      'b17c9309b82bb851403daa89e99e681a6221026e7e40e76b31f44257226081f9', // orbit-shield
      '9731f8263d64473ab717e40cbbd22ba7c625b8b3a831711c5fd051aa6011fbb3'  // orbit shield
    ]
  },
  {
    id: 'sanjivani',
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 2-word passphrase: "vertex-code" (or "vertex code")
    passHashes: [
      '46f63dc19b97c10d88f292713c8361872cab602c725c6f457b92d5a741c443f6', // vertex-code
      '7d2b37b384a3437515f1ae373bee10cf09e03e8e8bdcb587cb0f3ef2fce8cef1'  // vertex code
    ]
  },
  {
    id: 'sanjivni', // alias support for spelling "sanjivni"
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 2-word passphrase: "vertex-code" (or "vertex code")
    passHashes: [
      '46f63dc19b97c10d88f292713c8361872cab602c725c6f457b92d5a741c443f6', // vertex-code
      '7d2b37b384a3437515f1ae373bee10cf09e03e8e8bdcb587cb0f3ef2fce8cef1'  // vertex code
    ]
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
  const isValid = Array.isArray(admin.passHashes) 
    ? admin.passHashes.includes(hashedInput)
    : admin.passHash === hashedInput;

  if (!isValid) {
    return { success: false, error: 'Incorrect Passphrase. Please try again.' };
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

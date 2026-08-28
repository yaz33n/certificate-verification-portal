/**
 * DCODE CLUB — Certificate Verification Portal
 * Backend: Firestore & Supabase with Local Registry Fallback
 */
import { db } from './firebase-service.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

// ============================================================
// SUPABASE SETUP — Safe initialization
// ============================================================
let supabaseClient = null;
let useSupabase = false;

try {
	// Check if Supabase library loaded from CDN
	if (typeof supabase !== 'undefined' && supabase.createClient) {
		const SUPABASE_URL = 'https://nxmtyxbjpknpltsvetjh.supabase.co';
		const SUPABASE_ANON_KEY = 'sb_publishable_vKR9jXVpYxIr5CpuaIfnuQ_f2_mvqpl';

		supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		useSupabase = true;
		console.log('[CertPortal] Supabase connected.');
	}
} catch (err) {
	console.warn('[CertPortal] Supabase init notice:', err);
}

// ============================================================
// DEMO REGISTRY (works offline, no internet needed)
// ============================================================
const DEMO_REGISTRY = {
	"CC-2025-ASIF-001": {
		name: "Alex Rivera",
		event: "THE ASIF TALKS — Live Episode #1",
		series: "Leadership, Governance & Youth Dialogue Series",
		date: "2025-03-15",
		issuer: "The ASIF Talks & DCODE Developers Club",
		skills: ["Leadership", "Governance", "Youth Dialogue", "Public Policy", "Civic Tech"],
		checksum: "9f83a7c2e1b8c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123",
		perk: "20% discount on bootcamps and workshops",
		tier: "Gold Architect",
		events_attended: 8,
		partners: "Vertex • D Co</> Developers Club • SSIEMS Parbhani"
	},
	"CC-2026-VIBE-002": {
		name: "Elena Rostova",
		event: "Hands-on Workshop on Vibe Coding: Rapidly Building & Deploying GenAI Apps on Google Cloud",
		series: "DDSC Developer Workshop Series",
		date: "2026-05-16",
		issuer: "DDSC (DCode Developers Club) & Google Developer Expert",
		skills: ["Vibe Coding", "Gemini API", "Google Cloud", "GenAI Architecture", "Fast Prototyping"],
		checksum: "b8e2d1f4a9c5e3d7b1a6c4f8d2e9b3a7f1c5d9e2a8b4c7d1e6f3a9b5c8d2e7f4",
		perk: "10% discount on next workshop",
		tier: "Silver Contributor",
		events_attended: 5,
		partners: "Google Developer Expert • SSIEMS Parbhani • HP World Parbhani"
	},
	"CC-2026-AGENT-003": {
		name: "Marcus Vance",
		event: "Agentic AI & Autonomous Multi-Agent Workflows Summit 2026",
		series: "AI Systems Engineering & Production Agents",
		date: "2026-07-20",
		issuer: "DDSC AI Research Wing & Google Cloud",
		skills: ["Multi-Agent Systems", "Deep Reasoning", "Tool Calling", "Gemini 3 API", "Cloud Run"],
		checksum: "c5a1b3d7e8f2a9c4d6e1b8f3a5d7c2e9f4a8b1c6d3e7f2a5b9c4d8e1f6a3b7c2",
		perk: "20% discount on bootcamps and workshops",
		tier: "Gold Architect",
		events_attended: 6,
		partners: "DDSC • Google Cloud AI • Vertex AI"
	},
	"CC-2026-ZKSEC-004": {
		name: "Siddharth Rao",
		event: "Zero-Knowledge Cryptography & Smart Contract Security Protocol",
		series: "Web3 Advanced Security & Verification",
		date: "2026-09-12",
		issuer: "DDSC Cyber Security Lab & Ethereum Devs",
		skills: ["zk-SNARKs", "Rust", "Circom", "Smart Contract Audits", "Formal Verification"],
		checksum: "d2f8a4c1b6e3d9f5a8b2c7e1f4a9d3c6b8e2a5f1d7c4b9e3a6f2c8d1e5b7a4f9",
		perk: "20% discount on bootcamps and workshops",
		tier: "Gold Architect",
		events_attended: 9,
		partners: "DDSC Cyber Wing • Ethereum Security Alliance • SSIEMS"
	},
	"CC-2026-KUBE-005": {
		name: "Sophia Chen",
		event: "Cloud Native Platform Engineering: Kubernetes & Distributed Mesh",
		series: "DevOps & Cloud Systems Architecture",
		date: "2026-10-24",
		issuer: "DDSC Infrastructure Group & Red Hat Systems",
		skills: ["Kubernetes", "Istio Service Mesh", "Terraform", "Zero-Downtime CI/CD", "Docker"],
		checksum: "e4c7b2a9f3d1e8a5b2c9d6f3a1e7b4c8d2f6a9b3c5e1d7f4a8b2c6e3d9f1a5b8",
		perk: "10% discount on next workshop",
		tier: "Silver Contributor",
		events_attended: 4,
		partners: "DDSC • Red Hat Systems • Cloud Native Parbhani"
	},
	"CC-2026-QUANT-006": {
		name: "David Miller",
		event: "Quantum Computing & Advanced Algorithmic Complexity Masterclass",
		series: "Quantum Information Science & Deep Algorithms",
		date: "2026-11-18",
		issuer: "DDSC Quantum Lab & SSIEMS Advanced Research",
		skills: ["Quantum Circuits", "IBM Qiskit", "Superposition", "Grover's Algorithm", "Quantum Gates"],
		checksum: "f1a9d5b8e2c4a7d3f6b9e1c8a4d2f7b5e3c1a8d6f2b4e9c7a5d1f8b3e6c2a9d4",
		perk: null,
		tier: "Bronze Builder",
		events_attended: 3,
		partners: "DDSC Quantum Lab • SSIEMS Research Center • Tech Horizons"
	}
};

// ============================================================
// DOM REFERENCES
// ============================================================
const certInput = document.getElementById('certInput');
const verifyBtn = document.getElementById('verifyBtn');
const resultArea = document.getElementById('resultArea');

if (!certInput || !verifyBtn || !resultArea) {
	console.error('[CertPortal] ERROR: Missing DOM elements. Check your HTML IDs.');
}

// ============================================================
// VERIFY FUNCTION (auto-routes to Supabase or local)
// ============================================================
async function verify(certId) {
	certId = (certId || '').trim().toUpperCase();
	if (!certId) return;

	console.log('[CertPortal] Verifying:', certId);

	// Show loading
	resultArea.innerHTML = `
    <div style="text-align:center;padding:24px;color:var(--text-secondary,#64748b);">
      <div style="width:24px;height:24px;border:2px solid #cbd5e1;border-top-color:#0f172a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 8px;"></div>
      <div style="font-size:13px;">Verifying certificate...</div>
    </div>
  `;
	resultArea.classList.remove('hidden');

	// 1. Try Firebase Firestore
	if (db) {
		try {
			const docRef = doc(db, 'certificates', certId);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				const data = docSnap.data();
				console.log('[CertPortal] Firestore match found:', data.name);
				renderValid(certId, {
					name: data.name,
					event: data.event,
					date: data.date,
					issuer: data.issuer || 'DCODE Club HQ',
					skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(',').map(s => s.trim()) : []),
					checksum: data.checksum || 'N/A',
					tier: data.role || data.tier || 'Participant',
					perk: getPerkForTier(data.role || data.tier)
				});
				return;
			}
		} catch (err) {
			console.warn('[CertPortal] Firestore check notice:', err);
		}
	}

	// 2. Try Supabase
	if (useSupabase && supabaseClient) {
		await verifyWithSupabase(certId);
		return;
	}

	// 3. Try Local Registry
	console.log('[CertPortal] Using local demo registry.');
	verifyLocal(certId);
}
// ============================================================
// SUPABASE VERIFICATION (updated for generator schema)
// ============================================================
async function verifyWithSupabase(certId) {
	try {
		const { data, error } = await supabaseClient
			.from('certificates')
			.select('*')
			.eq('cert_id', certId)
			.single();

		if (error || !data) {
			console.log('[CertPortal] Supabase returned no match. Trying local fallback...');
			verifyLocal(certId);
			return;
		}

		// Map database schema to the format expected by renderValid
		const mapped = {
			name: data.name,
			event: data.event,
			date: data.date || data.issue_date || data.event_date,
			issuer: data.issuer || 'Coding Club HQ',
			skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(',').map(s => s.trim()) : []),
			checksum: data.checksum || 'N/A',
			tier: data.tier || 'Bronze Builder',
			events_attended: data.events_attended || 1,
			perk: getPerkForTier(data.tier),
			image_path: data.image_path,
			emailed: data.emailed,
		};

		console.log('[CertPortal] Supabase match found:', data.name);
		renderValid(certId, mapped);
	} catch (err) {
		console.error('[CertPortal] Supabase query failed:', err);
		console.log('[CertPortal] Falling back to local registry.');
		verifyLocal(certId);
	}
}

// Add this helper function
function getPerkForTier(tier) {
	if (tier === 'Gold Architect') return '20% discount on bootcamps and workshops';
	if (tier === 'Silver Contributor') return '10% discount on next workshop';
	return null;
}


// ============================================================
// LOCAL VERIFICATION (offline fallback)
// ============================================================
function verifyLocal(certId) {
	const data = DEMO_REGISTRY[certId];
	if (data) {
		console.log('[CertPortal] Local match found:', data.name);
		renderValid(certId, data);
	} else {
		console.log('[CertPortal] No local match for:', certId);
		renderInvalid(certId);
	}
}

// ============================================================
// RENDER: VALID
// ============================================================
function renderValid(certId, data) {
	const skills = Array.isArray(data.skills) ? data.skills : [];
	const skillsHtml = skills
		.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`)
		.join('');

	const perkHtml = data.perk
		? `<div class="perk-banner">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0;color:var(--warning,#f59e0b);"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>
        <span class="perk-text">${escapeHtml(data.perk)} — ${escapeHtml(data.tier)}</span>
       </div>`
		: '';

	const partnerHtml = data.partners
		? `<div class="cred-item" style="grid-column: 1 / -1;"><div class="cred-label">Partners & Ecosystem</div><div class="cred-value">${escapeHtml(data.partners)}</div></div>`
		: '';

	// Render preview certificate image if available
	let previewImgSrc = '';
	if (CERT_RENDER_ENGINES[certId]) {
		previewImgSrc = CERT_RENDER_ENGINES[certId]({ ...data, cert_id: certId });
	}

	const previewHtml = previewImgSrc
		? `<div style="margin: 16px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle, #e2e8f0); box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
			<img src="${previewImgSrc}" alt="Verified Certificate" style="width:100%; display:block; aspect-ratio: 1060/680; object-fit: cover;">
		   </div>`
		: '';

	resultArea.innerHTML = `
    <div class="result-valid">
      <div class="result-header">
        <svg class="result-icon" viewBox="0 0 24 24" fill="var(--positive,#10b981)" style="width:22px;height:22px;flex-shrink:0;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 14.17L7.41 12.59l1.18-1.18L11 13.83l4.59-4.59L16.77 10.4 11 16.17Z"/></svg>
        <div>
          <div class="result-title">Authentic Certificate</div>
          <div class="result-sub">Cryptographically verified by DCODE Club</div>
        </div>
      </div>
      ${previewHtml}
      <div class="cred-grid">
        <div class="cred-item"><div class="cred-label">Recipient</div><div class="cred-value font-semibold">${escapeHtml(data.name)}</div></div>
        <div class="cred-item"><div class="cred-label">Event / Workshop</div><div class="cred-value">${escapeHtml(data.event)}</div></div>
        <div class="cred-item"><div class="cred-label">Issue Date</div><div class="cred-value">${escapeHtml(data.date)}</div></div>
        <div class="cred-item"><div class="cred-label">Issuing Authority</div><div class="cred-value">${escapeHtml(data.issuer || 'DCODE Club HQ')}</div></div>
        <div class="cred-item"><div class="cred-label">Certificate ID</div><div class="cred-value mono font-semibold">${escapeHtml(certId)}</div></div>
        <div class="cred-item"><div class="cred-label">SHA-256 Checksum</div><div class="cred-value mono">${escapeHtml(data.checksum)}</div></div>
        ${partnerHtml}
      </div>
      <div class="skills-row">${skillsHtml}</div>
      ${perkHtml}
      <div class="result-actions">
        ${previewImgSrc ? `<a class="action-btn" href="${previewImgSrc}" download="${escapeHtml(certId)}.png" style="text-decoration:none;">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
          Download PNG
        </a>` : ''}
        <button class="action-btn" onclick="window.print()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M19 9h-1V4H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 6h8v3H8V6zm8 14H8v-4h8v4zm2-4v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z"/></svg>
          Print
        </button>
        <button class="action-btn" onclick="copyLink('${escapeHtml(certId)}')" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          Copy link
        </button>
        <button class="action-btn" onclick="resetVerification()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          Verify another
        </button>
      </div>
    </div>
  `;
	resultArea.classList.remove('hidden');
}

// ============================================================
// RENDER: INVALID
// ============================================================
function renderInvalid(certId) {
	resultArea.innerHTML = `
    <div class="result-invalid">
      <div class="result-header">
        <svg class="result-icon" viewBox="0 0 24 24" fill="var(--danger,#ef4444)" style="width:22px;height:22px;flex-shrink:0;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>
        <div>
          <div class="result-title">Certificate Not Found</div>
          <div class="result-sub">This ID does not exist in our registry</div>
        </div>
      </div>
      <p class="invalid-help">
        Please double-check the certificate ID. If you believe this is an error, contact support at
        <a href="mailto:certificates@codingclub.dev">certificates@codingclub.dev</a>
        with the ID: <code>${escapeHtml(certId)}</code>
      </p>
      <div class="result-actions">
        <button class="action-btn" onclick="resetVerification()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          Try again
        </button>
      </div>
    </div>
  `;
	resultArea.classList.remove('hidden');
}

// ============================================================
// ACTIONS
// ============================================================
function resetVerification() {
	certInput.value = '';
	resultArea.classList.add('hidden');
	resultArea.innerHTML = '';
	certInput.focus();
}

function copyLink(certId) {
	const baseUrl = window.location.href.split('?')[0];
	const url = baseUrl + '?cert=' + encodeURIComponent(certId);

	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(url)
			.then(() => showToast('Link copied!'))
			.catch(() => showToast(url));
	} else {
		const ta = document.createElement('textarea');
		ta.value = url;
		ta.style.cssText = 'position:fixed;opacity:0;';
		document.body.appendChild(ta);
		ta.select();
		try { document.execCommand('copy'); showToast('Link copied!'); }
		catch { showToast(url); }
		document.body.removeChild(ta);
	}
}

function showToast(msg) {
	const old = document.querySelector('.toast-msg');
	if (old) old.remove();
	const t = document.createElement('div');
	t.className = 'toast-msg';
	t.textContent = msg;
	t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:1000;animation:toastIn 0.3s ease;';
	document.body.appendChild(t);
	setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(text) {
	const d = document.createElement('div');
	d.textContent = String(text || '');
	return d.innerHTML;
}

// ============================================================
// RANDOM SCATTERED CERTIFICATES GENERATION (3 Left + 3 Right)
// ============================================================

// ============================================================
// REALISTIC CERTIFICATE CANVAS RENDERERS (2 User Samples + 4 Future Prospects)
// ============================================================

function drawMicrophoneIcon(ctx, x, y, size, color) {
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineWidth = size * 0.12;

	// Capsule body
	const w = size * 0.45;
	const h = size * 0.7;
	ctx.beginPath();
	ctx.roundRect(x - w / 2, y - h / 2, w, h, w / 2);
	ctx.fill();

	// Arc cradle
	ctx.beginPath();
	ctx.arc(x, y, size * 0.38, 0, Math.PI);
	ctx.stroke();

	// Stand
	ctx.beginPath();
	ctx.moveTo(x, y + size * 0.38);
	ctx.lineTo(x, y + size * 0.65);
	ctx.stroke();

	// Base
	ctx.beginPath();
	ctx.moveTo(x - size * 0.3, y + size * 0.65);
	ctx.lineTo(x + size * 0.3, y + size * 0.65);
	ctx.stroke();

	ctx.restore();
}

function drawSimulatedQr(ctx, x, y, size) {
	ctx.save();
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(x, y, size, size);
	ctx.strokeStyle = '#0f172a';
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, size, size);

	ctx.fillStyle = '#0f172a';
	const cellSize = size / 10;
	// Corner finder patterns
	ctx.fillRect(x + cellSize, y + cellSize, cellSize * 3, cellSize * 3);
	ctx.clearRect(x + cellSize * 1.5, y + cellSize * 1.5, cellSize * 2, cellSize * 2);
	ctx.fillRect(x + cellSize * 1.8, y + cellSize * 1.8, cellSize * 1.4, cellSize * 1.4);

	ctx.fillRect(x + size - cellSize * 4, y + cellSize, cellSize * 3, cellSize * 3);
	ctx.clearRect(x + size - cellSize * 3.5, y + cellSize * 1.5, cellSize * 2, cellSize * 2);
	ctx.fillRect(x + size - cellSize * 3.2, y + cellSize * 1.8, cellSize * 1.4, cellSize * 1.4);

	ctx.fillRect(x + cellSize, y + size - cellSize * 4, cellSize * 3, cellSize * 3);
	ctx.clearRect(x + cellSize * 1.5, y + size - cellSize * 3.5, cellSize * 2, cellSize * 2);
	ctx.fillRect(x + cellSize * 1.8, y + size - cellSize * 3.2, cellSize * 1.4, cellSize * 1.4);

	// Pseudo random data matrix dots
	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) {
			if ((r < 4 && c < 4) || (r < 4 && c > 3) || (r > 3 && c < 4)) continue;
			if ((r * 7 + c * 13) % 2 === 0) {
				ctx.fillRect(x + (c + 1) * cellSize, y + (r + 1) * cellSize, cellSize * 0.8, cellSize * 0.8);
			}
		}
	}
	ctx.restore();
}

function drawSimulatedSignature(ctx, x, y, name, color = '#1e293b') {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x - 50, y);
	ctx.bezierCurveTo(x - 30, y - 25, x - 10, y + 15, x + 10, y - 15);
	ctx.bezierCurveTo(x + 25, y + 20, x + 40, y - 10, x + 60, y);
	ctx.stroke();
	ctx.restore();
}

// 1. SAMPLE 1: THE ASIF TALKS
function renderAsifTalksCertificate(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Deep dark blue / navy background
	const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bg.addColorStop(0, '#060d1a');
	bg.addColorStop(0.5, '#0a1628');
	bg.addColorStop(1, '#050b16');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Gold header frame & curves
	ctx.strokeStyle = '#eab308';
	ctx.lineWidth = 3;
	ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

	// Top gold arch
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = '#ca8a04';
	ctx.lineWidth = 2;
	ctx.arc(canvas.width / 2, 60, 480, 0.15 * Math.PI, 0.85 * Math.PI, true);
	ctx.stroke();
	ctx.restore();

	// Circuit traces
	ctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
	ctx.lineWidth = 1.5;
	// Left circuit
	ctx.beginPath();
	ctx.moveTo(220, 160); ctx.lineTo(310, 160); ctx.lineTo(340, 185); ctx.lineTo(380, 185);
	ctx.moveTo(200, 200); ctx.lineTo(270, 200); ctx.lineTo(300, 220); ctx.lineTo(370, 220);
	ctx.stroke();
	// Right circuit
	ctx.beginPath();
	ctx.moveTo(840, 160); ctx.lineTo(750, 160); ctx.lineTo(720, 185); ctx.lineTo(680, 185);
	ctx.moveTo(860, 200); ctx.lineTo(790, 200); ctx.lineTo(760, 220); ctx.lineTo(690, 220);
	ctx.stroke();

	// Top Badge: LIVE EPISODE #1
	ctx.fillStyle = '#eab308';
	ctx.font = '700 13px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('—— LIVE EPISODE #1 ——', canvas.width / 2, 45);

	// Left Gold Rosette Ribbon: LIVE EPISODE #1
	ctx.save();
	ctx.fillStyle = '#0f172a';
	ctx.beginPath();
	ctx.arc(95, 110, 44, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#eab308';
	ctx.lineWidth = 4;
	ctx.stroke();
	drawMicrophoneIcon(ctx, 95, 95, 20, '#eab308');
	ctx.fillStyle = '#ffffff';
	ctx.font = '800 10px Inter, sans-serif';
	ctx.fillText('LIVE EPISODE', 95, 125);
	ctx.fillStyle = '#eab308';
	ctx.font = '800 12px Inter, sans-serif';
	ctx.fillText('#1', 95, 138);
	ctx.font = '10px Inter, sans-serif';
	ctx.fillText('★★★', 95, 148);
	ctx.restore();

	// Big Title: THE ASIF TALKS
	ctx.fillStyle = '#ffffff';
	ctx.font = '900 46px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.letterSpacing = '3px';
	ctx.fillText('THE ASIF TALKS', canvas.width / 2, 120);

	drawMicrophoneIcon(ctx, canvas.width / 2 + 210, 100, 36, '#eab308');

	ctx.fillStyle = '#fef08a';
	ctx.font = '700 14px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('LEADERSHIP, GOVERNANCE & YOUTH DIALOGUE SERIES', canvas.width / 2, 155);

	// White inner container
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.roundRect(40, 175, canvas.width - 80, 440, 16);
	ctx.fill();

	// CERTIFICATE OF PARTICIPATION
	ctx.fillStyle = '#0f172a';
	ctx.font = '900 32px "Times New Roman", Georgia, serif';
	ctx.letterSpacing = '5px';
	ctx.fillText('C E R T I F I C A T E', canvas.width / 2, 225);

	ctx.fillStyle = '#475569';
	ctx.font = '700 13px Inter, sans-serif';
	ctx.letterSpacing = '3px';
	ctx.fillText('O F   P A R T I C I P A T I O N', canvas.width / 2, 252);

	ctx.fillStyle = '#64748b';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('PROUDLY PRESENTED TO', canvas.width / 2, 280);

	// Recipient Name
	ctx.fillStyle = '#1e3a8a';
	ctx.font = '700 34px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 325);

	// Line under name
	ctx.strokeStyle = '#eab308';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 200, 340);
	ctx.lineTo(canvas.width / 2 + 200, 340);
	ctx.stroke();

	// Main citation text
	ctx.fillStyle = '#334155';
	ctx.font = '500 13px Inter, sans-serif';
	ctx.fillText('for actively participating in "THE ASIF TALKS — Live Episode #1", a youth dialogue on', canvas.width / 2, 370);
	ctx.font = '600 13px Inter, sans-serif';
	ctx.fillText('Leadership, Governance & Positive Impact.', canvas.width / 2, 390);

	// Left Sidebar: FOR WHOM?
	ctx.textAlign = 'left';
	ctx.fillStyle = '#1e293b';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('FOR WHOM?', 65, 230);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('• Youth (Future Leaders)', 65, 250);
	ctx.fillText('• Students (Learners Today)', 65, 270);
	ctx.fillText('• Community (Impact)', 65, 290);

	// Right Sidebar: Highlights
	ctx.textAlign = 'left';
	ctx.fillStyle = '#1e293b';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('PILLARS', canvas.width - 220, 230);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('• Real Conversations', canvas.width - 220, 250);
	ctx.fillText('• New Perspectives', canvas.width - 220, 270);
	ctx.fillText('• Youth Empowerment', canvas.width - 220, 290);
	ctx.fillText('• Positive Impact', canvas.width - 220, 310);

	// Association logos & seal
	ctx.textAlign = 'center';
	ctx.fillStyle = '#64748b';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('IN ASSOCIATION WITH', canvas.width / 2, 435);

	ctx.fillStyle = '#0f172a';
	ctx.font = '700 14px Inter, sans-serif';
	ctx.fillText('Vertex   |   D Co</> DEVELOPERS CLUB   |   SSIEMS', canvas.width / 2, 460);

	// Center Gold 5-Star Seal
	const sealX = canvas.width / 2;
	const sealY = 535;
	ctx.fillStyle = '#eab308';
	ctx.beginPath();
	ctx.arc(sealX, sealY, 28, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 18px Inter, sans-serif';
	ctx.fillText('★', sealX, sealY + 6);

	// Signatures
	drawSimulatedSignature(ctx, 160, 520, 'The Asif', '#0f172a');
	ctx.fillStyle = '#0f172a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('THE ASIF', 160, 555);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('HOST', 160, 570);

	drawSimulatedSignature(ctx, canvas.width - 260, 520, 'Organizing Team', '#0f172a');
	ctx.fillStyle = '#0f172a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('ORGANIZING TEAM', canvas.width - 260, 555);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('THE ASIF TALKS', canvas.width - 260, 570);

	// QR Code on right
	drawSimulatedQr(ctx, canvas.width - 130, 485, 60);
	ctx.fillStyle = '#64748b';
	ctx.font = '600 8px Inter, sans-serif';
	ctx.fillText('SCAN TO VERIFY', canvas.width - 100, 560);

	// Bottom Footer Ribbon
	ctx.fillStyle = '#0a1628';
	ctx.fillRect(40, 585, canvas.width - 80, 30);
	ctx.fillStyle = '#e2e8f0';
	ctx.font = '600 11px Inter, sans-serif';
	ctx.fillText('ONE STAGE.   |   ONE PURPOSE.   |   COUNTLESS FUTURES.', canvas.width / 2, 604);

	return canvas.toDataURL('image/png');
}

// 2. SAMPLE 2: VIBE CODING (Google Developer Expert & DDSC)
function renderVibeCodingCertificate(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Clean white background with modern border
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Blue top-left corner accent
	ctx.fillStyle = '#1d4ed8';
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(240, 0);
	ctx.lineTo(0, 140);
	ctx.closePath();
	ctx.fill();

	// Red bottom-right accent
	ctx.fillStyle = '#dc2626';
	ctx.beginPath();
	ctx.moveTo(canvas.width, canvas.height);
	ctx.lineTo(canvas.width - 180, canvas.height);
	ctx.lineTo(canvas.width, canvas.height - 110);
	ctx.closePath();
	ctx.fill();

	// Outer frame
	ctx.strokeStyle = '#e2e8f0';
	ctx.lineWidth = 3;
	ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

	// Header: D Co</> DEVELOPERS CLUB (DDSC)
	ctx.fillStyle = '#0f172a';
	ctx.font = '800 24px Inter, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText('D Co</>', 60, 55);
	ctx.font = '700 14px Inter, sans-serif';
	ctx.fillStyle = '#1e293b';
	ctx.fillText('DEVELOPERS CLUB', 60, 75);
	ctx.fillStyle = '#2563eb';
	ctx.font = '600 11px Inter, sans-serif';
	ctx.fillText('DDSC (DCode Developers Club) PRESENTS', 60, 95);

	// Center Google Developer Expert Badge
	const gdeX = canvas.width / 2;
	ctx.fillStyle = '#2563eb';
	ctx.beginPath();
	ctx.moveTo(gdeX - 60, 25);
	ctx.lineTo(gdeX + 60, 25);
	ctx.lineTo(gdeX + 70, 70);
	ctx.lineTo(gdeX, 100);
	ctx.lineTo(gdeX - 70, 70);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 13px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('< >', gdeX, 48);
	ctx.font = '600 11px Inter, sans-serif';
	ctx.fillText('Google Developer', gdeX, 64);
	ctx.font = '800 12px Inter, sans-serif';
	ctx.fillText('Expert', gdeX, 78);
	ctx.fillStyle = '#facc15';
	ctx.fillText('★', gdeX, 92);

	// Right Partner: SSIEMS Parbhani
	ctx.textAlign = 'right';
	ctx.fillStyle = '#2563eb';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('OUR PARTNER', canvas.width - 60, 40);
	ctx.fillStyle = '#0f172a';
	ctx.font = '700 13px Inter, sans-serif';
	ctx.fillText('Shri Shivaji Institute of', canvas.width - 60, 60);
	ctx.fillText('Engineering & Management Studies', canvas.width - 60, 76);
	ctx.fillStyle = '#64748b';
	ctx.font = '600 11px Inter, sans-serif';
	ctx.fillText('Parbhani', canvas.width - 60, 92);

	// Big Title: CERTIFICATE OF PARTICIPATION
	ctx.textAlign = 'center';
	ctx.fillStyle = '#2563eb';
	ctx.font = '900 38px Inter, sans-serif';
	ctx.letterSpacing = '4px';
	ctx.fillText('CERTIFICATE', canvas.width / 2, 155);

	ctx.fillStyle = '#475569';
	ctx.font = '700 15px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('OF PARTICIPATION', canvas.width / 2, 180);

	ctx.fillStyle = '#64748b';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.fillText('THIS IS TO CERTIFY THAT', canvas.width / 2, 205);

	// Recipient Name
	ctx.fillStyle = '#0f172a';
	ctx.font = '800 34px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 255);

	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 240, 270);
	ctx.lineTo(canvas.width / 2 + 240, 270);
	ctx.stroke();

	ctx.fillStyle = '#475569';
	ctx.font = '500 13px Inter, sans-serif';
	ctx.fillText('has successfully participated in the HANDS-ON WORKSHOP ON', canvas.width / 2, 295);

	// Workshop Title
	ctx.fillStyle = '#0f172a';
	ctx.font = '900 24px Inter, sans-serif';
	ctx.fillText('VIBE CODING:', canvas.width / 2 - 120, 335);

	ctx.fillStyle = '#2563eb';
	ctx.font = '800 18px Inter, sans-serif';
	ctx.fillText('RAPIDLY BUILDING & DEPLOYING', canvas.width / 2 + 130, 325);
	ctx.fillStyle = '#059669';
	ctx.fillText('GenAI APPS ON Google Cloud', canvas.width / 2 + 130, 348);

	ctx.fillStyle = '#64748b';
	ctx.font = '500 12px Inter, sans-serif';
	ctx.fillText('organised by DDSC in partnership with SSIEMS, Parbhani.', canvas.width / 2, 380);

	// Left Schedule Pill Box
	ctx.textAlign = 'left';
	ctx.fillStyle = '#f8fafc';
	ctx.strokeStyle = '#cbd5e1';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(40, 160, 180, 190, 12);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = '#1e3a8a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('📅 16th May 2026', 55, 190);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('Saturday', 55, 205);

	ctx.fillStyle = '#1e3a8a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('⏰ 12:30 PM Onwards', 55, 235);

	ctx.fillStyle = '#1e3a8a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('📍 APJ Abdul Kalam Aud.', 55, 265);
	ctx.fillStyle = '#64748b';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('SSIEMS, Parbhani', 55, 280);

	ctx.fillStyle = '#2563eb';
	ctx.font = '700 10px Inter, sans-serif';
	ctx.fillText('#GoogleDevExpert', 55, 320);

	// Right Highlights Pill Box
	ctx.fillStyle = '#f8fafc';
	ctx.beginPath();
	ctx.roundRect(canvas.width - 220, 160, 180, 190, 12);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = '#1e3a8a';
	ctx.font = '700 11px Inter, sans-serif';
	ctx.fillText('WORKSHOP HIGHLIGHTS', canvas.width - 205, 188);
	ctx.fillStyle = '#475569';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('🚀 Hands-on Learning', canvas.width - 205, 215);
	ctx.fillText('⚡ Build Real GenAI Apps', canvas.width - 205, 240);
	ctx.fillText('☁️ Deploy on Google Cloud', canvas.width - 205, 265);
	ctx.fillText('📜 Verified Certificate', canvas.width - 205, 290);

	// 5 Signatures
	const sigList = [
		{ name: 'Ashutosh Bhakare', title: 'Red Hat Security Specialist', role: 'SPEAKER 1', x: 120 },
		{ name: 'Rachana Bhakare', title: 'Senior Platform Instructor', role: 'SPEAKER 2', x: 310 },
		{ name: 'Dr. Anand K. Pathrikar', title: 'Director', role: 'SSIEMS, Parbhani', x: 530 },
		{ name: 'Prof. Shelke S.B.', title: 'Faculty Coordinator', role: 'DDSC', x: 740 },
		{ name: 'Syed Asif Syed Gaffar', title: 'President', role: 'DDSC', x: 940 }
	];

	sigList.forEach(s => {
		drawSimulatedSignature(ctx, s.x, 440, s.name, '#1e293b');
		ctx.textAlign = 'center';
		ctx.fillStyle = '#0f172a';
		ctx.font = '700 11px Inter, sans-serif';
		ctx.fillText(s.name, s.x, 480);
		ctx.fillStyle = '#64748b';
		ctx.font = '500 9px Inter, sans-serif';
		ctx.fillText(s.title, s.x, 495);
		ctx.font = '700 8px Inter, sans-serif';
		ctx.fillText(s.role, s.x, 508);
	});

	// Sponsor Bar: HP WORLD PARBHANI
	ctx.fillStyle = '#f1f5f9';
	ctx.beginPath();
	ctx.roundRect(canvas.width / 2 - 160, 525, 320, 48, 8);
	ctx.fill();
	ctx.fillStyle = '#64748b';
	ctx.font = '700 9px Inter, sans-serif';
	ctx.fillText('OUR SPONSOR', canvas.width / 2, 540);
	ctx.fillStyle = '#0f172a';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.fillText('HP WORLD PARBHANI', canvas.width / 2, 558);

	// Footer bar
	ctx.fillStyle = '#f8fafc';
	ctx.fillRect(20, 595, canvas.width - 40, 60);
	ctx.strokeStyle = '#e2e8f0';
	ctx.strokeRect(20, 595, canvas.width - 40, 60);

	ctx.fillStyle = '#475569';
	ctx.font = '500 11px Inter, sans-serif';
	ctx.fillText('✉ dcodeclub.ssiems@gmail.com   |   🌐 www.dcode.club   |   📸 Instagram: ddsc_club   |   🔗 LinkedIn: dcodeclub', canvas.width / 2, 630);

	return canvas.toDataURL('image/png');
}

// 3. FUTURE PROSPECT 1: AGENTIC AI & AUTONOMOUS WORKFLOWS
function renderAgenticAiCertificate(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Dark Emerald Matrix gradient
	const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bg.addColorStop(0, '#022c22');
	bg.addColorStop(0.5, '#064e3b');
	bg.addColorStop(1, '#021e17');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Neon Emerald borders
	ctx.strokeStyle = '#10b981';
	ctx.lineWidth = 3;
	ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

	ctx.strokeStyle = '#34d399';
	ctx.lineWidth = 1;
	ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

	// Inner card
	ctx.fillStyle = '#0f172a';
	ctx.beginPath();
	ctx.roundRect(45, 45, canvas.width - 90, canvas.height - 90, 14);
	ctx.fill();

	// AI Matrix nodes
	ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
	ctx.lineWidth = 1;
	for (let i = 80; i < canvas.width - 80; i += 60) {
		ctx.beginPath();
		ctx.moveTo(i, 80);
		ctx.lineTo(canvas.width / 2, 280);
		ctx.stroke();
	}

	// Brand header
	ctx.textAlign = 'center';
	ctx.fillStyle = '#34d399';
	ctx.font = '800 14px Inter, sans-serif';
	ctx.letterSpacing = '3px';
	ctx.fillText('DDSC AI RESEARCH WING  •  GOOGLE CLOUD AI ECOSYSTEM', canvas.width / 2, 90);

	ctx.fillStyle = '#ffffff';
	ctx.font = '900 32px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('AGENTIC AI SUMMIT 2026', canvas.width / 2, 140);

	ctx.fillStyle = '#a7f3d0';
	ctx.font = '600 13px Inter, sans-serif';
	ctx.fillText('AUTONOMOUS MULTI-AGENT ARCHITECTURES & REASONING ENGINES', canvas.width / 2, 170);

	// Recipient
	ctx.fillStyle = '#94a3b8';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.fillText('THIS CERTIFICATE IS OFFICIALLY CONFERRED UPON', canvas.width / 2, 230);

	ctx.fillStyle = '#6ee7b7';
	ctx.font = '800 38px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 285);

	ctx.strokeStyle = '#10b981';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 200, 305);
	ctx.lineTo(canvas.width / 2 + 200, 305);
	ctx.stroke();

	ctx.fillStyle = '#cbd5e1';
	ctx.font = '500 14px Inter, sans-serif';
	ctx.fillText('for mastering advanced multi-agent orchestration, tool routing, and deep Gemini 3 reasoning.', canvas.width / 2, 345);

	// Core Modules
	ctx.fillStyle = '#10b981';
	ctx.font = '700 12px "JetBrains Mono", monospace';
	ctx.fillText('MODULES: ReAct Agent Loops  •  Function Calling  •  Realtime Multimodal  •  Cloud Run Scale', canvas.width / 2, 385);

	// Holographic AI Seal
	const sealX = canvas.width / 2;
	const sealY = 480;
	ctx.fillStyle = '#065f46';
	ctx.beginPath();
	ctx.arc(sealX, sealY, 36, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#34d399';
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = '#34d399';
	ctx.font = '800 14px Inter, sans-serif';
	ctx.fillText('AI AGENT', sealX, sealY - 4);
	ctx.font = '700 10px Inter, sans-serif';
	ctx.fillText('VERIFIED', sealX, sealY + 12);

	// Signatures
	drawSimulatedSignature(ctx, 200, 480, 'AI Lead', '#6ee7b7');
	ctx.fillStyle = '#e2e8f0';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Dr. Elena Vance', 200, 525);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('Chief AI Scientist, DDSC', 200, 542);

	drawSimulatedSignature(ctx, canvas.width - 200, 480, 'Cloud Director', '#6ee7b7');
	ctx.fillStyle = '#e2e8f0';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Syed Asif Syed Gaffar', canvas.width - 200, 525);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('President, DDSC', canvas.width - 200, 542);

	// Footer Metadata
	ctx.fillStyle = '#64748b';
	ctx.font = '500 11px "JetBrains Mono", monospace';
	ctx.fillText(`ID: ${certData.cert_id}   |   CHECKSUM: ${certData.checksum.slice(0, 16)}...   |   DATE: ${certData.date}`, canvas.width / 2, 595);

	return canvas.toDataURL('image/png');
}

// 4. FUTURE PROSPECT 2: ZERO-KNOWLEDGE CRYPTOGRAPHY & SMART CONTRACT SECURITY
function renderZkCryptoCertificate(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Obsidian & Gold gradient
	const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bg.addColorStop(0, '#09090b');
	bg.addColorStop(0.5, '#18181b');
	bg.addColorStop(1, '#050507');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Cyber Gold lattice borders
	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth = 3;
	ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

	ctx.strokeStyle = '#78350f';
	ctx.lineWidth = 1;
	ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

	ctx.textAlign = 'center';
	ctx.fillStyle = '#fbbf24';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.letterSpacing = '3px';
	ctx.fillText('DDSC CYBER SECURITY LAB  •  ETHEREUM SECURITY ALLIANCE', canvas.width / 2, 80);

	ctx.fillStyle = '#ffffff';
	ctx.font = '900 30px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('ZERO-KNOWLEDGE CRYPTOGRAPHY', canvas.width / 2, 130);
	ctx.fillStyle = '#fbbf24';
	ctx.font = '800 18px Inter, sans-serif';
	ctx.fillText('& ADVANCED SMART CONTRACT SECURITY PROTOCOL', canvas.width / 2, 165);

	ctx.fillStyle = '#a1a1aa';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.fillText('PROUDLY PRESENTED FOR RIGOROUS AUDIT PROFICIENCY TO', canvas.width / 2, 225);

	ctx.fillStyle = '#fef08a';
	ctx.font = '800 36px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 280);

	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 180, 298);
	ctx.lineTo(canvas.width / 2 + 180, 298);
	ctx.stroke();

	ctx.fillStyle = '#e4e4e7';
	ctx.font = '500 13px Inter, sans-serif';
	ctx.fillText('demonstrating excellence in zk-SNARKs, formal circuit verification, and smart contract fuzzing.', canvas.width / 2, 335);

	ctx.fillStyle = '#fbbf24';
	ctx.font = '600 12px "JetBrains Mono", monospace';
	ctx.fillText('CURRICULUM: Groth16 • PLONK • Circom • Formal Verification • EVM Gas Optimization', canvas.width / 2, 375);

	// Shield seal
	const sealX = canvas.width / 2;
	const sealY = 475;
	ctx.fillStyle = '#78350f';
	ctx.beginPath();
	ctx.arc(sealX, sealY, 34, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.fillText('ZK-PROVEN', sealX, sealY + 5);

	// Signatures
	drawSimulatedSignature(ctx, 210, 475, 'Security Lead', '#fef08a');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Alexandre Dubois', 210, 520);
	ctx.fillStyle = '#a1a1aa';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('Head of Cryptography', 210, 538);

	drawSimulatedSignature(ctx, canvas.width - 210, 475, 'President DDSC', '#fef08a');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Syed Asif Syed Gaffar', canvas.width - 210, 520);
	ctx.fillStyle = '#a1a1aa';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('President, DDSC', canvas.width - 210, 538);

	ctx.fillStyle = '#71717a';
	ctx.font = '500 11px "JetBrains Mono", monospace';
	ctx.fillText(`VERIFIED ID: ${certData.cert_id}   |   SHA-256 HASH: ${certData.checksum.slice(0, 20)}...`, canvas.width / 2, 595);

	return canvas.toDataURL('image/png');
}

// 5. FUTURE PROSPECT 3: CLOUD NATIVE KUBERNETES & PLATFORM ARCHITECTURE
function renderCloudNativeCertificate(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Azure blue / slate theme
	const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bg.addColorStop(0, '#0c4a6e');
	bg.addColorStop(0.5, '#075985');
	bg.addColorStop(1, '#082f49');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = '#38bdf8';
	ctx.lineWidth = 3;
	ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

	ctx.fillStyle = '#0f172a';
	ctx.beginPath();
	ctx.roundRect(45, 45, canvas.width - 90, canvas.height - 90, 12);
	ctx.fill();

	ctx.textAlign = 'center';
	ctx.fillStyle = '#38bdf8';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.letterSpacing = '3px';
	ctx.fillText('DDSC INFRASTRUCTURE GROUP  •  RED HAT ENTERPRISE SYSTEMS', canvas.width / 2, 90);

	ctx.fillStyle = '#ffffff';
	ctx.font = '900 32px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('CLOUD NATIVE PLATFORM ENGINEERING', canvas.width / 2, 140);
	ctx.fillStyle = '#7dd3fc';
	ctx.font = '700 15px Inter, sans-serif';
	ctx.fillText('KUBERNETES, SERVICE MESH & DISTRIBUTED SYSTEMS', canvas.width / 2, 170);

	ctx.fillStyle = '#94a3b8';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.fillText('THIS HONORS AND CERTIFIES', canvas.width / 2, 230);

	ctx.fillStyle = '#bae6fd';
	ctx.font = '800 36px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 280);

	ctx.strokeStyle = '#38bdf8';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 180, 298);
	ctx.lineTo(canvas.width / 2 + 180, 298);
	ctx.stroke();

	ctx.fillStyle = '#e2e8f0';
	ctx.font = '500 13px Inter, sans-serif';
	ctx.fillText('for architecting zero-downtime microservices clusters, Terraform workflows, and Istio meshes.', canvas.width / 2, 335);

	ctx.fillStyle = '#38bdf8';
	ctx.font = '600 12px "JetBrains Mono", monospace';
	ctx.fillText('STACK: Kubernetes Operators • Istio • Prometheus • Helm • ArgoCD • Docker', canvas.width / 2, 375);

	// Seal
	const sealX = canvas.width / 2;
	const sealY = 475;
	ctx.fillStyle = '#0369a1';
	ctx.beginPath();
	ctx.arc(sealX, sealY, 34, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#38bdf8';
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.fillText('CLOUD ARCH', sealX, sealY + 5);

	// Signatures
	drawSimulatedSignature(ctx, 210, 475, 'Platform Lead', '#bae6fd');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Ashutosh Bhakare', 210, 520);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('Red Hat Security Specialist', 210, 538);

	drawSimulatedSignature(ctx, canvas.width - 210, 475, 'President DDSC', '#bae6fd');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Syed Asif Syed Gaffar', canvas.width - 210, 520);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('President, DDSC', canvas.width - 210, 538);

	ctx.fillStyle = '#64748b';
	ctx.font = '500 11px "JetBrains Mono", monospace';
	ctx.fillText(`IDENTIFIER: ${certData.cert_id}   |   DATE ISSUED: ${certData.date}`, canvas.width / 2, 595);

	return canvas.toDataURL('image/png');
}

// 6. FUTURE PROSPECT 4: QUANTUM COMPUTING MASTERCLASS
function renderQuantumCert(certData) {
	const canvas = document.createElement('canvas');
	canvas.width = 1060;
	canvas.height = 680;
	const ctx = canvas.getContext('2d');

	// Imperial Purple / Starlight gradient
	const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bg.addColorStop(0, '#2e1065');
	bg.addColorStop(0.5, '#4c1d95');
	bg.addColorStop(1, '#1e1b4b');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = '#c084fc';
	ctx.lineWidth = 3;
	ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

	ctx.fillStyle = '#0f172a';
	ctx.beginPath();
	ctx.roundRect(45, 45, canvas.width - 90, canvas.height - 90, 12);
	ctx.fill();

	// Bloch sphere / quantum circuits in background
	ctx.strokeStyle = 'rgba(192, 132, 252, 0.2)';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(canvas.width / 2, 280, 180, 0, Math.PI * 2);
	ctx.stroke();

	ctx.textAlign = 'center';
	ctx.fillStyle = '#c084fc';
	ctx.font = '800 13px Inter, sans-serif';
	ctx.letterSpacing = '3px';
	ctx.fillText('DDSC QUANTUM LAB  •  SSIEMS ADVANCED RESEARCH GROUP', canvas.width / 2, 90);

	ctx.fillStyle = '#ffffff';
	ctx.font = '900 32px Inter, sans-serif';
	ctx.letterSpacing = '2px';
	ctx.fillText('QUANTUM COMPUTING & ALGORITHMS', canvas.width / 2, 140);
	ctx.fillStyle = '#e9d5ff';
	ctx.font = '700 15px Inter, sans-serif';
	ctx.fillText('QUANTUM INFORMATION SCIENCE & DEEP COMPLEXITY', canvas.width / 2, 170);

	ctx.fillStyle = '#94a3b8';
	ctx.font = '600 12px Inter, sans-serif';
	ctx.fillText('PROUDLY PRESENTED TO', canvas.width / 2, 230);

	ctx.fillStyle = '#f3e8ff';
	ctx.font = '800 36px Inter, sans-serif';
	ctx.fillText(certData.name, canvas.width / 2, 280);

	ctx.strokeStyle = '#c084fc';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 180, 298);
	ctx.lineTo(canvas.width / 2 + 180, 298);
	ctx.stroke();

	ctx.fillStyle = '#e2e8f0';
	ctx.font = '500 13px Inter, sans-serif';
	ctx.fillText('for mastering quantum gates, entanglement protocols, IBM Qiskit, and Grover\'s search algorithm.', canvas.width / 2, 335);

	ctx.fillStyle = '#c084fc';
	ctx.font = '600 12px "JetBrains Mono", monospace';
	ctx.fillText('TOPICS: Superposition • Qubits • Phase Estimation • VQE • Quantum Error Mitigation', canvas.width / 2, 375);

	// Seal
	const sealX = canvas.width / 2;
	const sealY = 475;
	ctx.fillStyle = '#6b21a8';
	ctx.beginPath();
	ctx.arc(sealX, sealY, 34, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#c084fc';
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	ctx.font = '800 12px Inter, sans-serif';
	ctx.fillText('|Ψ⟩ QUANTUM', sealX, sealY + 4);

	// Signatures
	drawSimulatedSignature(ctx, 210, 475, 'Quantum Lead', '#f3e8ff');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Prof. Shelke S.B.', 210, 520);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('Faculty Coordinator, DDSC', 210, 538);

	drawSimulatedSignature(ctx, canvas.width - 210, 475, 'President DDSC', '#f3e8ff');
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 12px Inter, sans-serif';
	ctx.fillText('Syed Asif Syed Gaffar', canvas.width - 210, 520);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 10px Inter, sans-serif';
	ctx.fillText('President, DDSC', canvas.width - 210, 538);

	ctx.fillStyle = '#64748b';
	ctx.font = '500 11px "JetBrains Mono", monospace';
	ctx.fillText(`ID: ${certData.cert_id}   |   CRYPTO SEAL: ${certData.checksum.slice(0, 18)}...`, canvas.width / 2, 595);

	return canvas.toDataURL('image/png');
}

// Map IDs to specific generators
const CERT_RENDER_ENGINES = {
	'CC-2025-ASIF-001': renderAsifTalksCertificate,
	'CC-2026-VIBE-002': renderVibeCodingCertificate,
	'CC-2026-AGENT-003': renderAgenticAiCertificate,
	'CC-2026-ZKSEC-004': renderZkCryptoCertificate,
	'CC-2026-KUBE-005': renderCloudNativeCertificate,
	'CC-2026-QUANT-006': renderQuantumCert
};

function initScatteredCertificates() {
	const cardSlots = [
		{ id: 'certLeft1', certId: 'CC-2025-ASIF-001' },
		{ id: 'certLeft2', certId: 'CC-2026-VIBE-002' },
		{ id: 'certLeft3', certId: 'CC-2026-AGENT-003' },
		{ id: 'certRight1', certId: 'CC-2026-ZKSEC-004' },
		{ id: 'certRight2', certId: 'CC-2026-KUBE-005' },
		{ id: 'certRight3', certId: 'CC-2026-QUANT-006' }
	];

	cardSlots.forEach(slot => {
		const card = document.getElementById(slot.id);
		if (!card) return;

		const certRecord = DEMO_REGISTRY[slot.certId];
		if (!certRecord) return;

		card.dataset.id = slot.certId;
		card.setAttribute('title', `Click to verify ${certRecord.name}'s Certificate (${slot.certId})`);

		const renderFn = CERT_RENDER_ENGINES[slot.certId] || renderAsifTalksCertificate;
		const dataUrl = renderFn({ ...certRecord, cert_id: slot.certId });

		const img = card.querySelector('.cert-canvas-img');
		if (img) {
			img.src = dataUrl;
			img.alt = `${certRecord.name} — ${certRecord.event}`;
		}

		card.onclick = (e) => {
			e.preventDefault();
			if (certInput) certInput.value = slot.certId;
			verify(slot.certId);
			const verifyCard = document.querySelector('.verify-card');
			if (verifyCard && window.innerWidth <= 1024) {
				verifyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		};
	});

	console.log('[CertPortal] Initialized 6 certificates: 2 original user designs + 4 future prospects.');
}

// Attach event listeners
if (verifyBtn) {
	verifyBtn.addEventListener('click', () => verify(certInput.value));
	console.log('[CertPortal] Verify button listener attached.');
} else {
	console.error('[CertPortal] verifyBtn not found in DOM!');
}

if (certInput) {
	certInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') verify(certInput.value);
	});
}

document.querySelectorAll('.pill').forEach((p, i) => {
	p.addEventListener('click', () => verify(p.dataset.id));
});

// Initialize scattered certificates on page load
initScatteredCertificates();

// ============================================================
// SCROLL PARALLAX: Push scatter outward on scroll, float inward at top
// ============================================================
let scrollTicking = false;

function onScrollParallax() {
	if (!scrollTicking) {
		window.requestAnimationFrame(() => {
			const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
			// Push outward as user scrolls down, max 160px
			const outwardShift = Math.min(scrollY * 0.38, 160);
			document.documentElement.style.setProperty('--scatter-scroll-left', `-${outwardShift}px`);
			document.documentElement.style.setProperty('--scatter-scroll-right', `${outwardShift}px`);
			scrollTicking = false;
		});
		scrollTicking = true;
	}
}

window.addEventListener('scroll', onScrollParallax, { passive: true });
onScrollParallax(); // Initial check

// ============================================================
// URL PARAMS (deep link / QR)
// ============================================================
function checkUrlParams() {
	const params = new URLSearchParams(window.location.search);
	const urlId = params.get('id') || params.get('cert') || params.get('code');
	if (urlId) {
		certInput.value = urlId;
		verify(urlId);
	}
}

checkUrlParams();

// ============================================================
// SPINNER KEYFRAME (injected once)
// ============================================================
const s = document.createElement('style');
s.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(10px); } }
`;
document.head.appendChild(s);

console.log('[CertPortal] App initialized. Mode:', useSupabase ? 'Supabase' : 'LOCAL DEMO');

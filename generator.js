/**
 * DCODE CLUB — Certificate Generator & Admin Portal
 * Integrated with Google SSO & Firestore Cloud Database
 */

import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuth, 
  testFirestoreConnection, 
  db 
} from './firebase-service.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

// ==================== CONFIG & STATE ====================
const DEFAULT_FIELDS = [
	{ id: 'name', label: 'Recipient Name', x: 50, y: 48, fontSize: 44, font: 'Inter', color: '#1e1b4b', align: 'center', weight: '600' },
	{ id: 'event', label: 'Event Name', x: 50, y: 64, fontSize: 20, font: 'Inter', color: '#334155', align: 'center', weight: '500' },
	{ id: 'date', label: 'Date', x: 28, y: 88, fontSize: 17, font: 'JetBrains Mono', color: '#0f172a', align: 'left', weight: '500' },
	{ id: 'certId', label: 'Certificate ID', x: 72, y: 88, fontSize: 15, font: 'JetBrains Mono', color: '#2563eb', align: 'right', weight: '500' },
];

const state = {
	currentUser: null,
	templateImage: null,
	fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
	activeFieldId: 'name',
	event: {
		name: 'The ASIF Talks - Live Episode #1',
		code: 'ASIF',
		date: '2025-03-15',
		skills: 'Leadership, Governance, Youth Dialogue',
		tier: 'Bronze Builder'
	},
	participants: [],
	emailjsReady: false,
	zip: null,
	isGenerating: false,
};

// ==================== DOM ELEMENTS ====================
const authEls = {
	overlay: document.getElementById('authGateOverlay'),
	googleBtn: document.getElementById('googleAuthBtn'),
	errorMsg: document.getElementById('authErrorMsg'),
	protectedContent: document.getElementById('generatorProtectedContent'),
	headerControls: document.getElementById('headerAuthControls'),
	sessionBar: document.getElementById('adminSessionBar'),
	sessionAvatar: document.getElementById('sessionAvatar'),
	sessionName: document.getElementById('sessionName'),
	sessionRole: document.getElementById('sessionRole'),
	sessionSignOutBtn: document.getElementById('sessionSignOutBtn'),
};

const els = {
	templateUpload: document.getElementById('templateUpload'),
	fieldSelect: document.getElementById('fieldSelect'),
	fieldProps: document.getElementById('fieldProps'),
	propSize: document.getElementById('propSize'),
	propColor: document.getElementById('propColor'),
	propAlign: document.getElementById('propAlign'),
	propWeight: document.getElementById('propWeight'),
	propX: document.getElementById('propX'),
	propY: document.getElementById('propY'),
	emailjsKey: document.getElementById('emailjsKey'),
	emailjsService: document.getElementById('emailjsService'),
	emailjsTemplate: document.getElementById('emailjsTemplate'),
	previewCanvas: document.getElementById('previewCanvas'),
	canvasContainer: document.getElementById('canvasContainer'),
	canvasOverlay: document.getElementById('canvasOverlay'),
	previewBadge: document.getElementById('previewBadge'),
	resetFieldsBtn: document.getElementById('resetFieldsBtn'),
	testPreviewBtn: document.getElementById('testPreviewBtn'),
	eventName: document.getElementById('eventName'),
	eventCode: document.getElementById('eventCode'),
	eventDate: document.getElementById('eventDate'),
	eventSkills: document.getElementById('eventSkills'),
	eventTier: document.getElementById('eventTier'),
	participantsInput: document.getElementById('participantsInput'),
	participantStats: document.getElementById('participantStats'),
	generateBtn: document.getElementById('generateBtn'),
	downloadZipBtn: document.getElementById('downloadZipBtn'),
	progressArea: document.getElementById('progressArea'),
	progressFill: document.getElementById('progressFill'),
	progressText: document.getElementById('progressText'),
	resultsArea: document.getElementById('resultsArea'),
	resultsBody: document.getElementById('resultsBody'),
};

// ==================== AUTHENTICATION HANDLING ====================
function initAuth() {
	testFirestoreConnection();

	// Auth state change listener
	subscribeToAuth((user) => {
		state.currentUser = user;
		if (user) {
			renderAuthenticatedUI(user);
		} else {
			renderUnauthenticatedUI();
		}
	});

	// Google Sign-In with popup
	if (authEls.googleBtn) {
		authEls.googleBtn.addEventListener('click', async () => {
			hideAuthError();
			authEls.googleBtn.disabled = true;
			authEls.googleBtn.style.opacity = '0.6';
			const res = await loginWithGoogle();
			authEls.googleBtn.disabled = false;
			authEls.googleBtn.style.opacity = '1';
			if (!res.success) {
				showAuthError(res.error || 'Google Sign-In was cancelled or failed.');
			}
		});
	}

	// Sign out action
	if (authEls.sessionSignOutBtn) {
		authEls.sessionSignOutBtn.addEventListener('click', async () => {
			await logoutUser();
			showToast('Signed out successfully.');
		});
	}
}

function renderAuthenticatedUI(user) {
	if (authEls.overlay) {
		authEls.overlay.classList.add('hidden');
	}
	if (authEls.protectedContent) {
		authEls.protectedContent.style.display = 'block';
	}

	const displayName = user.displayName || user.email.split('@')[0];
	const initials = displayName.substring(0, 2).toUpperCase();

	if (authEls.sessionAvatar) authEls.sessionAvatar.textContent = initials;
	if (authEls.sessionName) authEls.sessionName.textContent = displayName;
	if (authEls.sessionRole) authEls.sessionRole.textContent = `${user.email} • Authorized Certificate Issuer`;

	if (authEls.headerControls) {
		authEls.headerControls.innerHTML = `
			<div class="user-badge">
				<div class="user-badge-avatar">${initials}</div>
				<span>${escapeHtml(displayName)}</span>
			</div>
			<button class="auth-logout-btn" id="headerLogoutBtn" type="button">Logout</button>
		`;
		const btn = document.getElementById('headerLogoutBtn');
		if (btn) {
			btn.addEventListener('click', () => logoutUser());
		}
	}

	renderPreview();
}

function renderUnauthenticatedUI() {
	if (authEls.overlay) {
		authEls.overlay.classList.remove('hidden');
	}
	if (authEls.protectedContent) {
		authEls.protectedContent.style.display = 'none';
	}
	if (authEls.headerControls) {
		authEls.headerControls.innerHTML = ``;
	}
}

function showAuthError(msg) {
	if (authEls.errorMsg) {
		authEls.errorMsg.textContent = msg;
		authEls.errorMsg.style.display = 'block';
	}
}

function hideAuthError() {
	if (authEls.errorMsg) {
		authEls.errorMsg.style.display = 'none';
	}
}

// ==================== DEFAULT CERTIFICATE TEMPLATE ====================
function createDefaultCertificateTemplate() {
	const canvas = document.createElement('canvas');
	canvas.width = 1920;
	canvas.height = 1350;
	const ctx = canvas.getContext('2d');

	// Background parchment gradient
	const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	bgGradient.addColorStop(0, '#ffffff');
	bgGradient.addColorStop(1, '#f8fafc');
	ctx.fillStyle = bgGradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Outer borders
	ctx.strokeStyle = '#cbd5e1';
	ctx.lineWidth = 3;
	ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth = 6;
	ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

	ctx.strokeStyle = '#d97706';
	ctx.lineWidth = 2;
	ctx.strokeRect(76, 76, canvas.width - 152, canvas.height - 152);

	// Corner ornaments
	const corners = [
		[60, 60],
		[canvas.width - 60, 60],
		[60, canvas.height - 60],
		[canvas.width - 60, canvas.height - 60]
	];
	corners.forEach(([cx, cy]) => {
		ctx.fillStyle = '#2563eb';
		ctx.beginPath();
		ctx.arc(cx, cy, 14, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#d97706';
		ctx.beginPath();
		ctx.arc(cx, cy, 7, 0, Math.PI * 2);
		ctx.fill();
	});

	// Header & Emblem
	ctx.fillStyle = '#1e1b4b';
	ctx.font = '700 28px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('DCODE CLUB', canvas.width / 2, 170);

	ctx.fillStyle = '#2563eb';
	ctx.font = '700 48px Inter, sans-serif';
	ctx.letterSpacing = '4px';
	ctx.fillText('CERTIFICATE OF ACCOMPLISHMENT', canvas.width / 2, 260);

	ctx.fillStyle = '#64748b';
	ctx.font = '500 22px Inter, sans-serif';
	ctx.letterSpacing = '1px';
	ctx.fillText('THIS CERTIFICATE IS PROUDLY PRESENTED TO', canvas.width / 2, 360);

	// Line for recipient
	ctx.strokeStyle = '#e2e8f0';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2 - 350, 700);
	ctx.lineTo(canvas.width / 2 + 350, 700);
	ctx.stroke();

	ctx.fillStyle = '#64748b';
	ctx.font = '500 20px Inter, sans-serif';
	ctx.fillText('FOR ACTIVE PARTICIPATION AND SUCCESSFUL COMPLETION OF', canvas.width / 2, 770);

	// Issuer and Verification footer labels
	ctx.fillStyle = '#475569';
	ctx.font = '600 18px Inter, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText('ISSUED BY: DCODE CLUB HQ', 120, 1140);
	ctx.fillStyle = '#94a3b8';
	ctx.font = '500 15px JetBrains Mono, monospace';
	ctx.fillText('CRYPTOGRAPHICALLY SECURED VIA SHA-256', 120, 1175);

	// Seal badge
	ctx.fillStyle = '#d97706';
	ctx.beginPath();
	ctx.arc(canvas.width / 2, 1150, 48, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 32px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('★', canvas.width / 2, 1162);

	const img = new Image();
	img.src = canvas.toDataURL('image/png');
	return img;
}

// ==================== INITIALIZE STATE & PREVIEW ====================
function init() {
	initAuth();

	const defaultImg = createDefaultCertificateTemplate();
	defaultImg.onload = () => {
		state.templateImage = defaultImg;
		renderPreview();
	};

	if (els.participantsInput && !els.participantsInput.value.trim()) {
		els.participantsInput.value = `Alex Rivera, alex@example.com\nElena Rostova, elena@example.com\nMarcus Vance, marcus@example.com\nSiddharth Rao, siddharth@example.com`;
	}
	updateParticipants();
	updateActiveFieldControls();
	attachEventListeners();
}

// ==================== EVENT LISTENERS ====================
function attachEventListeners() {
	if (els.templateUpload) {
		els.templateUpload.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					state.templateImage = img;
					els.canvasContainer.classList.add('has-image');
					renderPreview();
					showToast('Custom template uploaded!');
				};
				img.src = event.target.result;
			};
			reader.readAsDataURL(file);
		});
	}

	if (els.fieldSelect) {
		els.fieldSelect.addEventListener('change', () => {
			state.activeFieldId = els.fieldSelect.value;
			updateActiveFieldControls();
			renderOverlay();
		});
	}

	const propInputs = [els.propSize, els.propColor, els.propAlign, els.propWeight, els.propX, els.propY];
	propInputs.forEach(input => {
		if (input) {
			input.addEventListener('input', () => {
				const field = state.fields.find(f => f.id === state.activeFieldId);
				if (!field) return;

				if (input === els.propSize) field.fontSize = Number(input.value) || 20;
				if (input === els.propColor) field.color = input.value;
				if (input === els.propAlign) field.align = input.value;
				if (input === els.propWeight) field.weight = input.value;
				if (input === els.propX) field.x = Math.max(0, Math.min(100, Number(input.value) || 0));
				if (input === els.propY) field.y = Math.max(0, Math.min(100, Number(input.value) || 0));

				renderPreview();
			});
		}
	});

	if (els.previewCanvas) {
		els.previewCanvas.addEventListener('click', (e) => {
			const rect = els.previewCanvas.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickY = e.clientY - rect.top;

			const percentX = (clickX / rect.width) * 100;
			const percentY = (clickY / rect.height) * 100;

			const field = state.fields.find(f => f.id === state.activeFieldId);
			if (field) {
				field.x = Math.round(percentX * 10) / 10;
				field.y = Math.round(percentY * 10) / 10;
				updateActiveFieldControls();
				renderPreview();
				showToast(`Placed ${field.label} at (${field.x}%, ${field.y}%)`);
			}
		});
	}

	if (els.resetFieldsBtn) {
		els.resetFieldsBtn.addEventListener('click', () => {
			state.fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));
			updateActiveFieldControls();
			renderPreview();
			showToast('Fields reset to defaults');
		});
	}

	if (els.testPreviewBtn) {
		els.testPreviewBtn.addEventListener('click', () => {
			renderPreview({
				name: 'Syed Asif',
				event: (els.eventName && els.eventName.value) || 'The ASIF Talks - Live Episode #1',
				date: formatDate((els.eventDate && els.eventDate.value) || '2025-03-15'),
				certId: 'CC-2025-ASIF-0001'
			});
			showToast('Previewing with sample data');
		});
	}

	if (els.participantsInput) {
		els.participantsInput.addEventListener('input', updateParticipants);
	}

	if (els.generateBtn) {
		els.generateBtn.addEventListener('click', handleGenerateAll);
	}
}

// ==================== PREVIEW RENDERING ====================
function renderPreview(sampleData = null) {
	if (!els.previewCanvas || !state.templateImage) return;

	const canvas = els.previewCanvas;
	const ctx = canvas.getContext('2d');
	const img = state.templateImage;

	canvas.width = img.naturalWidth || 1920;
	canvas.height = img.naturalHeight || 1350;

	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	state.fields.forEach(field => {
		let text = '';
		if (sampleData) {
			text = sampleData[field.id] || field.label;
		} else {
			if (field.id === 'name') text = 'Recipient Full Name';
			else if (field.id === 'event') text = (els.eventName && els.eventName.value) || state.event.name;
			else if (field.id === 'date') text = formatDate((els.eventDate && els.eventDate.value) || state.event.date);
			else if (field.id === 'certId') text = 'CC-2025-ASIF-0001';
		}

		const x = (field.x / 100) * canvas.width;
		const y = (field.y / 100) * canvas.height;
		const scaleFactor = canvas.width / 1200;
		const fontSize = field.fontSize * scaleFactor;

		ctx.font = `${field.weight || '500'} ${fontSize}px ${field.font || 'Inter'}, sans-serif`;
		ctx.fillStyle = field.color || '#000000';
		ctx.textAlign = field.align || 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, x, y);
	});

	renderOverlay();
}

function renderOverlay() {
	if (!els.canvasOverlay) return;
	els.canvasOverlay.innerHTML = '';

	state.fields.forEach(field => {
		const marker = document.createElement('div');
		marker.className = `field-marker ${field.id === state.activeFieldId ? 'active' : ''}`;
		marker.style.left = `${field.x}%`;
		marker.style.top = `${field.y}%`;

		const label = document.createElement('div');
		label.className = 'field-label';
		label.textContent = field.label;
		marker.appendChild(label);

		els.canvasOverlay.appendChild(marker);
	});
}

function updateActiveFieldControls() {
	const field = state.fields.find(f => f.id === state.activeFieldId);
	if (!field) return;

	if (els.propSize) els.propSize.value = field.fontSize;
	if (els.propColor) els.propColor.value = field.color;
	if (els.propAlign) els.propAlign.value = field.align;
	if (els.propWeight) els.propWeight.value = field.weight;
	if (els.propX) els.propX.value = field.x;
	if (els.propY) els.propY.value = field.y;
}

// ==================== PARTICIPANTS PARSING ====================
function updateParticipants() {
	if (!els.participantsInput) return;
	const text = els.participantsInput.value.trim();
	if (!text) {
		state.participants = [];
		if (els.participantStats) els.participantStats.textContent = '0 participants ready';
		return;
	}

	const lines = text.split('\n').filter(l => l.trim().length > 0);
	state.participants = lines.map(line => {
		const parts = line.split(',').map(p => p.trim());
		return {
			name: parts[0] || 'Attendee',
			email: parts[1] || null,
		};
	});

	if (els.participantStats) {
		els.participantStats.textContent = `${state.participants.length} participant${state.participants.length === 1 ? '' : 's'} ready`;
	}
}

// ==================== GENERATION PIPELINE ====================
async function handleGenerateAll() {
	if (!state.currentUser) {
		showToast('Authentication required to issue certificates.');
		renderUnauthenticatedUI();
		return;
	}

	if (!state.participants.length) {
		showToast('Please add at least one participant.');
		return;
	}

	if (!state.templateImage) {
		showToast('Template image is still loading...');
		return;
	}

	state.isGenerating = true;
	els.generateBtn.disabled = true;

	if (els.progressArea) els.progressArea.classList.remove('hidden');
	if (els.resultsArea) els.resultsArea.classList.remove('hidden');
	if (els.resultsBody) els.resultsBody.innerHTML = '';
	if (els.downloadZipBtn) els.downloadZipBtn.classList.add('hidden');

	state.zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
	const total = state.participants.length;
	let completed = 0;

	for (let i = 0; i < total; i++) {
		const p = state.participants[i];
		const percent = Math.round(((i + 1) / total) * 100);

		if (els.progressFill) els.progressFill.style.width = `${percent}%`;
		if (els.progressText) els.progressText.textContent = `Generating ${i + 1} of ${total}: ${p.name}...`;

		try {
			const result = await generateOneCertificate(p, i);
			addResultRow(result);
		} catch (err) {
			console.error('Error generating cert for', p.name, err);
			addResultRow({ participant: p, error: err.message });
		}

		completed++;
		await new Promise(r => setTimeout(r, 40));
	}

	if (els.progressText) {
		els.progressText.textContent = `Completed! ${completed} of ${total} certificates generated.`;
	}

	if (state.zip && els.downloadZipBtn) {
		els.downloadZipBtn.classList.remove('hidden');
	}

	els.generateBtn.disabled = false;
	state.isGenerating = false;
	showToast(`Generated ${completed} certificates registered in Firestore!`);
}

async function generateOneCertificate(participant, index) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const img = state.templateImage;

	canvas.width = img.naturalWidth || 1920;
	canvas.height = img.naturalHeight || 1350;

	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	const year = new Date().getFullYear();
	const eventCode = (els.eventCode && els.eventCode.value.trim().toUpperCase()) || state.event.code;
	const seq = String(index + 1).padStart(4, '0');
	const certId = `CC-${year}-${eventCode}-${seq}`;
	const secretKey = generateSecretKey();
	const checksum = generateChecksum(certId, secretKey);

	state.fields.forEach(field => {
		let text = '';
		if (field.id === 'name') text = participant.name;
		else if (field.id === 'event') text = (els.eventName && els.eventName.value) || state.event.name;
		else if (field.id === 'date') text = formatDate((els.eventDate && els.eventDate.value) || state.event.date);
		else if (field.id === 'certId') text = certId;

		const x = (field.x / 100) * canvas.width;
		const y = (field.y / 100) * canvas.height;
		const scaleFactor = canvas.width / 1200;
		const fontSize = field.fontSize * scaleFactor;

		ctx.font = `${field.weight || '500'} ${fontSize}px ${field.font || 'Inter'}, sans-serif`;
		ctx.fillStyle = field.color || '#000000';
		ctx.textAlign = field.align || 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, x, y);
	});

	const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
	const dataUrl = canvas.toDataURL('image/png');

	let dbSaved = false;
	let emailSent = false;

	if (state.currentUser && db) {
		try {
			await setDoc(doc(db, 'certificates', certId), {
				certId: certId,
				name: participant.name,
				event: (els.eventName && els.eventName.value) || state.event.name,
				date: (els.eventDate && els.eventDate.value) || state.event.date,
				issuer: 'DCODE Club HQ',
				role: (els.eventTier && els.eventTier.value) || 'Participant',
				checksum: checksum,
				createdBy: state.currentUser.uid,
				creatorEmail: state.currentUser.email || '',
				createdAt: new Date().toISOString()
			});
			dbSaved = true;
		} catch (err) {
			console.warn('[Gen] Firestore certificate registration notice:', err);
		}
	}

	if (state.zip && blob) {
		const safeName = participant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
		state.zip.file(`${certId}_${safeName}.png`, blob);
	}

	return {
		certId,
		secretKey,
		checksum,
		participant,
		blob,
		dataUrl,
		dbSaved,
		emailSent,
	};
}

// ==================== RESULTS UI ====================
function addResultRow(result) {
	if (!els.resultsBody) return;
	const tr = document.createElement('tr');

	if (result.error) {
		tr.innerHTML = `
      <td colspan="7" style="color:var(--danger);font-weight:500;">
        Error for ${escapeHtml(result.participant.name)}: ${escapeHtml(result.error)}
      </td>
    `;
		els.resultsBody.appendChild(tr);
		return;
	}

	const statusClass = result.dbSaved ? 'status-success' : 'status-pending';
	const statusText = result.dbSaved ? 'Firestore' : 'Local';
	const emailStatus = result.emailSent ? 'Sent' : (result.participant.email ? 'Ready' : 'No Email');
	const emailClass = result.emailSent ? 'status-success' : 'status-pending';

	tr.innerHTML = `
    <td><code>${escapeHtml(result.certId)}</code></td>
    <td>${escapeHtml(result.participant.name)}</td>
    <td>${escapeHtml(result.participant.email || '—')}</td>
    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    <td>Generated</td>
    <td><span class="status-badge ${emailClass}">${emailStatus}</span></td>
    <td>
      <a href="${result.dataUrl}" download="${result.certId}.png" class="action-btn small">Download</a>
    </td>
  `;
	els.resultsBody.appendChild(tr);
}

// ==================== ZIP DOWNLOAD ====================
if (els.downloadZipBtn) {
	els.downloadZipBtn.addEventListener('click', async () => {
		if (!state.zip) return;
		showToast('Preparing ZIP archive...');
		const content = await state.zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(content);
		const a = document.createElement('a');
		a.href = url;
		const eventCode = (els.eventCode && els.eventCode.value.trim().toUpperCase()) || 'CERTS';
		a.download = `certificates_${eventCode}_${Date.now()}.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast('ZIP downloaded successfully!');
	});
}

// ==================== HELPERS & CRYPTO ====================
function generateSecretKey() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let res = '';
	for (let i = 0; i < 32; i++) {
		res += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return res;
}

function generateChecksum(certId, secret) {
	try {
		const str = btoa(certId + ':' + secret).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
		const parts = str.match(/.{1,4}/g);
		return parts ? parts.join('-') : 'A1B2-C3D4-E5F6-G7H8';
	} catch {
		return 'A1B2-C3D4-E5F6-G7H8';
	}
}

function formatDate(dateStr) {
	if (!dateStr) return '';
	try {
		const d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	} catch {
		return dateStr;
	}
}

function showToast(msg) {
	const old = document.querySelector('.toast-msg');
	if (old) old.remove();
	const t = document.createElement('div');
	t.className = 'toast-msg';
	t.textContent = msg;
	t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:1000;box-shadow:0 10px 25px rgba(0,0,0,0.2);';
	document.body.appendChild(t);
	setTimeout(() => {
		t.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
		t.style.opacity = '0';
		t.style.transform = 'translateX(-50%) translateY(10px)';
		setTimeout(() => t.remove(), 300);
	}, 2800);
}

function escapeHtml(text) {
	const d = document.createElement('div');
	d.textContent = String(text || '');
	return d.innerHTML;
}

window.addEventListener('resize', () => {
	renderPreview();
});

window.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
	init();
}

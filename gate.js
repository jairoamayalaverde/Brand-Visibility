// ============================================================
// brand-citability-gate.js
// Wrapper de monetización para Brand Citability
// Se carga ANTES del motor — no toca el código del motor
// jairoamaya.co · Jairo Amaya
// ============================================================

(function() {

// ── CONFIGURACIÓN ─────────────────────────────────────────────
var BC_CONFIG = {
    SUPABASE_URL:  'https://vrhztgfgbjirmpbbdcks.supabase.co',
    SUPABASE_KEY:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyaHp0Z2ZnYmppcm1wYmJkY2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODMxODUsImV4cCI6MjA4NjE1OTE4NX0.wkkxiZcLaADcGBLFvnAECHKLD7uLTinlVnvN4VjYElU',
    EDGE_FN:       'https://vrhztgfgbjirmpbbdcks.supabase.co/functions/v1/bc-credits-manager',

    // Proxies propios para planes Agencia+
    PROXY_OPENAI:      'https://jairoamaya.co/openai-proxy.php',
    PROXY_PERPLEXITY:  'https://jairoamaya.co/perplexity-proxy.php',

    // Créditos por tamaño de estudio (Modelo C)
    STUDY_COSTS: {
        basic:    15,   // ≤20 preguntas · 1 modelo propio
        standard: 30,   // ≤50 preguntas · Gemini + Claude
        complete: 50    // ≤75 preguntas · todos los modelos
    },

    // Modelos permitidos por plan
    PLAN_MODELS: {
        credits:    ['gemini', 'claude'],
        analista:   ['gemini', 'claude'],
        agencia:    ['gemini', 'claude', 'chatgpt', 'perplexity'],
        enterprise: ['gemini', 'claude', 'chatgpt', 'perplexity', 'custom']
    },

    // Límite de preguntas por plan
    PLAN_QUESTIONS: {
        credits:    75,
        analista:   75,
        agencia:    75,
        enterprise: 75
    },

    // 1 estudio gratuito sin registro
    FREE_LIMIT: 1
};

// ── ESTADO ────────────────────────────────────────────────────
var BC_STATE = {
    session:      null,  // { email, name, plan, credits }
    initialized:  false,
    modalVisible: false
};

// ── HELPERS ───────────────────────────────────────────────────
function bcEl(id) { return document.getElementById(id); }

function bcLocalGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch(e) { return null; }
}
function bcLocalSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e) {}
}
function bcLocalRemove(key) {
    try { localStorage.removeItem(key); }
    catch(e) {}
}

function bcGetLocalUsage() {
    return parseInt(localStorage.getItem('bc_usage') || '0');
}
function bcIncrementLocalUsage() {
    localStorage.setItem('bc_usage', bcGetLocalUsage() + 1);
}

// ── EDGE FUNCTION ─────────────────────────────────────────────
async function bcCallEdge(payload) {
    const res = await fetch(BC_CONFIG.EDGE_FN, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + BC_CONFIG.SUPABASE_KEY,
            'apikey':        BC_CONFIG.SUPABASE_KEY
        },
        body: JSON.stringify(payload)
    });
    return res.json();
}

// ── SESSION ───────────────────────────────────────────────────
window.BrandGate = {

    getSession() {
        return bcLocalGet('bc_session');
    },

    saveSession(data) {
        bcLocalSet('bc_session', data);
        BC_STATE.session = data;
    },

    clearSession() {
        bcLocalRemove('bc_session');
        BC_STATE.session = null;
    },

    isRegistered() {
        return !!this.getSession();
    },

    getPlan() {
        const s = this.getSession();
        return s ? (s.plan || 'credits') : null;
    },

    getCredits() {
        const s = this.getSession();
        return s ? (s.credits || 0) : 0;
    },

    getEmail() {
        const s = this.getSession();
        return s ? s.email : null;
    },

    getName() {
        const s = this.getSession();
        return s ? s.name : null;
    },

    // ── CALCULAR COSTO DEL ESTUDIO ─────────────────────────────
    calcStudyCost(numQuestions, activeModels) {
        const ownModels = activeModels.filter(m => ['gemini','claude'].includes(m));
        const extModels = activeModels.filter(m => ['chatgpt','perplexity'].includes(m));
        const totalOwn  = ownModels.length;

        // Completo: modelos externos activos O más de 50 preguntas con 2 modelos propios
        if (extModels.length > 0 || (numQuestions > 50 && totalOwn >= 2)) {
            return { size: 'complete', cost: BC_CONFIG.STUDY_COSTS.complete,
                     label: 'Completo', desc: numQuestions + ' preguntas · ' + activeModels.length + ' modelos' };
        }
        // Estándar: 2 modelos propios ≤50 preguntas
        if (totalOwn >= 2 && numQuestions <= 50) {
            return { size: 'standard', cost: BC_CONFIG.STUDY_COSTS.standard,
                     label: 'Estándar', desc: numQuestions + ' preguntas · Gemini + Claude' };
        }
        // Básico: 1 modelo propio ≤20 preguntas
        return { size: 'basic', cost: BC_CONFIG.STUDY_COSTS.basic,
                 label: 'Básico', desc: numQuestions + ' preguntas · 1 modelo' };
    },

    // ── VERIFICAR MODELOS PERMITIDOS ───────────────────────────
    getAllowedModels() {
        const plan = this.getPlan() || 'credits';
        return BC_CONFIG.PLAN_MODELS[plan] || BC_CONFIG.PLAN_MODELS.credits;
    },

    isModelAllowed(modelId) {
        return this.getAllowedModels().includes(modelId);
    },

    // ── VERIFICAR ACCESO ANTES DE EJECUTAR ─────────────────────
    async checkAccess(numQuestions, activeModels) {
        // Sin registro: 1 estudio gratis
        if (!this.isRegistered()) {
            if (bcGetLocalUsage() < BC_CONFIG.FREE_LIMIT) return { ok: true, free: true };
            this.showModal('register');
            return { ok: false };
        }

        // Verificar modelos permitidos por plan
        const plan = this.getPlan();
        const blocked = activeModels.filter(m => !this.isModelAllowed(m));
        if (blocked.length > 0) {
            this.showModal('upgrade', { blocked });
            return { ok: false };
        }

        // Planes de suscripción — no descuentan créditos
        if (['analista', 'agencia', 'enterprise'].includes(plan)) {
            return { ok: true, subscription: true };
        }

        // Plan créditos — verificar saldo
        const studyCost = this.calcStudyCost(numQuestions, activeModels);
        if (this.getCredits() < studyCost.cost) {
            this.showModal('buy', { studyCost });
            return { ok: false };
        }

        return { ok: true, studyCost };
    },

    // ── CONSUMIR CRÉDITOS AL TERMINAR ──────────────────────────
    async consume(numQuestions, activeModels) {
        if (!this.isRegistered()) {
            bcIncrementLocalUsage();
            this.updateBadge();
            return;
        }

        const plan = this.getPlan();
        if (['analista', 'agencia', 'enterprise'].includes(plan)) {
            // Suscripción: solo registrar uso, no descontar
            await bcCallEdge({
                action: 'log_usage',
                email:  this.getEmail(),
                study_size: this.calcStudyCost(numQuestions, activeModels).size
            }).catch(() => {});
            return;
        }

        // Créditos: descontar
        const studyCost = this.calcStudyCost(numQuestions, activeModels);
        try {
            const result = await bcCallEdge({
                action: 'consume',
                email:  this.getEmail(),
                credits: studyCost.cost,
                study_size: studyCost.size
            });
            if (result.success) {
                const s = this.getSession();
                if (s) { s.credits = result.credits; this.saveSession(s); }
                this.updateBadge();
            }
        } catch(e) {
            console.warn('BrandGate consume error (non-blocking):', e);
        }
    },

    // ── SINCRONIZAR SALDO ──────────────────────────────────────
    async syncBalance() {
        const email = this.getEmail();
        if (!email) return;
        try {
            const data = await bcCallEdge({ action: 'balance', email });
            if (data.success) {
                const s = this.getSession();
                if (s) {
                    s.credits = data.credits;
                    s.plan    = data.plan || s.plan;
                    this.saveSession(s);
                }
                this.updateBadge();
            }
        } catch(e) {}
    },

    // ── REGISTRO ───────────────────────────────────────────────
    async register(name, email) {
        const data = await bcCallEdge({ action: 'register', name, email });
        if (data.success) {
            this.saveSession({
                email, name,
                plan:    data.plan    || 'credits',
                credits: data.credits || 20
            });
            this.updateBadge();
        }
        return data;
    },

    // ── PROXY ROUTING — redirige chatgpt/perplexity a proxies propios ──
    getProxyForModel(modelId) {
        if (modelId === 'chatgpt')    return BC_CONFIG.PROXY_OPENAI;
        if (modelId === 'perplexity') return BC_CONFIG.PROXY_PERPLEXITY;
        return null;
    },

    // ── UPDATE BADGE ───────────────────────────────────────────
    updateBadge() {
        const badge = bcEl('bc-gate-badge');
        const text  = bcEl('bc-gate-badge-text');
        if (!badge || !text) return;

        if (!this.isRegistered()) {
            const remaining = Math.max(0, BC_CONFIG.FREE_LIMIT - bcGetLocalUsage());
            badge.className = 'bc-badge';
            text.textContent = remaining > 0
                ? remaining + ' estudio gratuito disponible'
                : 'Regístrate para obtener 20 créditos';
            return;
        }

        const plan    = this.getPlan();
        const credits = this.getCredits();
        const name    = this.getName();

        if (['analista', 'agencia', 'enterprise'].includes(plan)) {
            badge.className = 'bc-badge bc-badge--pro';
            text.textContent = name + ' · Plan ' + plan.charAt(0).toUpperCase() + plan.slice(1);
        } else if (credits >= 30) {
            badge.className = 'bc-badge bc-badge--ok';
            text.textContent = credits + ' créditos · ' + name;
        } else if (credits > 0) {
            badge.className = 'bc-badge bc-badge--low';
            text.textContent = credits + ' créditos (bajo) · ' + name;
        } else {
            badge.className = 'bc-badge bc-badge--empty';
            text.textContent = 'Sin créditos · Recarga para continuar';
        }
    },

    // ── MODAL SYSTEM ───────────────────────────────────────────
    showModal(mode, data) {
        BC_STATE.modalVisible = true;
        const overlay = bcEl('bc-gate-overlay');
        if (!overlay) return;

        // Ocultar todas las vistas
        ['register', 'buy', 'upgrade'].forEach(v => {
            const el = bcEl('bc-view-' + v);
            if (el) el.style.display = 'none';
        });

        // Mostrar vista correcta
        const view = bcEl('bc-view-' + mode);
        if (view) view.style.display = 'flex';

        // Actualizar contenido según modo
        if (mode === 'buy' && data?.studyCost) {
            const costEl = bcEl('bc-study-cost');
            const labelEl = bcEl('bc-study-label');
            if (costEl) costEl.textContent = data.studyCost.cost;
            if (labelEl) labelEl.textContent = data.studyCost.label + ' — ' + data.studyCost.desc;
        }

        if (mode === 'upgrade' && data?.blocked) {
            const blockedEl = bcEl('bc-blocked-models');
            if (blockedEl) blockedEl.textContent = data.blocked.join(', ');
        }

        overlay.style.display = 'flex';
        if (mode === 'register') {
            setTimeout(() => { const n = bcEl('bc-reg-name'); if(n) n.focus(); }, 350);
        }
    },

    hideModal() {
        BC_STATE.modalVisible = false;
        const overlay = bcEl('bc-gate-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // ── INICIALIZAR ────────────────────────────────────────────
    async init() {
        if (BC_STATE.initialized) return;
        BC_STATE.initialized = true;

        // Inyectar UI
        this.injectUI();

        // Sincronizar sesión
        await this.syncBalance();
        this.updateBadge();

        // Verificar pago pendiente de Wompi
        await this.checkPendingPayment();

        // Interceptar ciaRun
        this.interceptEngine();

        console.log('[BrandGate] Inicializado · Plan:', this.getPlan() || 'sin registro');
    },

    // ── INTERCEPTAR EL MOTOR ───────────────────────────────────
    interceptEngine() {
        const self = this;

        // 1. Interceptar ciaRun — punto de entrada principal
        const originalRun = window.ciaRun;
        if (originalRun) {
            window.ciaRun = async function() {
                const numQ   = parseInt(document.getElementById('cia-nq')?.value || '30');
                const mods   = window.ciaActiveMods ? window.ciaActiveMods() : [];

                const access = await self.checkAccess(numQ, mods);
                if (!access.ok) return;

                // Marcar uso gratuito si aplica
                if (access.free) bcIncrementLocalUsage();

                // Ejecutar motor original
                await originalRun.call(this);

                // Consumir créditos al terminar (solo si no fue gratis)
                if (!access.free) {
                    await self.consume(numQ, mods);
                }

                self.updateBadge();
            };
        }

        // 2. Interceptar ciaActiveMods — filtrar modelos por plan
        const originalMods = window.ciaActiveMods;
        if (originalMods) {
            window.ciaActiveMods = function() {
                const all     = originalMods.call(this);
                const allowed = self.getAllowedModels();
                return all.filter(m => allowed.includes(m));
            };
        }

        // 3. Interceptar ciaCallModel — redirigir chatgpt/perplexity a proxies propios
        const originalCall = window.ciaCallModel;
        if (originalCall) {
            window.ciaCallModel = async function(mid, prompt, qtext, qi, total) {
                // Si es chatgpt o perplexity y el plan lo permite, usar proxy propio
                if ((mid === 'chatgpt' || mid === 'perplexity') && self.isModelAllowed(mid)) {
                    const proxy = self.getProxyForModel(mid);
                    if (proxy) {
                        try {
                            const res = await fetch(proxy, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt })
                            });
                            if (!res.ok) throw new Error('Proxy ' + res.status);
                            const data = await res.json();
                            // OpenAI y Perplexity devuelven mismo formato
                            return data.choices?.[0]?.message?.content || '';
                        } catch(e) {
                            console.warn('[BrandGate] Proxy ' + mid + ' error:', e.message);
                            return '';
                        }
                    }
                }
                // Para todos los demás, usar el motor original
                return originalCall.apply(this, arguments);
            };
        }

        // 4. Bloquear toggles de modelos no permitidos en UI
        this.lockModelToggles();
    },

    // ── BLOQUEAR MODELOS NO PERMITIDOS EN UI ──────────────────
    lockModelToggles() {
        const allowed = this.getAllowedModels();
        const allMods = ['gemini', 'claude', 'chatgpt', 'perplexity', 'custom'];

        allMods.forEach(mid => {
            if (allowed.includes(mid)) return;
            const toggle = document.getElementById('cia-tog-' + mid);
            const card   = document.getElementById('cia-mc-' + mid);
            const badge  = document.getElementById('cia-mbadge-' + mid);
            if (toggle) {
                toggle.checked  = false;
                toggle.disabled = true;
            }
            if (card) {
                card.classList.remove('on');
                card.style.opacity = '0.4';
                card.style.pointerEvents = 'none';
                card.title = 'Disponible en Plan Agencia o superior';
            }
            if (badge) {
                badge.className = 'cia-mbadge bo';
                badge.textContent = 'Plan Agencia+';
            }
        });
    },

    // ── VERIFICAR PAGO PENDIENTE WOMPI ────────────────────────
    async checkPendingPayment() {
        try {
            const pending = localStorage.getItem('bc_pending_pack');
            const email   = localStorage.getItem('bc_pending_email');
            if (!pending || !email) return;
            localStorage.removeItem('bc_pending_pack');
            localStorage.removeItem('bc_pending_email');
            await this.syncBalance();
            const credits = this.getCredits();
            if (credits > 0) {
                bcShowToast('✅ Pago confirmado. Créditos acreditados.', 'success', 5000);
            }
        } catch(e) {}
    },

    // ── INYECTAR UI ────────────────────────────────────────────
    injectUI() {
        // Badge de estado
        const badgeHTML = `
            <div id="bc-gate-badge-wrap" style="text-align:center;padding:8px 0 4px;">
                <div id="bc-gate-badge" class="bc-badge">
                    <span id="bc-gate-badge-text">Cargando...</span>
                </div>
            </div>`;

        // Insertar badge antes del botón de run
        const runArea = document.querySelector('#cia-agent .cia-run');
        if (runArea) {
            runArea.insertAdjacentHTML('afterbegin', badgeHTML);
        }

        // Modal completo
        const modalHTML = `
<div id="bc-gate-overlay" style="position:fixed;inset:0;background:rgba(7,9,12,0.93);z-index:999999;display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);">
    <div style="background:#0d0d10;border:1px solid #2a2a32;border-radius:24px;width:100%;max-width:480px;font-family:'DM Sans',sans-serif;color:#e1e1e6;overflow:hidden;">

        <!-- VISTA: REGISTRO -->
        <div id="bc-view-register" style="display:flex;flex-direction:column;padding:40px 36px;gap:20px;">
            <div style="text-align:center;">
                <div style="display:inline-block;background:rgba(157,78,221,0.12);border:1px solid rgba(157,78,221,0.3);color:#9d4edd;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;padding:5px 14px;border-radius:50px;margin-bottom:16px;">1 ESTUDIO GRATUITO USADO</div>
                <div style="font-size:36px;margin-bottom:12px;">⚡</div>
                <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;line-height:1.1;margin-bottom:10px;">Obtén <span style="color:#FFD60A;">20 créditos</span> gratis</div>
                <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">Regístrate y recibe 20 créditos — equivalen a 1 estudio completo sin costo adicional.</p>
            </div>
            <!-- Preview créditos -->
            <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
                <div style="background:#111;border:1px solid #2a2a32;border-radius:10px;padding:12px 16px;text-align:center;">
                    <div style="font-family:'Fraunces',serif;font-size:26px;font-weight:900;font-style:italic;color:#fff;line-height:1;">1</div>
                    <div style="font-size:9px;color:#666;text-transform:uppercase;font-weight:700;margin-top:4px;">Gratis<br>ya usado</div>
                </div>
                <div style="font-size:18px;color:#333;font-weight:900;">+</div>
                <div style="background:#111;border:1px solid #FFD60A;border-radius:10px;padding:12px 16px;text-align:center;">
                    <div style="font-family:'Fraunces',serif;font-size:26px;font-weight:900;font-style:italic;color:#FFD60A;line-height:1;">20</div>
                    <div style="font-size:9px;color:#666;text-transform:uppercase;font-weight:700;margin-top:4px;">Créditos<br>al registrarte</div>
                </div>
            </div>
            <!-- Form -->
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#9d4edd;letter-spacing:1px;margin-bottom:6px;">Tu nombre</label>
                    <input id="bc-reg-name" type="text" placeholder="Ej: Carlos Pérez" autocomplete="name"
                        style="width:100%;background:#0a0a0a;border:1px solid #2a2a32;border-radius:8px;padding:12px 14px;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;box-sizing:border-box;"
                        onfocus="this.style.borderColor='#FFD60A'" onblur="this.style.borderColor='#2a2a32'">
                </div>
                <div>
                    <label style="display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#9d4edd;letter-spacing:1px;margin-bottom:6px;">Email profesional</label>
                    <input id="bc-reg-email" type="email" placeholder="tu@empresa.com" autocomplete="email"
                        style="width:100%;background:#0a0a0a;border:1px solid #2a2a32;border-radius:8px;padding:12px 14px;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;box-sizing:border-box;"
                        onfocus="this.style.borderColor='#FFD60A'" onblur="this.style.borderColor='#2a2a32'">
                </div>
                <div id="bc-reg-error" style="display:none;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:12px;color:#EF4444;font-weight:700;"></div>
                <button id="bc-reg-submit" onclick="BrandGate.submitRegister()"
                    style="width:100%;background:#FFD60A;color:#000;border:none;border-radius:10px;padding:15px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:900;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;">
                    <span id="bc-reg-btn-text">Reclamar 20 créditos →</span>
                    <div id="bc-reg-spinner" style="display:none;width:16px;height:16px;border:2px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:bc-spin 0.8s linear infinite;"></div>
                </button>
                <p style="text-align:center;font-size:10px;color:#444;font-weight:700;text-transform:uppercase;margin:0;">Sin spam · Sin tarjeta de crédito</p>
            </div>
        </div>

        <!-- VISTA: COMPRA DE CRÉDITOS -->
        <div id="bc-view-buy" style="display:none;flex-direction:column;padding:40px 36px;gap:20px;">
            <div style="text-align:center;">
                <div style="display:inline-block;background:rgba(219,39,119,0.12);border:1px solid rgba(219,39,119,0.3);color:#db2777;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;padding:5px 14px;border-radius:50px;margin-bottom:16px;">CRÉDITOS INSUFICIENTES</div>
                <div style="font-size:36px;margin-bottom:12px;">💳</div>
                <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;line-height:1.1;margin-bottom:10px;">Recarga tus <span style="color:#FFD60A;">créditos</span></div>
                <div style="background:#111;border:1px solid #2a2a32;border-radius:10px;padding:12px 16px;display:inline-block;margin-bottom:4px;">
                    <span style="font-size:11px;color:#666;text-transform:uppercase;font-weight:700;">Este estudio cuesta </span>
                    <span id="bc-study-cost" style="font-family:'Fraunces',serif;font-size:22px;font-weight:900;font-style:italic;color:#FFD60A;">30</span>
                    <span style="font-size:11px;color:#666;text-transform:uppercase;font-weight:700;"> créditos</span>
                </div>
                <div id="bc-study-label" style="font-size:11px;color:#666;margin-top:4px;"></div>
            </div>

            <!-- Packs -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                <div class="bc-pack" data-pack="pack_100" onclick="BrandGate.selectPack(this)"
                    style="background:#111;border:1px solid #2a2a32;border-radius:12px;padding:14px 10px;text-align:center;cursor:pointer;transition:all 0.2s;">
                    <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:#666;margin-bottom:6px;">Starter</div>
                    <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;color:#fff;line-height:1;">100</div>
                    <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-bottom:8px;">créditos</div>
                    <div style="font-size:11px;color:#888;margin-bottom:8px;">6 estudios básicos</div>
                    <div style="font-size:13px;font-weight:900;color:#fff;">$79.000</div>
                </div>
                <div class="bc-pack" data-pack="pack_250" onclick="BrandGate.selectPack(this)"
                    style="background:#111;border:1px solid #333;border-radius:12px;padding:14px 10px;text-align:center;cursor:pointer;transition:all 0.2s;position:relative;">
                    <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#FFD60A;color:#000;font-size:8px;font-weight:900;padding:2px 10px;border-radius:20px;white-space:nowrap;">MÁS POPULAR</div>
                    <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:#666;margin-bottom:6px;">Growth</div>
                    <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;color:#fff;line-height:1;">250</div>
                    <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-bottom:8px;">créditos</div>
                    <div style="font-size:11px;color:#888;margin-bottom:8px;">16 estudios básicos</div>
                    <div style="font-size:13px;font-weight:900;color:#fff;">$149.000</div>
                </div>
                <div class="bc-pack" data-pack="pack_500" onclick="BrandGate.selectPack(this)"
                    style="background:#111;border:1px solid #2a2a32;border-radius:12px;padding:14px 10px;text-align:center;cursor:pointer;transition:all 0.2s;">
                    <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:#666;margin-bottom:6px;">Pro</div>
                    <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;color:#fff;line-height:1;">500</div>
                    <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-bottom:8px;">créditos</div>
                    <div style="font-size:11px;color:#888;margin-bottom:8px;">33 estudios básicos</div>
                    <div style="font-size:13px;font-weight:900;color:#fff;">$249.000</div>
                </div>
            </div>

            <!-- Suscripciones -->
            <div style="border-top:1px solid #1a1a1a;padding-top:16px;">
                <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:#9d4edd;letter-spacing:1px;margin-bottom:10px;">O elige un plan de suscripción</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div class="bc-sub" data-plan="analista" onclick="BrandGate.selectSub(this)"
                        style="background:#111;border:1px solid #2a2a32;border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;">
                        <div>
                            <div style="font-size:13px;font-weight:700;color:#fff;">Analista</div>
                            <div style="font-size:11px;color:#666;margin-top:2px;">200 créditos/mes · Gemini + Claude</div>
                        </div>
                        <div style="font-size:14px;font-weight:900;color:#FFD60A;">$99.000/mes</div>
                    </div>
                    <div class="bc-sub" data-plan="agencia" onclick="BrandGate.selectSub(this)"
                        style="background:#111;border:1px solid #2a2a32;border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;">
                        <div>
                            <div style="font-size:13px;font-weight:700;color:#fff;">Agencia <span style="background:rgba(157,78,221,0.2);color:#9d4edd;font-size:8px;padding:2px 6px;border-radius:4px;margin-left:4px;">4 MODELOS</span></div>
                            <div style="font-size:11px;color:#666;margin-top:2px;">600 créditos/mes · Gemini + Claude + GPT-4o + Perplexity</div>
                        </div>
                        <div style="font-size:14px;font-weight:900;color:#FFD60A;">$249.000/mes</div>
                    </div>
                    <div class="bc-sub" data-plan="enterprise" onclick="BrandGate.selectSub(this)"
                        style="background:#111;border:1px solid #2a2a32;border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;">
                        <div>
                            <div style="font-size:13px;font-weight:700;color:#fff;">Enterprise <span style="background:rgba(255,214,10,0.15);color:#FFD60A;font-size:8px;padding:2px 6px;border-radius:4px;margin-left:4px;">ILIMITADO</span></div>
                            <div style="font-size:11px;color:#666;margin-top:2px;">Sin límite · 4 modelos · Soporte prioritario</div>
                        </div>
                        <div style="font-size:14px;font-weight:900;color:#FFD60A;">$499.000/mes</div>
                    </div>
                </div>
            </div>

            <div id="bc-buy-error" style="display:none;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:12px;color:#EF4444;font-weight:700;"></div>

            <button id="bc-buy-submit" onclick="BrandGate.submitBuy()" disabled
                style="width:100%;background:#FFD60A;color:#000;border:none;border-radius:10px;padding:15px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:900;text-transform:uppercase;cursor:pointer;opacity:0.5;min-height:50px;">
                <span id="bc-buy-btn-text">Selecciona un pack o plan →</span>
            </button>
            <button onclick="BrandGate.hideModal()"
                style="width:100%;background:none;border:none;color:#444;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;font-family:'DM Sans',sans-serif;padding:4px;">
                Cancelar
            </button>
        </div>

        <!-- VISTA: UPGRADE DE PLAN -->
        <div id="bc-view-upgrade" style="display:none;flex-direction:column;padding:40px 36px;gap:20px;text-align:center;">
            <div style="font-size:36px;">🔒</div>
            <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:900;font-style:italic;line-height:1.1;">Modelos <span style="color:#FFD60A;">Agencia+</span></div>
            <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">Los modelos <strong id="bc-blocked-models" style="color:#fff;"></strong> están disponibles desde el Plan Agencia.</p>
            <div style="background:#111;border:1px solid #9d4edd;border-radius:12px;padding:16px;">
                <div style="font-size:12px;color:#9d4edd;font-weight:700;margin-bottom:6px;">Plan Agencia incluye:</div>
                <div style="font-size:12px;color:#888;line-height:1.8;">✦ GPT-4o (OpenAI)<br>✦ Sonar Pro (Perplexity)<br>✦ Gemini 2.0 Flash<br>✦ Claude Sonnet<br>✦ 600 créditos/mes</div>
            </div>
            <button onclick="BrandGate.showModal('buy')"
                style="width:100%;background:#FFD60A;color:#000;border:none;border-radius:10px;padding:15px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                Ver planes →
            </button>
            <button onclick="BrandGate.hideModal()"
                style="width:100%;background:none;border:none;color:#444;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;font-family:'DM Sans',sans-serif;">
                Cancelar
            </button>
        </div>

    </div>
</div>

<style>
@keyframes bc-spin { to { transform: rotate(360deg); } }
.bc-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 50px; padding: 5px 14px;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
    color: #666; text-transform: uppercase; letter-spacing: 0.5px;
}
.bc-badge--ok    { color: #22C55E; border-color: rgba(34,197,94,0.2); }
.bc-badge--low   { color: #F59E0B; border-color: rgba(245,158,11,0.2); }
.bc-badge--empty { color: #EF4444; border-color: rgba(239,68,68,0.2); }
.bc-badge--pro   { color: #9d4edd; border-color: rgba(157,78,221,0.3); }
.bc-pack.selected  { border-color: #FFD60A !important; background: rgba(255,214,10,0.06) !important; }
.bc-sub.selected   { border-color: #FFD60A !important; background: rgba(255,214,10,0.06) !important; }
</style>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && BC_STATE.modalVisible) this.hideModal();
        });

        // Enter en inputs de registro
        ['bc-reg-name', 'bc-reg-email'].forEach(id => {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.submitRegister();
                });
            }, 500);
        });
    },

    // ── PACK SELECTION ────────────────────────────────────────
    _selectedPack: null,
    _selectedSub:  null,

    selectPack(el) {
        this._selectedPack = el.dataset.pack;
        this._selectedSub  = null;
        document.querySelectorAll('.bc-pack').forEach(p => p.classList.remove('selected'));
        document.querySelectorAll('.bc-sub').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        const btn = document.getElementById('bc-buy-submit');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            const packLabels = { pack_100: '100 créditos · $79.000 COP', pack_250: '250 créditos · $149.000 COP', pack_500: '500 créditos · $249.000 COP' };
            document.getElementById('bc-buy-btn-text').textContent = 'Comprar ' + (packLabels[this._selectedPack] || '') + ' →';
        }
    },

    selectSub(el) {
        this._selectedSub  = el.dataset.plan;
        this._selectedPack = null;
        document.querySelectorAll('.bc-pack').forEach(p => p.classList.remove('selected'));
        document.querySelectorAll('.bc-sub').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        const btn = document.getElementById('bc-buy-submit');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            const subLabels = { analista: 'Plan Analista · $99.000/mes', agencia: 'Plan Agencia · $249.000/mes', enterprise: 'Plan Enterprise · $499.000/mes' };
            document.getElementById('bc-buy-btn-text').textContent = 'Suscribirme · ' + (subLabels[this._selectedSub] || '') + ' →';
        }
    },

    // Links de Wompi — packs de créditos
    WOMPI_PACK_LINKS: {
        pack_100: 'https://checkout.wompi.co/l/PACK_100_LINK',
        pack_250: 'https://checkout.wompi.co/l/PACK_250_LINK',
        pack_500: 'https://checkout.wompi.co/l/PACK_500_LINK'
    },

    // Links de Wompi — suscripciones
    WOMPI_SUB_LINKS: {
        analista:   'https://checkout.wompi.co/l/SUB_ANALISTA_LINK',
        agencia:    'https://checkout.wompi.co/l/SUB_AGENCIA_LINK',
        enterprise: 'https://checkout.wompi.co/l/SUB_ENTERPRISE_LINK'
    },

    submitBuy() {
        const email = this.getEmail();
        if (!email) { bcShowToast('Error: no se encontró tu sesión.', 'error'); return; }

        if (this._selectedPack) {
            const url = this.WOMPI_PACK_LINKS[this._selectedPack];
            if (url && !url.includes('LINK')) {
                localStorage.setItem('bc_pending_pack', this._selectedPack);
                localStorage.setItem('bc_pending_email', email);
                this.hideModal();
                window.open(url, '_blank');
                bcShowToast('💳 Completa el pago en la ventana que se abrió.', 'info', 6000);
            } else {
                bcShowToast('🔜 Pagos disponibles muy pronto.', 'info', 4000);
                this.hideModal();
            }
            return;
        }

        if (this._selectedSub) {
            const url = this.WOMPI_SUB_LINKS[this._selectedSub];
            if (url && !url.includes('LINK')) {
                localStorage.setItem('bc_pending_sub', this._selectedSub);
                localStorage.setItem('bc_pending_email', email);
                this.hideModal();
                window.open(url, '_blank');
                bcShowToast('💳 Completa tu suscripción en la ventana que se abrió.', 'info', 6000);
            } else {
                bcShowToast('🔜 Suscripciones disponibles muy pronto.', 'info', 4000);
                this.hideModal();
            }
        }
    },

    // ── SUBMIT REGISTRO ───────────────────────────────────────
    async submitRegister() {
        const name    = (document.getElementById('bc-reg-name')?.value || '').trim();
        const email   = (document.getElementById('bc-reg-email')?.value || '').trim();
        const errEl   = document.getElementById('bc-reg-error');
        const btn     = document.getElementById('bc-reg-submit');
        const btnTxt  = document.getElementById('bc-reg-btn-text');
        const spinner = document.getElementById('bc-reg-spinner');

        errEl.style.display = 'none';

        if (!name || name.length < 2) {
            errEl.textContent = 'Por favor ingresa tu nombre.';
            errEl.style.display = 'block';
            return;
        }
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) {
            errEl.textContent = 'Ingresa un email válido.';
            errEl.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btnTxt.textContent = 'Activando créditos...';
        spinner.style.display = 'block';

        try {
            const result = await this.register(name, email);
            if (!result.success) throw new Error('Error al registrar');

            this.hideModal();
            this.lockModelToggles();
            const msg = result.existing
                ? '✅ ¡Bienvenido de nuevo ' + name + '! Saldo: ' + result.credits + ' créditos.'
                : '✅ ¡Bienvenido ' + name + '! Tienes 20 créditos para empezar.';
            bcShowToast(msg, 'success', 5000);
        } catch(e) {
            errEl.textContent = 'Error al conectar. Intenta de nuevo.';
            errEl.style.display = 'block';
        }

        btn.disabled = false;
        btnTxt.textContent = 'Reclamar 20 créditos →';
        spinner.style.display = 'none';
    }
};

// ── TOAST GLOBAL ──────────────────────────────────────────────
function bcShowToast(msg, type, duration) {
    duration = duration || 3500;
    let container = document.getElementById('bc-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bc-toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }
    const colors = { success: '#22C55E', error: '#EF4444', info: '#FFD60A' };
    const textColors = { success: '#fff', error: '#fff', info: '#000' };
    const el = document.createElement('div');
    el.style.cssText = 'padding:12px 20px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:13px;font-weight:700;pointer-events:auto;max-width:320px;box-shadow:0 8px 30px rgba(0,0,0,0.4);animation:bc-spin 0s;opacity:1;transition:opacity 0.3s;background:' + (colors[type] || '#FFD60A') + ';color:' + (textColors[type] || '#000') + ';';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350); }, duration);
}

window.bcShowToast = bcShowToast;

// ── AUTO INIT ─────────────────────────────────────────────────
// Esperar a que el motor esté listo antes de interceptar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => BrandGate.init(), 100));
} else {
    setTimeout(() => BrandGate.init(), 100);
}

})();

<template>
  <div class="landing">

    <!-- ══ NAVBAR ══════════════════════════════════════════════ -->
    <nav class="navbar" :class="{ scrolled: scrolled }">
      <div class="nav-inner">
        <a href="#inicio" class="logo" @click.prevent="scrollTo('inicio')">
          <div class="logo-icon">
            <svg viewBox="0 0 32 32" fill="none"><path d="M4 14L16 4L28 14V28H20V20H12V28H4V14Z" fill="currentColor"/></svg>
          </div>
          <span>InmoSaaS</span>
        </a>
        <div class="nav-links" :class="{ open: menuOpen }">
          <a v-for="item in navItems" :key="item.id" :href="`#${item.id}`"
            @click.prevent="scrollTo(item.id); menuOpen = false"
            :class="{ active: activeSection === item.id }">
            {{ item.label }}
          </a>
        </div>
        <div class="nav-actions">
          <a href="/portal" class="btn-outline-nav">Portal inquilinos</a>
          <button @click="scrollTo('login')" class="btn-outline-nav">Iniciar sesión</button>
          <button @click="scrollTo('contratar')" class="btn-cta-nav">Contratar →</button>
          <button class="hamburger" @click="menuOpen = !menuOpen">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- ══ HERO ════════════════════════════════════════════════ -->
    <section id="inicio" class="hero">
      <div class="hero-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="grid-overlay"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">✦ Sistema de gestión inmobiliaria</div>
        <h1 class="hero-title">
          Gestioná tu<br/>
          inmobiliaria <span class="hero-sin">sin</span><br/>
          <span class="hero-comp">complicaciones</span>
        </h1>
        <p class="hero-sub">
          Contratos, cobros, propiedades, métricas y más.<br/>
          Todo en un sistema diseñado para inmobiliarias argentinas.
        </p>
        <div class="hero-actions">
          <button @click="scrollTo('contratar')" class="btn-hero-primary">
            Empezar ahora — gratis
          </button>
          <button @click="scrollTo('funcionalidades')" class="btn-hero-secondary">
            Ver funcionalidades ↓
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <!-- Laptop mockup -->
        <div class="device-laptop">
          <div class="laptop-screen">
            <div class="preview-bar">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="preview-url">app.inmosaas.com/dashboard</span>
            </div>
            <div class="preview-body">
              <div class="preview-sidebar">
                <div v-for="i in 5" :key="i" class="sidebar-item" :class="{ active: i === 1 }"></div>
              </div>
              <div class="preview-main">
                <div class="preview-kpis">
                  <div class="kpi-card">
                    <div class="kpi-label-text">Total Ingresos:</div>
                    <div class="kpi-value-text">$120k</div>
                  </div>
                  <div class="kpi-card">
                    <div class="kpi-label-text">Alquileres:</div>
                    <div class="kpi-value-text">85%</div>
                  </div>
                  <div class="kpi-card">
                    <div class="kpi-label-text">Total io Ingresos:</div>
                    <div class="kpi-value-text">$300k</div>
                  </div>
                  <div class="kpi-card">
                    <div class="kpi-label-text">Alquileres:</div>
                    <div class="kpi-value-text">85%</div>
                  </div>
                </div>
                <div class="preview-charts">
                  <div class="chart-card">
                    <div class="chart-title-small">Total Ingresos</div>
                    <div class="chart-bars">
                      <div v-for="(h, i) in [60,80,45,90,70,55,85]" :key="i" class="bar" :style="`height:${h}%`"></div>
                    </div>
                    <div class="chart-labels">
                      <span v-for="l in ['algo','aber','mar','ago','jun','juñ']" :key="l">{{l}}</span>
                    </div>
                  </div>
                  <div class="chart-card small">
                    <div class="donut-preview"></div>
                    <div class="donut-legend">
                      <div class="legend-item"><span class="legend-dot blue"></span> Total Ingresos: $120k</div>
                      <div class="legend-item"><span class="legend-dot gray"></span> Al... 89%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Tablet mockup -->
        <div class="device-tablet">
          <div class="tablet-screen">
            <div class="tablet-kpis">
              <div class="t-kpi"><span class="t-label">Total Ingresos:</span><span class="t-val">$120k</span></div>
              <div class="t-kpi"><span class="t-label">Alquileres: 85%</span><div class="t-bar"><div class="t-bar-fill" style="width:85%"></div></div></div>
              <div class="t-kpi"><span class="t-label">Total io ingresos:</span><span class="t-val">$300k</span></div>
              <div class="t-kpi"><span class="t-label">Alquileres: 85%</span><div class="t-bar"><div class="t-bar-fill" style="width:85%"></div></div></div>
            </div>
            <div class="tablet-donut">
              <div class="donut-sm"></div>
              <div class="tablet-donut-labels">
                <div v-for="i in 4" :key="i" class="tdl">Alquileres: 85%</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Mobile mockup -->
        <div class="device-mobile">
          <div class="mobile-screen">
            <div class="mobile-header">
              <div class="mh-icon"></div>
              <div class="mh-lines"><div></div><div></div></div>
            </div>
            <div class="mobile-kpis">
              <div class="m-kpi"><span class="m-label">Total Ingresos:</span><span class="m-val">$120k</span></div>
              <div class="m-kpi"><span class="m-label">Alquileres: 85%</span><div class="m-bar"><div class="m-bar-fill" style="width:85%"></div></div></div>
              <div class="m-kpi"><span class="m-label">Total io Ingresos:</span><span class="m-val">$120k</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ STATS ════════════════════════════════════════════════ -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num">16</span>
          <span class="stat-label">MÓDULOS</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <span class="stat-num">100%</span>
          <span class="stat-label">MULTI-TENANT</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <span class="stat-num">∞</span>
          <span class="stat-label">PROPIEDADES</span>
        </div>
      </div>
    </section>

    <!-- ══ QUIÉNES SOMOS ═══════════════════════════════════════ -->
    <section id="quienes-somos" class="section nosotros">
      <div class="container">
        <div class="nosotros-grid">
          <div class="nosotros-text">
            <div class="section-tag">Quiénes somos</div>
            <h2 class="section-title">Construido por y para<br/>el mercado argentino</h2>
            <p class="section-desc">
              InmoSaaS nació de la necesidad real de inmobiliarias que querían dejar atrás las planillas de Excel y los sistemas genéricos que no entienden el mercado local.
            </p>
            <p class="section-desc" style="margin-top:12px">
              Entendemos los ajustes por IPC, los contratos en pesos, la gestión de propietarios e inquilinos en el mismo sistema.
            </p>
            <div class="values">
              <div v-for="v in valores" :key="v.title" class="value-item">
                <span class="value-icon">{{ v.icon }}</span>
                <div>
                  <p class="value-title">{{ v.title }}</p>
                  <p class="value-desc">{{ v.desc }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="nosotros-visual">
            <div class="visual-card card-1"><div class="vc-icon">🏢</div><p class="vc-num">+500</p><p class="vc-label">propiedades gestionadas</p></div>
            <div class="visual-card card-2"><div class="vc-icon">📄</div><p class="vc-num">100%</p><p class="vc-label">digital, sin papel</p></div>
            <div class="visual-card card-3"><div class="vc-icon">⚡</div><p class="vc-num">IPC</p><p class="vc-label">ajuste automático</p></div>
            <div class="visual-card card-4"><div class="vc-icon">🔒</div><p class="vc-num">Multi</p><p class="vc-label">tenant seguro</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ FUNCIONALIDADES ═════════════════════════════════════ -->
    <section id="funcionalidades" class="section features">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Funcionalidades</div>
          <h2 class="section-title">Todo lo que necesitás<br/>en un solo lugar</h2>
          <p class="section-desc">16 módulos integrados que cubren el 100% de la operación de tu inmobiliaria.</p>
        </div>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
            <ul class="feature-list">
              <li v-for="item in f.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ PLANES ══════════════════════════════════════════════ -->
    <section id="planes" class="section planes">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Planes</div>
          <h2 class="section-title">Elegí el plan<br/>que mejor te queda</h2>
          <p class="section-desc">Sin costos ocultos. Cancelás cuando quieras.</p>
        </div>
        <div class="planes-grid">
          <div v-for="plan in planes" :key="plan.nombre"
            class="plan-card" :class="{ popular: plan.popular }">
            <div v-if="plan.popular" class="popular-badge">⭐ Más popular</div>
            <div class="plan-header">
              <h3 class="plan-nombre">{{ plan.nombre }}</h3>
              <div class="plan-precio">
                <span class="plan-moneda">$</span>
                <span class="plan-monto">{{ plan.precio }}</span>
                <span class="plan-periodo">/mes</span>
              </div>
              <p class="plan-desc">{{ plan.desc }}</p>
            </div>
            <ul class="plan-features">
              <li v-for="f in plan.features" :key="f" class="plan-feature">
                <span class="check">✓</span> {{ f }}
              </li>
              <li v-for="f in (plan.locked || [])" :key="f" class="plan-feature plan-feature-locked">
                <span class="check-no">✕</span> {{ f }}
              </li>
            </ul>
            <button @click="scrollTo('contratar')" class="plan-btn" :class="{ 'plan-btn-popular': plan.popular }">
              {{ plan.cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CONTRATAR ═══════════════════════════════════════════ -->
    <section id="contratar" class="section contratar">
      <div class="container">
        <div class="contratar-grid">
          <div class="contratar-text">
            <div class="section-tag">Contratar</div>
            <h2 class="section-title">Registrá tu inmobiliaria<br/>en 2 minutos</h2>
            <p class="section-desc">Empezá hoy. Sin tarjeta de crédito. Sin compromiso.</p>
            <div class="pasos">
              <div v-for="(paso, i) in pasos" :key="i" class="paso">
                <div class="paso-num">{{ i + 1 }}</div>
                <div>
                  <p class="paso-title">{{ paso.title }}</p>
                  <p class="paso-desc">{{ paso.desc }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="contratar-form card-form">
            <h3 class="form-title">Crear cuenta gratis</h3>
            <div v-if="registroExito" class="success-msg">🎉 ¡Cuenta creada! Podés iniciar sesión ahora.</div>
            <div v-else>
              <div v-if="registroError" class="error-msg">{{ registroError }}</div>
              <form @submit.prevent="registrar" class="form-fields">
                <div class="field-group">
                  <label class="field-label">Nombre de la inmobiliaria *</label>
                  <input v-model="regForm.tenantNombre" class="field-input" placeholder="Inmobiliaria García" required />
                </div>
                <div class="field-group">
                  <label class="field-label">Email de la inmobiliaria *</label>
                  <input v-model="regForm.tenantEmail" type="email" class="field-input" placeholder="contacto@garcia.com" required />
                </div>
                <div class="field-row">
                  <div class="field-group">
                    <label class="field-label">Tu nombre *</label>
                    <input v-model="regForm.nombre" class="field-input" placeholder="Juan" required />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Apellido *</label>
                    <input v-model="regForm.apellido" class="field-input" placeholder="García" required />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Tu email *</label>
                  <input v-model="regForm.adminEmail" type="email" class="field-input" placeholder="juan@garcia.com" required />
                </div>
                <div class="field-group">
                  <label class="field-label">Contraseña *</label>
                  <input v-model="regForm.password" type="password" class="field-input" placeholder="Mínimo 8 caracteres" required />
                  <p class="field-hint">Debe tener al menos 8 caracteres, una letra y un número.</p>
                </div>
                <button type="submit" :disabled="registrando" class="submit-btn">
                  {{ registrando ? 'Creando cuenta...' : 'Crear cuenta gratis →' }}
                </button>
              </form>
              <p class="login-link">¿Ya tenés cuenta? <a href="#" @click.prevent="scrollTo('login')">Iniciá sesión aquí</a></p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ LOGIN ═══════════════════════════════════════════════ -->
    <section id="login" class="section login-section">
      <div class="container">
        <div class="login-grid">
          <div class="login-text">
            <div class="section-tag">Acceso al sistema</div>
            <h2 class="section-title">Bienvenido de vuelta</h2>
            <p class="section-desc">Ingresá a tu panel de gestión y continuá donde lo dejaste.</p>
            <div class="login-features">
              <div v-for="f in loginFeatures" :key="f" class="lf-item">
                <span class="lf-check">✓</span> {{ f }}
              </div>
            </div>
          </div>
          <div class="card-form">
            <h3 class="form-title">Iniciar sesión</h3>
            <div v-if="auth.error" class="error-msg">{{ auth.error }}</div>
            <form @submit.prevent="handleLogin" class="form-fields">
              <div class="field-group">
                <label class="field-label">Email</label>
                <input v-model="loginForm.email" type="email" class="field-input" placeholder="tu@email.com" required />
              </div>
              <div class="field-group">
                <label class="field-label">Contraseña</label>
                <div class="pass-wrap">
                  <input v-model="loginForm.password" :type="showPass ? 'text' : 'password'" class="field-input" placeholder="••••••••" required />
                  <button type="button" @click="showPass = !showPass" class="pass-toggle">{{ showPass ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <button type="submit" :disabled="auth.loading" class="submit-btn">
                {{ auth.loading ? 'Ingresando...' : 'Ingresar al sistema →' }}
              </button>
            </form>
            <p class="login-link">¿No tenés cuenta? <a href="#" @click.prevent="scrollTo('contratar')">Registrá tu inmobiliaria</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ FOOTER ══════════════════════════════════════════════ -->
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="logo">
              <div class="logo-icon"><svg viewBox="0 0 32 32" fill="none"><path d="M4 14L16 4L28 14V28H20V20H12V28H4V14Z" fill="currentColor"/></svg></div>
              <span>InmoSaaS</span>
            </div>
            <p class="footer-desc">Sistema de gestión inmobiliaria<br/>hecho para Argentina.</p>
          </div>
          <div class="footer-links">
            <div v-for="col in footerCols" :key="col.title" class="footer-col">
              <p class="footer-col-title">{{ col.title }}</p>
              <a v-for="link in col.links" :key="link.label" :href="`#${link.id}`" @click.prevent="scrollTo(link.id)" class="footer-link">{{ link.label }}</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom"><p>© 2026 InmoSaaS. Todos los derechos reservados.</p></div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const router = useRouter();
const auth = useAuthStore();

const scrolled = ref(false);
const menuOpen = ref(false);
const activeSection = ref('inicio');
const showPass = ref(false);
const registrando = ref(false);
const registroExito = ref(false);
const registroError = ref('');

const loginForm = ref({ email: '', password: '' });
const regForm = ref({ tenantNombre: '', tenantEmail: '', nombre: '', apellido: '', adminEmail: '', password: '' });

const navItems = [
  { id: 'quienes-somos', label: 'Quiénes somos' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'planes', label: 'Planes' },
  { id: 'contratar', label: 'Contratar' },
];

const valores = [
  { icon: '🇦🇷', title: 'Hecho en Argentina', desc: 'Pensado para el mercado local, con ajustes IPC y contratos en pesos.' },
  { icon: '🔐', title: 'Multi-inmobiliaria', desc: 'Cada inmobiliaria tiene su propio espacio seguro e independiente.' },
  { icon: '📱', title: 'Responsive', desc: 'Funciona desde la computadora, tablet o celular.' },
];

const features = [
  { icon: '🏠', title: 'Propiedades', desc: 'Catálogo completo con galería de fotos.', items: ['Fotos en Supabase Storage', 'Ficha de detalle', 'Estado automático', 'Vinculación a propietario'] },
  { icon: '📄', title: 'Contratos', desc: 'Contratos digitales con ajuste automático.', items: ['Generación de PDF', 'Ajuste IPC automático', 'Estados del contrato', 'Historial de ajustes'] },
  { icon: '💰', title: 'Cobros', desc: 'Registro de pagos completos y parciales.', items: ['Pagos parciales', 'Múltiples formas de pago', 'Historial completo', 'Alertas de mora'] },
  { icon: '📊', title: 'Métricas', desc: 'Panel financiero con gráficos y exportación.', items: ['Ingresos vs gastos', 'Tasa de ocupación', 'Deuda por inquilino', 'Exportar a Excel'] },
  { icon: '🔔', title: 'Notificaciones', desc: 'Alertas automáticas en tiempo real.', items: ['Pagos atrasados', 'Facturas por vencer', 'Contratos por finalizar', 'Tareas vencidas'] },
  { icon: '✅', title: 'Tareas', desc: 'Gestión de recordatorios y seguimiento.', items: ['Prioridades', 'Vinculación a clientes', 'Fechas de vencimiento', 'Estados de avance'] },
];

const planes = [
  {
    nombre: 'Starter', precio: '12.900', desc: 'Para empezar sin riesgos', popular: false, cta: 'Empezar con Starter',
    features: ['Hasta 10 propiedades', '1 usuario', 'Clientes, Contratos y Cobros', 'Tareas y recordatorios', 'Contratos PDF', 'Métricas básicas'],
    locked: ['Gastos', 'Facturas de servicios', 'Ventas', 'Excel import/export', 'Métricas avanzadas'],
  },
  {
    nombre: 'Pro', precio: '27.900', desc: 'Para inmobiliarias en crecimiento', popular: true, cta: 'Contratar Pro',
    features: ['Propiedades ilimitadas', 'Hasta 5 usuarios', 'Todos los módulos', 'Gastos y facturas', 'Ventas', 'Import/Export Excel', 'Métricas avanzadas', 'Ajuste IPC automático'],
    locked: [],
  },
  {
    nombre: 'Enterprise', precio: '54.900', desc: 'Para operaciones grandes', popular: false, cta: 'Contactar ventas',
    features: ['Todo lo de Pro', 'Usuarios ilimitados', 'Multi-sucursal', 'API de integración', 'Portal propietario/inquilino', 'Automatizaciones', 'Reportes avanzados'],
    locked: [],
  },
];

const pasos = [
  { title: 'Completá el formulario', desc: 'Nombre de tu inmobiliaria y tus datos de admin.' },
  { title: 'Accedé al sistema', desc: 'Tu cuenta queda lista al instante, sin esperas.' },
  { title: 'Empezá a cargar', desc: 'Importá desde Excel o cargá manualmente.' },
];

const loginFeatures = [
  'Dashboard con métricas en tiempo real',
  'Notificaciones de pagos y vencimientos',
  'Acceso desde cualquier dispositivo',
  'Datos siempre seguros y respaldados',
];

const footerCols = [
  { title: 'Producto', links: [{ id: 'funcionalidades', label: 'Funcionalidades' }, { id: 'planes', label: 'Planes' }] },
  { title: 'Empresa', links: [{ id: 'quienes-somos', label: 'Quiénes somos' }, { id: 'contratar', label: 'Contratar' }] },
  { title: 'Acceso', links: [{ id: 'login', label: 'Iniciar sesión' }, { id: 'contratar', label: 'Crear cuenta' }] },
];

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  menuOpen.value = false;
};

const handleLogin = async () => {
  const ok = await auth.login(loginForm.value);
  if (ok) router.push('/app/dashboard');
};

const registrar = async () => {
  registrando.value = true; registroError.value = '';
  try {
    const { data } = await api.post('/auth/register', {
      tenant: { nombre: regForm.value.tenantNombre, email: regForm.value.tenantEmail },
      admin: { nombre: regForm.value.nombre, apellido: regForm.value.apellido, email: regForm.value.adminEmail, password: regForm.value.password },
    });
    if (data.token) { auth.setSession(data.token, data.usuario, data.tenant); router.push('/app/dashboard'); }
    else { registroExito.value = true; }
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || 'Error al registrar';
    registroError.value = Array.isArray(msg) ? msg.join(' • ') : msg;
  } finally { registrando.value = false; }
};

const onScroll = () => {
  scrolled.value = window.scrollY > 40;
  const sections = ['inicio', 'quienes-somos', 'funcionalidades', 'planes', 'contratar', 'login'];
  for (const id of [...sections].reverse()) {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) { activeSection.value = id; break; }
  }
};

onMounted(() => window.addEventListener('scroll', onScroll));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

/* ── BASE ───────────────────────────────────── */
.landing { font-family: 'DM Sans', sans-serif; color: #0f172a; background: #fff; overflow-x: hidden; }
.container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
.section { padding: 100px 0; }
.section-tag { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 100px; padding: 4px 14px; margin-bottom: 18px; }
.section-title { font-family: 'Syne', sans-serif; font-size: clamp(28px, 4vw, 44px); font-weight: 800; line-height: 1.15; color: #0f172a; margin-bottom: 16px; }
.section-desc { font-size: 16px; color: #64748b; line-height: 1.7; max-width: 540px; }
.section-header { text-align: center; margin-bottom: 64px; }
.section-header .section-desc { margin: 0 auto; }

/* ── NAVBAR ─────────────────────────────────── */
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(255,255,255,0.97); backdrop-filter: blur(12px); box-shadow: 0 1px 0 #e2e8f0; padding: 14px 0; transition: all 0.3s; }
.nav-inner { max-width: 1160px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 32px; }
.logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #0f172a; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; }
.logo-icon { width: 34px; height: 34px; background: #1e40af; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; }
.logo-icon svg { width: 18px; height: 18px; }
.nav-links { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.nav-links a { text-decoration: none; font-size: 14px; font-weight: 500; color: #475569; padding: 8px 14px; border-radius: 8px; transition: all 0.2s; }
.nav-links a:hover, .nav-links a.active { color: #3b82f6; background: #eff6ff; }
.nav-actions { display: flex; align-items: center; gap: 8px; }
.btn-outline-nav { font-size: 14px; font-weight: 500; color: #475569; background: none; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; cursor: pointer; transition: all 0.2s; }
.btn-outline-nav:hover { border-color: #3b82f6; color: #3b82f6; }
.btn-cta-nav { font-size: 14px; font-weight: 600; color: #fff; background: #1e40af; border: none; border-radius: 10px; padding: 8px 18px; cursor: pointer; transition: all 0.2s; }
.btn-cta-nav:hover { background: #1d3a9e; transform: translateY(-1px); }
.hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
.hamburger span { display: block; width: 22px; height: 2px; background: #475569; border-radius: 2px; }

/* ── HERO ───────────────────────────────────── */
.hero { min-height: 100vh; display: flex; align-items: center; padding: 120px 80px 80px; max-width: 1300px; margin: 0 auto; gap: 60px; position: relative; }
.hero-bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.25; }
.blob-1 { width: 700px; height: 700px; background: radial-gradient(circle, #bfdbfe, #e0e7ff); top: -150px; right: -100px; animation: float 8s ease-in-out infinite; }
.blob-2 { width: 400px; height: 400px; background: radial-gradient(circle, #dbeafe, #f0fdf4); bottom: 100px; left: -80px; animation: float 10s ease-in-out infinite reverse; }
.grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px); background-size: 40px 40px; opacity: 0.2; }
@keyframes float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,20px)} }

.hero-content { flex: 0 0 420px; min-width: 0; }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 100px; padding: 6px 16px; margin-bottom: 28px; }
.hero-title { font-family: 'Syne', sans-serif; font-size: clamp(36px, 4vw, 52px); font-weight: 700; line-height: 1.15; color: #0f172a; margin-bottom: 20px; }
.hero-sin { color: #0f172a; }
.hero-comp { color: #93c5fd; font-weight: 700; }
.hero-sub { font-size: 16px; color: #64748b; line-height: 1.7; margin-bottom: 36px; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.btn-hero-primary { font-size: 15px; font-weight: 600; color: #fff; background: #1e40af; border: none; border-radius: 12px; padding: 14px 28px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(30,64,175,0.3); }
.btn-hero-primary:hover { background: #1d3a9e; transform: translateY(-2px); }
.btn-hero-secondary { font-size: 15px; font-weight: 500; color: #475569; background: rgba(255,255,255,0.8); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 24px; cursor: pointer; transition: all 0.2s; }
.btn-hero-secondary:hover { border-color: #3b82f6; color: #3b82f6; }

/* ── HERO VISUAL — 3 DEVICES ────────────────── */
.hero-visual { flex: 1; position: relative; height: 420px; min-width: 0; }

/* Laptop */
.device-laptop { position: absolute; left: 0; top: 0; width: 100%; max-width: 560px; z-index: 1; }
.laptop-screen { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.06); overflow: hidden; }
.preview-bar { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.dot { width: 9px; height: 9px; border-radius: 50%; }
.dot.red { background: #f87171; } .dot.yellow { background: #fbbf24; } .dot.green { background: #34d399; }
.preview-url { flex: 1; font-size: 10px; color: #94a3b8; text-align: center; font-family: monospace; }
.preview-body { display: flex; height: 240px; }
.preview-sidebar { width: 44px; background: #1e293b; padding: 10px 7px; display: flex; flex-direction: column; gap: 5px; }
.sidebar-item { height: 22px; background: #334155; border-radius: 5px; }
.sidebar-item.active { background: #3b82f6; }
.preview-main { flex: 1; padding: 10px; background: #f8fafc; }
.preview-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.kpi-card { background: white; border-radius: 8px; padding: 8px 10px; border: 1px solid #e2e8f0; }
.kpi-label-text { font-size: 9px; color: #94a3b8; margin-bottom: 4px; }
.kpi-value-text { font-size: 16px; font-weight: 700; color: #0f172a; }
.preview-charts { display: grid; grid-template-columns: 2fr 1fr; gap: 6px; }
.chart-card { background: white; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; }
.chart-title-small { font-size: 9px; color: #64748b; margin-bottom: 4px; }
.chart-bars { display: flex; align-items: flex-end; gap: 3px; height: 70px; }
.bar { flex: 1; background: linear-gradient(to top, #3b82f6, #93c5fd); border-radius: 3px 3px 0 0; }
.chart-labels { display: flex; gap: 3px; margin-top: 3px; }
.chart-labels span { flex: 1; font-size: 7px; color: #94a3b8; text-align: center; }
.chart-card.small { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.donut-preview { width: 50px; height: 50px; border-radius: 50%; background: conic-gradient(#3b82f6 0deg 252deg, #e2e8f0 252deg 360deg); position: relative; }
.donut-preview::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 32px; height: 32px; background: white; border-radius: 50%; }
.donut-legend { width: 100%; }
.legend-item { font-size: 7px; color: #64748b; display: flex; align-items: center; gap: 3px; margin-bottom: 2px; }
.legend-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.legend-dot.blue { background: #3b82f6; } .legend-dot.gray { background: #e2e8f0; }

/* Tablet */
.device-tablet { position: absolute; right: -20px; top: 20px; width: 200px; z-index: 2; background: white; border-radius: 14px; box-shadow: 0 16px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.07); overflow: hidden; }
.tablet-screen { padding: 12px; }
.tablet-kpis { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.t-kpi { display: flex; flex-direction: column; gap: 3px; }
.t-label { font-size: 9px; color: #64748b; }
.t-val { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1; }
.t-bar { height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
.t-bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; }
.tablet-donut { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.donut-sm { width: 70px; height: 70px; border-radius: 50%; background: conic-gradient(#3b82f6 0deg 252deg, #e2e8f0 252deg 360deg); position: relative; }
.donut-sm::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 44px; height: 44px; background: white; border-radius: 50%; }
.tablet-donut-labels { width: 100%; display: flex; flex-direction: column; gap: 4px; }
.tdl { font-size: 8px; color: #64748b; }

/* Mobile */
.device-mobile { position: absolute; right: -60px; bottom: -20px; width: 120px; z-index: 3; background: white; border-radius: 18px; box-shadow: 0 16px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08); overflow: hidden; }
.mobile-screen { padding: 10px; }
.mobile-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.mh-icon { width: 20px; height: 20px; background: #1e293b; border-radius: 5px; }
.mh-lines { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.mh-lines div { height: 5px; background: #e2e8f0; border-radius: 3px; }
.mh-lines div:last-child { width: 60%; }
.mobile-kpis { display: flex; flex-direction: column; gap: 7px; }
.m-kpi { display: flex; flex-direction: column; gap: 2px; }
.m-label { font-size: 7px; color: #64748b; }
.m-val { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1; }
.m-bar { height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
.m-bar-fill { height: 100%; background: #3b82f6; border-radius: 2px; }

/* ── STATS ──────────────────────────────────── */
.stats-section { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0; }
.stats-grid { max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: center; padding: 40px 24px; gap: 0; }
.stat-card { flex: 1; text-align: center; padding: 20px; }
.stat-num { display: block; font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 6px; }
.stat-label { font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; }
.stat-divider { width: 1px; height: 60px; background: #e2e8f0; }

/* ── NOSOTROS ───────────────────────────────── */
.nosotros { background: #f8fafc; }
.nosotros-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.values { display: flex; flex-direction: column; gap: 18px; margin-top: 32px; }
.value-item { display: flex; gap: 14px; align-items: flex-start; }
.value-icon { font-size: 22px; flex-shrink: 0; }
.value-title { font-weight: 600; color: #0f172a; font-size: 15px; margin-bottom: 2px; }
.value-desc { font-size: 14px; color: #64748b; }
.nosotros-visual { position: relative; height: 380px; }
.visual-card { position: absolute; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); padding: 20px 24px; min-width: 140px; }
.card-1 { top: 0; left: 20px; } .card-2 { top: 80px; right: 0; } .card-3 { bottom: 80px; left: 0; } .card-4 { bottom: 10px; right: 30px; }
.vc-icon { font-size: 24px; margin-bottom: 6px; }
.vc-num { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: #3b82f6; line-height: 1; }
.vc-label { font-size: 12px; color: #64748b; margin-top: 2px; }

/* ── FEATURES ───────────────────────────────── */
.features { background: white; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.feature-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; transition: all 0.2s; }
.feature-card:hover { border-color: #bfdbfe; background: white; transform: translateY(-4px); box-shadow: 0 12px 40px rgba(59,130,246,0.1); }
.feature-icon { font-size: 28px; margin-bottom: 14px; }
.feature-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
.feature-desc { font-size: 13px; color: #64748b; margin-bottom: 14px; }
.feature-list { list-style: none; padding: 0; margin: 0; }
.feature-list li { font-size: 13px; color: #475569; padding: 3px 0 3px 14px; position: relative; }
.feature-list li::before { content: '→'; position: absolute; left: 0; color: #3b82f6; font-size: 11px; top: 4px; }

/* ── PLANES ─────────────────────────────────── */
.planes { background: #0f172a; }
.planes .section-tag { color: #60a5fa; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
.planes .section-title { color: white; }
.planes .section-desc { color: #94a3b8; }
.planes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.plan-card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; position: relative; transition: all 0.2s; }
.plan-card.popular { background: white; border-color: transparent; box-shadow: 0 0 0 2px #3b82f6, 0 20px 60px rgba(59,130,246,0.25); }
.popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; font-size: 11px; font-weight: 600; padding: 4px 14px; border-radius: 100px; white-space: nowrap; }
.plan-nombre { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #f1f5f9; margin-bottom: 12px; }
.plan-card.popular .plan-nombre { color: #0f172a; }
.plan-precio { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.plan-moneda { font-size: 18px; color: #3b82f6; font-weight: 600; }
.plan-monto { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #f1f5f9; }
.plan-card.popular .plan-monto { color: #0f172a; }
.plan-periodo { font-size: 14px; color: #64748b; }
.plan-desc { font-size: 13px; color: #64748b; margin-bottom: 24px; }
.plan-features { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 10px; }
.plan-feature { font-size: 14px; color: #94a3b8; display: flex; gap: 10px; }
.plan-card.popular .plan-feature { color: #475569; }
.plan-feature-locked { opacity: 0.35; }
.check { color: #22c55e; font-weight: 700; flex-shrink: 0; }
.check-no { color: #ef4444; font-weight: 700; flex-shrink: 0; }
.plan-btn { width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1.5px solid #334155; color: #94a3b8; background: transparent; transition: all 0.2s; }
.plan-btn:hover { border-color: #3b82f6; color: #3b82f6; }
.plan-btn-popular { background: #3b82f6; border-color: #3b82f6; color: white; }
.plan-btn-popular:hover { background: #2563eb; }

/* ── CONTRATAR / LOGIN FORMS ────────────────── */
.contratar, .login-section { background: #f8fafc; }
.contratar-grid, .login-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
.pasos { display: flex; flex-direction: column; gap: 20px; margin-top: 36px; }
.paso { display: flex; align-items: flex-start; gap: 16px; }
.paso-num { width: 32px; height: 32px; background: #1e40af; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.paso-title { font-weight: 600; color: #0f172a; font-size: 15px; margin-bottom: 2px; }
.paso-desc { font-size: 13px; color: #64748b; }
.login-features { display: flex; flex-direction: column; gap: 12px; margin-top: 28px; }
.lf-item { font-size: 14px; color: #475569; display: flex; gap: 10px; align-items: center; }
.lf-check { color: #3b82f6; font-weight: 700; }
.card-form { background: white; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.08); padding: 36px; }
.form-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
.form-fields { display: flex; flex-direction: column; gap: 18px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-label { font-size: 13px; font-weight: 500; color: #475569; }
.field-input { width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; color: #0f172a; background: #f8fafc; outline: none; transition: border-color 0.2s; box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
.field-input:focus { border-color: #3b82f6; background: white; }
.field-hint { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.pass-wrap { position: relative; }
.pass-wrap .field-input { padding-right: 44px; }
.pass-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; }
.submit-btn { width: 100%; padding: 13px; background: #1e40af; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.submit-btn:hover:not(:disabled) { background: #1d3a9e; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(30,64,175,0.3); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.login-link { text-align: center; font-size: 13px; color: #64748b; margin-top: 14px; }
.login-link a { color: #3b82f6; font-weight: 500; text-decoration: none; }
.error-msg { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13px; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
.success-msg { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 14px; border-radius: 12px; padding: 16px; text-align: center; }

/* ── FOOTER ─────────────────────────────────── */
.footer { background: #0f172a; color: #94a3b8; }
.footer-top { display: grid; grid-template-columns: 1fr 2fr; gap: 60px; padding: 60px 0 40px; }
.footer-brand .logo { color: white; margin-bottom: 12px; text-decoration: none; display: flex; }
.footer-desc { font-size: 14px; line-height: 1.6; }
.footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.footer-col-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: white; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.08em; }
.footer-link { display: block; font-size: 14px; color: #64748b; text-decoration: none; margin-bottom: 8px; transition: color 0.2s; cursor: pointer; }
.footer-link:hover { color: #3b82f6; }
.footer-bottom { border-top: 1px solid #1e293b; padding: 20px 0; font-size: 13px; text-align: center; }

/* ── RESPONSIVE ─────────────────────────────── */
@media (max-width: 1024px) {
  .device-mobile { right: -20px; }
}
@media (max-width: 900px) {
  .hero { flex-direction: column; padding-top: 100px; min-height: auto; padding-bottom: 60px; }
  .hero-content { flex: none; width: 100%; }
  .hero-visual { width: 100%; height: 280px; }
  .device-tablet { right: 0; }
  .device-mobile { right: -30px; bottom: -10px; }
  .nosotros-grid, .contratar-grid, .login-grid { grid-template-columns: 1fr; gap: 40px; }
  .features-grid { grid-template-columns: 1fr 1fr; }
  .planes-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
  .nosotros-visual { height: 280px; }
  .footer-top { grid-template-columns: 1fr; gap: 32px; }
  .nav-links { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; flex-direction: column; align-items: center; justify-content: center; gap: 24px; z-index: 99; }
  .nav-links.open { display: flex; }
  .nav-links a { font-size: 20px; }
  .hamburger { display: flex; z-index: 100; }
}
@media (max-width: 600px) {
  .features-grid { grid-template-columns: 1fr; }
  .field-row { grid-template-columns: 1fr; }
  .hero-actions { flex-direction: column; }
  .btn-hero-primary, .btn-hero-secondary { width: 100%; }
  .section { padding: 64px 0; }
  .stats-grid { gap: 0; }
}
</style>

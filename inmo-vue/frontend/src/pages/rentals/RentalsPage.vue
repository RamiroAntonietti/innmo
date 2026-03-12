<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText :size="24" class="text-primary-500" /> Alquileres
        </h1>
        <select v-model="filtroEstado" @change="fetchContratos" class="input w-auto min-w-[140px] py-2 text-sm">
          <option value="">Todos</option>
          <option value="ACTIVO,ATRASADO">Activos</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="ANULADO">Anulados</option>
        </select>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nuevo contrato
      </button>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-4">
      <div v-for="c in contratos" :key="c.id" class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="font-mono text-xs text-gray-500 mb-0.5">{{ c.codigo || '—' }}</p>
            <p class="font-semibold text-gray-900">{{ c.propiedad?.titulo }}</p>
            <p class="text-sm text-gray-500">{{ c.propiedad?.direccion }}</p>
          </div>
          <span :class="estadoClass(c.estado)">{{ c.estado }}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div><p class="text-xs text-gray-400">Inquilino</p><p class="font-medium">{{ c.inquilino?.nombre }} {{ c.inquilino?.apellido }}</p></div>
          <div><p class="text-xs text-gray-400">Monto mensual</p><p class="font-bold text-primary-600">${{ formatMonto(c.montoMensual) }}</p></div>
          <div><p class="text-xs text-gray-400">Vigencia</p><p class="font-medium text-gray-700">{{ formatFecha(c.fechaInicio) }} — {{ formatFecha(c.fechaFin) }}</p></div>
          <div v-if="c.tipoAjuste"><p class="text-xs text-gray-400">Ajuste</p><p class="font-medium text-blue-600">{{ c.tipoAjuste }} c/{{ c.frecuenciaAjuste }}m</p></div>
          <div v-if="c.deposito && Number(c.deposito) > 0"><p class="text-xs text-gray-400">Depósito</p><p class="font-medium">${{ formatMonto(c.deposito) }} <span :class="c.depositoEstado === 'DEVUELTO' ? 'text-green-600' : c.depositoEstado === 'RETENIDO' ? 'text-amber-600' : 'text-gray-500'" class="text-xs">({{ depositoEstadoLabel(c.depositoEstado) }})</span></p></div>
        </div>
        <div class="flex gap-2 flex-wrap items-center">
          <button v-if="c.estado !== 'ANULADO'" @click="openPago(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-green-600">
            <DollarSign :size="12" /> Registrar pago
          </button>
          <button v-if="c.estado !== 'ANULADO'" @click="abrirAjuste(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <TrendingUp :size="12" /> Ajuste
          </button>
          <button @click="verPagos(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <List :size="12" /> Ver pagos
          </button>
          <button v-if="c.deposito && Number(c.deposito) > 0 && (c.depositoEstado === 'PENDIENTE' || !c.depositoEstado)" @click="abrirDeposito(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-600">
            <Shield :size="12" /> Depósito
          </button>
          <button v-if="c.estado !== 'ANULADO' && (c.estado === 'FINALIZADO' || puedeRenovar(c))" @click="abrirRenovar(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-600">
            <RefreshCw :size="12" /> Renovar
          </button>
          <button v-if="isAdmin && c.estado !== 'ANULADO'" @click="anularContrato(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-500 ml-auto">
            <Ban :size="12" /> Anular
          </button>
        </div>
      </div>
      <div v-if="!contratos.length" class="text-center py-12 text-gray-400">No hay contratos</div>
    </div>

    <!-- Modal nuevo contrato -->
    <div v-if="modalContrato" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nuevo contrato</h2>
          <button @click="modalContrato = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardarContrato" class="space-y-4">
          <div>
            <label class="label">Propiedad</label>
            <select v-model="formContrato.propiedadId" class="input" required>
              <option value="">Seleccionar propiedad</option>
              <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }} — {{ p.direccion }}{{ p.estado === 'RESERVADO' ? ' (reservada)' : '' }}</option>
            </select>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="label mb-0">Inquilino</label>
              <button type="button" @click="modalNuevoCliente = true" class="text-xs text-primary-500 hover:underline flex items-center gap-1">
                <UserPlus :size="12" /> Agregar cliente
              </button>
            </div>
            <select v-model="formContrato.inquilinoId" class="input" required>
              <option value="">Seleccionar inquilino</option>
              <option v-for="c in clientesInquilinos" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Fecha inicio</label><input v-model="formContrato.fechaInicio" type="date" class="input" required /></div>
            <div><label class="label">Fecha fin</label><input v-model="formContrato.fechaFin" type="date" class="input" required /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Monto mensual</label><input v-model.number="formContrato.montoMensual" type="number" min="0" class="input" required /></div>
            <div><label class="label">Depósito / garantía <span class="text-gray-400 font-normal">(opcional)</span></label><input v-model.number="formContrato.deposito" type="number" min="0" step="0.01" class="input" placeholder="0" /></div>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalContrato = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Crear contrato' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal rápido nuevo cliente -->
    <div v-if="modalNuevoCliente" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nuevo inquilino</h2>
          <button @click="modalNuevoCliente = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="crearClienteRapido" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Nombre</label><input v-model="formCliente.nombre" class="input" required /></div>
            <div><label class="label">Apellido</label><input v-model="formCliente.apellido" class="input" required /></div>
          </div>
          <div><label class="label">Email</label><input v-model="formCliente.email" type="email" class="input" /></div>
          <div><label class="label">Teléfono</label><input v-model="formCliente.telefono" class="input" /></div>
          <p v-if="errorCliente" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorCliente }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalNuevoCliente = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="savingCliente" class="btn-primary flex-1">{{ savingCliente ? 'Creando...' : 'Crear y seleccionar' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal credenciales portal (tras crear contrato) -->
    <div v-if="modalCredenciales" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-green-700 flex items-center gap-2">
            <Key :size="20" /> Acceso al portal creado
          </h2>
          <button @click="modalCredenciales = false; credencialesPortal = null" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <p class="text-sm text-gray-600 mb-4">Se generó acceso al portal para el inquilino. Guardá estas credenciales para ingresar como él:</p>
        <div class="bg-gray-50 rounded-xl p-4 space-y-2 font-mono text-sm">
          <p><span class="text-gray-500">Email:</span> <strong class="text-gray-900">{{ credencialesPortal?.email }}</strong></p>
          <p><span class="text-gray-500">Contraseña:</span> <strong class="text-primary-600 text-lg">{{ credencialesPortal?.password }}</strong></p>
        </div>
        <a href="/portal" target="_blank" class="btn-primary w-full mt-4 flex items-center justify-center gap-2">
          Abrir portal
        </a>
      </div>
    </div>

    <!-- Modal Ver pagos -->
    <div v-if="modalPagos" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-lg p-6 max-h-[85vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Historial de pagos — {{ contratoPagos?.propiedad?.titulo }}</h2>
          <button @click="modalPagos = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="loadingPagos" class="text-center py-8 text-gray-400">Cargando...</div>
        <div v-else class="overflow-y-auto flex-1 space-y-2">
          <div v-for="p in pagosContrato" :key="p.id" class="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 text-sm">
            <div>
              <span class="font-mono text-xs text-gray-500">{{ p.codigo || '—' }}</span>
              <p class="font-medium">{{ formatFecha(p.fechaPago || p.fechaVence) }} · {{ p.estado }}</p>
              <p v-if="p.formaPago" class="text-xs text-gray-500">{{ p.formaPago }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold">${{ formatMonto(p.montoPagado ?? p.monto) }}</p>
              <span :class="p.estado === 'PAGADO' ? 'badge-green' : p.estado === 'ATRASADO' ? 'badge-red' : 'badge-yellow'" class="text-xs">{{ p.estado }}</span>
            </div>
          </div>
          <p v-if="!pagosContrato.length" class="text-center py-8 text-gray-400">No hay pagos registrados</p>
        </div>
        <button @click="modalPagos = false" class="btn-secondary w-full mt-4">Cerrar</button>
      </div>
    </div>

    <!-- Modal Ajuste -->
    <div v-if="modalAjuste" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Ajuste de alquiler</h2>
          <button @click="cerrarModalAjuste" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="contratoAjuste" class="space-y-4">
          <p class="text-sm text-gray-600">{{ contratoAjuste.propiedad?.titulo }}</p>
          <p class="text-lg font-bold text-primary-600">Monto actual: ${{ formatMonto(contratoAjuste.montoMensual) }}/mes</p>

          <div v-if="contratoAjuste.tipoAjuste">
            <p class="text-sm text-green-600 font-medium">Ajuste configurado: {{ contratoAjuste.tipoAjuste }} cada {{ contratoAjuste.frecuenciaAjuste }} meses</p>
            <p v-if="contratoAjuste.proximoAjuste" class="text-xs text-gray-500">Próximo: {{ formatFecha(contratoAjuste.proximoAjuste) }}</p>
            <div v-if="previewAjuste" class="mt-4 p-4 bg-blue-50 rounded-xl text-sm">
              <p class="font-medium text-blue-800">Vista previa</p>
              <p>Nuevo monto: ${{ formatMonto(previewAjuste.montoNuevo) }}</p>
              <p class="text-xs text-blue-600">{{ previewAjuste.detalle }}</p>
              <button @click="ejecutarAjuste" :disabled="savingAjuste" class="btn-primary w-full mt-3">
                {{ savingAjuste ? 'Procesando...' : 'Aplicar ajuste' }}
              </button>
            </div>
            <div v-else class="flex gap-2 mt-4">
              <button @click="cargarPreviewAjuste" :disabled="loadingPreview" class="btn-primary flex-1">
                {{ loadingPreview ? '...' : 'Ver preview' }}
              </button>
              <button @click="cerrarModalAjuste" class="btn-secondary flex-1">Cerrar</button>
            </div>
          </div>
          <div v-else>
            <form @submit.prevent="configurarAjuste" class="space-y-4">
              <div>
                <label class="label">Tipo de ajuste</label>
                <select v-model="formAjuste.tipoAjuste" class="input" required>
                  <option value="IPC">IPC (índice oficial)</option>
                  <option value="FIJO">Porcentaje fijo</option>
                </select>
              </div>
              <div>
                <label class="label">Cada cuántos meses</label>
                <input v-model.number="formAjuste.frecuenciaAjuste" type="number" min="1" max="24" class="input" required />
              </div>
              <div v-if="formAjuste.tipoAjuste === 'FIJO'">
                <label class="label">Porcentaje (%)</label>
                <input v-model.number="formAjuste.porcentajeAjuste" type="number" min="0" step="0.01" class="input" required />
              </div>
              <p v-if="errorAjuste" class="text-sm text-red-600">{{ errorAjuste }}</p>
              <div class="flex gap-2">
                <button type="button" @click="cerrarModalAjuste" class="btn-secondary flex-1">Cancelar</button>
                <button type="submit" :disabled="savingAjuste" class="btn-primary flex-1">{{ savingAjuste ? 'Guardando...' : 'Configurar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal renovar -->
    <div v-if="modalRenovar" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Renovar contrato</h2>
          <button @click="modalRenovar = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="contratoRenovar" class="space-y-4">
          <p class="text-sm text-gray-600">{{ contratoRenovar.propiedad?.titulo }} — {{ contratoRenovar.inquilino?.nombre }} {{ contratoRenovar.inquilino?.apellido }}</p>
          <p class="text-sm text-gray-500">Se creará un nuevo contrato con el mismo inquilino y propiedad. El actual quedará finalizado.</p>
          <form @submit.prevent="registrarRenovacion" class="space-y-4">
            <div>
              <label class="label">Nueva fecha fin</label>
              <input v-model="formRenovar.fechaFin" type="date" class="input" required />
            </div>
            <div>
              <label class="label">Monto mensual</label>
              <input v-model.number="formRenovar.montoMensual" type="number" min="0" step="0.01" class="input" required />
            </div>
            <div>
              <label class="label">Depósito <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input v-model.number="formRenovar.deposito" type="number" min="0" step="0.01" class="input" placeholder="Igual al anterior o vacío" />
            </div>
            <p v-if="errorRenovar" class="text-sm text-red-600">{{ errorRenovar }}</p>
            <div class="flex gap-2">
              <button type="button" @click="modalRenovar = false" class="btn-secondary flex-1">Cancelar</button>
              <button type="submit" :disabled="savingRenovar" class="btn-primary flex-1">{{ savingRenovar ? 'Renovando...' : 'Renovar contrato' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal depósito -->
    <div v-if="modalDeposito" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Depósito / garantía</h2>
          <button @click="modalDeposito = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="contratoDeposito" class="space-y-4">
          <p class="text-sm text-gray-600">{{ contratoDeposito.propiedad?.titulo }}</p>
          <p class="text-lg font-bold text-primary-600">${{ formatMonto(contratoDeposito.deposito) }}</p>
          <p class="text-sm text-gray-500">Registrar devolución o retención del depósito.</p>
          <form @submit.prevent="registrarDeposito" class="space-y-4">
            <div>
              <label class="label">Acción</label>
              <select v-model="formDeposito.accion" class="input" required>
                <option value="DEVUELTO">Devuelto al inquilino</option>
                <option value="RETENIDO">Retenido</option>
              </select>
            </div>
            <div v-if="formDeposito.accion === 'RETENIDO'">
              <label class="label">Motivo (opcional)</label>
              <textarea v-model="formDeposito.notas" rows="2" class="input w-full resize-none" placeholder="Ej: daños en la propiedad" />
            </div>
            <p v-if="errorDeposito" class="text-sm text-red-600">{{ errorDeposito }}</p>
            <div class="flex gap-2">
              <button type="button" @click="modalDeposito = false" class="btn-secondary flex-1">Cancelar</button>
              <button type="submit" :disabled="savingDeposito" class="btn-primary flex-1">{{ savingDeposito ? 'Guardando...' : 'Registrar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal pago -->
    <div v-if="modalPago" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Registrar pago</h2>
          <button @click="modalPago = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p class="text-gray-600">{{ contratoSeleccionado?.propiedad?.titulo }}</p>
          <p class="font-bold text-primary-600 text-lg">${{ formatMonto(contratoSeleccionado?.montoMensual) }}</p>
        </div>
        <form @submit.prevent="registrarPago" class="space-y-4">
          <div>
            <label class="label">Tipo de pago</label>
            <div class="flex gap-2">
              <button type="button" @click="formPago.tipoPago = 'COMPLETO'" :class="formPago.tipoPago === 'COMPLETO' ? 'btn-primary' : 'btn-secondary'" class="flex-1 text-sm py-2">Completo</button>
              <button type="button" @click="formPago.tipoPago = 'PARCIAL'" :class="formPago.tipoPago === 'PARCIAL' ? 'btn-primary' : 'btn-secondary'" class="flex-1 text-sm py-2">Parcial</button>
            </div>
          </div>
          <div><label class="label">Monto</label><input v-model.number="formPago.monto" type="number" min="0" class="input" required /></div>
          <div v-if="formPago.tipoPago === 'PARCIAL'"><label class="label">Monto pagado</label><input v-model.number="formPago.montoPagado" type="number" min="0" class="input" required /></div>
          <div><label class="label">Fecha de pago</label><input v-model="formPago.fechaPago" type="date" class="input" required /></div>
          <div>
            <label class="label">Forma de pago</label>
            <select v-model="formPago.formaPago" class="input">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalPago = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Registrando...' : 'Registrar pago' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { FileText, Plus, DollarSign, TrendingUp, List, X, Ban, UserPlus, Key, Shield, RefreshCw } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const route = useRoute();

const { isAdmin } = useAuthStore();
const contratos = ref([]);
const propiedades = ref([]);
const clientesInquilinos = ref([]);
const loading = ref(true);
const modalContrato = ref(false);
const modalPago = ref(false);
const modalNuevoCliente = ref(false);
const saving = ref(false);
const savingCliente = ref(false);
const formError = ref('');
const errorCliente = ref('');
const contratoSeleccionado = ref(null);

const formContrato = ref({ propiedadId: '', inquilinoId: '', fechaInicio: '', fechaFin: '', montoMensual: 0, deposito: null });
const formPago = ref({ monto: 0, montoPagado: 0, fechaPago: new Date().toISOString().split('T')[0], formaPago: 'EFECTIVO', tipoPago: 'COMPLETO' });
const formCliente = ref({ nombre: '', apellido: '', email: '', telefono: '' });

const estadoClass = (e) => ({ ACTIVO: 'badge-green', FINALIZADO: 'badge-gray', ATRASADO: 'badge-red', ANULADO: 'badge-gray' }[e] || 'badge-gray');
const depositoEstadoLabel = (e) => ({ PENDIENTE: 'pendiente', DEVUELTO: 'devuelto', RETENIDO: 'retenido' }[e] || '—');
const puedeRenovar = (c) => {
  if (c.estado !== 'ACTIVO' && c.estado !== 'ATRASADO') return false;
  const fin = new Date(c.fechaFin);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diasParaVencer = Math.floor((fin - hoy) / 86400000);
  return diasParaVencer <= 60;
};
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const filtroEstado = ref('');

const fetchContratos = async () => {
  loading.value = true;
  try {
    const params = filtroEstado.value ? { estado: filtroEstado.value, limit: 500 } : { limit: 500 };
    const { data } = await api.get('/rentals', { params });
    const d = data.data || data;
    contratos.value = d.data || d;
  } finally { loading.value = false; }
};

const openModal = async () => {
  const [props, clients] = await Promise.all([
    api.get('/properties', { params: { estado: 'DISPONIBLE,RESERVADO' } }),
    api.get('/clients', { params: { tipo: 'INQUILINO', limit: 200 } }),
  ]);
  const pd = props.data.data || props.data; propiedades.value = pd.data || pd;
  const cd = clients.data.data || clients.data; clientesInquilinos.value = cd.data || cd;
  formContrato.value = { propiedadId: '', inquilinoId: '', fechaInicio: '', fechaFin: '', montoMensual: 0, deposito: null };
  formError.value = '';
  modalContrato.value = true;
};

const modalCredenciales = ref(null);
const credencialesPortal = ref(null);

const guardarContrato = async () => {
  saving.value = true; formError.value = '';
  try {
    const { data } = await api.post('/rentals', formContrato.value);
    modalContrato.value = false;
    fetchContratos();
    if (data?.portalAcceso) {
      credencialesPortal.value = data.portalAcceso;
      modalCredenciales.value = true;
    }
  } catch (e) {
    const msg = e.response?.data?.message;
    formError.value = Array.isArray(msg) ? msg.join(' · ') : (e.response?.data?.error || msg || 'Error al guardar');
  }
  finally { saving.value = false; }
};

const crearClienteRapido = async () => {
  savingCliente.value = true; errorCliente.value = '';
  try {
    const { data } = await api.post('/clients', { ...formCliente.value, tipo: 'INQUILINO', estado: 'ACTIVO' });
    const nuevo = data.data || data;
    clientesInquilinos.value.push(nuevo);
    formContrato.value.inquilinoId = nuevo.id;
    modalNuevoCliente.value = false;
    formCliente.value = { nombre: '', apellido: '', email: '', telefono: '' };
  } catch (e) { errorCliente.value = e.response?.data?.error || 'Error al crear cliente'; }
  finally { savingCliente.value = false; }
};

const openPago = (c) => {
  contratoSeleccionado.value = c;
  formPago.value = { monto: parseFloat(c.montoMensual), montoPagado: 0, fechaPago: new Date().toISOString().split('T')[0], formaPago: 'EFECTIVO', tipoPago: 'COMPLETO' };
  formError.value = '';
  modalPago.value = true;
};

const registrarPago = async () => {
  saving.value = true; formError.value = '';
  try {
    await api.post(`/rentals/${contratoSeleccionado.value.id}/payments`, formPago.value);
    modalPago.value = false;
    fetchContratos();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al registrar pago'; }
  finally { saving.value = false; }
};

const anularContrato = async (c) => {
  if (!confirm(`¿Anular el contrato de "${c.propiedad?.titulo}"?\nEsta acción no se puede deshacer.`)) return;
  await api.post(`/rentals/${c.id}/anular`);
  fetchContratos();
};

const modalPagos = ref(false);
const contratoPagos = ref(null);
const pagosContrato = ref([]);
const loadingPagos = ref(false);

const verPagos = async (c) => {
  contratoPagos.value = c;
  modalPagos.value = true;
  loadingPagos.value = true;
  pagosContrato.value = [];
  try {
    const { data } = await api.get(`/rentals/${c.id}/payments`);
    pagosContrato.value = data ?? [];
  } catch (e) {
    pagosContrato.value = [];
  } finally {
    loadingPagos.value = false;
  }
};

const modalAjuste = ref(false);
const contratoAjuste = ref(null);
const previewAjuste = ref(null);
const loadingPreview = ref(false);
const savingAjuste = ref(false);
const errorAjuste = ref('');
const formAjuste = ref({ tipoAjuste: 'IPC', frecuenciaAjuste: 3, porcentajeAjuste: null });

const abrirAjuste = (c) => {
  contratoAjuste.value = c;
  previewAjuste.value = null;
  errorAjuste.value = '';
  formAjuste.value = { tipoAjuste: 'IPC', frecuenciaAjuste: 3, porcentajeAjuste: null };
  modalAjuste.value = true;
};

const cerrarModalAjuste = () => {
  modalAjuste.value = false;
  contratoAjuste.value = null;
  previewAjuste.value = null;
  fetchContratos();
};

const cargarPreviewAjuste = async () => {
  if (!contratoAjuste.value?.id) return;
  loadingPreview.value = true;
  errorAjuste.value = '';
  try {
    const { data } = await api.get(`/contratos/${contratoAjuste.value.id}/ajuste/preview`);
    previewAjuste.value = data;
  } catch (e) {
    errorAjuste.value = e.response?.data?.message || 'Error al obtener preview';
  } finally {
    loadingPreview.value = false;
  }
};

const ejecutarAjuste = async () => {
  if (!contratoAjuste.value?.id) return;
  savingAjuste.value = true;
  errorAjuste.value = '';
  try {
    await api.post(`/contratos/${contratoAjuste.value.id}/ajuste/ejecutar`);
    cerrarModalAjuste();
  } catch (e) {
    errorAjuste.value = e.response?.data?.message || 'Error al aplicar ajuste';
  } finally {
    savingAjuste.value = false;
  }
};

const modalDeposito = ref(false);
const contratoDeposito = ref(null);
const formDeposito = ref({ accion: 'DEVUELTO', notas: '' });
const savingDeposito = ref(false);
const errorDeposito = ref('');

const abrirDeposito = (c) => {
  contratoDeposito.value = c;
  formDeposito.value = { accion: 'DEVUELTO', notas: '' };
  errorDeposito.value = '';
  modalDeposito.value = true;
};

const modalRenovar = ref(false);
const contratoRenovar = ref(null);
const formRenovar = ref({ fechaFin: '', montoMensual: 0, deposito: null });
const savingRenovar = ref(false);
const errorRenovar = ref('');

const abrirRenovar = (c) => {
  contratoRenovar.value = c;
  const fin = new Date(c.fechaFin);
  fin.setMonth(fin.getMonth() + 12);
  formRenovar.value = {
    fechaFin: fin.toISOString().split('T')[0],
    montoMensual: parseFloat(c.montoMensual) || 0,
    deposito: c.deposito ? parseFloat(c.deposito) : null,
  };
  errorRenovar.value = '';
  modalRenovar.value = true;
};

const registrarRenovacion = async () => {
  if (!contratoRenovar.value?.id) return;
  savingRenovar.value = true;
  errorRenovar.value = '';
  try {
    const payload = {
      fechaFin: formRenovar.value.fechaFin,
      montoMensual: formRenovar.value.montoMensual,
    };
    if (formRenovar.value.deposito !== null && formRenovar.value.deposito !== undefined) {
      payload.deposito = Number(formRenovar.value.deposito) || 0;
    }
    await api.post(`/rentals/${contratoRenovar.value.id}/renovar`, payload);
    modalRenovar.value = false;
    contratoRenovar.value = null;
    fetchContratos();
  } catch (e) {
    errorRenovar.value = e.response?.data?.message || 'Error al renovar.';
  } finally {
    savingRenovar.value = false;
  }
};

const registrarDeposito = async () => {
  if (!contratoDeposito.value?.id) return;
  savingDeposito.value = true;
  errorDeposito.value = '';
  try {
    await api.patch(`/rentals/${contratoDeposito.value.id}/deposito/devolver`, formDeposito.value);
    modalDeposito.value = false;
    contratoDeposito.value = null;
    fetchContratos();
  } catch (e) {
    errorDeposito.value = e.response?.data?.message || 'Error al registrar.';
  } finally {
    savingDeposito.value = false;
  }
};

const configurarAjuste = async () => {
  if (!contratoAjuste.value?.id) return;
  if (formAjuste.value.tipoAjuste === 'FIJO' && !formAjuste.value.porcentajeAjuste) {
    errorAjuste.value = 'El porcentaje es requerido para ajuste fijo';
    return;
  }
  savingAjuste.value = true;
  errorAjuste.value = '';
  try {
    const payload = {
      tipoAjuste: formAjuste.value.tipoAjuste,
      frecuenciaAjuste: formAjuste.value.frecuenciaAjuste,
      ...(formAjuste.value.tipoAjuste === 'FIJO' && { porcentajeAjuste: formAjuste.value.porcentajeAjuste }),
    };
    const { data } = await api.post(`/contratos/${contratoAjuste.value.id}/ajuste`, payload);
    contratoAjuste.value = { ...contratoAjuste.value, ...data };
    previewAjuste.value = null;
  } catch (e) {
    errorAjuste.value = e.response?.data?.message || 'Error al configurar';
  } finally {
    savingAjuste.value = false;
  }
};

onMounted(() => {
  const q = route.query.estado;
  if (q === 'activos' || q === 'ACTIVO,ATRASADO') filtroEstado.value = 'ACTIVO,ATRASADO';
  else if (['FINALIZADO', 'ANULADO'].includes(q)) filtroEstado.value = q;
  fetchContratos();
});
</script>

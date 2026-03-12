<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
      <FileSpreadsheet :size="24" class="text-primary-500" /> Migración y Exportación de datos
    </h1>
    <p class="text-gray-500 text-sm mb-6">Importá datos desde Excel o exportá tu base de datos para edición masiva</p>

    <!-- Tabs -->
    <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
      <button v-for="t in tabs" :key="t.key" @click="tab = t.key"
        :class="tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all">
        {{ t.label }}
      </button>
    </div>

    <!-- ═══ TAB: IMPORTACIÓN ═══ -->
    <div v-if="tab === 'importar'">
      <div class="grid grid-cols-4 gap-3 mb-6">
        <button v-for="e in entidades" :key="e.key" @click="entidad = e.key"
          :class="entidad === e.key ? 'ring-2 ring-primary-500 bg-primary-50' : ''"
          class="card p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
          <div class="text-2xl mb-1">{{ e.emoji }}</div>
          <p class="font-semibold text-gray-900 text-sm">{{ e.label }}</p>
        </button>
      </div>

      <!-- Guía de columnas -->
      <div class="card p-5 mb-5 bg-blue-50 border-blue-100">
        <h3 class="font-semibold text-blue-900 flex items-center gap-2 mb-3">
          <Info :size="15" /> Columnas requeridas para <span class="underline">{{ entidadActual?.label }}</span>
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div v-for="col in entidadActual?.columnas" :key="col.nombre"
            class="bg-white rounded-lg px-3 py-2 border border-blue-100">
            <p class="text-xs font-bold text-gray-800 font-mono">{{ col.nombre }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ col.desc }}</p>
            <span v-if="col.requerido" class="text-xs text-red-500">* requerido</span>
            <span v-else class="text-xs text-gray-400">opcional</span>
          </div>
        </div>
        <button @click="descargarPlantilla" class="btn-secondary text-xs mt-3 flex items-center gap-1.5">
          <Download :size="12" /> Descargar plantilla vacía
        </button>
      </div>

      <!-- Zona de carga -->
      <div class="card p-6 mb-5">
        <div class="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-primary-300 transition-colors"
          @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="onDrop">
          <Upload :size="32" class="text-gray-300 mx-auto mb-3" />
          <p class="text-sm font-medium text-gray-600">Arrastrá un archivo Excel o hacé click para seleccionar</p>
          <p class="text-xs text-gray-400 mt-1">.xlsx, .xls</p>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onFile" />
        </div>
      </div>

      <!-- Preview -->
      <div v-if="preview.length" class="card p-5 mb-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">Vista previa (primeras 3 filas)</p>
        <div class="overflow-x-auto">
          <table class="text-xs w-full">
            <thead><tr class="bg-gray-50">
              <th v-for="h in previewHeaders" :key="h" class="px-3 py-2 text-left font-medium text-gray-500">{{ h }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="(row, i) in preview" :key="i" class="border-t border-gray-50">
                <td v-for="h in previewHeaders" :key="h" class="px-3 py-2 text-gray-700">{{ row[h] || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="importar" :disabled="importing" class="btn-primary mt-4 flex items-center gap-2">
          <CheckCircle2 :size="16" />
          {{ importing ? 'Importando...' : `Importar ${rows.length} registros` }}
        </button>
      </div>

      <!-- Resultado -->
      <div v-if="resultado" class="card p-5">
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center"><p class="text-2xl font-bold text-gray-900">{{ resultado.total }}</p><p class="text-xs text-gray-500">Total</p></div>
          <div class="text-center"><p class="text-2xl font-bold text-green-600">{{ resultado.exitosos }}</p><p class="text-xs text-gray-500">Exitosos</p></div>
          <div class="text-center"><p class="text-2xl font-bold text-red-500">{{ resultado.fallidos }}</p><p class="text-xs text-gray-500">Fallidos</p></div>
        </div>
        <div v-if="resultado.errores?.length" class="mt-3">
          <p class="text-sm font-medium text-gray-700 mb-2">Errores:</p>
          <div v-for="e in resultado.errores" :key="e.fila" class="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5 mb-1">
            Fila {{ e.fila }}: {{ e.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: EXPORTACIÓN ═══ -->
    <div v-if="tab === 'exportar'">
      <p class="text-gray-600 text-sm mb-5">Exportá tu base de datos completa en Excel para edición masiva. Los archivos se pueden reimportar luego.</p>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div v-for="exp in exportaciones" :key="exp.key" class="card p-5 hover:shadow-md transition-shadow">
          <div class="text-3xl mb-3">{{ exp.emoji }}</div>
          <h3 class="font-semibold text-gray-900 mb-1">{{ exp.label }}</h3>
          <p class="text-xs text-gray-500 mb-4">{{ exp.desc }}</p>
          <button @click="exportar(exp)" :disabled="exportando === exp.key"
            class="btn-primary w-full text-sm flex items-center justify-center gap-2">
            <Download :size="14" />
            {{ exportando === exp.key ? 'Generando...' : 'Exportar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { FileSpreadsheet, Upload, CheckCircle2, Download, Info } from 'lucide-vue-next';
import * as XLSX from 'xlsx';
import api from '../../services/api.js';

const tab = ref('importar');
const entidad = ref('clientes');
const preview = ref([]);
const previewHeaders = ref([]);
const rows = ref([]);
const importing = ref(false);
const exportando = ref('');
const resultado = ref(null);

const tabs = [
  { key: 'importar', label: '📥 Importar desde Excel' },
  { key: 'exportar', label: '📤 Exportar a Excel' },
];

const entidades = [
  {
    key: 'clientes', label: 'Clientes', emoji: '👥',
    columnas: [
      { nombre: 'nombre', desc: 'Nombre del cliente', requerido: true },
      { nombre: 'apellido', desc: 'Apellido', requerido: true },
      { nombre: 'email', desc: 'Correo electrónico', requerido: false },
      { nombre: 'telefono', desc: 'Número de teléfono', requerido: false },
      { nombre: 'tipo', desc: 'INQUILINO o PROPIETARIO', requerido: true },
      { nombre: 'estado', desc: 'ACTIVO, INACTIVO, PROSPECTO o CERRADO', requerido: false },
      { nombre: 'dni', desc: 'Documento de identidad', requerido: false },
      { nombre: 'direccion', desc: 'Dirección del cliente', requerido: false },
    ]
  },
  {
    key: 'propiedades', label: 'Propiedades', emoji: '🏠',
    columnas: [
      { nombre: 'titulo', desc: 'Nombre o título de la propiedad', requerido: true },
      { nombre: 'direccion', desc: 'Dirección completa', requerido: true },
      { nombre: 'ciudad', desc: 'Ciudad', requerido: true },
      { nombre: 'precio', desc: 'Precio numérico (sin $)', requerido: true },
      { nombre: 'tipoOperacion', desc: 'ALQUILER o VENTA', requerido: true },
      { nombre: 'estado', desc: 'DISPONIBLE, RESERVADO, ALQUILADO, VENDIDO', requerido: false },
      { nombre: 'dormitorios', desc: 'Cantidad de dormitorios', requerido: false },
      { nombre: 'banos', desc: 'Cantidad de baños', requerido: false },
      { nombre: 'metrosCuadrados', desc: 'Superficie en m²', requerido: false },
      { nombre: 'descripcion', desc: 'Descripción de la propiedad', requerido: false },
    ]
  },
  {
    key: 'contratos', label: 'Contratos', emoji: '📄',
    columnas: [
      { nombre: 'propiedadId', desc: 'ID de la propiedad (del sistema)', requerido: true },
      { nombre: 'inquilinoId', desc: 'ID del inquilino (del sistema)', requerido: true },
      { nombre: 'fechaInicio', desc: 'Fecha inicio (YYYY-MM-DD)', requerido: true },
      { nombre: 'fechaFin', desc: 'Fecha fin (YYYY-MM-DD)', requerido: true },
      { nombre: 'montoMensual', desc: 'Monto mensual numérico', requerido: true },
      { nombre: 'tipoAjuste', desc: 'IPC, FIJO o dejar vacío', requerido: false },
      { nombre: 'frecuenciaAjuste', desc: 'Meses entre ajustes (ej: 3)', requerido: false },
    ]
  },
  {
    key: 'gastos', label: 'Gastos', emoji: '💸',
    columnas: [
      { nombre: 'propiedadId', desc: 'ID de la propiedad', requerido: true },
      { nombre: 'tipo', desc: 'REPARACION, IMPUESTO, EXPENSA, SEGURO, SERVICIO, HONORARIO, OTRO', requerido: true },
      { nombre: 'descripcion', desc: 'Descripción del gasto', requerido: true },
      { nombre: 'monto', desc: 'Monto numérico', requerido: true },
      { nombre: 'fecha', desc: 'Fecha (YYYY-MM-DD)', requerido: true },
      { nombre: 'pagadoPor', desc: 'PROPIETARIO o INMOBILIARIA', requerido: false },
    ]
  },
];

const entidadActual = computed(() => entidades.find(e => e.key === entidad.value));

const ENDPOINT_MAP = {
  clientes: '/clients',
  propiedades: '/properties',
  contratos: '/rentals',
  gastos: '/gastos',
};

const exportaciones = [
  { key: 'clientes', label: 'Clientes', emoji: '👥', desc: 'Todos los clientes (propietarios e inquilinos)', endpoint: '/clients', params: { limit: 5000 } },
  { key: 'propiedades', label: 'Propiedades', emoji: '🏠', desc: 'Catálogo completo de propiedades', endpoint: '/properties', params: { limit: 5000 } },
  { key: 'contratos', label: 'Contratos', emoji: '📄', desc: 'Contratos de alquiler activos e históricos', endpoint: '/rentals', params: { limit: 5000 } },
  { key: 'gastos', label: 'Gastos', emoji: '💸', desc: 'Historial de gastos por propiedad', endpoint: '/gastos', params: { limit: 5000 } },
  { key: 'tareas', label: 'Tareas', emoji: '✅', desc: 'Todas tus tareas y recordatorios', endpoint: '/tareas', params: {} },
  { key: 'facturas', label: 'Servicios por propiedad', emoji: '⚡', desc: 'Luz, gas, expensas y otros servicios de la propiedad', endpoint: '/facturas', params: {} },
];

const descargarPlantilla = () => {
  const cols = entidadActual.value.columnas;
  const headers = cols.map(c => c.nombre);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // Style header row
  headers.forEach((h, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cell]) ws[cell] = {};
    ws[cell].s = { font: { bold: true } };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entidadActual.value.label);
  XLSX.writeFile(wb, `plantilla_${entidad.value}.xlsx`);
};

const processFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    rows.value = data;
    previewHeaders.value = data.length ? Object.keys(data[0]) : [];
    preview.value = data.slice(0, 3);
    resultado.value = null;
  };
  reader.readAsBinaryString(file);
};

const onFile = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };
const onDrop = (e) => { if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };

const importar = async () => {
  const endpoint = ENDPOINT_MAP[entidad.value];
  if (!endpoint) { alert('Importación no soportada para esta entidad'); return; }
  importing.value = true;
  resultado.value = null;
  let exitosos = 0, fallidos = 0, errores = [];

  for (let i = 0; i < rows.value.length; i++) {
    try {
      await api.post(endpoint, rows.value[i]);
      exitosos++;
    } catch (e) {
      fallidos++;
      errores.push({ fila: i + 2, error: e.response?.data?.error || e.message });
    }
  }
  resultado.value = { total: rows.value.length, exitosos, fallidos, errores };
  importing.value = false;
};

const exportar = async (exp) => {
  exportando.value = exp.key;
  try {
    const { data } = await api.get(exp.endpoint, { params: exp.params });
    const d = data.data || data;
    let registros = d.data || d;
    if (!Array.isArray(registros)) registros = [registros];

    // Flatten nested objects; poner codigo primero cuando exista (referencia legible)
    const flat = registros.map(r => {
      const row = {};
      Object.entries(r).forEach(([k, v]) => {
        if (v === null || v === undefined) row[k] = '';
        else if (typeof v === 'object' && !Array.isArray(v)) {
          Object.entries(v).forEach(([k2, v2]) => { if (typeof v2 !== 'object') row[`${k}_${k2}`] = v2; });
        } else if (!Array.isArray(v)) row[k] = v;
      });
      if (row.codigo !== undefined && row.codigo !== '') {
        const { codigo, ...rest } = row;
        return { codigo, ...rest };
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exp.label);
    XLSX.writeFile(wb, `export_${exp.key}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (e) {
    alert('Error al exportar: ' + (e.response?.data?.error || e.message));
  } finally {
    exportando.value = '';
  }
};
</script>

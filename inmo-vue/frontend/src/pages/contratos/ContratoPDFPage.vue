<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText :size="24" class="text-primary-500" /> Contratos PDF
        </h1>
        <p class="text-gray-500 text-sm mt-1">Generá contratos de alquiler listos para imprimir</p>
      </div>
    </div>

    <!-- Selector de contrato -->
    <div class="card p-5 mb-6">
      <label class="label">Seleccioná un contrato de alquiler</label>
      <div class="flex gap-3">
        <select v-model="contratoId" @change="cargarContrato" class="input flex-1">
          <option value="">Seleccionar contrato...</option>
          <option v-for="c in contratos" :key="c.id" :value="c.id">
            {{ c.propiedad?.titulo }} — {{ c.inquilino?.nombre }} {{ c.inquilino?.apellido }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loadingContrato" class="text-center py-12 text-gray-400">Cargando datos del contrato...</div>

    <div v-else-if="contrato" class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Editor del contrato -->
      <div class="space-y-4">
        <div class="card p-5">
          <h2 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Edit3 :size="14" /> Datos del contrato
          </h2>
          <div class="space-y-3">
            <div>
              <label class="label">Título del documento</label>
              <input v-model="doc.titulo" class="input" />
            </div>
            <div>
              <label class="label">Lugar y fecha</label>
              <input v-model="doc.lugarFecha" class="input" />
            </div>
            <div>
              <label class="label">Cláusula introductoria</label>
              <textarea v-model="doc.intro" class="input h-24 resize-none text-sm" />
            </div>
            <div>
              <label class="label">Objeto del contrato</label>
              <textarea v-model="doc.objeto" class="input h-20 resize-none text-sm" />
            </div>
            <div>
              <label class="label">Precio y forma de pago</label>
              <textarea v-model="doc.precio" class="input h-20 resize-none text-sm" />
            </div>
            <div>
              <label class="label">Cláusula de ajuste</label>
              <textarea v-model="doc.ajuste" class="input h-20 resize-none text-sm" />
            </div>
            <div>
              <label class="label">Obligaciones del locatario</label>
              <textarea v-model="doc.obligaciones" class="input h-24 resize-none text-sm" />
            </div>
            <div>
              <label class="label">Cláusulas adicionales</label>
              <textarea v-model="doc.adicionales" class="input h-24 resize-none text-sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Preview y acciones -->
      <div class="space-y-4">

        <!-- Preview -->
        <div class="card p-6 font-serif text-sm text-gray-800 leading-relaxed" style="min-height: 600px;">
          <div class="text-center mb-6">
            <p class="text-xs text-gray-400 mb-1">{{ contrato.tenant?.nombre }}</p>
            <h2 class="text-lg font-bold uppercase tracking-wide">{{ doc.titulo }}</h2>
            <p class="text-xs text-gray-500 mt-1">{{ doc.lugarFecha }}</p>
          </div>

          <div class="border-t border-gray-200 pt-4 space-y-4">
            <div>
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Las partes</p>
              <p class="text-xs">{{ doc.intro }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg">
              <div>
                <p class="font-bold text-gray-600">LOCADOR (Propietario)</p>
                <p>{{ contrato.propiedad?.propietario?.nombre }} {{ contrato.propiedad?.propietario?.apellido }}</p>
                <p class="text-gray-500">{{ contrato.propiedad?.propietario?.email }}</p>
                <p class="text-gray-500">{{ contrato.propiedad?.propietario?.telefono }}</p>
              </div>
              <div>
                <p class="font-bold text-gray-600">LOCATARIO (Inquilino)</p>
                <p>{{ contrato.inquilino?.nombre }} {{ contrato.inquilino?.apellido }}</p>
                <p class="text-gray-500">{{ contrato.inquilino?.email }}</p>
                <p class="text-gray-500">{{ contrato.inquilino?.telefono }}</p>
              </div>
            </div>

            <div>
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Objeto</p>
              <p class="text-xs">{{ doc.objeto }}</p>
            </div>

            <div>
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Precio y pago</p>
              <p class="text-xs">{{ doc.precio }}</p>
            </div>

            <div v-if="doc.ajuste">
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Ajuste</p>
              <p class="text-xs">{{ doc.ajuste }}</p>
            </div>

            <div>
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Obligaciones</p>
              <p class="text-xs whitespace-pre-line">{{ doc.obligaciones }}</p>
            </div>

            <div v-if="doc.adicionales">
              <p class="text-xs font-bold uppercase text-gray-500 mb-1">Cláusulas adicionales</p>
              <p class="text-xs whitespace-pre-line">{{ doc.adicionales }}</p>
            </div>

            <!-- Firmas -->
            <div class="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-200">
              <div class="text-center text-xs">
                <div class="border-b border-gray-400 mb-1 h-10"></div>
                <p class="font-medium">{{ contrato.propiedad?.propietario?.nombre }} {{ contrato.propiedad?.propietario?.apellido }}</p>
                <p class="text-gray-400">Locador</p>
              </div>
              <div class="text-center text-xs">
                <div class="border-b border-gray-400 mb-1 h-10"></div>
                <p class="font-medium">{{ contrato.inquilino?.nombre }} {{ contrato.inquilino?.apellido }}</p>
                <p class="text-gray-400">Locatario</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón descargar -->
        <button @click="generarPDF" :disabled="generando"
          class="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
          <Download :size="18" />
          {{ generando ? 'Generando PDF...' : 'Descargar PDF' }}
        </button>
        <p class="text-xs text-gray-400 text-center">El PDF se genera directamente en tu navegador</p>
      </div>
    </div>

    <div v-else-if="!contratoId" class="text-center py-20 text-gray-400">
      <FileText :size="48" class="mx-auto mb-3 opacity-30" />
      <p>Seleccioná un contrato para generar el PDF</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FileText, Edit3, Download } from 'lucide-vue-next';
import api from '../../services/api.js';

const contratos = ref([]);
const contratoId = ref('');
const contrato = ref(null);
const loadingContrato = ref(false);
const generando = ref(false);

const doc = ref({
  titulo: 'CONTRATO DE LOCACIÓN',
  lugarFecha: '',
  intro: '',
  objeto: '',
  precio: '',
  ajuste: '',
  obligaciones: '',
  adicionales: '',
});

const fetchContratos = async () => {
  const { data } = await api.get('/rentals', { params: { limit: 100 } });
  const d = data.data || data;
  contratos.value = (d.data || d).filter(c => c.estado === 'ACTIVO');
};

const cargarContrato = async () => {
  if (!contratoId.value) { contrato.value = null; return; }
  loadingContrato.value = true;
  try {
    const { data } = await api.get(`/rentals/${contratoId.value}`);
    contrato.value = data.data || data;
    rellenarDoc(contrato.value);
  } catch {
    // fallback: buscar en la lista
    contrato.value = contratos.value.find(c => c.id === contratoId.value);
    if (contrato.value) rellenarDoc(contrato.value);
  } finally {
    loadingContrato.value = false;
  }
};

const rellenarDoc = (c) => {
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const inicio = new Date(c.fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const fin = new Date(c.fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const monto = parseFloat(c.montoMensual).toLocaleString('es-AR', { minimumFractionDigits: 2 });
  const propietario = c.propiedad?.propietario;

  doc.value = {
    titulo: 'CONTRATO DE LOCACIÓN',
    lugarFecha: `Buenos Aires, ${hoy}`,
    intro: `En la Ciudad Autónoma de Buenos Aires, a los ${hoy}, entre ${propietario ? `${propietario.nombre} ${propietario.apellido}` : 'EL LOCADOR'}, en adelante "EL LOCADOR", y ${c.inquilino?.nombre} ${c.inquilino?.apellido}, en adelante "EL LOCATARIO", se celebra el presente contrato de locación.`,
    objeto: `EL LOCADOR da en locación al LOCATARIO el inmueble ubicado en ${c.propiedad?.direccion}, ${c.propiedad?.ciudad}, por el período comprendido entre el ${inicio} y el ${fin}.`,
    precio: `El precio de la locación se fija en la suma de $${monto} (pesos ${monto}) mensuales, pagaderos por mes adelantado dentro de los primeros cinco días hábiles de cada mes.`,
    ajuste: c.tipoAjuste
      ? `El precio de la locación se ajustará cada ${c.frecuenciaAjuste || 3} meses según índice ${c.tipoAjuste === 'IPC' ? 'IPC (INDEC)' : `fijo del ${c.porcentajeAjuste}%`}, conforme a la Ley 27.551.`
      : '',
    obligaciones: `El LOCATARIO se obliga a:\n- Pagar el alquiler en tiempo y forma.\n- Mantener el inmueble en buen estado de conservación.\n- No realizar modificaciones sin consentimiento escrito del LOCADOR.\n- No ceder ni sublocar total ni parcialmente el inmueble.\n- Permitir inspecciones periódicas con previo aviso de 48 horas.`,
    adicionales: '',
  };
};

const generarPDF = async () => {
  generando.value = true;
  try {
    // Carga jsPDF dinámicamente
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const margen = 20;
    const ancho = 210 - margen * 2;
    let y = margen;

    const linea = (texto, size = 10, bold = false, color = [30, 30, 30]) => {
      pdf.setFontSize(size);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(texto, ancho);
      lines.forEach(l => {
        if (y > 270) { pdf.addPage(); y = margen; }
        pdf.text(l, margen, y);
        y += size * 0.45;
      });
      y += 2;
    };

    const separador = () => {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margen, y, 210 - margen, y);
      y += 4;
    };

    // Encabezado
    pdf.setFillColor(245, 247, 250);
    pdf.rect(0, 0, 210, 28, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(contrato.value?.tenant?.nombre || 'INMOBILIARIA', margen, 10);
    y = 15;
    linea(doc.value.titulo, 16, true, [30, 30, 30]);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(doc.value.lugarFecha, margen, y);
    y += 8;
    separador();

    // Partes
    linea('LAS PARTES', 9, true, [80, 80, 80]);
    linea(doc.value.intro, 9);
    y += 2;

    // Box partes
    pdf.setFillColor(248, 249, 250);
    pdf.roundedRect(margen, y, ancho / 2 - 2, 22, 2, 2, 'F');
    pdf.roundedRect(margen + ancho / 2 + 2, y, ancho / 2 - 2, 22, 2, 2, 'F');
    const propietario = contrato.value?.propiedad?.propietario;
    const inquilino = contrato.value?.inquilino;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(80, 80, 80);
    pdf.text('LOCADOR (Propietario)', margen + 3, y + 5);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(40, 40, 40);
    pdf.text(propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Sin propietario', margen + 3, y + 10);
    pdf.setTextColor(120, 120, 120);
    if (propietario?.email) pdf.text(propietario.email, margen + 3, y + 14);
    if (propietario?.telefono) pdf.text(propietario.telefono, margen + 3, y + 18);

    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(80, 80, 80);
    pdf.text('LOCATARIO (Inquilino)', margen + ancho / 2 + 5, y + 5);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(40, 40, 40);
    pdf.text(`${inquilino?.nombre} ${inquilino?.apellido}`, margen + ancho / 2 + 5, y + 10);
    pdf.setTextColor(120, 120, 120);
    if (inquilino?.email) pdf.text(inquilino.email, margen + ancho / 2 + 5, y + 14);
    if (inquilino?.telefono) pdf.text(inquilino.telefono, margen + ancho / 2 + 5, y + 18);
    y += 26;
    separador();

    // Secciones
    const seccion = (titulo, texto) => {
      if (!texto) return;
      linea(titulo, 9, true, [80, 80, 80]);
      linea(texto, 9);
      y += 2;
      separador();
    };

    seccion('OBJETO DEL CONTRATO', doc.value.objeto);
    seccion('PRECIO Y FORMA DE PAGO', doc.value.precio);
    if (doc.value.ajuste) seccion('CLÁUSULA DE AJUSTE', doc.value.ajuste);
    seccion('OBLIGACIONES DEL LOCATARIO', doc.value.obligaciones);
    if (doc.value.adicionales) seccion('CLÁUSULAS ADICIONALES', doc.value.adicionales);

    // Firmas
    if (y > 230) { pdf.addPage(); y = margen; }
    y += 10;
    linea('FIRMAS', 9, true, [80, 80, 80]);
    y += 15;
    const mitad = margen + ancho / 2;
    pdf.setDrawColor(100, 100, 100);
    pdf.line(margen, y, mitad - 10, y);
    pdf.line(mitad + 10, y, 210 - margen, y);
    y += 4;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60);
    const nomProp = propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Locador';
    const nomInq = inquilino ? `${inquilino.nombre} ${inquilino.apellido}` : 'Locatario';
    pdf.text(nomProp, margen + (mitad - margen - 10) / 2 - pdf.getTextWidth(nomProp) / 2, y);
    pdf.text(nomInq, mitad + 10 + (210 - margen - mitad - 10) / 2 - pdf.getTextWidth(nomInq) / 2, y);
    y += 4;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(140, 140, 140);
    pdf.text('Locador', margen + (mitad - margen - 10) / 2 - pdf.getTextWidth('Locador') / 2, y);
    pdf.text('Locatario', mitad + 10 + (210 - margen - mitad - 10) / 2 - pdf.getTextWidth('Locatario') / 2, y);

    const nombreArchivo = `contrato-${contrato.value?.propiedad?.titulo?.replace(/\s+/g, '-')}-${contrato.value?.inquilino?.apellido}.pdf`;
    pdf.save(nombreArchivo);
  } catch (e) {
    console.error(e);
    alert('Error al generar el PDF. Revisá la consola.');
  } finally {
    generando.value = false;
  }
};

onMounted(fetchContratos);
</script>

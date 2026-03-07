import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api.js';

export const MODULE_LABELS = {
  clientes: 'Clientes', propiedades: 'Propiedades', contratos: 'Contratos',
  cobros: 'Cobros', tareas: 'Tareas', contratos_pdf: 'Contratos PDF',
  metricas_basicas: 'Métricas básicas', metricas_avanzadas: 'Métricas avanzadas',
  gastos: 'Gastos', facturas: 'Facturas de servicios',
  migracion_excel: 'Importación/Exportación Excel', ventas: 'Ventas',
  ajuste_ipc: 'Ajuste IPC automático',
  notificaciones_avanzadas: 'Notificaciones avanzadas',
};

export const usePlanStore = defineStore('plan', () => {
  const plan = ref('STARTER');
  const enabledModules = ref([]);
  const limits = ref({ maxProperties: 10, maxUsers: 1, currentProperties: 0, currentUsers: 0 });
  const priceMonthly = ref(null);
  const loaded = ref(false);
  const upgradeModal = ref({ show: false, message: '', moduleName: '' });

  const hasModule = (moduleName) => enabledModules.value.includes(moduleName);
  const canAddProperty = computed(() => !limits.value.maxProperties || limits.value.currentProperties < limits.value.maxProperties);
  const canAddUser = computed(() => !limits.value.maxUsers || limits.value.currentUsers < limits.value.maxUsers);
  const isStarter = computed(() => plan.value === 'STARTER');
  const isPro = computed(() => plan.value === 'PRO');
  const isEnterprise = computed(() => plan.value === 'ENTERPRISE');
  const propertyUsagePercent = computed(() => !limits.value.maxProperties ? 0 : Math.round((limits.value.currentProperties / limits.value.maxProperties) * 100));
  const userUsagePercent = computed(() => !limits.value.maxUsers ? 0 : Math.round((limits.value.currentUsers / limits.value.maxUsers) * 100));

  async function fetchPlan() {
    try {
      const { data } = await api.get('/plans/my-plan');
      plan.value = data.plan;
      enabledModules.value = data.enabledModules || [];
      limits.value = data.limits || limits.value;
      priceMonthly.value = data.priceMonthly;
      loaded.value = true;
    } catch (e) { console.error('Error cargando plan:', e.message); }
  }

  function openUpgradeModal(moduleName, customMessage) {
    const label = MODULE_LABELS[moduleName] || moduleName;
    const upgrade = plan.value === 'STARTER' ? 'Pro' : 'Enterprise';
    upgradeModal.value = { show: true, moduleName, message: customMessage || `"${label}" está disponible a partir del plan ${upgrade}.` };
  }

  function closeUpgradeModal() { upgradeModal.value = { show: false, message: '', moduleName: '' }; }

  function reset() {
    plan.value = 'STARTER'; enabledModules.value = [];
    limits.value = { maxProperties: 10, maxUsers: 1, currentProperties: 0, currentUsers: 0 };
    loaded.value = false; closeUpgradeModal();
  }

  return {
    plan, enabledModules, limits, priceMonthly, loaded, upgradeModal,
    hasModule, canAddProperty, canAddUser, isStarter, isPro, isEnterprise,
    propertyUsagePercent, userUsagePercent,
    fetchPlan, reset, openUpgradeModal, closeUpgradeModal,
  };
});

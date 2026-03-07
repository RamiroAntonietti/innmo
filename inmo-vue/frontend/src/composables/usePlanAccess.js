// composables/usePlanAccess.js
// Uso en cualquier página:
//
//   import { usePlanAccess } from '@/composables/usePlanAccess.js'
//   const { requireModule, canAddProperty, canAddUser } = usePlanAccess()
//
//   // En un click handler:
//   if (!requireModule('gastos')) return   // muestra modal si no tiene acceso
//
//   // O en template:
//   <button @click="crear" :disabled="!canAddProperty.value">Agregar propiedad</button>

import { computed } from 'vue';
import { usePlanStore } from '../stores/plan.js';

export function usePlanAccess() {
  const planStore = usePlanStore();

  // Verifica si tiene acceso a un módulo.
  // Si NO tiene acceso, abre el modal y retorna false.
  function requireModule(moduleName) {
    if (planStore.hasModule(moduleName)) return true;
    planStore.openUpgradeModal(moduleName);
    return false;
  }

  // Verifica límite de propiedades
  function requirePropertySlot() {
    if (planStore.canAddProperty) return true;
    planStore.openUpgradeModal('propiedades', `Alcanzaste el límite de ${planStore.limits.maxProperties} propiedades de tu plan ${planStore.plan}.`);
    return false;
  }

  // Verifica límite de usuarios
  function requireUserSlot() {
    if (planStore.canAddUser) return true;
    planStore.openUpgradeModal('usuarios', `Alcanzaste el límite de ${planStore.limits.maxUsers} usuario(s) de tu plan ${planStore.plan}.`);
    return false;
  }

  return {
    plan: computed(() => planStore.plan),
    hasModule: planStore.hasModule,
    canAddProperty: computed(() => planStore.canAddProperty),
    canAddUser: computed(() => planStore.canAddUser),
    isStarter: computed(() => planStore.isStarter),
    isPro: computed(() => planStore.isPro),
    isEnterprise: computed(() => planStore.isEnterprise),
    limits: computed(() => planStore.limits),
    requireModule,
    requirePropertySlot,
    requireUserSlot,
  };
}

export default usePlanAccess;

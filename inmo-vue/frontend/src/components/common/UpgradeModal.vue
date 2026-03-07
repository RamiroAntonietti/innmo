<template>
  <!-- Modal de upgrade de plan -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="planStore.upgradeModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
        @click.self="planStore.closeUpgradeModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">

          <!-- Icono -->
          <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>

          <h2 class="text-xl font-bold text-gray-900 text-center mb-2">
            Función no disponible
          </h2>
          <p class="text-gray-500 text-center text-sm mb-6">
            {{ planStore.upgradeModal.message || 'Esta función está disponible en planes superiores.' }}
          </p>

          <!-- Plan actual vs upgrade -->
          <div class="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div class="text-center">
              <p class="text-xs text-gray-400 mb-1">Plan actual</p>
              <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                {{ planStore.plan }}
              </span>
            </div>
            <svg class="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <div class="text-center">
              <p class="text-xs text-gray-400 mb-1">Requiere</p>
              <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {{ requiredPlan }}
              </span>
            </div>
          </div>

          <div class="flex gap-3">
            <button @click="planStore.closeUpgradeModal()"
              class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Ahora no
            </button>
            <button @click="goToPlans"
              class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              ⬆ Actualizar plan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlanStore } from '../../stores/plan.js';

const planStore = usePlanStore();
const router = useRouter();

const requiredPlan = computed(() => {
  const current = planStore.plan;
  if (current === 'STARTER') return 'Pro o superior';
  if (current === 'PRO') return 'Enterprise';
  return 'Plan superior';
});

const goToPlans = () => {
  planStore.closeUpgradeModal();
  router.push('/#planes');
};
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>

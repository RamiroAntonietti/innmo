<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Shield :size="24" class="text-primary-500" /> Usuarios
      </h1>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2"><Plus :size="18" /> Nuevo usuario</button>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card p-4"><p class="text-xs text-gray-500 mb-1">Total</p><p class="text-2xl font-bold">{{ usuarios.length }}</p></div>
      <div class="card p-4"><p class="text-xs text-gray-500 mb-1">Activos</p><p class="text-2xl font-bold text-green-600">{{ usuarios.filter(u => u.activo).length }}</p></div>
      <div class="card p-4"><p class="text-xs text-gray-500 mb-1">Admins</p><p class="text-2xl font-bold text-primary-600">{{ usuarios.filter(u => u.rol === 'ADMIN').length }}</p></div>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3 font-medium">Usuario</th>
            <th class="px-5 py-3 font-medium">Email</th>
            <th class="px-5 py-3 font-medium">Rol</th>
            <th class="px-5 py-3 font-medium">Estado</th>
            <th class="px-5 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="u in usuarios" :key="u.id" class="hover:bg-gray-50" :class="!u.activo ? 'opacity-50' : ''">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600">
                  {{ u.nombre[0] }}{{ u.apellido[0] }}
                </div>
                <p class="font-semibold text-gray-900">{{ u.nombre }} {{ u.apellido }}</p>
              </div>
            </td>
            <td class="px-5 py-4 text-gray-600">{{ u.email }}</td>
            <td class="px-5 py-4"><span :class="rolClass(u.rol)" class="text-xs px-2.5 py-1 rounded-full font-medium">{{ u.rol }}</span></td>
            <td class="px-5 py-4">
              <span :class="u.activo ? 'badge-green' : 'badge-gray'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
            </td>
            <td class="px-5 py-4">
              <div class="flex gap-2">
                <button @click="openModal(u)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"><Pencil :size="12" /> Editar</button>
                <button v-if="u.id !== currentUser?.id" @click="eliminar(u)" class="btn-secondary text-xs py-1.5 px-3 text-red-500 flex items-center gap-1"><Trash2 :size="12" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Nombre</label><input v-model="form.nombre" class="input" required /></div>
            <div><label class="label">Apellido</label><input v-model="form.apellido" class="input" required /></div>
          </div>
          <div v-if="!editando"><label class="label">Email</label><input v-model="form.email" type="email" class="input" required /></div>
          <div>
            <label class="label">{{ editando ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</label>
            <input v-model="form.password" type="password" class="input" :required="!editando" minlength="6" />
          </div>
          <div>
            <label class="label">Rol</label>
            <select v-model="form.rol" class="input">
              <option value="ADMIN">Administrador</option>
              <option value="AGENTE">Agente</option>
              <option value="ASISTENTE">Asistente</option>
            </select>
          </div>
          <div v-if="editando" class="flex items-center gap-3">
            <label class="text-sm font-medium text-gray-700">Activo:</label>
            <button type="button" @click="form.activo = !form.activo"
              :class="form.activo ? 'bg-primary-500' : 'bg-gray-300'"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors">
              <span :class="form.activo ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
            </button>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { Shield, Plus, Pencil, Trash2, X } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';
const { user: currentUser } = useAuthStore();
const usuarios = ref([]);
const modal = ref(false);
const saving = ref(false);
const formError = ref('');
const editando = ref(null);
const form = ref({ nombre: '', apellido: '', email: '', password: '', rol: 'AGENTE', activo: true });
const rolClass = (r) => ({ ADMIN: 'bg-purple-50 text-purple-700', AGENTE: 'bg-blue-50 text-blue-700', ASISTENTE: 'bg-gray-100 text-gray-600' }[r] || '');
const fetchUsuarios = async () => {
  const { data } = await api.get('/usuarios');
  usuarios.value = data.data || data;
};
const openModal = (u) => {
  editando.value = u;
  form.value = u ? { ...u, password: '' } : { nombre: '', apellido: '', email: '', password: '', rol: 'AGENTE', activo: true };
  formError.value = ''; modal.value = true;
};
const guardar = async () => {
  saving.value = true; formError.value = '';
  try {
    const payload = { ...form.value };
    if (!payload.password) delete payload.password;
    if (editando.value) await api.put(`/usuarios/${editando.value.id}`, payload);
    else await api.post('/usuarios', payload);
    modal.value = false; fetchUsuarios();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al guardar'; }
  finally { saving.value = false; }
};
const eliminar = async (u) => {
  if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
  try { await api.delete(`/usuarios/${u.id}`); fetchUsuarios(); }
  catch (e) { alert(e.response?.data?.error || 'Error al eliminar'); }
};
onMounted(fetchUsuarios);
</script>

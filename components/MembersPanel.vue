<script setup lang="ts">
const props = defineProps<{ projectId: string; projectName: string }>()
const emit = defineEmits<{ close: [] }>()

const { api } = useVault()

const members = ref<any[]>([])
const email = ref('')
const role = ref('viewer')
const busy = ref(false)
const error = ref('')
const ok = ref('')

const ROLES: Record<string, string> = {
  owner: 'Dono — controla tudo, inclusive membros',
  editor: 'Editor — vê e altera credenciais',
  viewer: 'Leitor — só visualiza'
}

async function load() {
  try {
    const r = await api(`members?project_id=${props.projectId}`)
    members.value = r.members || []
  } catch (e: any) {
    error.value = e.message
  }
}
onMounted(load)

async function invite() {
  busy.value = true
  error.value = ''
  ok.value = ''
  try {
    await api('members', {
      method: 'POST',
      body: { project_id: props.projectId, email: email.value.trim(), role: role.value }
    })
    ok.value = 'Pessoa adicionada ao projeto.'
    email.value = ''
    await load()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Remover esta pessoa do projeto?')) return
  try {
    await api(`members/${id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet panel" role="dialog" aria-modal="true">
      <header>
        <h2>Quem acessa {{ projectName }}</h2>
        <button class="btn-quiet" @click="emit('close')">Fechar</button>
      </header>

      <div class="body">
        <p v-if="error" class="notice error">{{ error }}</p>
        <p v-if="ok" class="notice ok">{{ ok }}</p>

        <ul class="list">
          <li v-for="m in members" :key="m.id">
            <div>
              <strong>{{ m.profiles?.full_name || m.profiles?.email }}</strong>
              <span class="muted em">{{ m.profiles?.email }}</span>
            </div>
            <span class="tag">{{ m.role }}</span>
            <button v-if="m.role !== 'owner'" class="btn-quiet danger" @click="remove(m.id)">Remover</button>
          </li>
        </ul>

        <h3 class="sec">Adicionar pessoa</h3>
        <p class="hint muted">A pessoa precisa já ter criado o acesso dela no Cofre.</p>
        <div class="invite">
          <input v-model="email" type="email" placeholder="e-mail da pessoa" />
          <select v-model="role">
            <option value="viewer">Leitor</option>
            <option value="editor">Editor</option>
            <option value="owner">Dono</option>
          </select>
          <button class="btn" :disabled="busy || !email" @click="invite">Adicionar</button>
        </div>
        <p class="hint muted">{{ ROLES[role] }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(19, 35, 43, .42);
  display: grid; place-items: center; padding: 20px; z-index: 30;
}
.sheet { width: min(560px, 100%); max-height: 90vh; display: flex; flex-direction: column; }
header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--line-soft);
}
header h2 { font-size: 17px; }
.body { padding: 20px; overflow: auto; }
.list { list-style: none; margin: 0 0 18px; padding: 0; }
.list li {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--line-soft);
}
.list li > div { flex: 1; min-width: 0; }
.list strong { display: block; font-weight: 500; }
.em { font-size: 12.5px; }
.tag {
  font-size: 12px; padding: 2px 8px; border-radius: 20px;
  background: var(--pine-soft); color: var(--pine-dark);
}
.sec { font-size: 14px; }
.hint { font-size: 13px; margin: 4px 0 10px; }
.invite { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
@media (max-width: 560px) { .invite { grid-template-columns: 1fr; } }
</style>

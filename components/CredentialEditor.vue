<script setup lang="ts">
type Field = { label: string; value: string; secret: boolean }

const props = defineProps<{ projectId: string; credentialId: string | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { api } = useVault()

const name = ref('')
const service = ref('')
const url = ref('')
const username = ref('')
const fields = ref<Field[]>([])
const busy = ref(false)
const loading = ref(false)
const error = ref('')

const PRESETS: Record<string, { url: string; fields: Field[] }> = {
  Supabase: {
    url: 'https://supabase.com/dashboard',
    fields: [
      { label: 'E-mail de login', value: '', secret: false },
      { label: 'Senha', value: '', secret: true },
      { label: 'Project URL', value: '', secret: false },
      { label: 'anon key', value: '', secret: true },
      { label: 'service_role key', value: '', secret: true }
    ]
  },
  Brevo: {
    url: 'https://app.brevo.com',
    fields: [
      { label: 'E-mail de login', value: '', secret: false },
      { label: 'Senha', value: '', secret: true },
      { label: 'API key', value: '', secret: true },
      { label: 'SMTP login', value: '', secret: false },
      { label: 'SMTP senha', value: '', secret: true }
    ]
  },
  GitHub: {
    url: 'https://github.com',
    fields: [
      { label: 'Usuário', value: '', secret: false },
      { label: 'Senha', value: '', secret: true },
      { label: 'Personal access token', value: '', secret: true },
      { label: 'Código de recuperação 2FA', value: '', secret: true }
    ]
  },
  'E-mail': {
    url: '',
    fields: [
      { label: 'Endereço', value: '', secret: false },
      { label: 'Senha', value: '', secret: true },
      { label: 'Servidor IMAP', value: '', secret: false },
      { label: 'Servidor SMTP', value: '', secret: false }
    ]
  }
}

onMounted(async () => {
  if (!props.credentialId) {
    fields.value = [{ label: '', value: '', secret: true }]
    return
  }
  loading.value = true
  try {
    const { credential } = await api(`credentials/${props.credentialId}`)
    name.value = credential.name
    service.value = credential.service || ''
    url.value = credential.url || ''
    username.value = credential.username || ''
    fields.value = (credential.fields || []).map((f: any) => ({
      label: f.label,
      value: f.value,
      secret: f.secret !== false
    }))
    if (!fields.value.length) fields.value = [{ label: '', value: '', secret: true }]
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function applyPreset(key: string) {
  const p = PRESETS[key]
  service.value = key
  if (!url.value) url.value = p.url
  const filled = fields.value.filter((f) => f.label || f.value)
  fields.value = [...p.fields.map((f) => ({ ...f })), ...filled]
}

function addField() {
  fields.value.push({ label: '', value: '', secret: true })
}
function removeField(i: number) {
  fields.value.splice(i, 1)
  if (!fields.value.length) addField()
}
function fill(i: number) {
  fields.value[i].value = generatePassword(24, true)
  fields.value[i].secret = true
}

async function save() {
  if (!name.value.trim()) {
    error.value = 'Dê um nome para esta credencial.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const body = {
      project_id: props.projectId,
      name: name.value.trim(),
      service: service.value || null,
      url: url.value || null,
      username: username.value || null,
      fields: fields.value.filter((f) => f.label.trim())
    }
    if (props.credentialId) {
      await api(`credentials/${props.credentialId}`, { method: 'PATCH', body })
    } else {
      await api('credentials', { method: 'POST', body })
    }
    emit('saved')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet panel" role="dialog" aria-modal="true">
      <header>
        <h2>{{ credentialId ? 'Editar credencial' : 'Nova credencial' }}</h2>
        <button class="btn-quiet" @click="emit('close')" aria-label="Fechar">Fechar</button>
      </header>

      <div class="body">
        <p v-if="error" class="notice error">{{ error }}</p>
        <p v-if="loading" class="muted">Carregando…</p>

        <template v-if="!loading">
          <label class="field">
            <span>Nome</span>
            <input v-model="name" placeholder="Ex.: Supabase — Loja do João" />
          </label>

          <div class="row">
            <label class="field">
              <span>Serviço</span>
              <input v-model="service" placeholder="Supabase, Brevo, GitHub…" />
            </label>
            <label class="field">
              <span>Link do painel</span>
              <input v-model="url" placeholder="https://…" />
            </label>
          </div>

          <label class="field">
            <span>Usuário ou e-mail principal <em class="muted">(aparece na lista, não é secreto)</em></span>
            <input v-model="username" />
          </label>

          <div v-if="!credentialId" class="presets">
            <span class="muted">Começar a partir de:</span>
            <button v-for="k in Object.keys(PRESETS)" :key="k" type="button" class="btn-ghost small"
                    @click="applyPreset(k)">{{ k }}</button>
          </div>

          <h3 class="sec">Campos guardados</h3>
          <p class="hint muted">
            Crie os campos que esta ferramenta precisar. Os marcados como secretos vão cifrados para o banco.
          </p>

          <div v-for="(f, i) in fields" :key="i" class="fieldrow">
            <input v-model="f.label" class="lbl" placeholder="Nome do campo" />
            <input v-model="f.value" class="val mono" :type="f.secret ? 'password' : 'text'"
                   placeholder="Valor" autocomplete="off" spellcheck="false" />
            <label class="chk" title="Guardar cifrado e esconder na tela">
              <input type="checkbox" v-model="f.secret" /> secreto
            </label>
            <button type="button" class="btn-quiet" @click="fill(i)" title="Gerar senha forte">Gerar</button>
            <button type="button" class="btn-quiet danger" @click="removeField(i)" title="Remover campo">Remover</button>
          </div>

          <button type="button" class="btn-ghost small" @click="addField">Adicionar campo</button>
        </template>
      </div>

      <footer>
        <button class="btn-ghost" @click="emit('close')">Cancelar</button>
        <button class="btn" :disabled="busy || loading" @click="save">
          {{ busy ? 'Salvando…' : 'Salvar credencial' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(19, 35, 43, .42);
  display: grid; place-items: center; padding: 20px; z-index: 30;
}
.sheet { width: min(720px, 100%); max-height: 90vh; display: flex; flex-direction: column; }
header, footer {
  display: flex; align-items: center; gap: 10px; padding: 14px 20px;
}
header { border-bottom: 1px solid var(--line-soft); justify-content: space-between; }
header h2 { font-size: 17px; }
footer { border-top: 1px solid var(--line-soft); justify-content: flex-end; }
.body { padding: 20px; overflow: auto; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.presets { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 18px; font-size: 13px; }
.small { padding: 5px 10px; font-size: 13px; }
.sec { font-size: 14px; margin-top: 6px; }
.hint { font-size: 13px; margin: 4px 0 12px; }
.fieldrow {
  display: grid; grid-template-columns: 1fr 1.4fr auto auto auto;
  gap: 8px; align-items: center; margin-bottom: 8px;
}
.chk { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--ink-2); white-space: nowrap; }
.chk input { width: auto; }
em { font-style: normal; font-size: 12.5px; }
@media (max-width: 680px) {
  .row { grid-template-columns: 1fr; }
  .fieldrow { grid-template-columns: 1fr 1fr; }
  .fieldrow .val { grid-column: 1 / -1; }
}
</style>

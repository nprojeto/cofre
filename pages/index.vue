<script setup lang="ts">
const { supabase, api } = useVault()

const ready = ref(false)
const session = ref<any>(null)
const bootError = ref('')

const projects = ref<any[]>([])
const currentId = ref<string | null>(null)
const credentials = ref<any[]>([])
const search = ref('')
const loadingList = ref(false)
const error = ref('')

const openId = ref<string | null>(null)
const detail = ref<any>(null)
const revealed = ref<Record<number, boolean>>({})
const copied = ref('')

const editorFor = ref<string | null | undefined>(undefined) // undefined = fechado
const showMembers = ref(false)
const newProject = ref('')
const rail = ref(false)

const current = computed(() => projects.value.find((p) => p.id === currentId.value) || null)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return credentials.value
  return credentials.value.filter((c) =>
    [c.name, c.service, c.username, c.url].some((v) => (v || '').toLowerCase().includes(q))
  )
})

onMounted(async () => {
  try {
    const sb = await supabase()
    const { data } = await sb.auth.getSession()
    session.value = data.session
    sb.auth.onAuthStateChange((_e, s) => {
      session.value = s
      if (s) loadProjects()
      else {
        projects.value = []
        credentials.value = []
      }
    })
    if (data.session) await loadProjects()
  } catch (e: any) {
    bootError.value = e.message
  } finally {
    ready.value = true
  }
})

async function loadProjects() {
  const sb = await supabase()
  const { data, error: e } = await sb.from('projects').select('*').order('name')
  if (e) {
    error.value = e.message
    return
  }
  projects.value = data || []
  if (!currentId.value && projects.value.length) select(projects.value[0].id)
}

async function createProject() {
  const nm = newProject.value.trim()
  if (!nm) return
  const sb = await supabase()
  const { data, error: e } = await sb
    .from('projects')
    .insert({ name: nm, owner_id: session.value.user.id })
    .select()
    .single()
  if (e) {
    error.value = e.message
    return
  }
  newProject.value = ''
  await loadProjects()
  select(data.id)
}

async function removeProject() {
  if (!current.value) return
  if (!confirm(`Apagar o projeto "${current.value.name}" e todas as credenciais dentro dele?`)) return
  const sb = await supabase()
  const { error: e } = await sb.from('projects').delete().eq('id', current.value.id)
  if (e) {
    error.value = e.message
    return
  }
  currentId.value = null
  credentials.value = []
  await loadProjects()
}

async function select(id: string) {
  currentId.value = id
  openId.value = null
  detail.value = null
  rail.value = false
  await loadCredentials()
}

async function loadCredentials() {
  if (!currentId.value) return
  loadingList.value = true
  error.value = ''
  try {
    const r = await api(`credentials?project_id=${currentId.value}`)
    credentials.value = r.credentials || []
  } catch (e: any) {
    error.value = e.message
  } finally {
    loadingList.value = false
  }
}

async function toggle(id: string) {
  if (openId.value === id) {
    openId.value = null
    detail.value = null
    return
  }
  openId.value = id
  detail.value = null
  revealed.value = {}
  try {
    const r = await api(`credentials/${id}`)
    detail.value = r.credential
  } catch (e: any) {
    error.value = e.message
  }
}

async function copy(value: string, tag: string) {
  if (await copyText(value)) {
    copied.value = tag
    setTimeout(() => (copied.value = ''), 1600)
  }
}

async function removeCredential(id: string) {
  if (!confirm('Apagar esta credencial?')) return
  try {
    await api(`credentials/${id}`, { method: 'DELETE' })
    openId.value = null
    await loadCredentials()
  } catch (e: any) {
    error.value = e.message
  }
}

async function onSaved() {
  editorFor.value = undefined
  await loadCredentials()
  if (openId.value) {
    const id = openId.value
    openId.value = null
    await toggle(id)
  }
}

async function signOut() {
  const sb = await supabase()
  await sb.auth.signOut()
  currentId.value = null
}
</script>

<template>
  <div v-if="!ready" class="boot muted">Abrindo o cofre…</div>
  <div v-else-if="bootError" class="boot">
    <p class="notice error">{{ bootError }}</p>
  </div>

  <SignIn v-else-if="!session" />

  <div v-else class="app">
    <aside :class="{ open: rail }">
      <div class="aside-top">
        <h2>Projetos</h2>
        <button class="btn-quiet close" @click="rail = false">Fechar</button>
      </div>

      <ul class="projects">
        <li v-for="p in projects" :key="p.id">
          <button :class="{ on: p.id === currentId }" @click="select(p.id)">
            {{ p.name }}
          </button>
        </li>
      </ul>

      <div class="newproj">
        <input v-model="newProject" placeholder="Nome do projeto" @keyup.enter="createProject" />
        <button class="btn-ghost small" @click="createProject">Criar</button>
      </div>

      <div class="aside-foot">
        <p class="muted em">{{ session.user.email }}</p>
        <button class="btn-quiet" @click="signOut">Sair</button>
      </div>
    </aside>

    <main>
      <div class="bar">
        <button class="btn-quiet menu" @click="rail = true">Projetos</button>
        <h1>{{ current?.name || 'Nenhum projeto ainda' }}</h1>
        <div class="bar-actions" v-if="current">
          <input v-model="search" class="search" placeholder="Buscar" />
          <button class="btn-ghost small" @click="showMembers = true">Acessos</button>
          <button class="btn small" @click="editorFor = null">Nova credencial</button>
        </div>
      </div>

      <p v-if="error" class="notice error">{{ error }}</p>

      <div v-if="!projects.length" class="empty panel">
        <h3>Comece criando um projeto</h3>
        <p class="muted">Cada projeto guarda as contas e chaves de um cliente ou sistema seu.</p>
      </div>

      <div v-else-if="loadingList" class="muted pad">Carregando…</div>

      <div v-else-if="!filtered.length" class="empty panel">
        <h3>{{ search ? 'Nada encontrado' : 'Nenhuma credencial aqui' }}</h3>
        <p class="muted">
          {{ search ? 'Tente outro termo.' : 'Guarde o primeiro acesso deste projeto.' }}
        </p>
        <button v-if="!search" class="btn" @click="editorFor = null">Nova credencial</button>
      </div>

      <ul v-else class="creds panel">
        <li v-for="c in filtered" :key="c.id" :class="{ open: openId === c.id }">
          <button class="head" @click="toggle(c.id)" :aria-expanded="openId === c.id">
            <span class="nm">{{ c.name }}</span>
            <span class="meta muted">{{ [c.service, c.username].filter(Boolean).join(' · ') }}</span>
          </button>

          <div v-if="openId === c.id" class="detail">
            <p v-if="!detail" class="muted">Abrindo…</p>
            <template v-else>
              <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener" class="link">
                {{ detail.url }}
              </a>

              <dl>
                <div v-for="(f, i) in detail.fields" :key="i" class="pair">
                  <dt>{{ f.label }}</dt>
                  <dd>
                    <code v-if="!f.secret || revealed[i]" class="mono">{{ f.value }}</code>
                    <span v-else class="redacted" aria-label="valor oculto"></span>
                    <button v-if="f.secret" class="btn-quiet" @click="revealed[i] = !revealed[i]">
                      {{ revealed[i] ? 'Ocultar' : 'Mostrar' }}
                    </button>
                    <button class="btn-quiet" @click="copy(f.value, c.id + '-' + i)">
                      {{ copied === c.id + '-' + i ? 'Copiado' : 'Copiar' }}
                    </button>
                  </dd>
                </div>
              </dl>

              <div class="detail-actions">
                <button class="btn-ghost small" @click="editorFor = c.id">Editar</button>
                <button class="btn-quiet danger" @click="removeCredential(c.id)">Apagar</button>
              </div>
            </template>
          </div>
        </li>
      </ul>

      <div v-if="current" class="dangerzone">
        <button class="btn-quiet danger" @click="removeProject">Apagar projeto {{ current.name }}</button>
      </div>
    </main>

    <CredentialEditor
      v-if="editorFor !== undefined && currentId"
      :project-id="currentId"
      :credential-id="editorFor"
      @close="editorFor = undefined"
      @saved="onSaved"
    />

    <MembersPanel
      v-if="showMembers && current"
      :project-id="current.id"
      :project-name="current.name"
      @close="showMembers = false"
    />
  </div>
</template>

<style scoped>
.boot { display: grid; place-items: center; min-height: 100vh; padding: 20px; }
.app { display: grid; grid-template-columns: 264px 1fr; min-height: 100vh; }

aside {
  border-right: 1px solid var(--line);
  background: var(--surface);
  padding: 20px 16px;
  display: flex; flex-direction: column; gap: 14px;
}
.aside-top { display: flex; justify-content: space-between; align-items: center; }
.aside-top h2 { font-size: 13px; color: var(--ink-2); font-weight: 500; }
.close { display: none; }

.projects { list-style: none; margin: 0; padding: 0; flex: 1; }
.projects button {
  width: 100%; text-align: left; border: 0; background: none;
  padding: 8px 10px; border-radius: var(--radius); color: var(--ink);
  border-left: 2px solid transparent;
}
.projects button:hover { background: var(--line-soft); }
.projects button.on { background: var(--pine-soft); border-left-color: var(--pine); font-weight: 500; }

.newproj { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
.small { padding: 6px 10px; font-size: 13px; }
.aside-foot { border-top: 1px solid var(--line-soft); padding-top: 12px; display: flex; align-items: center; gap: 8px; }
.aside-foot p { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.em { font-size: 12.5px; }

main { padding: 24px 28px 60px; max-width: 940px; }
.bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.bar h1 { font-size: 22px; flex: 1; }
.bar-actions { display: flex; gap: 8px; align-items: center; }
.search { width: 170px; padding: 6px 10px; }
.menu { display: none; }

.pad { padding: 20px 0; }
.empty { padding: 36px 24px; text-align: center; }
.empty h3 { font-size: 16px; margin-bottom: 6px; }
.empty .btn { margin-top: 14px; }

.creds { list-style: none; margin: 0; padding: 0; overflow: hidden; }
.creds li + li { border-top: 1px solid var(--line-soft); }
.creds li.open { background: #fbfdfc; }
.head {
  width: 100%; text-align: left; border: 0; background: none;
  padding: 13px 18px; display: flex; align-items: baseline; gap: 12px;
}
.head:hover { background: var(--line-soft); }
.nm { font-weight: 500; }
.meta { font-size: 13px; }

.detail { padding: 4px 18px 18px; }
.link { font-size: 13px; display: inline-block; margin-bottom: 10px; word-break: break-all; }
dl { margin: 0; }
.pair {
  display: grid; grid-template-columns: 190px 1fr; gap: 12px;
  padding: 7px 0; border-top: 1px dotted var(--line);
}
dt { color: var(--ink-2); font-size: 13.5px; }
dd { margin: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
code { word-break: break-all; }
.redacted {
  display: inline-block; width: 128px; height: 11px; border-radius: 2px;
  background: repeating-linear-gradient(90deg, var(--ink-3) 0 7px, transparent 7px 11px);
  opacity: .55;
}
.detail-actions { margin-top: 14px; display: flex; gap: 8px; }
.dangerzone { margin-top: 32px; }

@media (max-width: 820px) {
  .app { grid-template-columns: 1fr; }
  aside {
    position: fixed; inset: 0 auto 0 0; width: 250px; z-index: 20;
    transform: translateX(-100%); transition: transform .18s ease;
    box-shadow: var(--shadow);
  }
  aside.open { transform: none; }
  .close, .menu { display: inline-block; }
  main { padding: 18px 16px 60px; }
  .bar h1 { flex-basis: 100%; order: -1; }
  .search { width: 100%; }
  .bar-actions { width: 100%; }
  .pair { grid-template-columns: 1fr; gap: 2px; }
}
</style>

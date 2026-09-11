<script setup lang="ts">
const { supabase } = useVault()

const mode = ref<'in' | 'up'>('in')
const email = ref('')
const password = ref('')
const fullName = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')

async function submit() {
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    const sb = await supabase()
    if (mode.value === 'in') {
      const { error: e } = await sb.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      })
      if (e) throw new Error('E-mail ou senha não conferem.')
    } else {
      const { data, error: e } = await sb.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: { data: { full_name: fullName.value.trim() } }
      })
      if (e) throw new Error(e.message)
      if (!data.session) {
        info.value = 'Conta criada. Confirme o e-mail que enviamos e depois entre.'
        mode.value = 'in'
      }
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="gate">
    <div class="brand">
      <svg viewBox="0 0 40 40" aria-hidden="true" class="mark">
        <rect x="2.5" y="2.5" width="35" height="35" rx="3" fill="none" stroke="var(--pine)" stroke-width="2" />
        <circle cx="20" cy="18" r="6.5" fill="none" stroke="var(--pine)" stroke-width="2" />
        <path d="M20 24.5 L20 31" stroke="var(--pine)" stroke-width="2" stroke-linecap="round" />
        <path d="M20 28 L24 28" stroke="var(--pine)" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h1>Cofre</h1>
      <p class="muted">Os acessos e chaves dos seus projetos, em um lugar só.</p>
    </div>

    <form class="panel form" @submit.prevent="submit">
      <div class="tabs">
        <button type="button" :class="{ on: mode === 'in' }" @click="mode = 'in'">Entrar</button>
        <button type="button" :class="{ on: mode === 'up' }" @click="mode = 'up'">Criar acesso</button>
      </div>

      <p v-if="error" class="notice error">{{ error }}</p>
      <p v-if="info" class="notice ok">{{ info }}</p>

      <label v-if="mode === 'up'" class="field">
        <span>Seu nome</span>
        <input v-model="fullName" type="text" autocomplete="name" />
      </label>

      <label class="field">
        <span>E-mail</span>
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label class="field">
        <span>Senha mestra</span>
        <input v-model="password" type="password" required minlength="8"
               :autocomplete="mode === 'in' ? 'current-password' : 'new-password'" />
      </label>

      <button class="btn wide" :disabled="busy">
        {{ busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar acesso' }}
      </button>

      <p class="fine muted">
        Esta é a única senha que você precisa lembrar. Ela não fica guardada em lugar nenhum.
      </p>
    </form>
  </div>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 28px;
  padding: 40px 20px;
}
.brand { text-align: center; max-width: 34ch; }
.mark { width: 44px; height: 44px; display: block; margin: 0 auto 14px; }
.brand h1 { font-size: 34px; letter-spacing: -0.03em; }
.brand p { margin-top: 6px; font-size: 14px; }
.form { width: 100%; max-width: 380px; padding: 22px; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--line-soft); }
.tabs button {
  border: 0; background: none; padding: 7px 2px; margin-right: 18px;
  color: var(--ink-3); border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tabs button.on { color: var(--ink); border-bottom-color: var(--pine); font-weight: 500; }
.wide { width: 100%; margin-top: 4px; }
.fine { font-size: 12.5px; margin-top: 14px; line-height: 1.45; }
</style>

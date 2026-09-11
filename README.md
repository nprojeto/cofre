# Cofre

Guarda os acessos e chaves de API dos seus projetos.

- Site: GitHub Pages (publicado sozinho a cada alteração)
- Dados: Supabase (Postgres + Edge Function `api`)
- Segredos: cifrados com AES-256-GCM antes de entrar no banco

## O único arquivo que você edita

`public/config.json` — cole ali a **Project URL** e a **anon key** do seu Supabase.

## Publicar

Repositório > Settings > Pages > Source: **GitHub Actions**.
Cada alteração no branch `main` republica o site automaticamente.

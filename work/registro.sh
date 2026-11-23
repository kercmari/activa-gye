#!/usr/bin/env bash
# Activa GYE — Ronda 5 (22/11/2026): registro con tipo de cuenta (paciente / nutricionista pendiente) + foto obligatoria;
# Nutrición como inicio y Panel de deportes. Diseño: docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md
# Implementan haiku, revisa opus. 20 min por fase. Nunca push, nunca deploy, nunca la nube.
#   R1 (a la vez): XR1 SQL ‖ XR2 datos ‖ XR4 portada+panel   → unión + gates + db reset
#   R2: XR3 pantallas (registro, perfil, encabezado, admin)   → unión + gates
#   R3: XR5 e2e                                               → unión + suite e2e completa
#   RE5 revisión → si DO NOT SHIP: XR6 arreglo → e2e → RE5b
# Reanudable: vuelve a lanzarlo y salta las tareas que ya tienen informe.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/registro.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.registro.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }

  say 'INICIO registro (ronda 5)'
  plan_en_main || exit 3
  ronda "R1: XR1 (SQL) ‖ XR2 (datos) ‖ XR4 (portada + panel de deportes)" XR1:haiku:4 XR2:haiku:4 XR4:haiku:4
  base_main
  ronda "R2: XR3 (pantallas de registro, perfil, encabezado y admin)" XR3:haiku:4
  ronda "R3: XR5 (e2e)" XR5:haiku:4
  e2e_main E2E-R5
  ronda "REVISIÓN: RE5 (opus)" RE5:opus:5
  if ship RE5; then
    say 'LISTO: RE5 SHIP. No se publica solo.'
  else
    say 'RE5 DO NOT SHIP → XR6 arreglo y RE5b'
    ronda "ARREGLO: XR6" XR6:haiku:4
    base_main
    e2e_main E2E-R5b
    ronda "RE-REVISIÓN: RE5b (opus)" RE5b:opus:5
    if ship RE5b; then say 'LISTO: RE5b SHIP. No se publica solo.'; else say 'NO SHIP: ver work/out/RE5b/report.md (queda para la dueña)'; fi
  fi
  resumen
  say 'FIN registro'
}

say() { printf '%s %s\n' "$(date '+%F %T')" "$1" | tee -a "$LOG"; }

# El diseño, el generador y los briefs entran en main para que cada worktree los tenga.
plan_en_main() {
  local files="docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md work/gen/briefs_registro.py work/registro.sh work/briefs/XR1.md work/briefs/XR2.md work/briefs/XR3.md work/briefs/XR4.md work/briefs/XR5.md work/briefs/XR6.md work/briefs/RE5.md work/briefs/RE5b.md"
  git -C "$MAIN" add $files >> "$LOG" 2>&1 || { say 'no pude preparar el plan en main'; return 1; }
  git -C "$MAIN" diff --cached --quiet || git -C "$MAIN" commit -qm "Plan ronda 5: registro con tipo de cuenta y foto; Nutrición como inicio" >> "$LOG" 2>&1
  return 0
}

preparar() {
  local id=$1 dir="$WT/$1"
  if [ ! -d "$dir" ]; then
    git -C "$MAIN" worktree add -q -b "t/$id" "$dir" main >> "$LOG" 2>&1 || git -C "$MAIN" worktree add -q "$dir" "t/$id" >> "$LOG" 2>&1 || { say "no pude crear el worktree de $id"; return 1; }
  fi
  [ -e "$dir/node_modules" ] || ln -s "$MAIN/node_modules" "$dir/node_modules"
  mkdir -p "$dir/work/out" "$dir/work/blocks"
  # e2e y revisiones usan la Supabase local (claves locales de demostración).
  case $id in XR3|XR5|XR6|RE5|RE5b) cp -f "$MAIN/.env.local" "$dir/.env.local" 2>/dev/null;; esac
  cp -f "$MAIN"/work/out/E2E-*.txt "$MAIN"/work/out/gate-*.txt "$dir/work/out/" 2>/dev/null
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -f "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in XR1) echo 4330;; XR2) echo 4331;; XR4) echo 4332;; XR3) echo 4333;; XR5) echo 4334;; RE5) echo 4335;; XR6) echo 4336;; RE5b) echo 4337;; *) echo 4339;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  case $id in RE5|RE5b) cap=900;; esac
  if [ -f "$MAIN/work/out/$id/report.md" ]; then say "$id ya tiene informe: lo salto"; return 0; fi
  preparar "$id" || return 1
  echo "$id $model work/briefs/$id.md $budget" > "$dir/work/blocks/$id.txt"
  ( cd "$dir" && E2E_PORT=$(puerto "$id") RUN_CAP_SECONDS=$cap CHAIN_OUTER_CAP_SECONDS=$((cap + 300)) work/chain.sh "work/blocks/$id.txt" ) >> "$MAIN/work/out/$id.console" 2>&1
  local st=$?
  if [ -f "$dir/work/out/$id/report.md" ]; then mkdir -p "$MAIN/work/out/$id" && cp "$dir/work/out/$id/report.md" "$MAIN/work/out/$id/report.md"; fi
  say "$id terminó (status $st)$(veredicto "$id")"
}

veredicto() {
  local f="$MAIN/work/out/$1/report.md" v
  case $1 in RE5|RE5b) ;; *) return 0;; esac
  [ -f "$f" ] || { echo " sin informe"; return 0; }
  v="$(grep -oiE 'verdict[^A-Za-z]*\**[^A-Za-z]*(DO NOT SHIP|SHIP)' "$f" | head -1 | grep -oiE 'DO NOT SHIP|SHIP')"
  echo " veredicto=${v:-ninguno}"
}
ship() { [ "$(veredicto "$1")" = " veredicto=SHIP" ]; }

# Sin "-X ours": un conflicto para la cadena y queda para la dueña (no se pierde trabajo en silencio).
unir() {
  local id=$1 br="t/$1"
  git -C "$MAIN" rev-parse -q --verify "$br" >/dev/null || return 0
  [ -z "$(git -C "$MAIN" log --oneline "main..$br" 2>/dev/null)" ] && return 0
  if git -C "$MAIN" merge -q --no-edit "$br" >> "$LOG" 2>&1; then say "unida $br"; return 0; fi
  local un; un=$(git -C "$MAIN" diff --name-only --diff-filter=U | tr '\n' ' ')
  git -C "$MAIN" merge --abort >> "$LOG" 2>&1
  say "CONFLICTO al unir $br en [$un]: PARO (queda para la dueña)"; exit 5
}

ronda() {
  local titulo=$1; shift
  say "$titulo"
  local t id model budget pids=()
  for t in "$@"; do
    IFS=: read -r id model budget <<< "$t"
    correr "$id" "$model" "$budget" &
    pids+=($!)
    sleep 5
  done
  wait "${pids[@]}"
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RE5|RE5b) ;; *) unir "$id";; esac; done
  gates_main
}

base_main() {
  local r
  if ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 ); then r="reset=ok"; else r="reset=FALLÓ (ver work/out/gate-db-reset.txt)"; fi
  if ( cd "$MAIN" && npx supabase test db > work/out/gate-db-test.txt 2>&1 ); then r="$r test-db=ok"; else r="$r test-db=FALLÓ (ver work/out/gate-db-test.txt)"; fi
  say "BASE main: $r"
}

gates_main() {
  local l b t
  ( cd "$MAIN" && npm run -s lint > work/out/gate-lint.txt 2>&1 ); l=$?
  ( cd "$MAIN" && npm run -s build > work/out/gate-build.txt 2>&1 ); b=$?
  ( cd "$MAIN" && npx vitest run > work/out/gate-test.txt 2>&1 ); t=$?
  say "GATES main: lint=$l build=$b test=$t | $(grep -E 'Tests ' "$MAIN/work/out/gate-test.txt" | tail -1 | tr -s ' ')"
}

# Suite e2e completa UNA vez sobre main con la base recién limpia (los revisores leen el resultado).
e2e_main() {
  local out=$1
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  ( cd "$MAIN" && E2E_PORT=4329 timeout 1150 npx playwright test --reporter=line > "work/out/$out.txt" 2>&1 )
  local p; p=$(pgrep -f 'vite preview --port 4329' || true); [ -n "$p" ] && kill $p 2>/dev/null
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  say "E2E main ($out): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' "$MAIN/work/out/$out.txt" | tr -s ' ' | tr '\n' ' ')"
}

resumen() {
  {
    echo "# Resumen ronda 5: registro y portada ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline 431e518..main
    echo; echo '## Veredictos'
    local r; for r in RE5 RE5b; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Pendiente para publicar (solo con OK de la dueña)'
    echo '- Aplicar supabase/migrations/20261122000010_registro_rol_foto.sql (y 11 si existe) al proyecto en la nube.'
    echo '- Build con .env.nube → .env.production.local (y devolverlo), wrangler deploy en la cuenta agentpulqora.'
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-REGISTRO.md"
}

main "$@"

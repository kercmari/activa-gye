#!/usr/bin/env bash
# Activa GYE — Ronda 6 (23/11/2026): revisión del front con work/ref/CHECKLIST-FRONT.md (360 y 1280 px).
# Revisa opus, arregla haiku. 20 min por fase. Nunca push, nunca deploy, nunca la nube.
#   R1 (a la vez): RF1 público+paciente ‖ RF2 staff                → informes con hallazgos A/B
#   R2 (a la vez): XF1 arreglos público/paciente ‖ XF2 staff + e2e  → unión + gates + suite e2e
#   RF3 re-revisión → si DO NOT SHIP: XF3 arreglo → e2e → RF4
# Reanudable: vuelve a lanzarlo y salta las tareas que ya tienen informe.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/front.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.front.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }
  # Va en cola: espera a que terminen las cadenas de la otra sesión sobre el mismo main.
  say 'espero a precios-fase3.sh y registro.sh'
  exec 6>"$MAIN/work/out/.precios-fase3.lock"; flock 6
  exec 7>"$MAIN/work/out/.registro.lock"; flock 7

  say 'INICIO front (ronda 6)'
  plan_en_main || exit 3
  base_main
  ronda "R1: RF1 (público y paciente) ‖ RF2 (nutricionista y admin)" RF1:opus:5 RF2:opus:5
  ronda "R2: XF1 (arreglos público/paciente) ‖ XF2 (arreglos staff + e2e)" XF1:haiku:4 XF2:haiku:4
  base_main
  e2e_main E2E-F1
  ronda "RE-REVISIÓN: RF3 (opus)" RF3:opus:5
  if ship RF3; then
    say 'LISTO: RF3 SHIP. No se publica solo.'
  else
    say 'RF3 DO NOT SHIP → XF3 arreglo y RF4'
    ronda "ARREGLO: XF3" XF3:haiku:4
    base_main
    e2e_main E2E-F2
    ronda "RE-REVISIÓN: RF4 (opus)" RF4:opus:5
    if ship RF4; then say 'LISTO: RF4 SHIP. No se publica solo.'; else say 'NO SHIP: ver work/out/RF4/report.md (queda para la dueña)'; fi
  fi
  resumen
  say 'FIN front'
}

say() { printf '%s %s\n' "$(date '+%F %T')" "$1" | tee -a "$LOG"; }

# El diseño, el generador y los briefs entran en main para que cada worktree los tenga.
plan_en_main() {
  local files="work/ref/CHECKLIST-FRONT.md work/gen/briefs_front.py work/front.sh work/briefs/RF1.md work/briefs/RF2.md work/briefs/RF3.md work/briefs/RF4.md work/briefs/XF1.md work/briefs/XF2.md work/briefs/XF3.md"
  git -C "$MAIN" add $files >> "$LOG" 2>&1 || { say 'no pude preparar el plan en main'; return 1; }
  git -C "$MAIN" diff --cached --quiet || git -C "$MAIN" commit -qm "Plan ronda 6: revisión del front (360 y 1280 px) y arreglos" >> "$LOG" 2>&1
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
  cp -f "$MAIN/.env.local" "$dir/.env.local" 2>/dev/null
  cp -f "$MAIN"/work/out/E2E-*.txt "$MAIN"/work/out/gate-*.txt "$dir/work/out/" 2>/dev/null
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -f "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in RF1) echo 4340;; RF2) echo 4341;; XF1) echo 4342;; XF2) echo 4343;; RF3) echo 4344;; XF3) echo 4345;; RF4) echo 4346;; *) echo 4349;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  case $id in RF3|RF4) cap=900;; esac
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
  case $1 in RF1|RF2|RF3|RF4) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RF*) ;; *) unir "$id";; esac; done
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
  ( cd "$MAIN" && E2E_PORT=4339 timeout 1150 npx playwright test --reporter=line > "work/out/$out.txt" 2>&1 )
  local p; p=$(pgrep -f 'vite preview --port 4339' || true); [ -n "$p" ] && kill $p 2>/dev/null
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  say "E2E main ($out): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' "$MAIN/work/out/$out.txt" | tr -s ' ' | tr '\n' ' ')"
}

resumen() {
  {
    echo "# Resumen ronda 6: revisión del front ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline 21eb52f..main
    echo; echo '## Veredictos'
    local r; for r in RF1 RF2 RF3 RF4; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Pendiente para publicar (solo con OK de la dueña)'
    echo '- Aplicar supabase/migrations/20261122000010_registro_rol_foto.sql (y 11 si existe) al proyecto en la nube.'
    echo '- Build con .env.nube → .env.production.local (y devolverlo), wrangler deploy en la cuenta agentpulqora.'
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-FRONT.md"
}

main "$@"

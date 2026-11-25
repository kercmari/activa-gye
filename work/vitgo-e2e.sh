#!/usr/bin/env bash
# VITGO — Ronda 8 (25/11/2026): dejar la ronda 7 lista para publicar tras RV3 DO NOT SHIP (e2e sin medir en verde).
# Implementa haiku, revisa opus. 20 min por fase. Nunca push, nunca deploy, nunca la nube.
#   R1: XW1 e2e en verde ‖ XW2 grants y textos → unión + gates + db reset
#   R2: e2e completa sobre main (candado huérfano limpiado antes)
#   R3: RW1 gates/e2e/base ‖ RW2 pantallas (opus) → si alguna DO NOT SHIP: XW3 → e2e → RW3 (hasta 2 vueltas)
# Reanudable: vuelve a lanzarlo y salta las tareas que ya tienen informe.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/vitgo-e2e.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.vitgo-e2e.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }
  exec 7>"$MAIN/work/out/.recetas.lock"; flock 7

  say 'INICIO ronda 8 (VITGO listo para publicar)'
  plan_en_main || exit 3
  base_main
  ronda "R1: XW1 (e2e en verde) ‖ XW2 (grants y textos)" XW1:haiku:4 XW2:haiku:4
  base_main
  e2e_main E2E-RW
  ronda "R3: RW1 (gates, e2e, base) ‖ RW2 (pantallas) — opus" RW1:opus:5 RW2:opus:5
  if ship RW1 && ship RW2; then
    say 'LISTO: RW1 y RW2 SHIP. No se publica solo.'
  else
    local vuelta
    for vuelta in 1 2; do
      say "DO NOT SHIP → arreglo XW3 y re-revisión RW3 (vuelta $vuelta)"
      if [ "$vuelta" = 2 ]; then
        mv "$MAIN/work/out/XW3" "$MAIN/work/out/XW3-v1" 2>/dev/null; mv "$MAIN/work/out/RW3" "$MAIN/work/out/RW3-v1" 2>/dev/null
        local w; for w in XW3 RW3; do git -C "$MAIN" worktree remove --force "$WT/$w" >> "$LOG" 2>&1; git -C "$MAIN" branch -D "t/$w" >> "$LOG" 2>&1; done
      fi
      ronda "ARREGLO: XW3" XW3:haiku:4
      base_main
      e2e_main E2E-RW2
      ronda "RE-REVISIÓN: RW3 (opus)" RW3:opus:5
      if ship RW3; then say 'LISTO: RW3 SHIP. No se publica solo.'; break; fi
    done
    ship RW3 || say 'NO SHIP tras 2 vueltas: ver work/out/RW3/report.md (queda para la dueña)'
  fi
  resumen
  say 'FIN ronda 8'
}

say() { printf '%s %s\n' "$(date '+%F %T')" "$1" | tee -a "$LOG"; }

# El diseño, el generador y los briefs entran en main para que cada worktree los tenga.
plan_en_main() {
  local files="work/gen/briefs_vitgo_e2e.py work/vitgo-e2e.sh $(for i in XW1 XW2 XW3 RW1 RW2 RW3; do printf "work/briefs/%s.md " $i; done)"
  git -C "$MAIN" add $files >> "$LOG" 2>&1 || { say 'no pude preparar el plan en main'; return 1; }
  git -C "$MAIN" diff --cached --quiet || git -C "$MAIN" commit -qm "Plan ronda 8: VITGO listo para publicar (e2e en verde, grants y textos)" >> "$LOG" 2>&1
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

puerto() { case $1 in XW1) echo 4371;; XW2) echo 4372;; XW3) echo 4373;; RW1) echo 4374;; RW2) echo 4375;; RW3) echo 4376;; *) echo 4379;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  case $id in RV*|RW*) cap=900;; esac
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
  case $1 in RV*|RW*) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RV*|RW*) ;; *) unir "$id";; esac; done
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
  if ! pgrep -f 'playwright test' > /dev/null; then rmdir /tmp/activagye-e2e-fases.lock 2>/dev/null && say 'candado de fases huérfano borrado'; fi
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  ( cd "$MAIN" && E2E_PORT=4349 timeout 1150 npx playwright test --reporter=line > "work/out/$out.txt" 2>&1 )
  local p; p=$(pgrep -f 'vite preview --port 4349' || true); [ -n "$p" ] && kill $p 2>/dev/null
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  say "E2E main ($out): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' "$MAIN/work/out/$out.txt" | tr -s ' ' | tr '\n' ' ')"
}

resumen() {
  {
    echo "# Resumen ronda 8: VITGO listo para publicar ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline 751f8ca..main
    echo; echo '## Veredictos'
    local r; for r in RW1 RW2 RW3; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Pendiente para publicar (solo con OK de la dueña)'
    echo '- Aplicar las migraciones 12, 13, 14, 15 (y 16 si existe) al proyecto en la nube y comparar grants como el 2026-11-23.'
    echo '- Build con .env.nube → .env.production.local (y devolverlo), wrangler deploy en la cuenta agentpulqora.'
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-RONDA8.md"
}

main "$@"

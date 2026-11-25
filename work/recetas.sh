#!/usr/bin/env bash
# Activa GYE — Ronda 7 (24/11/2026): recetas que llenan el calendario, planes Gratis/Starter/Profesional,
# suscripción por correo y vistas completas de admin y nutricionista.
# Diseño: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md · Plan: docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md
# Implementa haiku, revisa opus. 20 min por fase. Nunca push, nunca deploy, nunca la nube.
#   R1: S12 SQL ‖ DT1 datos                          → unión + gates + db reset
#   R2: S13 SQL ‖ DT2 simulador ‖ UA admin ‖ UP paciente → unión + gates + db reset
#   R3: UN1 nutri tablero/pacientes/plan ‖ UN2 nutri recetas → unión + gates
#   R4: EX2 e2e → suite e2e completa
#   R5: RV1 base ‖ RV2 pantallas (opus) → si alguna DO NOT SHIP: XV → e2e → RV3 (y otra vuelta XV/RV3 si hace falta)
# Reanudable: vuelve a lanzarlo y salta las tareas que ya tienen informe.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/recetas.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.recetas.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }
  say 'espero a otras cadenas sobre el mismo main (si las hay)'
  exec 5>"$MAIN/work/out/.front.lock"; flock 5
  exec 6>"$MAIN/work/out/.precios-fase3.lock"; flock 6
  exec 7>"$MAIN/work/out/.registro.lock"; flock 7

  say 'INICIO recetas (ronda 7)'
  plan_en_main || exit 3
  base_main
  ronda "R1: S12 (SQL planes) ‖ DT1 (contrato y datos)" S12:haiku:4 DT1:haiku:4
  base_main
  ronda "R2: S13 (SQL recetas) ‖ DT2 (simulador) ‖ UA (admin) ‖ UP (paciente)" S13:haiku:4 DT2:haiku:4 UA:haiku:4 UP:haiku:4
  base_main
  ronda "R3: UN1 (nutri tablero/pacientes/plan) ‖ UN2 (nutri recetas)" UN1:haiku:4 UN2:haiku:4
  ronda "R4: EX2 (e2e)" EX2:haiku:4
  e2e_main E2E-RX
  ronda "R5: RV1 (base) ‖ RV2 (pantallas) — opus" RV1:opus:5 RV2:opus:5
  if ship RV1 && ship RV2; then
    say 'LISTO: RV1 y RV2 SHIP. No se publica solo.'
  else
    local vuelta
    for vuelta in 1 2; do
      say "DO NOT SHIP → arreglo XV y re-revisión RV3 (vuelta $vuelta)"
      if [ "$vuelta" = 2 ]; then
        mv "$MAIN/work/out/XV" "$MAIN/work/out/XV-v1" 2>/dev/null; mv "$MAIN/work/out/RV3" "$MAIN/work/out/RV3-v1" 2>/dev/null
        local w; for w in XV RV3; do git -C "$MAIN" worktree remove --force "$WT/$w" >> "$LOG" 2>&1; git -C "$MAIN" branch -D "t/$w" >> "$LOG" 2>&1; done
      fi
      ronda "ARREGLO: XV" XV:haiku:4
      base_main
      e2e_main E2E-RX2
      ronda "RE-REVISIÓN: RV3 (opus)" RV3:opus:5
      if ship RV3; then say 'LISTO: RV3 SHIP. No se publica solo.'; break; fi
    done
    ship RV3 || say 'NO SHIP tras 2 vueltas: ver work/out/RV3/report.md (queda para la dueña)'
  fi
  resumen
  say 'FIN recetas'
}

say() { printf '%s %s\n' "$(date '+%F %T')" "$1" | tee -a "$LOG"; }

# El diseño, el generador y los briefs entran en main para que cada worktree los tenga.
plan_en_main() {
  local files="docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md work/gen/briefs_recetas.py work/recetas.sh $(for i in S12 DT1 S13 DT2 UA UP UN1 UN2 EX2 RV1 RV2 XV RV3; do printf "work/briefs/%s.md " $i; done)"
  git -C "$MAIN" add $files >> "$LOG" 2>&1 || { say 'no pude preparar el plan en main'; return 1; }
  git -C "$MAIN" diff --cached --quiet || git -C "$MAIN" commit -qm "Plan ronda 7: recetas, planes y suscripción por correo" >> "$LOG" 2>&1
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

puerto() { case $1 in S12) echo 4350;; DT1) echo 4351;; S13) echo 4352;; DT2) echo 4353;; UA) echo 4354;; UP) echo 4355;; UN1) echo 4356;; UN2) echo 4357;; EX2) echo 4358;; RV1) echo 4359;; RV2) echo 4360;; XV) echo 4361;; RV3) echo 4362;; *) echo 4369;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  case $id in RV*) cap=900;; esac
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
  case $1 in RV*) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RV*) ;; *) unir "$id";; esac; done
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
  ( cd "$MAIN" && E2E_PORT=4349 timeout 1150 npx playwright test --reporter=line > "work/out/$out.txt" 2>&1 )
  local p; p=$(pgrep -f 'vite preview --port 4349' || true); [ -n "$p" ] && kill $p 2>/dev/null
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  say "E2E main ($out): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' "$MAIN/work/out/$out.txt" | tr -s ' ' | tr '\n' ' ')"
}

resumen() {
  {
    echo "# Resumen ronda 7: recetas, planes y suscripción ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline 4ed889b..main
    echo; echo '## Veredictos'
    local r; for r in RV1 RV2 RV3; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Pendiente para publicar (solo con OK de la dueña)'
    echo '- Aplicar las migraciones 12, 13 (y 14 si existe) al proyecto en la nube y comparar grants como el 2026-11-23.'
    echo '- Build con .env.nube → .env.production.local (y devolverlo), wrangler deploy en la cuenta agentpulqora.'
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-RECETAS.md"
}

main "$@"

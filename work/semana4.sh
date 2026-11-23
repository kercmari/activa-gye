#!/usr/bin/env bash
# Activa GYE — semana gratis estilo Base Vital (21/11/2026). Implementan agentes haiku en paralelo; revisan opus.
# Diseño: docs/superpowers/specs/2026-11-21-semana-gratis-design.md · Contrato BD: docs/superpowers/plans/2026-11-21-db-contrato-semana.md
# Ronda 2 (22/11): arreglos XT2+XU2a → XU2b → e2e completa una vez → revisiones cortas RT2 RU2a RU2b. Hallazgos: work/out/HALLAZGOS-R2.md.
# Reanudable: vuelve a lanzarlo y salta lo hecho. Nunca hace push ni deploy.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/semana4.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.semana4.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }
  
  say 'INICIO semana4'
  ronda "ARREGLOS: XU4a (fases ocultas + logo), XU4b (ingreso y registro)" XU4a:haiku:5 XU4b:haiku:4
  e2e_main
  ronda "REVISIÓN: RE4 (opus)" RE4:opus:5
  gates_main
  if ship RE4; then say 'LISTO: RE4 SHIP. No se publica solo.'; else say 'NO SHIP: ver work/out/RE4/report.md'; fi
  resumen
  say 'FIN semana4'
}

# Suite e2e completa UNA vez sobre main (los revisores leen el resultado y no la repiten).
e2e_main() {
  ( cd "$MAIN" && E2E_PORT=4306 timeout 1150 npx playwright test --reporter=line > work/out/E2E-R4-final.txt 2>&1 )
  local p; p=$(pgrep -f 'vite preview --port 4306' || true); [ -n "$p" ] && kill $p 2>/dev/null
  ( cd "$MAIN" && npx supabase db reset > work/out/gate-db-reset.txt 2>&1 )
  say "E2E main: $(grep -E '^\s+[0-9]+ (passed|failed|flaky)' "$MAIN/work/out/E2E-R4-final.txt" | tr -s ' ' | tr '\n' ' ')"
}

say() { printf '%s %s\n' "$(date '+%F %T')" "$1" | tee -a "$LOG"; }

# Prepara el worktree de una tarea desde el main actual.
preparar() {
  local id=$1 dir="$WT/$1"
  if [ ! -d "$dir" ]; then
    git -C "$MAIN" worktree add -q -b "t/$id" "$dir" main >> "$LOG" 2>&1 || git -C "$MAIN" worktree add -q "$dir" "t/$id" >> "$LOG" 2>&1 || { say "no pude crear el worktree de $id"; return 1; }
  fi
  [ -e "$dir/node_modules" ] || ln -s "$MAIN/node_modules" "$dir/node_modules"
  mkdir -p "$dir/work/out" "$dir/work/blocks"
  # Pruebas de punta a punta y revisiones usan la Supabase local (claves locales de demostración).
  case $id in XU4a|XU4b|RE4) cp -f "$MAIN/.env.local" "$dir/.env.local" 2>/dev/null;; esac
  # Pantallas originales de Base Vital (referencia, sin versionar).
  mkdir -p "$dir/work/ref-base-vital" && cp -rn "$MAIN/work/ref-base-vital/." "$dir/work/ref-base-vital/" 2>/dev/null
  # Informes de las rondas anteriores (para que revisores y arreglos los lean).
  cp -rf "$MAIN"/work/out/e2e-r1-contexto "$dir/work/out/" 2>/dev/null
  cp -f "$MAIN"/work/out/HALLAZGOS-R2.md "$MAIN"/work/out/E2E-R2*.txt "$MAIN"/work/out/gate-*.txt "$dir/work/out/" 2>/dev/null
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -n "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in XU4a) echo 4320;; XU4b) echo 4321;; RE4) echo 4322;; XT2) echo 4300;; XU2a) echo 4301;; XU2b) echo 4302;; RT2) echo 4303;; RU2a) echo 4304;; RU2b) echo 4305;; *) echo 4309;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  case $id in RE4) cap=900;; esac
  preparar "$id" || return 1
  echo "$id $model work/briefs/$id.md $budget" > "$dir/work/blocks/$id.txt"
  ( cd "$dir" && E2E_PORT=$(puerto "$id") RUN_CAP_SECONDS=$cap CHAIN_OUTER_CAP_SECONDS=$((cap + 300)) work/chain.sh "work/blocks/$id.txt" ) >> "$MAIN/work/out/$id.console" 2>&1
  local st=$?
  if [ -f "$dir/work/out/$id/report.md" ]; then mkdir -p "$MAIN/work/out/$id" && cp "$dir/work/out/$id/report.md" "$MAIN/work/out/$id/report.md"; fi
  say "$id terminó (status $st)$(veredicto "$id")"
}

veredicto() {
  local f="$MAIN/work/out/$1/report.md" v
  case $1 in RE4) ;; *) return 0;; esac
  [ -f "$f" ] || { echo " sin informe"; return 0; }
  v="$(grep -oiE 'verdict[^A-Za-z]*\**[^A-Za-z]*(DO NOT SHIP|SHIP)' "$f" | head -1 | grep -oiE 'DO NOT SHIP|SHIP')"
  echo " veredicto=${v:-ninguno}"
}

ship() { [ "$(veredicto "$1")" = " veredicto=SHIP" ]; }

unir() {
  local id=$1 br="t/$1"
  git -C "$MAIN" rev-parse -q --verify "$br" >/dev/null || return 0
  [ -z "$(git -C "$MAIN" log --oneline "main..$br" 2>/dev/null)" ] && return 0
  if git -C "$MAIN" merge -q --no-edit "$br" >> "$LOG" 2>&1; then say "unida $br"; return 0; fi
  local un; un=$(git -C "$MAIN" diff --name-only --diff-filter=U | tr '\n' ' ')
  git -C "$MAIN" merge --abort >> "$LOG" 2>&1
  if git -C "$MAIN" merge -q --no-edit -X ours "$br" >> "$LOG" 2>&1; then say "unida $br con conflictos en [$un] resueltos a favor de main (revisar)"; else git -C "$MAIN" merge --abort >> "$LOG" 2>&1; say "NO pude unir $br (conflicto en $un)"; fi
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RE4) ;; *) unir "$id";; esac; done
  gates_main
}

# Aplica en la base local todas las migraciones + semilla de main y corre las pruebas SQL.
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

resumen() {
  {
    echo "# Resumen semana gratis, ronda 4 ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline -80
    echo; echo '## Veredictos'
    local r; for r in RE4; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-SEMANA4.md"
}

main "$@"

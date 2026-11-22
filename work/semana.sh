#!/usr/bin/env bash
# Activa GYE — semana gratis estilo Base Vital (21/11/2026). Implementan agentes haiku en paralelo; revisan opus.
# Diseño: docs/superpowers/specs/2026-11-21-semana-gratis-design.md · Contrato BD: docs/superpowers/plans/2026-11-21-db-contrato-semana.md
# Rondas: A (S5 D4 U7a U7b U7c U7d) → B (S6 U8a U8b U8c) → C (EG) → revisión (RT RU) → arreglos si hace falta (XT XU → RTb RUb).
# Reanudable: vuelve a lanzarlo y salta lo hecho. Nunca hace push ni deploy.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/semana.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.semana.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }

  say 'INICIO semana'
  docker ps --format '{{.Names}}' | grep -q supabase_db_activa-gye || { say 'Supabase local apagada: la enciendo'; npx supabase start >> "$LOG" 2>&1 || { say 'NO pude encender Supabase local'; exit 3; }; }

  ronda "RONDA A: esquema, datos y pantallas del paciente (S5, D4, U7a, U7b, U7c, U7d)" S5:haiku:5 D4:haiku:5 U7a:haiku:5 U7b:haiku:5 U7c:haiku:4 U7d:haiku:4
  base_main
  ronda "RONDA B: contenido, suscripción, plantillas y nutricionista (S6, U8a, U8b, U8c)" S6:haiku:6 U8a:haiku:4 U8b:haiku:5 U8c:haiku:3
  base_main
  ronda "RONDA C: pruebas de punta a punta y evidencia (EG)" EG:haiku:6
  ronda "REVISIÓN: RT seguridad, RU navegación (opus)" RT:opus:8 RU:opus:8

  if ! ship RT || ! ship RU; then
    ronda "ARREGLOS: XT (base), XU (pantallas)" XT:haiku:5 XU:haiku:5
    base_main
    ronda "RECOMPROBACIÓN: RTb, RUb (opus)" RTb:opus:6 RUb:opus:6
  fi

  gates_main
  if { ship RT && ship RU; } || { ship RTb && ship RUb; }; then
    say 'LISTO: revisiones SHIP. No se publica solo.'
  else
    say 'NO SHIP: ver work/out/<RT|RU|RTb|RUb>/report.md'
  fi
  resumen
  say 'FIN semana'
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
  case $id in EG|RT|RU|RTb|RUb|XU) cp -f "$MAIN/.env.local" "$dir/.env.local" 2>/dev/null;; esac
  # Pantallas originales de Base Vital (referencia, sin versionar).
  mkdir -p "$dir/work/ref-base-vital" && cp -rn "$MAIN/work/ref-base-vital/." "$dir/work/ref-base-vital/" 2>/dev/null
  # Informes de las rondas anteriores (para que revisores y arreglos los lean).
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -n "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in EG) echo 4290;; RT) echo 4291;; RU) echo 4292;; XT) echo 4293;; XU) echo 4294;; RTb) echo 4295;; RUb) echo 4296;; *) echo 4299;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  [ "$id" = EG ] && cap=1500
  preparar "$id" || return 1
  echo "$id $model work/briefs/$id.md $budget" > "$dir/work/blocks/$id.txt"
  ( cd "$dir" && E2E_PORT=$(puerto "$id") RUN_CAP_SECONDS=$cap CHAIN_OUTER_CAP_SECONDS=$((cap + 300)) work/chain.sh "work/blocks/$id.txt" ) >> "$MAIN/work/out/$id.console" 2>&1
  local st=$?
  if [ -f "$dir/work/out/$id/report.md" ]; then mkdir -p "$MAIN/work/out/$id" && cp "$dir/work/out/$id/report.md" "$MAIN/work/out/$id/report.md"; fi
  say "$id terminó (status $st)$(veredicto "$id")"
}

veredicto() {
  local f="$MAIN/work/out/$1/report.md" v
  case $1 in RT|RU|RTb|RUb) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RT|RU|RTb|RUb) ;; *) unir "$id";; esac; done
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
    echo "# Resumen semana gratis ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline -80
    echo; echo '## Veredictos'
    local r; for r in RT RU RTb RUb; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-SEMANA.md"
}

main "$@"

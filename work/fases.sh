#!/usr/bin/env bash
# Activa GYE — backend real y 3 fases (21/11/2026). Implementan agentes haiku en paralelo; revisan opus.
# Plan: docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md · Contrato BD: docs/superpowers/plans/2026-11-21-db-contrato.md
# Rondas: 1 (S1 S2 D1 U1a U1b) → 2 (S3 D2 U2 U2b U3) → 3a (S4 D3 U4a U4b U5a) → 3b (U4c U5b U6a U6b U6c)
#         → 4 (C1 DOC, luego EF) → revisión (RS RN) → arreglos si hace falta (XS XN → RSb RNb).
# Reanudable: vuelve a lanzarlo y salta lo hecho. Nunca hace push ni deploy (publicar necesita a la dueña).
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/fases.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.fases.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }

  say 'INICIO fases'
  docker ps --format '{{.Names}}' | grep -q supabase_db_activa-gye || { say 'Supabase local apagada: la enciendo'; npx supabase start >> "$LOG" 2>&1 || { say 'NO pude encender Supabase local'; exit 3; }; }

  ronda "RONDA 1: fase 1 (S1, S2, D1, U1a, U1b)" S1:haiku:5 S2:haiku:3 D1:haiku:5 U1a:haiku:5 U1b:haiku:4
  base_main
  ronda "RONDA 2: fase 2 parte 1 (S3, D2, U2, U2b, U3)" S3:haiku:5 D2:haiku:4 U2:haiku:5 U2b:haiku:3 U3:haiku:4
  base_main
  ronda "RONDA 3a: fase 2 parte 2 (S4, D3, U4a, U4b, U5a)" S4:haiku:5 D3:haiku:4 U4a:haiku:5 U4b:haiku:4 U5a:haiku:5
  base_main
  ronda "RONDA 3b: pagos y fase 3 (U4c, U5b, U6a, U6b, U6c)" U4c:haiku:4 U5b:haiku:3 U6a:haiku:4 U6b:haiku:4 U6c:haiku:4
  ronda "RONDA 4a: correos y documentos (C1, DOC)" C1:haiku:3 DOC:haiku:3
  base_main
  ronda "RONDA 4b: pruebas de punta a punta y evidencia (EF)" EF:haiku:6
  ronda "REVISIÓN: RS seguridad, RN navegación (opus)" RS:opus:8 RN:opus:8

  if ! ship RS || ! ship RN; then
    ronda "ARREGLOS: XS (base), XN (pantallas)" XS:haiku:5 XN:haiku:5
    base_main
    ronda "RECOMPROBACIÓN: RSb, RNb (opus)" RSb:opus:6 RNb:opus:6
  fi

  gates_main
  if { ship RS && ship RN; } || { ship RSb && ship RNb; }; then
    say 'LISTO: revisiones SHIP. No se publica solo: falta el proyecto Supabase en la nube (lo crea la dueña).'
  else
    say 'NO SHIP: ver work/out/<RS|RN|RSb|RNb>/report.md'
  fi
  resumen
  say 'FIN fases'
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
  case $id in EF|RS|RN|RSb|RNb|XN) cp -f "$MAIN/.env.local" "$dir/.env.local" 2>/dev/null;; esac
  # Informes de las rondas anteriores (para que revisores y arreglos los lean).
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -n "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in EF) echo 4280;; RS) echo 4281;; RN) echo 4282;; XS) echo 4283;; XN) echo 4284;; RSb) echo 4285;; RNb) echo 4286;; *) echo 4299;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1" cap=1200
  [ "$id" = EF ] && cap=1500
  preparar "$id" || return 1
  echo "$id $model work/briefs/$id.md $budget" > "$dir/work/blocks/$id.txt"
  ( cd "$dir" && E2E_PORT=$(puerto "$id") RUN_CAP_SECONDS=$cap CHAIN_OUTER_CAP_SECONDS=$((cap + 300)) work/chain.sh "work/blocks/$id.txt" ) >> "$MAIN/work/out/$id.console" 2>&1
  local st=$?
  if [ -f "$dir/work/out/$id/report.md" ]; then mkdir -p "$MAIN/work/out/$id" && cp "$dir/work/out/$id/report.md" "$MAIN/work/out/$id/report.md"; fi
  say "$id terminó (status $st)$(veredicto "$id")"
}

veredicto() {
  local f="$MAIN/work/out/$1/report.md" v
  case $1 in RS|RN|RSb|RNb) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in RS|RN|RSb|RNb) ;; *) unir "$id";; esac; done
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
    echo "# Resumen fases ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline -80
    echo; echo '## Veredictos'
    local r; for r in RS RN RSb RNb; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN-FASES.md"
}

main "$@"

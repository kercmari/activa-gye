#!/usr/bin/env bash
# Activa GYE — trabajo de toda la noche (21/11/2026). Implementan agentes haiku en paralelo; revisan opus.
# Rondas: 1 (F1 F2a F2b) → 2 (G1 G2 G3 G4) → 3 (E1) → revisión (R1 R2) → arreglos si hace falta (X1 X2 → R1b R2b → X3 X4 → R1c R2c)
# → si todo SHIP: publicación gratis en Cloudflare Workers. Reanudable: vuelve a lanzarlo y salta lo hecho. Nunca hace push.
main() {
  set -uo pipefail
  MAIN=/home/kerly/Desktop/proyects/activa-gye
  WT=/home/kerly/Desktop/proyects/activa-gye-wt
  LOG="$MAIN/work/out/noche.log"
  mkdir -p "$MAIN/work/out" "$MAIN/work/blocks" "$WT"
  cd "$MAIN" || exit 2
  exec 8>"$MAIN/work/out/.noche.lock"; flock -n 8 || { echo "ya está corriendo"; exit 4; }

  say 'INICIO de la noche'
  ronda "RONDA 1: base (F1, F2a, F2b)" F1:haiku:4 F2a:haiku:4 F2b:haiku:4
  ronda "RONDA 2: pantallas (G1, G2, G3, G4)" G1:haiku:4 G2:haiku:4 G3:haiku:4 G4:haiku:4
  ronda "RONDA 3: pruebas y evidencia (E1)" E1:haiku:5
  ronda "REVISIÓN: R1 datos, R2 navegación (opus)" R1:opus:8 R2:opus:8

  if ! ship R1 || ! ship R2; then
    ronda "ARREGLOS 1: X1, X2" X1:haiku:4 X2:haiku:4
    ronda "RECOMPROBACIÓN 1: R1b, R2b (opus)" R1b:opus:6 R2b:opus:6
    if ! ship R1b || ! ship R2b; then
      ronda "ARREGLOS 2: X3, X4" X3:haiku:4 X4:haiku:4
      ronda "RECOMPROBACIÓN 2: R1c, R2c (opus)" R1c:opus:6 R2c:opus:6
    fi
  fi

  local final_ok=1
  if ship R1 && ship R2; then :; elif ship R1b && ship R2b; then :; elif ship R1c && ship R2c; then :; else final_ok=0; fi

  gates_main
  if [ "$final_ok" -eq 1 ]; then publicar; else say 'NO SE PUBLICA: las revisiones no dieron SHIP. Ver informes en work/out/<R*>/report.md'; fi
  resumen
  say 'FIN de la noche'
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
  # Informes de las rondas anteriores (para que revisores y arreglos los lean).
  local d; for d in "$MAIN"/work/out/*/; do [ -f "$d/report.md" ] && mkdir -p "$dir/work/out/$(basename "$d")" && cp -n "$d/report.md" "$dir/work/out/$(basename "$d")/" 2>/dev/null; done
  return 0
}

puerto() { case $1 in E1) echo 4180;; R1) echo 4181;; R2) echo 4182;; X1) echo 4183;; X2) echo 4184;; R1b) echo 4185;; R2b) echo 4186;; X3) echo 4187;; X4) echo 4188;; R1c) echo 4189;; R2c) echo 4190;; *) echo 4199;; esac; }

correr() {
  local id=$1 model=$2 budget=$3 dir="$WT/$1"
  preparar "$id" || return 1
  echo "$id $model work/briefs/$id.md $budget" > "$dir/work/blocks/$id.txt"
  ( cd "$dir" && E2E_PORT=$(puerto "$id") RUN_CAP_SECONDS=1200 CHAIN_OUTER_CAP_SECONDS=1500 work/chain.sh "work/blocks/$id.txt" ) >> "$MAIN/work/out/$id.console" 2>&1
  local st=$?
  # Copia el informe al main para que lo vean las rondas siguientes (work/out no se versiona).
  if [ -f "$dir/work/out/$id/report.md" ]; then mkdir -p "$MAIN/work/out/$id" && cp "$dir/work/out/$id/report.md" "$MAIN/work/out/$id/report.md"; fi
  say "$id terminó (status $st)$(veredicto "$id")"
}

veredicto() {
  local f="$MAIN/work/out/$1/report.md" v
  case $1 in R*) ;; *) return 0;; esac
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
  for t in "$@"; do IFS=: read -r id _ _ <<< "$t"; case $id in R*) ;; *) unir "$id";; esac; done
  gates_main
}

gates_main() {
  ( cd "$MAIN" && npm run -s lint > work/out/gate-lint.txt 2>&1; echo "lint=$?" ; npm run -s build > work/out/gate-build.txt 2>&1; echo "build=$?"; npx vitest run > work/out/gate-test.txt 2>&1; echo "test=$?"; tail -4 work/out/gate-test.txt | tr '\n' ' ' ) 2>&1 | tr '\n' ' ' | sed 's/^/GATES main: /' | while read -r l; do say "$l"; done
}

publicar() {
  say 'PUBLICANDO en Cloudflare Workers (gratis, cuenta con sesión de wrangler)'
  if ( cd "$MAIN" && npm run -s build >> "$LOG" 2>&1 && timeout 300 npx wrangler deploy > work/out/deploy.txt 2>&1 ); then
    say "PUBLICADO: $(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' "$MAIN/work/out/deploy.txt" | head -1)"
  else
    say "FALLÓ la publicación: ver work/out/deploy.txt"
  fi
}

resumen() {
  {
    echo "# Resumen de la noche ($(date '+%F %T'))"
    echo; echo '## Commits en main'; git -C "$MAIN" log --oneline -60
    echo; echo '## Veredictos'
    local r; for r in R1 R2 R1b R2b R1c R2c; do [ -f "$MAIN/work/out/$r/report.md" ] && echo "- $r:$(veredicto $r)"; done
    echo; echo '## Gates main'; tail -5 "$MAIN/work/out/gate-test.txt" 2>/dev/null
    echo; echo '## Registro'; cat "$LOG"
  } > "$MAIN/work/out/RESUMEN.md"
}

main "$@"

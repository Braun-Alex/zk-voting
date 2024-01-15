#!/bin/bash

total_validators=${1:-4}
build_binary=${2:-n}
clear_logs=${3:-y}

./deploy-programs.sh &

if [[ $build_binary == "y" ]]; then
  cargo install --path . || exit 1
fi

if [[ $clear_logs == "y" ]]; then
  clean_processes=()

  for ((validator_index = 0; validator_index < total_validators; validator_index++)); do
    snarkos clean --dev $validator_index &
    clean_processes+=($!)
  done

  for process_id in "${clean_processes[@]}"; do
    wait "$process_id"
  done
fi

log_dir=".logs-$(date +"%Y%m%d%H%M%S")"
mkdir -p "$log_dir"

tmux new-session -d -s "devnet" -n "window0"

validator_indices=($(seq 0 $((total_validators - 1))))

for validator_index in "${validator_indices[@]}"; do
  log_file="$log_dir/validator-$validator_index.log"
  tmux new-window -t "devnet:$validator_index" -n "window$validator_index"
  tmux send-keys -t "devnet:window$validator_index" "snarkos start --nodisplay --dev $validator_index --dev-num-validators $total_validators --validator --logfile $log_file" C-m
done

tmux attach-session -t "devnet"


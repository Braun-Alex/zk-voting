#!/bin/bash

set -e

if [ -f .env ]; then
    export $(cat .env | xargs)
fi

while [[ $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3033/${NETWORK}/latest/height) != 200 ]]; do
    sleep 9
done

echo "Successful snarkOS initialization..."

if [[ $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3033/${NETWORK}/program/id_hashing.aleo) == 500 ]]; then
    echo "Deploying id_hashing.aleo and zk_voting.aleo programs..."

    snarkos developer deploy "id_hashing.aleo" --private-key ${PRIVATE_KEY} --query "http://localhost:3033" --path "id_hashing/build/" --broadcast "http://localhost:3033/${NETWORK}/transaction/broadcast" --priority-fee 300000

    sleep 3

    snarkos developer deploy "zk_voting.aleo" --private-key ${PRIVATE_KEY} --query "http://localhost:3033" --path "zk_voting/build/" --broadcast "http://localhost:3033/${NETWORK}/transaction/broadcast" --priority-fee 300000
fi

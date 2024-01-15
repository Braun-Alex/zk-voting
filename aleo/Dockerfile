FROM rust:latest as builder

RUN apt-get update && apt-get install -y git && apt-get clean

WORKDIR /aleo-network
RUN git clone https://github.com/AleoHQ/snarkOS.git --depth 1
WORKDIR /aleo-network/snarkOS

RUN ./build_ubuntu.sh && cargo install --path .

COPY zk_voting/ /aleo-network/snarkOS/zk_voting/
COPY id_hashing/ /aleo-network/snarkOS/id_hashing/
COPY .env /aleo-network/snarkOS/.env

COPY deploy-programs.sh /aleo-network/snarkOS/deploy-programs.sh
RUN chmod +x /aleo-network/snarkOS/deploy-programs.sh

COPY run-network.sh /aleo-network/snarkOS/run-network.sh
RUN chmod +x /aleo-network/snarkOS/run-network.sh

EXPOSE 4133 3033

ENTRYPOINT ["/aleo-network/snarkOS/run-network.sh"]

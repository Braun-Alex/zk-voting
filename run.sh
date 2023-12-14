#!/bin/bash
if ! command -v leo &> /dev/null
then
    echo "leo is not installed."
    exit
fi

echo "
The private key and address of the proposer.
private_key: APrivateKey1zkp8wKHF9zFX1j4YJrK3JhxtyKDmPbRu9LrnEW8Ki56UQ3G
address: aleo1rfez44epy0m7nv4pskvjy6vex64tnt0xy90fyhrg49cwe0t9ws8sh6nhhr

The private key and address of voter 1.
private_key: APrivateKey1zkpHmSu9zuhyuCJqVfQE8p82HXpCTLVa8Z2HUNaiy9mrug2
address: aleo1c45etea8czkyscyqawxs7auqjz08daaagp2zq4qjydkhxt997q9s77rsp2

The private key and address of voter 2.
private_key: APrivateKey1zkp6NHwbT7PkpnEFeBidz5ZkZ14W8WXZmJ6kjKbEHYdMmf2
address: aleo1uc6jphye8y9gfqtezrz240ak963sdgugd7s96qpuw6k7jz9axs8q2qnhxc
"

echo "
Let's propose a new poll.

echo '
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkp8wKHF9zFX1j4YJrK3JhxtyKDmPbRu9LrnEW8Ki56UQ3G
' > .env

leo run create_poll '{
  title: [1u16, 3u16, 5u16],
  question: [3u16, 3u16, 3u16],
  proposals: [[1u16, 1u16, 1u16], [3u16, 3u16, 3u16], [5u16, 5u16, 5u16]],
  proposal_count: 3u8,
  proposer: aleo1rfez44epy0m7nv4pskvjy6vex64tnt0xy90fyhrg49cwe0t9ws8sh6nhhr,
  duration: 9u32
}'
"

echo "
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkp8wKHF9zFX1j4YJrK3JhxtyKDmPbRu9LrnEW8Ki56UQ3G
" > .env

leo run create_poll "{
  title: [1u16, 3u16, 5u16],
  question: [3u16, 3u16, 3u16],
  proposals: [[1u16, 1u16, 1u16], [3u16, 3u16, 3u16], [5u16, 5u16, 5u16]],
  proposal_count: 3u8,
  proposer: aleo1rfez44epy0m7nv4pskvjy6vex64tnt0xy90fyhrg49cwe0t9ws8sh6nhhr,
  duration: 9u32
}"

echo "
The output generates a new record with the proposal information and sets a public mapping with the proposal id as an argument input.
"

echo "
###############################################################################
########                                                               ########
########                        Proposing a new poll                   ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   0   |   0   |   0   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

echo "
Let's create a new private ticket to make a vote. Take on the role of voter 1 and run the create_ticket transition.

echo '
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkpHmSu9zuhyuCJqVfQE8p82HXpCTLVa8Z2HUNaiy9mrug2
' > .env

leo run create_ticket 3711088592885483821180861574304328371702856282276435646565600442413799740831field aleo1c45etea8czkyscyqawxs7auqjz08daaagp2zq4qjydkhxt997q9s77rsp2
"

echo "
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkpHmSu9zuhyuCJqVfQE8p82HXpCTLVa8Z2HUNaiy9mrug2
" > .env

leo run create_ticket 3711088592885483821180861574304328371702856282276435646565600442413799740831field aleo1c45etea8czkyscyqawxs7auqjz08daaagp2zq4qjydkhxt997q9s77rsp2

echo "
You will see a new private ticket created belonging to the owner.
"

echo "
###############################################################################
########                                                               ########
########                   Voter 1 issues a new poll ticket            ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   0   |   0   |   0   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

echo "
Voter 1 can now vote privately on their ticket. Call the vote transition function.

leo run vote '{
  owner: aleo1c45etea8czkyscyqawxs7auqjz08daaagp2zq4qjydkhxt997q9s77rsp2.private,
  poll_id: 3711088592885483821180861574304328371702856282276435646565600442413799740831field.private,
  _nonce: 1738483341280375163846743812193292672860569105378494043894154684192972730518group.public,
  }' 0u8
"

leo run vote "{
  owner: aleo1c45etea8czkyscyqawxs7auqjz08daaagp2zq4qjydkhxt997q9s77rsp2.private,
  poll_id: 3711088592885483821180861574304328371702856282276435646565600442413799740831field.private,
  _nonce: 1738483341280375163846743812193292672860569105378494043894154684192972730518group.public
  }" 0u8

echo "
###############################################################################
########                                                               ########
########               Voter 1 votes '0u8' on their poll ticket        ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   1   |   0   |   0   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

echo "
Let's create a new private ticket for voter 2. Take on the role of voter 1 and run the create_ticket transition.

echo '
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkp6NHwbT7PkpnEFeBidz5ZkZ14W8WXZmJ6kjKbEHYdMmf2
' > .env

leo run create_ticket 3711088592885483821180861574304328371702856282276435646565600442413799740831field aleo1uc6jphye8y9gfqtezrz240ak963sdgugd7s96qpuw6k7jz9axs8q2qnhxc
"

echo "
NETWORK=testnet3
PRIVATE_KEY=APrivateKey1zkp6NHwbT7PkpnEFeBidz5ZkZ14W8WXZmJ6kjKbEHYdMmf2
" > .env

leo run create_ticket 3711088592885483821180861574304328371702856282276435646565600442413799740831field aleo1uc6jphye8y9gfqtezrz240ak963sdgugd7s96qpuw6k7jz9axs8q2qnhxc

echo "
###############################################################################
########                                                               ########
########                   Voter 2 issues a new poll ticket            ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   0   |   0   |   0   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

echo "
Voter 2 can now vote privately on their ticket.

leo run vote '{
  owner: aleo1uc6jphye8y9gfqtezrz240ak963sdgugd7s96qpuw6k7jz9axs8q2qnhxc.private,
  poll_id: 3711088592885483821180861574304328371702856282276435646565600442413799740831field.private,
  _nonce: 6511154004161574129036815174288926693337549214513234790975047364416273541105group.public,
}' 2u8
"

leo run vote "{
  owner: aleo1uc6jphye8y9gfqtezrz240ak963sdgugd7s96qpuw6k7jz9axs8q2qnhxc.private,
  poll_id: 3711088592885483821180861574304328371702856282276435646565600442413799740831field.private,
  _nonce: 6511154004161574129036815174288926693337549214513234790975047364416273541105group.public
}" 2u8

echo "
###############################################################################
########                                                               ########
########               Voter 1 votes '2u8' on their poll ticket        ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   0   |   0   |   1   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

echo "
Votes on the ticket are private. But the sum total of the votes are shown on-chain in the public mapping. You can query this data on-chain.

###############################################################################
########                                                               ########
########                          Tallying the votes                   ########
########                                                               ########
########                  -----------------------------------          ########
########                  |         |  0u8  |  1u8  |  2u8  |          ########
########                  -----------------------------------          ########
########                  |  Votes  |   1   |   0   |   1   |          ########
########                  -----------------------------------          ########
########                                                               ########
###############################################################################
"

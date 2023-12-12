program zk_voting.aleo {
    mapping polls: field => PollInfo;

    mapping poll_expiration: field => u32;

    mapping poll_exists: field => bool;

    mapping tickets: field => u64;

    mapping votes: field => [u32; 10];

    mapping has_ticket: field => bool;

    record Poll {
        owner: address,
        id: field,
        info: PollInfo,
    }

    record Ticket {
        owner: address,
        poll_id: field,
        proposal_id: u8,
    }

    struct PollInfo {
        title: [u16; 32],
        question: [u16; 32],
        proposals: [[u16; 20]; 10],
        proposal_count: u8,
        proposer: address,
        duration: u32,
    }

    transition create_poll(public info: PollInfo) -> Poll {
        assert_eq(self.caller, info.proposer);

        let id: field = BHP256::hash_to_field(info);

        let new: Poll = Poll {
                      owner: self.caller,
                      id,
                      info,
        };


        return new then finalize(id, info);
    }
    finalize create_poll(public poll_id: field, public poll_info: PollInfo) {
        assert(poll_info.proposal_count >= 2u8 && poll_info.proposal_count <= 10u8);
        let poll_created: bool = Mapping::get_or_use(poll_exists, poll_id, false);
        assert(!poll_created);
        Mapping::set(poll_expiration, poll_id, block.height + poll_info.duration);
        Mapping::set(poll_exists, poll_id, true);
        Mapping::set(polls, poll_id, poll_info);
        Mapping::set(tickets, poll_id, 0u64);
        Mapping::set(votes, poll_id, [0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32]);
    }

    transition create_ticket(
        public poll_id: field,
        voter: address,
        proposal_id: u8,
    ) -> Ticket {
        let new: Ticket = Ticket {
                    owner: voter,
                    poll_id,
                    proposal_id,
        };

        let voter_id: field = BHP256::hash_to_field(new);

        return new then finalize(poll_id, voter_id);
    }
    finalize create_ticket(public poll_id: field, public voter_id: field) {
        let expiration: u32 = Mapping::get(poll_expiration, poll_id);
        assert(expiration > block.height);
        let has_issued: bool = Mapping::get_or_use(has_ticket, voter_id, false);
        assert(!has_issued);
        Mapping::set(has_ticket, voter_id, true);
        let current: u64 = Mapping::get_or_use(tickets, poll_id, 0u64);
        Mapping::set(tickets, poll_id, current + 1u64);
    }

    transition vote(ticket: Ticket) {
        return then finalize(ticket.poll_id, ticket.proposal_id);
    }
    finalize vote(public poll_id: field, public proposal_id: u8) {
        let poll: PollInfo = Mapping::get(polls, poll_id);
        assert(proposal_id + 1u8 <= poll.proposal_count);
        let expiration: u32 = Mapping::get(poll_expiration, poll_id);
        assert(expiration > block.height);
        let vote_counts: [u32; 10] = Mapping::get(votes, poll_id);
        vote_counts[proposal_id].add(1u32);
        Mapping::set(votes, poll_id, vote_counts);
    }
}

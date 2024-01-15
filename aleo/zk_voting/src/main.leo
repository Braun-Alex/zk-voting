program zk_voting.aleo {
    mapping polls: field => PollInfo;

    mapping poll_expiration: field => u32;

    mapping tickets: field => u64;

    mapping votes: field => u64;

    mapping has_ticket: field => bool;

    record Ticket {
        owner: address,
        poll_id: field,
    }

    struct PollInfo {
        title: [u8; 32],
        question: [u8; 32],
        proposals: [[u8; 32]; 32],
        proposal_count: u8,
        proposer: address,
        duration: u32,
    }

    transition create_poll(public info: PollInfo) {
        assert_eq(self.caller, info.proposer);

        return then finalize(info);
    }
    finalize create_poll(public poll_info: PollInfo) {
    	let poll_id: field = Poseidon8::hash_to_field(poll_info);
        assert(poll_info.proposal_count >= 2u8 && poll_info.proposal_count <= 32u8);
        let poll_created: bool = Mapping::contains(polls, poll_id);
        assert(!poll_created);
        Mapping::set(poll_expiration, poll_id, block.height + poll_info.duration);
        Mapping::set(polls, poll_id, poll_info);
        Mapping::set(tickets, poll_id, 0u64);
    }

    transition create_ticket(
        public poll_id: field,
        public voter: address,
    ) -> Ticket {
        let new: Ticket = Ticket {
                    owner: voter,
                    poll_id,
        };

        let voter_id: field = Poseidon8::hash_to_field(new);

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

    transition vote(ticket: Ticket, public proposal_id: u8) {
        return then finalize(ticket.poll_id, proposal_id);
    }
    finalize vote(public poll_id: field, public proposal_id: u8) {
        let poll: PollInfo = Mapping::get(polls, poll_id);
        assert(proposal_id + 1u8 <= poll.proposal_count);
        let expiration: u32 = Mapping::get(poll_expiration, poll_id);
        assert(expiration > block.height);
        let voting_slot: field = Poseidon8::hash_to_field(poll_id + proposal_id as field);
        let slot_votes_count: u64 = Mapping::get_or_use(votes, voting_slot, 0u64);
        Mapping::set(votes, voting_slot, slot_votes_count + 1u64);
    }
}

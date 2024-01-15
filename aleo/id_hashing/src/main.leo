program id_hashing.aleo {
    struct PollInfo {
        title: [u8; 32],
        question: [u8; 32],
        proposals: [[u8; 32]; 32],
        proposal_count: u8,
        proposer: address,
        duration: u32,
    }

    transition to_poll_id(public info: PollInfo) -> field {
        let poll_id: field = Poseidon8::hash_to_field(info);
        return poll_id;
    }

    transition to_voting_slot(public poll_id: field, public proposal_id: u8) -> field {
        let voting_slot: field = Poseidon8::hash_to_field(poll_id + proposal_id as field);
        return voting_slot;
    }
}

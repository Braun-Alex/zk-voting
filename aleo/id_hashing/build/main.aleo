program id_hashing.aleo;

struct PollInfo:
    title as [u8; 32u32];
    question as [u8; 32u32];
    proposals as [[u8; 32u32]; 32u32];
    proposal_count as u8;
    proposer as address;
    duration as u32;


function to_poll_id:
    input r0 as PollInfo.public;
    hash.psd8 r0 into r1 as field;
    output r1 as field.private;


function to_voting_slot:
    input r0 as field.public;
    input r1 as u8.public;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.psd8 r3 into r4 as field;
    output r4 as field.private;

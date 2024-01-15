program zk_voting.aleo;

record Ticket:
    owner as address.private;
    poll_id as field.private;

struct PollInfo:
    title as [u8; 32u32];
    question as [u8; 32u32];
    proposals as [[u8; 32u32]; 32u32];
    proposal_count as u8;
    proposer as address;
    duration as u32;


mapping polls:
	key as field.public;
	value as PollInfo.public;


mapping poll_expiration:
	key as field.public;
	value as u32.public;


mapping tickets:
	key as field.public;
	value as u64.public;


mapping votes:
	key as field.public;
	value as u64.public;


mapping has_ticket:
	key as field.public;
	value as boolean.public;

function create_poll:
    input r0 as PollInfo.public;
    assert.eq self.caller r0.proposer;
    async create_poll r0 into r1;
    output r1 as zk_voting.aleo/create_poll.future;

finalize create_poll:
    input r0 as PollInfo.public;
    hash.psd8 r0 into r1 as field;
    gte r0.proposal_count 2u8 into r2;
    lte r0.proposal_count 32u8 into r3;
    and r2 r3 into r4;
    assert.eq r4 true;
    contains polls[r1] into r5;
    not r5 into r6;
    assert.eq r6 true;
    add block.height r0.duration into r7;
    set r7 into poll_expiration[r1];
    set r0 into polls[r1];
    set 0u64 into tickets[r1];


function create_ticket:
    input r0 as field.public;
    input r1 as address.public;
    cast r1 r0 into r2 as Ticket.record;
    hash.psd8 r2 into r3 as field;
    async create_ticket r0 r3 into r4;
    output r2 as Ticket.record;
    output r4 as zk_voting.aleo/create_ticket.future;

finalize create_ticket:
    input r0 as field.public;
    input r1 as field.public;
    get poll_expiration[r0] into r2;
    gt r2 block.height into r3;
    assert.eq r3 true;
    get.or_use has_ticket[r1] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    set true into has_ticket[r1];
    get.or_use tickets[r0] 0u64 into r6;
    add r6 1u64 into r7;
    set r7 into tickets[r0];


function vote:
    input r0 as Ticket.record;
    input r1 as u8.public;
    async vote r0.poll_id r1 into r2;
    output r2 as zk_voting.aleo/vote.future;

finalize vote:
    input r0 as field.public;
    input r1 as u8.public;
    get polls[r0] into r2;
    add r1 1u8 into r3;
    lte r3 r2.proposal_count into r4;
    assert.eq r4 true;
    get poll_expiration[r0] into r5;
    gt r5 block.height into r6;
    assert.eq r6 true;
    cast r1 into r7 as field;
    add r0 r7 into r8;
    hash.psd8 r8 into r9 as field;
    get.or_use votes[r9] 0u64 into r10;
    add r10 1u64 into r11;
    set r11 into votes[r9];

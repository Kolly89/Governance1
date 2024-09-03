import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });
let polls = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);
        if (jsonPayload.method === "create_poll") {
            polls[jsonPayload.pollId] = {
                question: jsonPayload.question,
                options: jsonPayload.options,
                votes: {},
                creator: sender
            };
            console.log("Poll created:", jsonPayload.pollId);
        } else if (jsonPayload.method === "vote") {
            const poll = polls[jsonPayload.pollId];
            poll.votes[sender] = jsonPayload.vote;
            console.log("Vote cast:", jsonPayload.vote);
        }
        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const pollId = hexToString(payload).split("/")[1];
    const poll = polls[pollId] || {};
    const results = {};
    for (const vote of Object.values(poll.votes || {})) {
        results[vote] = (results[vote] || 0) + 1;
    }
    await app.createReport({ payload: stringToHex(JSON.stringify(results)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});

const {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} = require("@aws-sdk/client-bedrock-agentcore");

const bedrockClient = new BedrockAgentCoreClient();

const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN;
const AGENT_QUALIFIER = process.env.AGENT_QUALIFIER || "DEFAULT";

if (!AGENT_RUNTIME_ARN) {
  throw new Error(
    "AGENT_RUNTIME_ARN environment variable is required for the agent proxy Lambda"
  );
}

exports.handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const body = event?.body
    ? typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body
    : event || {};

  const runtimeSessionId = body.runtimeSessionId;
  const payload = body.payload;

  if (!runtimeSessionId || !payload) {
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });

    stream.write(
      JSON.stringify({ error: "Missing runtimeSessionId or payload" })
    );
    stream.end();
    return;
  }

  let sseStream;
  const ensureSseStream = (statusCode = 200) => {
    if (!sseStream) {
      sseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
    return sseStream;
  };

  try {
    let payloadBytes;
    if (typeof payload === "object") {
      payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");
    } else if (typeof payload === "string") {
      payloadBytes = Buffer.from(payload, "utf-8");
    } else {
      payloadBytes = Buffer.from(payload);
    }

    console.log(`Invoking AgentCore with session ID: ${runtimeSessionId}`);

    const command = new InvokeAgentRuntimeCommand({
      runtimeSessionId,
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      qualifier: AGENT_QUALIFIER,
      payload: payloadBytes,
    });

    const response = await bedrockClient.send(command);
    const eventStream = response.response;

    if (!eventStream) {
      const stream = ensureSseStream(502);
      stream.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "No response stream from AgentCore",
        })}\n\n`
      );
      stream.end();
      return;
    }

    const stream = ensureSseStream(200);

    console.log("Starting direct streaming of AgentCore response");

    for await (const chunk of eventStream) {
      let chunkBuffer;

      if (chunk?.chunk?.bytes) {
        chunkBuffer = Buffer.from(chunk.chunk.bytes);
      } else if (chunk?.bytes) {
        chunkBuffer = Buffer.from(chunk.bytes);
      } else if (typeof chunk === "string") {
        chunkBuffer = Buffer.from(chunk, "utf-8");
      } else if (chunk instanceof Uint8Array) {
        chunkBuffer = Buffer.from(chunk);
      } else if (chunk) {
        const serialized = JSON.stringify(chunk);
        chunkBuffer = Buffer.from(serialized, "utf-8");
      }

      if (!chunkBuffer) {
        console.warn("Received empty chunk from AgentCore", chunk);
        continue;
      }

      const chunkPreview = chunkBuffer.toString("utf-8");
      console.log("[Agent Proxy] Received chunk from AgentCore:", chunkPreview);

      stream.write(chunkBuffer);

      console.log("[Agent Proxy] Forwarded chunk to client:", chunkPreview);
    }

    console.log("Direct streaming complete");
    stream.end();
  } catch (error) {
    console.error("Error in streaming response:", error);

    const stream = ensureSseStream(200);
    stream.write(
      `data: ${JSON.stringify({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      })}\n\n`
    );
    stream.end();
  }
});

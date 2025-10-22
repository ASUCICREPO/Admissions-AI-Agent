export type AppConfig = {
  formSubmissionApi: string | undefined;
  agentProxyUrl: string | undefined;
};

export const config: AppConfig = {
  formSubmissionApi: process.env.NEXT_PUBLIC_FORM_SUBMISSION_API,
  agentProxyUrl: process.env.NEXT_PUBLIC_AGENT_PROXY_URL,
};

if (!config.formSubmissionApi) {
  console.warn("NEXT_PUBLIC_FORM_SUBMISSION_API not configured.");
}

if (!config.agentProxyUrl) {
  console.warn("NEXT_PUBLIC_AGENT_PROXY_URL not configured.");
}

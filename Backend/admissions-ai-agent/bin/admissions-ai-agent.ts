#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AdmissionsAgentStack } from "../lib/admissions-agent-stack";
import { AmplifyHostingStack } from "../lib/amplify-hosting-stack";
require("dotenv").config();

const envDev = {
  account: process.env.AWS_ACCOUNT,
  region: process.env.AWS_REGION,
};

const app = new cdk.App();
const backend = new AdmissionsAgentStack(
  app,
  "AdmissionsAgentStack",
  {
    env: envDev,
    description: " dev env Stack for Admissions Agent",
  }
);

const amplify = new AmplifyHostingStack(app, "AmplifyHostingStack", {
  env: envDev,
  description:
    "DEVELOPMENT Environment Stack for Admissions Agent V1 FRONTEND APP - Manual Deployment",
  appEnv: {
    NEXT_PUBLIC_AGENT_PROXY_URL: backend.agentProxyFunctionUrl,
    NEXT_PUBLIC_FORM_SUBMISSION_API: backend.formSubmissionApi,
  },
});

amplify.addDependency(backend);

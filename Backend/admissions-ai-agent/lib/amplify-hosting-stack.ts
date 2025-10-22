import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as aws_amplify from "@aws-cdk/aws-amplify-alpha";

interface AmplifyHostingStackProps extends cdk.StackProps {
  appEnv?: Record<string, string>;
}

export class AmplifyHostingStack extends cdk.Stack {
  public readonly websiteUrl: string;
  public readonly appId: string;

  constructor(scope: Construct, id: string, props: AmplifyHostingStackProps) {
    super(scope, id, props);

    // Create Amplify app for manual deployment of pre-built files only
    const amplifyApp = new aws_amplify.App(
      this,
      "Admissions-Agent-Frontend-Amplify-App-Manual-Deploy-v1",
      {
        description:
          "Admissions Agent Frontend - Manual Deployment (Pre-built Files Only)",
        // No sourceCodeProvider and no buildSpec for manual deployment
      }
    );

    // branch is required so we use main here
    const branch = amplifyApp.addBranch("manual-deploy-v1", {
      branchName: "main",
      environmentVariables: props.appEnv ?? {},
      autoBuild: false,
    });

    this.websiteUrl = `https://${branch.branchName}.${amplifyApp.defaultDomain}`;
    this.appId = amplifyApp.appId;

    new cdk.CfnOutput(this, "AmplifyAppIdv1", {
      value: this.appId,
      description:
        "Amplify App ID for manual deployment (pre-built files only)",
    });

    new cdk.CfnOutput(this, "AmplifyWebsiteUrlv1", {
      value: this.websiteUrl,
      description: "Amplify default domain for the app",
    });
  }
}

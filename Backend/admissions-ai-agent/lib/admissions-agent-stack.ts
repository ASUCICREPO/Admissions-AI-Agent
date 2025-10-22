import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as api_gateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda_event_sources from "aws-cdk-lib/aws-lambda-event-sources";
import { Duration } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";

export class AdmissionsAgentStack extends cdk.Stack {
  public readonly agentProxyFunctionUrl: string;
  public readonly formSubmissionApi: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 bucket for admissions data files - English, this is the bucket that can be used to store the admissions data files and connect to the knowledge base.
    const admissionsDataBucket = new s3.Bucket(this, "AdmissionsDataBucket", {
      bucketName: "admissions-data-english-v1",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // table for whatsapp and chat sessions
    const whatsappSessionsTable = new dynamodb.Table(
      this,
      "WhatsappSessionsTablev2",
      {
        tableName: "WhatsappSessionsv2",
        partitionKey: {
          name: "phone_number",
          type: dynamodb.AttributeType.STRING,
        },
      }
    );

    //  ------------------------------ Agent core section------------------------------

    // IAM Role for AgentCore Runtime
    const agentCoreRole = new iam.Role(this, "AgentCoreExecutionRole", {
      assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com"),
      roleName: "AdmissionsAgentCoreRolev1",
      description: "Execution role for Bedrock AgentCore runtime",
    });

    agentCoreRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:*",
          "logs:*",
          "s3:*",
          "ecr:*",
          "bedrock-agentcore:*",
          "dynamodb:*",
          "sqs:*",
        ],
        resources: ["*"],
      })
    );

    // ECR Repository for agent container images
    const ecrRepository = new ecr.Repository(this, "AgentRepository", {
      repositoryName: "admissions-ai-agent-v1",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: "Keep last 10 images",
          maxImageCount: 10,
        },
      ],
    });

    // Outputs for use with AgentCore toolkit
    new cdk.CfnOutput(this, "AgentCoreRoleArn", {
      value: agentCoreRole.roleArn,
      description: "IAM Role ARN for AgentCore execution",
      exportName: "AdmissionsAgentCoreRoleArn",
    });

    new cdk.CfnOutput(this, "ECRRepositoryUri", {
      value: ecrRepository.repositoryUri,
      description: "ECR Repository URI for agent images",
      exportName: "AdmissionsAgentECRUri",
    });

    new cdk.CfnOutput(this, "ECRRepositoryName", {
      value: ecrRepository.repositoryName,
      description: "ECR Repository Name",
      exportName: "AdmissionsAgentECRName",
    });

    new cdk.CfnOutput(this, "WhatsappSessionsTableName", {
      value: whatsappSessionsTable.tableName,
      description: "Whatsapp Sessions Table Name",
      exportName: "AdmissionsWhatsappSessionsTableName",
    });

    //  ------------------------------------- Lambda Layers -------------------------------------
    // creating the layer for all the dependencies for the "Langchain" framework
    const salesforce_layer = new lambda.LayerVersion(this, "salesforce_layer_v1", {
      compatibleRuntimes: [
        lambda.Runtime.PYTHON_3_10,
        lambda.Runtime.PYTHON_3_12,
        lambda.Runtime.PYTHON_3_11,
        lambda.Runtime.PYTHON_3_9,
      ],
      code: lambda.Code.fromAsset("salesforce-layer/salesforce"),
      description: "The Salesforce layer v2",
    });

    // ==================== Twilio layer  ====================
    const twilio_layer = new lambda.LayerVersion(this, "twilio_layer_v1", {
      compatibleRuntimes: [
        lambda.Runtime.PYTHON_3_10,
        lambda.Runtime.PYTHON_3_12,
        lambda.Runtime.PYTHON_3_11,
        lambda.Runtime.PYTHON_3_9,
      ],
      code: lambda.Code.fromAsset("twilio-layer/python-twilio"),
      description: "The Twilio layer",
    });

    const form_submit_salesforce = new lambda.Function(
      this,
      "form_submit_salesforce_v1",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "form_submission.handler",
        timeout: Duration.minutes(15),
        code: lambda.Code.fromAsset("lambda"),
        layers: [salesforce_layer],
        environment: {
          SF_USERNAME: process.env.SF_USERNAME!,
          SF_PASSWORD: process.env.SF_PASSWORD!,
          SF_TOKEN: process.env.SF_TOKEN!,
        },
      }
    );

    form_submit_salesforce.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["logs:*", "apigateway:*", "dynamodb:*", "s3:*"],
        resources: ["*"],
      })
    );

    // API Gateway for the Lambda function
    const salesforce_api = new api_gateway.RestApi(this, "salesforce_v2_api_v1", {
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new api_gateway.LogGroupLogDestination(
          new logs.LogGroup(this, "salesforce_v2_api_log_group_v1", {
            logGroupName: "salesforce_v2_api_log_group_v1",
            retention: RetentionDays.ONE_MONTH,
            removalPolicy: RemovalPolicy.DESTROY,
          })
        ),
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["*"],
        allowOrigins: api_gateway.Cors.ALL_ORIGINS,
        allowMethods: api_gateway.Cors.ALL_METHODS,
      },
    });

    //  ------------------- lambda integrations -------------------
    // -------- create form lead integration --------
    const form_lead_creation_create_integration =
      new api_gateway.LambdaIntegration(form_submit_salesforce);
    // declaring the resource and then adding method
    const form_lead_creation_api_path =
      salesforce_api.root.addResource("createFormLead");
    form_lead_creation_api_path.addMethod(
      "POST",
      form_lead_creation_create_integration
    );

    this.formSubmissionApi = salesforce_api.url;
    
    new cdk.CfnOutput(this, "FormSubmissionApi", {
      value: this.formSubmissionApi,
      description: "API Gateway URL for form submission",
      exportName: "AdmissionsFormSubmissionApi",
    });

    // DynamoDB Table for Message Tracking 
    const whatsappMessageTrackingTable = new dynamodb.Table(
      this,
      "WhatsAppMessageTrackingTablev2",
      {
        tableName: "WhatsAppMessageTrackingv2",
        partitionKey: {
          name: "eum_msg_id",
          type: dynamodb.AttributeType.STRING,
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    // ==================== TWILIO WHATSAPP INTEGRATION ====================

    // 1. SQS Queue for Twilio WhatsApp Messages
    const twilioWhatsappQueue = new sqs.Queue(this, "TwilioWhatsAppQueuev1", {
      queueName: "twilio-whatsapp-queue-v1",
      retentionPeriod: Duration.hours(2),
      visibilityTimeout: Duration.minutes(10),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Lambda: Send WhatsApp Messages via Twilio
    const sendTwilioWhatsappLambda = new lambda.Function(
      this,
      "SendTwilioWhatsAppLambdav1",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "send_whatsapp_twilio.handler",
        timeout: Duration.minutes(10),
        code: lambda.Code.fromAsset("lambda"),
        layers: [twilio_layer],
        environment: {
          TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
          TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
          TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
          MESSAGE_TRACKING_TABLE_NAME: whatsappMessageTrackingTable.tableName,
        },
      }
    );

    // 3. Permissions
    whatsappMessageTrackingTable.grantReadWriteData(sendTwilioWhatsappLambda);
    twilioWhatsappQueue.grantConsumeMessages(sendTwilioWhatsappLambda);

    // 4. SQS Event Source for Twilio Send Lambda
    sendTwilioWhatsappLambda.addEventSource(
      new lambda_event_sources.SqsEventSource(twilioWhatsappQueue, {
        batchSize: 1,
      })
    );

    // 5. Outputs
    new cdk.CfnOutput(this, "TwilioWhatsAppQueueUrl", {
      value: twilioWhatsappQueue.queueUrl,
      description:
        "SQS Queue URL for Twilio WhatsApp messages - Add to AgentCore .env as TWILIO_WHATSAPP_QUEUE_URL",
      exportName: "AdmissionsTwilioWhatsAppQueueUrl",
    });

    const agentProxyLambda = new lambda.Function(this, "AgentProxyLambdav1", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: Duration.minutes(15),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "..", "lambda", "agent-proxy")
      ),
      environment: {
        AGENT_RUNTIME_ARN: process.env.AGENT_RUNTIME_ARN!,
        AGENT_QUALIFIER: "DEFAULT",
      },
    });

    agentProxyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock-agentcore:InvokeAgentRuntime"],
        resources: ["*"],
      })
    );

    const agentProxyFunctionUrl = agentProxyLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["*"],
      },
    });

    this.agentProxyFunctionUrl = agentProxyFunctionUrl.url;

    new cdk.CfnOutput(this, "AgentProxyFunctionUrlv1", {
      value: this.agentProxyFunctionUrl,
      description: "Invoke URL for the streaming Agent proxy Lambda",
      exportName: "AdmissionsAgentProxyFunctionUrl",
    });
  }
}

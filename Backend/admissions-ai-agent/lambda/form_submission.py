import json
import os
import logging
from simple_salesforce import Salesforce

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

sf_username = os.environ.get("SF_USERNAME")
sf_password = os.environ.get("SF_PASSWORD")
sf_token = os.environ.get("SF_TOKEN")


def handler(event, context):
    """
    Lambda handler for processing form submissions and storing them in Salesforce
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Parse the request body
        body = json.loads(event.get("body", "{}"))
        logger.info(f"Parsed body: {body}")

        # Validate required fields
        if not body:
            return build_response(
                400,
                {"error": "Empty request body", "message": "Please provide form data"},
            )

        # Connect to Salesforce
        try:
            sf = Salesforce(
                username=sf_username,
                password=sf_password,
                security_token=sf_token,
            )
            logger.info("Successfully connected to Salesforce")
        except Exception as e:
            logger.error(f"Failed to connect to Salesforce: {str(e)}")
            return build_response(
                500,
                {
                    "error": "Salesforce connection error",
                    "message": "Failed to connect to Salesforce",
                },
            )

        # Map form data to Salesforce Lead fields
        lead_data = map_form_to_lead(body)

        # Create Lead in Salesforce
        try:
            result = sf.Lead.create(lead_data)
            logger.info(f"Successfully created Lead: {result['id']}")

            return build_response(
                200,
                {
                    "success": True,
                    "salesforce_id": result["id"],
                    "message": "Form submission stored in Salesforce successfully",
                },
            )
        except Exception as e:
            logger.error(f"Failed to create Lead: {str(e)}")
            return build_response(
                500,
                {
                    "success": False,
                    "error": str(e),
                    "message": "Failed to store form submission in Salesforce",
                },
            )

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return build_response(
            400, {"error": "Invalid JSON", "message": "Request body must be valid JSON"}
        )

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return build_response(
            500, {"error": str(e), "message": "An unexpected error occurred"}
        )


def map_form_to_lead(form_data):
    """
    Map form submission data to Salesforce Lead fields

    Expected form fields:
    - firstName: string
    - lastName: string
    - email: string
    - cellPhone: string
    - headquarters: string (goes to Description)
    - programType: string (goes to Description)
    """
    lead_data = {}

    # Map direct fields
    lead_data["FirstName"] = form_data.get("firstName", "")
    lead_data["LastName"] = form_data.get("lastName", "")
    lead_data["Email"] = form_data.get("email", "")
    lead_data["Phone"] = form_data.get("cellPhone", "")

    # Build description from headquarters and programType
    description_parts = []
    if form_data.get("headquarters"):
        description_parts.append(f"Headquarters: {form_data['headquarters']}")
    if form_data.get("programType"):
        description_parts.append(f"Program Type: {form_data['programType']}")

    if description_parts:
        lead_data["Description"] = "\n".join(description_parts)

    # Set defaults
    lead_data["Company"] = "Not Provided"
    lead_data["LeadSource"] = "Web Form - Admissions"
    lead_data["Status"] = "New"

    logger.info(f"Mapped lead data: {lead_data}")
    return lead_data


def build_response(status_code, body):
    """
    Build HTTP response with proper headers

    Args:
        status_code: HTTP status code
        body: Response body (will be JSON encoded)

    Returns:
        Dictionary with statusCode, headers, and body
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }

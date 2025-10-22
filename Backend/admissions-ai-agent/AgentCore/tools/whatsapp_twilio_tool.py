#!/usr/bin/env python3

import os
import boto3
import json
import logging
from datetime import datetime
from strands import tool
from typing import Optional

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
TWILIO_QUEUE_URL = os.getenv('TWILIO_WHATSAPP_QUEUE_URL')

# University Configuration
UNIVERSITY_SHORT_NAME = os.getenv('UNIVERSITY_SHORT_NAME', 'MU')

# AWS Clients
sqs = boto3.client('sqs', region_name=AWS_REGION)


def send_custom_twilio_message(
    phone_number: str,
    custom_message: str
) -> str:
    """
    Internal helper function: Send custom WhatsApp message via Twilio SQS.

    This is NOT a tool - it's called internally by the advisor_handoff_tool.

    Args:
        phone_number: Student's phone number in E.164 format (e.g., +918427094436)
        custom_message: AI-generated personalized message content

    Returns:
        Success message or error description
    """
    # Validate inputs
    if not phone_number:
        error_msg = "Error: Phone number is required to send WhatsApp message"
        logger.error(error_msg)
        return error_msg

    if not custom_message:
        error_msg = "Error: Message content is required"
        logger.error(error_msg)
        return error_msg

    if not TWILIO_QUEUE_URL:
        error_msg = "Error: Twilio queue URL not configured. Please set TWILIO_WHATSAPP_QUEUE_URL environment variable."
        logger.error(error_msg)
        return error_msg

    # Ensure phone number has E.164 format
    if not phone_number.startswith('+'):
        phone_number = f'+{phone_number}'

    try:
        # Prepare SQS message payload
        message_payload = {
            'phone_number': phone_number,
            'message': custom_message,
            'timestamp': datetime.utcnow().isoformat(),
            'message_type': 'advisor_handoff',
            'source': 'bedrock_agent_handoff'
        }

        # Send message to Twilio SQS queue for processing
        response = sqs.send_message(
            QueueUrl=TWILIO_QUEUE_URL,
            MessageBody=json.dumps(message_payload)
        )

        message_id = response.get('MessageId')
        logger.info(f"✅ Custom Twilio WhatsApp message queued successfully")
        logger.info(f"   Phone: {phone_number}")
        logger.info(f"   Message: {custom_message[:100]}...")
        logger.info(f"   SQS Message ID: {message_id}")

        return (
            f"WhatsApp message queued successfully via Twilio for {phone_number}. "
            f"Message ID: {message_id}. The student will receive the personalized message shortly."
        )

    except Exception as e:
        error_msg = f"Error sending custom Twilio WhatsApp message: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return error_msg


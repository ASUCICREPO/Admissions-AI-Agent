#!/usr/bin/env python3

import os
import json
import boto3
import logging
from datetime import datetime, timedelta, UTC
from typing import Dict, Any, Optional
from twilio.rest import Client

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')

# Environment variables - Twilio credentials
TWILIO_ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
TWILIO_AUTH_TOKEN = os.environ['TWILIO_AUTH_TOKEN']
TWILIO_PHONE_NUMBER = os.environ['TWILIO_PHONE_NUMBER']
MESSAGE_TRACKING_TABLE_NAME = os.environ['MESSAGE_TRACKING_TABLE_NAME']

# DynamoDB table
msg_tracking_table = dynamodb.Table(MESSAGE_TRACKING_TABLE_NAME)

# Cache for Twilio client (reused across Lambda invocations)
_twilio_client = None


def handler(event, context):
    """
    Lambda handler for sending WhatsApp messages via Twilio.
    Triggered by SQS queue.

    Args:
        event: SQS event with message payload
        context: Lambda context

    Returns:
        Response dict with batch item failures for retry
    """
    
    print(event)
    
    
    logger.info(f"📨 Received {len(event.get('Records', []))} message(s) from SQS")

    failed_msgs = []

    # Get Twilio client once for all messages
    try:
        twilio_client, twilio_number = get_twilio_client()
    except Exception as e:
        logger.error(f"❌ Failed to initialize Twilio client: {e}")
        # All messages fail if we can't get credentials
        return {
            "batchItemFailures": [
                {"itemIdentifier": record["messageId"]}
                for record in event.get("Records", [])
            ]
        }

    for record in event.get("Records", []):
        try:
            payload = json.loads(record.get("body"))
            phone_number = payload.get("phone_number")
            message = payload.get("message")
            message_type = payload.get("message_type", "unknown")

            if not phone_number or not message:
                logger.warning(
                    f"⚠️ Skipping message with missing phone_number or message"
                )
                continue

            logger.info(f"📲 Processing Twilio WhatsApp message")
            logger.info(f"   Recipient: {phone_number}")
            logger.info(f"   Type: {message_type}")

            # Send WhatsApp message via Twilio
            message_sid = send_whatsapp_message(
                client=twilio_client,
                from_number=twilio_number,
                to_number=phone_number,
                message=message,
            )

            if message_sid:
                # Track successful delivery
                track_message(message_sid, "sent_via_twilio", phone_number)
                logger.info(f"✅ Message processed successfully for {phone_number}")
            else:
                # Message failed to send
                logger.error(f"❌ Failed to send message to {phone_number}")
                failed_msgs.append({"itemIdentifier": record["messageId"]})

        except Exception as e:
            logger.error(f"❌ Error processing record: {e}", exc_info=True)
            failed_msgs.append({"itemIdentifier": record["messageId"]})

    logger.info(f"✅ Processing complete. Failed messages: {len(failed_msgs)}")

    return {"batchItemFailures": failed_msgs}


def get_twilio_client() -> tuple[Client, str]:
    """
    Initialize Twilio client using environment variables.
    Client is cached for subsequent invocations.

    Returns:
        Tuple of (Twilio Client, Twilio phone number)
    """
    global _twilio_client

    if _twilio_client is not None:
        logger.info("Using cached Twilio client")
        return _twilio_client, TWILIO_PHONE_NUMBER

    try:
        logger.info(f"Initializing Twilio client from environment variables")

        # Initialize Twilio client
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        logger.info(f"✅ Twilio client initialized successfully")
        logger.info(f"   Twilio number: {TWILIO_PHONE_NUMBER}")

        return _twilio_client, TWILIO_PHONE_NUMBER

    except Exception as e:
        logger.error(f"❌ Error initializing Twilio client: {e}")
        raise


def send_whatsapp_message(client: Client, from_number: str, to_number: str, message: str) -> Optional[str]:
    """
    Send WhatsApp message using Twilio API.

    Args:
        client: Twilio client instance
        from_number: Twilio WhatsApp number (e.g., +14155238886)
        to_number: Recipient phone number (e.g., +918427094436)
        message: Message content

    Returns:
        Message SID if successful, None otherwise
    """
    try:
        # Ensure phone numbers have correct format
        if not from_number.startswith('+'):
            from_number = f'+{from_number}'
        if not to_number.startswith('+'):
            to_number = f'+{to_number}'

        # Format numbers with whatsapp: prefix
        from_whatsapp = f"whatsapp:{from_number}"
        to_whatsapp = f"whatsapp:{to_number}"

        logger.info(f"📤 Sending WhatsApp message via Twilio")
        logger.info(f"   From: {from_whatsapp}")
        logger.info(f"   To: {to_whatsapp}")

        # Send message
        twilio_message = client.messages.create(
            from_=from_whatsapp,
            body=message,
            to=to_whatsapp
        )

        message_sid = twilio_message.sid
        logger.info(f"✅ Message sent successfully. Twilio SID: {message_sid}")

        return message_sid

    except Exception as e:
        logger.error(f"❌ Error sending WhatsApp message via Twilio: {e}")
        return None


def track_message(msg_sid: str, status: str, recipient: str):
    """
    Track Twilio message delivery status in DynamoDB.

    Args:
        msg_sid: Twilio message SID
        status: Message status
        recipient: Recipient phone number
    """
    try:
        now = datetime.now(tz=UTC)
        ttl = int((now + timedelta(days=365)).timestamp())

        msg_tracking_table.put_item(Item={
            'type': 'twilio_whatsapp',
            'eum_msg_id': f'twilio_{msg_sid}',  # Prefix to distinguish from AWS messages
            'wa_msg_id': msg_sid,
            'latest_status': status,
            'latest_update': int(now.timestamp()),
            'recipient': recipient,
            'delivery_history': {now.isoformat(): status},
            'expiration_date': ttl,
            'registration_date': now.isoformat()
        })

        logger.info(f"📊 Message tracked: {msg_sid} - Status: {status}")
    except Exception as e:
        logger.error(f"Error tracking message: {e}")

#!/usr/bin/env python3

import os
import logging
from typing import Dict, Any, Optional
from simple_salesforce import Salesforce
from strands import tool

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Salesforce credentials from environment variables
SF_USERNAME = os.getenv('SF_USERNAME')
SF_PASSWORD = os.getenv('SF_PASSWORD')
SF_TOKEN = os.getenv('SF_TOKEN')


def get_salesforce_connection() -> Optional[Salesforce]:
    """
    Establish connection to Salesforce.

    Returns:
        Salesforce connection object or None if connection fails
    """
    if not SF_USERNAME or not SF_PASSWORD or not SF_TOKEN:
        logger.error("Missing Salesforce credentials (SF_USERNAME, SF_PASSWORD, SF_TOKEN)")
        return None
    try:
        sf = Salesforce(
            username=SF_USERNAME,
            password=SF_PASSWORD,
            security_token=SF_TOKEN
        )
        logger.info("Successfully connected to Salesforce")
        return sf
    except Exception as e:
        logger.error(f"Failed to connect to Salesforce: {str(e)}")
        return None


@tool
def get_lead_information(
    phone_number: Optional[str] = None,
    email: Optional[str] = None
) -> str:
    """
    Retrieve lead information from Salesforce by phone number or email.

    Use this tool to find a student's lead record in Salesforce. The tool searches
    by phone number first, then falls back to email if phone is not found.

    Args:
        phone_number: The student's phone number (primary search method)
        email: The student's email address (fallback search method)

    Returns:
        Formatted lead information including ID, name, status, contact details,
        and description, or an error message if lead not found
    """
    if not phone_number and not email:
        return "Error: Either phone_number or email must be provided to search for a lead."

    sf = get_salesforce_connection()
    if not sf:
        return "Error: Unable to connect to Salesforce. Please try again later."

    try:
        # First, try searching by phone number
        if phone_number:
            logger.info(f"Searching for lead by phone: {phone_number}")
            query = f"SELECT Id, FirstName, LastName, Email, Phone, Status, Description FROM Lead WHERE Phone = '{phone_number}' LIMIT 1"
            result = sf.query(query)

            if result['totalSize'] > 0:
                lead = result['records'][0]
                logger.info(f"Lead found by phone: {lead['Id']}")
                return format_lead_info(lead)

        # Fallback to email search
        if email:
            logger.info(f"Searching for lead by email: {email}")
            query = f"SELECT Id, FirstName, LastName, Email, Phone, Status, Description FROM Lead WHERE Email = '{email}' LIMIT 1"
            result = sf.query(query)

            if result['totalSize'] > 0:
                lead = result['records'][0]
                logger.info(f"Lead found by email: {lead['Id']}")
                return format_lead_info(lead)

        # No lead found
        logger.warning(f"No lead found for phone: {phone_number}, email: {email}")
        return f"No lead found in Salesforce for the provided contact information. Phone: {phone_number or 'Not provided'}, Email: {email or 'Not provided'}. Consider asking the student for their correct phone number."

    except Exception as e:
        error_msg = f"Error searching for lead: {str(e)}"
        logger.error(error_msg)
        return error_msg


def format_lead_info(lead: Dict[str, Any]) -> str:
    """
    Format lead information for agent consumption.

    Args:
        lead: Lead record from Salesforce

    Returns:
        Formatted string with lead details
    """
    return f"""Lead Found:
- Lead ID: {lead.get('Id')}
- Name: {lead.get('FirstName', '')} {lead.get('LastName', '')}
- Email: {lead.get('Email', 'Not provided')}
- Phone: {lead.get('Phone', 'Not provided')}
- Status: {lead.get('Status', 'Unknown')}
- Description: {lead.get('Description', 'No description')}"""


@tool
def update_lead_status(lead_id: str, new_status: str = "Working") -> str:
    """
    Update the status of a lead in Salesforce.

    Use this tool to change a lead's status when they show intent to attend
    or request to speak with an advisor. Typically used to move leads from
    "New" to "Working" status.

    Args:
        lead_id: The Salesforce Lead ID (18-character ID)
        new_status: The new status for the lead (default: "Working")

    Returns:
        Success message or error description
    """
    if not lead_id:
        return "Error: Lead ID is required to update status."

    sf = get_salesforce_connection()
    if not sf:
        return "Error: Unable to connect to Salesforce. Please try again later."

    try:
        logger.info(f"Updating lead {lead_id} status to {new_status}")

        sf.Lead.update(lead_id, {'Status': new_status})

        logger.info(f"Successfully updated lead {lead_id} to status: {new_status}")
        return f"Successfully updated lead status to '{new_status}' for Lead ID: {lead_id}"

    except Exception as e:
        error_msg = f"Error updating lead status: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def log_conversation_analysis(
    lead_id: str,
    interest_level: str,
    summary: str,
    session_id: Optional[str] = None,
    conversation_length: Optional[int] = None,
    programs_discussed: Optional[str] = None,
    start_date: Optional[str] = None,
    concerns: Optional[str] = None,
    confidence_score: Optional[float] = None
) -> str:
    """
    Create an activity log (Task) in Salesforce documenting the conversation analysis.

    Use this tool to record insights from the conversation with a prospective student.
    This helps track their interest level, preferred start dates, and any concerns they have.

    Args:
        lead_id: The Salesforce Lead ID to associate the activity with
        interest_level: Student's interest level (e.g., "High - Ready to enroll", "Medium - Exploring options", "Low - Just browsing")
        summary: Brief 1-3 line summary of the conversation analysis
        session_id: Conversation session UUID (optional)
        conversation_length: Number of message turns in conversation (optional)
        programs_discussed: Comma-separated list of programs mentioned (optional)
        start_date: Preferred start date mentioned by student (optional)
        concerns: Any concerns or questions the student has (optional)
        confidence_score: AI confidence score for intent detection (0.0-1.0, optional)

    Returns:
        Success message with Task ID or error description
    """
    if not lead_id:
        return "Error: Lead ID is required to log conversation analysis."

    if not summary:
        return "Error: Summary is required to log conversation analysis."

    sf = get_salesforce_connection()
    if not sf:
        return "Error: Unable to connect to Salesforce. Please try again later."

    try:
        from datetime import datetime
        logger.info(f"Creating activity log for lead {lead_id}")

        # Build detailed description with metadata header
        description_parts = []

        # Header with timestamp and metadata
        description_parts.append("=" * 50)
        description_parts.append("AI AGENT CONVERSATION ANALYSIS")
        description_parts.append("=" * 50)

        # Timestamp
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        description_parts.append(f"Timestamp: {timestamp}")

        # Session metadata
        if session_id:
            description_parts.append(f"Session ID: {session_id}")

        if conversation_length:
            description_parts.append(f"Conversation Length: {conversation_length} turns")

        if programs_discussed:
            description_parts.append(f"Programs Discussed: {programs_discussed}")

        # Interest assessment
        description_parts.append("\n" + "-" * 50)
        description_parts.append("INTEREST ASSESSMENT")
        description_parts.append("-" * 50)
        description_parts.append(f"Interest Level: {interest_level}")

        if confidence_score is not None:
            description_parts.append(f"AI Confidence Score: {confidence_score:.2f}/1.0")

        if start_date:
            description_parts.append(f"Preferred Start Date: {start_date}")

        if concerns:
            description_parts.append(f"Concerns/Questions: {concerns}")

        # Summary
        description_parts.append("\n" + "-" * 50)
        description_parts.append("CONVERSATION SUMMARY")
        description_parts.append("-" * 50)
        description_parts.append(summary)

        # Recommended actions
        description_parts.append("\n" + "-" * 50)
        description_parts.append("RECOMMENDED NEXT STEPS")
        description_parts.append("-" * 50)
        description_parts.append("• Call student within 24 hours to maintain engagement")
        description_parts.append("• Send personalized email with program information")
        if start_date:
            description_parts.append(f"• Discuss {start_date} enrollment timeline and deadlines")
        description_parts.append("• Schedule enrollment consultation")
        description_parts.append("=" * 50)

        full_description = "\n".join(description_parts)

        # Create Task (Activity)
        task_data = {
            'WhoId': lead_id,  # Associate with Lead
            'Subject': 'AI Agent Conversation Analysis',
            'Status': 'Completed',
            'Priority': 'High',  # High priority for high-intent leads
            'Description': full_description,
            'ActivityDate': None  # Today's date (Salesforce will auto-set)
        }

        result = sf.Task.create(task_data)
        task_id = result['id']

        logger.info(f"Successfully created activity log {task_id} for lead {lead_id}")
        return f"Successfully logged conversation analysis. Task ID: {task_id}, Lead ID: {lead_id}"

    except Exception as e:
        error_msg = f"Error logging conversation analysis: {str(e)}"
        logger.error(error_msg)
        return error_msg


@tool
def add_advisor_contact_note(
    lead_id: str,
    note: str
) -> str:
    """
    Add a note to the Lead's Description field indicating student approved advisor contact.

    Use this tool after a student consents to being contacted by an enrollment advisor.
    This appends a timestamped note to the existing Lead Description, preserving all
    prior information while adding the new context about advisor contact approval.

    Args:
        lead_id: The Salesforce Lead ID (18-character ID)
        note: Brief note about what was discussed and student's interest

    Returns:
        Success message or error description
    """
    if not lead_id:
        return "Error: Lead ID is required to add contact note."

    if not note:
        return "Error: Note content is required."

    sf = get_salesforce_connection()
    if not sf:
        return "Error: Unable to connect to Salesforce. Please try again later."

    try:
        from datetime import datetime
        logger.info(f"Adding advisor contact note to lead {lead_id}")

        # Fetch current lead to get existing description
        lead = sf.Lead.get(lead_id)
        existing_description = lead.get('Description', '')

        # Create timestamped note
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        new_note = f"\n\n{'='*50}\n[{timestamp}] ADVISOR CONTACT APPROVED\n{'='*50}\nStudent approved contact from enrollment advisor.\n{note}\n{'='*50}"

        # Append to existing description
        updated_description = existing_description + new_note if existing_description else new_note.strip()

        # Update Lead
        sf.Lead.update(lead_id, {'Description': updated_description})

        logger.info(f"Successfully added contact note to lead {lead_id}")
        return f"Successfully added advisor contact note to Lead ID: {lead_id}"

    except Exception as e:
        error_msg = f"Error adding contact note: {str(e)}"
        logger.error(error_msg)
        return error_msg


def create_task_with_full_history(
    sf: Salesforce,
    lead_id: str,
    summary: str,
    full_chat_history: str,
    programs_discussed: Optional[str] = None,
    concerns: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Internal helper function: Create Salesforce Task with both summary and full chat history.

    This is NOT a tool - it's called internally by the advisor_handoff_tool.

    Args:
        sf: Salesforce connection object
        lead_id: The Salesforce Lead ID to associate the activity with
        summary: Brief 2-3 sentence summary of conversation
        full_chat_history: Complete chat transcript from conversation memory
        programs_discussed: Comma-separated list of programs mentioned (optional)
        concerns: Any concerns or questions the student has (optional)
        session_id: Conversation session UUID (optional)

    Returns:
        Dictionary with success status and task_id: {'success': True, 'task_id': '00TXXX'}
    """
    try:
        from datetime import datetime
        logger.info(f"Creating task with full history for lead {lead_id}")

        # Build detailed description with metadata header
        description_parts = []

        # Header with timestamp and metadata
        description_parts.append("=" * 70)
        description_parts.append("ADVISOR HANDOFF - COMPLETE CONVERSATION RECORD")
        description_parts.append("=" * 70)

        # Timestamp
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        description_parts.append(f"Timestamp: {timestamp}")

        # Session metadata
        if session_id:
            description_parts.append(f"Session ID: {session_id}")

        # Programs and concerns
        if programs_discussed:
            description_parts.append(f"Programs Discussed: {programs_discussed}")

        if concerns:
            description_parts.append(f"Concerns/Questions: {concerns}")

        # Summary section
        description_parts.append("\n" + "-" * 70)
        description_parts.append("CONVERSATION SUMMARY")
        description_parts.append("-" * 70)
        description_parts.append(summary)

        # Full chat history section
        description_parts.append("\n" + "-" * 70)
        description_parts.append("FULL CHAT TRANSCRIPT")
        description_parts.append("-" * 70)
        description_parts.append(full_chat_history)

        # Recommended actions
        description_parts.append("\n" + "-" * 70)
        description_parts.append("RECOMMENDED NEXT STEPS")
        description_parts.append("-" * 70)
        description_parts.append("• Contact student within 24 hours to maintain engagement")
        description_parts.append("• Reference specific topics discussed in chat transcript")
        if programs_discussed:
            description_parts.append(f"• Provide detailed information about: {programs_discussed}")
        if concerns:
            description_parts.append(f"• Address student concerns: {concerns}")
        description_parts.append("• Schedule enrollment consultation")
        description_parts.append("=" * 70)

        full_description = "\n".join(description_parts)

        # Create Task (Activity)
        task_data = {
            'WhoId': lead_id,  # Associate with Lead
            'Subject': 'Advisor Handoff - Chat Transcript',
            'Status': 'Completed',
            'Priority': 'High',
            'Description': full_description,
            'ActivityDate': None  # Today's date (Salesforce will auto-set)
        }

        result = sf.Task.create(task_data)
        task_id = result['id']

        logger.info(f"Successfully created task {task_id} with full chat history for lead {lead_id}")
        return {
            'success': True,
            'task_id': task_id
        }

    except Exception as e:
        error_msg = f"Error creating task with full history: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }

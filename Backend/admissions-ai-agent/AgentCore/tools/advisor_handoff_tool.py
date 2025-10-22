#!/usr/bin/env python3

import os
import logging
from typing import Optional
from strands import tool

# Import helper functions from other tools
from .salesforce_tools import get_salesforce_connection, create_task_with_full_history
from .whatsapp_twilio_tool import send_custom_twilio_message
from .session_utils import sanitize_phone_for_actor_id, fetch_conversation_history

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment Variables
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AGENTCORE_MEMORY_ID = os.getenv('AGENTCORE_MEMORY_ID')
MAX_HISTORY_TURNS = int(os.getenv('MAX_HISTORY_TURNS', '5'))

# Module-level context storage (set by nemo_agent before agent invocation)
_current_phone_number: Optional[str] = None
_current_session_id: Optional[str] = None


def set_context(phone_number: str, session_id: str):
    """
    Set session context for the current request.

    This must be called by nemo_agent.py BEFORE invoking the agent.

    Args:
        phone_number: Student's phone number
        session_id: Session UUID
    """
    global _current_phone_number, _current_session_id
    _current_phone_number = phone_number
    _current_session_id = session_id
    logger.info(f"Context set: phone={phone_number}, session={session_id}")



@tool
def complete_advisor_handoff(
    conversation_summary: str,
    whatsapp_message: str,
    programs_discussed: Optional[str] = None,
    concerns: Optional[str] = None
) -> str:
    """
    Complete advisor handoff workflow: Find lead, store chat history, send WhatsApp confirmation.

    Use this tool ONLY when a student explicitly agrees to be contacted by an enrollment advisor.
    This tool orchestrates the entire handoff process in one call.

    **Actions performed by this tool:**
    1. Retrieves complete chat history from Bedrock Memory
    2. Searches for student's lead in Salesforce by phone number
    3. Updates lead status to "Working"
    4. Creates Task with conversation summary AND full chat transcript
    5. Sends personalized WhatsApp message to student

    **When to use this tool:**
    - Student says "Yes, I'd like to speak with an advisor"
    - Student says "Please have someone call me"
    - Student gives explicit consent for advisor contact

    **Do NOT use this tool if:**
    - Student is just browsing or exploring options
    - Student hasn't explicitly agreed to advisor contact
    - Student says "I'll think about it" or "Maybe later"

    Args:
        conversation_summary: Brief 2-3 sentence summary of key discussion points.
                            Example: "Student interested in MBA program with focus on data analytics.
                            Asked about financial aid and scholarship opportunities. Very engaged throughout."
        whatsapp_message: Personalized 2-3 sentence WhatsApp message to send to the student.
                         Should reference specific topics discussed and confirm when advisor will contact them.
                         Include the timeframe naturally based on student's preference (within 2 hours or business hours 10am-5pm).
                         Example: "Hi! Thanks for your interest in our MBA program. Our enrollment advisor will
                         reach out within the next 2 hours to discuss financial aid options. Looking forward to connecting!"
        programs_discussed: Comma-separated list of programs mentioned (optional).
                          Example: "MBA, Computer Science, Data Analytics"
        concerns: Any concerns or barriers mentioned by student (optional).
                 Example: "Financial aid, housing options, transfer credits"

    Returns:
        Success message with lead ID and confirmation, or error if lead not found

    Note: phone_number and session_id are automatically retrieved from session context.
          You do NOT need to provide them as parameters.

    Example:
        complete_advisor_handoff(
            conversation_summary="Student interested in MBA program with data analytics focus. Prefers contact within 2 hours.",
            whatsapp_message="Hi! Thanks for your interest in our MBA program. Our advisor will reach out within the next 2 hours to discuss financial aid options.",
            programs_discussed="MBA",
            concerns="Financial aid options"
        )
    """

    # Read phone_number and session_id from module-level context
    phone_number = _current_phone_number
    session_id = _current_session_id

    # Validate context is set
    if not phone_number or not session_id:
        error_msg = "Error: Session context not set. Please ensure set_context() was called before agent invocation."
        logger.error(error_msg)
        return error_msg

    # Validate AI-provided inputs
    if not conversation_summary:
        error_msg = "Error: Conversation summary is required"
        logger.error(error_msg)
        return error_msg

    if not whatsapp_message:
        error_msg = "Error: WhatsApp message is required"
        logger.error(error_msg)
        return error_msg

    logger.info(f"🚀 Starting advisor handoff workflow")
    logger.info(f"   Phone: {phone_number}")
    logger.info(f"   Session: {session_id}")

    # Step 1: Retrieve full chat history from Bedrock Memory
    logger.info(f"📜 Retrieving full chat history for session {session_id}")
    full_chat_history = fetch_conversation_history(
        session_id=session_id,
        phone_number=phone_number,
        memory_id=AGENTCORE_MEMORY_ID,
        region_name=AWS_REGION,
        max_turns=MAX_HISTORY_TURNS
    )

    if not full_chat_history:
        logger.warning("No chat history found - using summary only")
        full_chat_history = conversation_summary
    else:
        logger.info(f"✅ Retrieved chat history ({len(full_chat_history)} characters)")

    try:
        # Step 2: Connect to Salesforce
        sf = get_salesforce_connection()
        if not sf:
            error_msg = "Error: Unable to connect to Salesforce. Please try again later."
            logger.error(error_msg)
            return error_msg

        # Step 3: Search for lead by phone number
        logger.info(f"🔍 Searching for lead by phone: {phone_number}")

        # Ensure phone number format is clean for Salesforce query
        clean_phone = phone_number.strip()
        if clean_phone.startswith('+'):
            clean_phone = clean_phone[1:]  # Remove + for Salesforce search

        # Try searching with and without country code
        query = f"SELECT Id, FirstName, LastName, Email, Phone, Status FROM Lead WHERE Phone LIKE '%{clean_phone[-10:]}%' LIMIT 1"
        result = sf.query(query)

        if result['totalSize'] == 0:
            # Lead not found
            error_msg = (
                f"No lead found in Salesforce for phone number {phone_number}. "
                f"Please verify the phone number with the student. The student may need to "
                f"fill out the inquiry form first before an advisor can be assigned."
            )
            logger.warning(error_msg)
            return error_msg

        lead = result['records'][0]
        lead_id = lead['Id']
        lead_name = f"{lead.get('FirstName', '')} {lead.get('LastName', '')}".strip()
        logger.info(f"✅ Lead found: {lead_name} (ID: {lead_id})")

        # Step 4: Update lead status to "Working"
        logger.info(f"📝 Updating lead {lead_id} status to 'Working'")
        try:
            sf.Lead.update(lead_id, {'Status': 'Working'})
            logger.info(f"✅ Lead status updated to 'Working'")
        except Exception as status_error:
            logger.warning(f"⚠️  Failed to update lead status: {status_error}")
            # Continue even if status update fails

        # Step 5: Create Task with conversation summary and full chat history
        logger.info(f"📋 Creating Salesforce Task with full chat history")

        task_result = create_task_with_full_history(
            sf=sf,
            lead_id=lead_id,
            summary=conversation_summary,
            full_chat_history=full_chat_history,
            programs_discussed=programs_discussed,
            concerns=concerns,
            session_id=session_id
        )

        if not task_result.get('success'):
            error_msg = f"Error creating Salesforce task: {task_result.get('error', 'Unknown error')}"
            logger.error(error_msg)
            return error_msg

        task_id = task_result.get('task_id')
        logger.info(f"✅ Task created: {task_id}")

        # Step 6: Send WhatsApp message
        logger.info(f"💬 Sending WhatsApp message to {phone_number}")
        whatsapp_result = send_custom_twilio_message(
            phone_number=phone_number,
            custom_message=whatsapp_message
        )

        if "Error" in whatsapp_result:
            logger.warning(f"⚠️  WhatsApp sending failed: {whatsapp_result}")
            # Don't fail the entire workflow if WhatsApp fails
            whatsapp_status = "WhatsApp message could not be sent"
        else:
            logger.info(f"✅ WhatsApp message queued successfully")
            whatsapp_status = "WhatsApp confirmation sent"

        # Step 7: Return success message
        success_message = (
            f"✅ Advisor handoff complete!\n\n"
            f"Lead Details:\n"
            f"  • Name: {lead_name}\n"
            f"  • Lead ID: {lead_id}\n"
            f"  • Status: Working\n"
            f"  • Phone: {phone_number}\n\n"
            f"Actions Taken:\n"
            f"  • Conversation logged in Salesforce (Task ID: {task_id})\n"
            f"  • {whatsapp_status}\n"
            f"  • Advisor will contact student as discussed\n\n"
            f"The enrollment advisor now has complete context from the chat transcript."
        )

        logger.info(f"🎉 Advisor handoff completed successfully for lead {lead_id}")
        return success_message

    except Exception as e:
        error_msg = f"Error during advisor handoff workflow: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return error_msg

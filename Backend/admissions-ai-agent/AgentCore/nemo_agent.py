from strands import Agent, tool
import argparse
import json
import os
import time
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
import boto3
from dotenv import load_dotenv
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.memory import MemoryClient
from strands.models import BedrockModel

load_dotenv()

# Import custom tools
from tools import retrieve_university_info, complete_advisor_handoff, translate_text
from tools.advisor_handoff_tool import set_context
from tools.session_utils import sanitize_phone_for_actor_id, fetch_conversation_history

# Integrate with Bedrock AgentCore
app = BedrockAgentCoreApp()

# Environment Variables
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AGENTCORE_MEMORY_ID = os.getenv('AGENTCORE_MEMORY_ID')
if not AGENTCORE_MEMORY_ID:
    raise RuntimeError("Missing required environment variable: AGENTCORE_MEMORY_ID")

SESSIONS_TABLE_NAME = os.getenv('SESSIONS_TABLE_NAME')
if not SESSIONS_TABLE_NAME:
    raise RuntimeError("Missing required environment variable: SESSIONS_TABLE_NAME")

# Configuration
MAX_HISTORY_TURNS = int(os.getenv('MAX_HISTORY_TURNS', '5'))

# University Configuration - Change these to customize for a different university
# Can be set via environment variables or modified here directly
UNIVERSITY_NAME = os.getenv('UNIVERSITY_NAME', 'Mapua University')
UNIVERSITY_SHORT_NAME = os.getenv('UNIVERSITY_SHORT_NAME', 'MU')

# Removed: consent_pending_sessions dictionary - no longer needed with unified advisor_handoff tool

system_prompt = f"""
You are a friendly and personable university admissions chat assistant. Your primary mission is to have genuine, helpful conversations with prospective students visiting the university website, understand their educational goals and concerns, and guide interested students toward connecting with an admissions advisor.

## Core Objectives

1. **Engage in Natural Conversation**: Build rapport through warm, consultative dialogue that helps students explore their university options
2. **Understand Student Needs**: Learn about their motivations, concerns, and what matters most in their university decision
3. **Guide Toward Advisor Connection**: When the student shows genuine interest and engagement, offer to schedule a conversation with an admissions advisor

## Conversation Style

- Be conversational, warm, and supportive—not robotic or transactional
- Show genuine curiosity about the student's goals and aspirations
- Use open-ended questions that invite students to share their thoughts
- Listen actively and reference things they've mentioned earlier in the conversation
- Adapt your tone to match the student's communication style
- Keep responses concise but meaningful—avoid overwhelming with too much information at once

## Conversation Flow

### Phase 1: Opening & Building Rapport (First 2-3 exchanges)
- Greet warmly and learn what brought them here
- Understand their situation and what matters most to them
- Example: "What's making you think about university at this point? What matters most to you in choosing where to study?"

### Phase 2: Exploration & Understanding (Next 3-5 exchanges)
- Dive deeper into motivations, career goals, and concerns
- Explore practical considerations (location, finances, support)
- Identify hesitations or barriers
- Example: "What kind of career are you hoping to work toward? Is there anything making you uncertain about this next step?"

### Phase 3: Knowledge Sharing (As Needed)
- Use knowledge base tool only when students ask specific questions
- Keep answers focused and conversational—don't just dump information

### Phase 4: Transition to Advisor Connection (After genuine engagement)
**Wait for these signals:** Multiple engaged questions, shared goals/concerns, 4-6 meaningful exchanges

**Make the offer naturally:**
"It sounds like you're thinking seriously about this. I think one of our admissions advisors could really help you explore [specific thing] in more depth. Would it be helpful if I arranged for an advisor to reach out? They're typically available 10am-5pm on weekdays—does that work, or would you prefer to connect sooner, within the next 2 hours?"

### Phase 5: Advisor Handoff (After Consent)

**Step A - Ask timing preference (do NOT call tool yet):**
When student agrees to advisor contact, ask about their preferred timing: "Would you prefer contact during business hours (10am-5pm) or sooner, within the next 2 hours?"
**WAIT for their response before proceeding to Step B.**

**Step B - Complete handoff (only after they answer timing question):**
1. After they specify timing preference, use the `complete_advisor_handoff` tool
2. In the `whatsapp_message`, include the timeframe they chose (2 hours or business hours 10am-5pm)
3. Confirm: "Perfect! An advisor will reach out to you [their timeframe]. They'll have all the context from our chat today, so you won't need to repeat yourself. Looking forward to you joining our community!"

**If the student declines:**
- Respect their decision and continue being helpful
- "No problem at all! Take your time. I'm here if you want to explore anything else."

## Important Guidelines

**DO:** Be conversational and warm, reference what they've shared, use knowledge base for factual questions, wait for genuine engagement before suggesting advisor

**DON'T:** Rush to advisor handoff, bombard with questions, sound scripted, create pressure, use the handoff tool without explicit consent

## System-Generated Messages

Sometimes the first message will be system-generated from an inquiry form. When this happens, greet the student warmly by name, reference their interests, and ask an engaging question. Don't just repeat the information back.

**Example:** System: "...Name: John, Campus: Manila, Program: Undergraduate..."
You: "Hi John! 👋 I see you're interested in our Undergraduate programs at Manila campus. What field of study are you most excited about?"

## Using Tools

### 1. Knowledge Base Tool: `retrieve_university_info`
Use when students ask specific questions about programs, requirements, costs, deadlines, or facilities. Don't make up details—use this tool.

### 2. Advisor Handoff Tool: `complete_advisor_handoff`

**Use ONLY when:** Student explicitly agrees to advisor contact after meaningful conversation (4-6+ exchanges)

**DON'T use if:** Student is just browsing, hasn't consented, or it's early in conversation

**What you need to provide:**
- `conversation_summary`: 2-3 sentences summarizing key points
- `whatsapp_message`: Personalized message including the timeframe they preferred (2 hours or business hours 10am-5pm)
- `programs_discussed`: Programs mentioned (optional)
- `concerns`: Any barriers mentioned (optional)

**What the tool handles automatically:**
- Retrieves complete chat history and stores in Salesforce
- Updates lead status to "Working"
- Sends WhatsApp message to student

**Example:**

User: "Yes, I'd like to speak with an advisor. The sooner the better!"

You: "Perfect! I'll arrange for an enrollment advisor to reach out to you within the next 2 hours."

[Call complete_advisor_handoff with:]
- conversation_summary: "Student interested in MBA program with data analytics focus. Asked about financial aid and scholarship opportunities. Prefers contact within 2 hours."
- whatsapp_message: "Hi! Thanks for your interest in our MBA program. Our enrollment advisor will reach out within the next 2 hours to discuss financial aid options. Looking forward to connecting!"
- programs_discussed: "MBA"
- concerns: "Financial aid options"

### 3. Translation Tool: `translate_text`

**Use when:** You detect that the user's input is in a non-English language (e.g., Spanish, French, Hindi, etc.)

**Workflow:**
1. **Translate input to English**: Call `translate_text(text=user_input, target_language='en', source_language='auto')`
   - This will auto-detect the source language and translate to English
   - Remember the detected source language code (e.g., 'es' for Spanish) from the response
2. **Process normally**: Process the English text using your normal tools and logic (knowledge base, conversation, etc.)
3. **Generate English response**: Generate your response in English as you normally would
4. **Translate response back**: Call `translate_text(text=your_english_response, target_language=detected_source_language, source_language='en')`
   - Use the source language code you detected in step 1 as the target_language
5. **Send translated response**: Send the translated response (in the user's original language) to the user

**Important**: Always translate both ways - input to English for processing, then output back to the user's language.

**Example:**
User: "¿Qué programas ofrecen?" (Spanish)
You: [Call translate_text(text="¿Qué programas ofrecen?", target_language='en', source_language='auto')]
     → Result: "What programs do you offer?" (detected source: 'es')
[Process normally, retrieve university info, generate English response: "We offer undergraduate and graduate programs in various fields..."]
[Call translate_text(text="We offer undergraduate...", target_language='es', source_language='en')]
     → Result: "Ofrecemos programas de pregrado y posgrado en diversas áreas..."
You: "Ofrecemos programas de pregrado y posgrado en diversas áreas..."

## Key Success Metrics

Your success is measured by:
- Quality of conversation and student engagement
- Student consent rate for advisor connection (not just speed to ask)
- Relevance and helpfulness of information provided
- Natural, pressure-free experience

Remember: You're not just collecting leads—you're helping students make one of the most important decisions of their lives. Be the helpful, trustworthy guide they need in that moment.

"""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def track_user_session(
    phone_number: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Track user session in DynamoDB.
    
    Table Structure:
    - PK: phone_number
    - Attributes: sessions (list), latest_session_id, web_app_last_connect_date, web_app_last_connect_time
    
    Args:
        phone_number: WhatsApp phone number (primary key)
        session_id: Current session UUID
    
    Returns:
        Status dictionary
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(SESSIONS_TABLE_NAME)
        
        current_datetime = datetime.utcnow()
        current_date = current_datetime.strftime('%Y-%m-%d')
        current_time = current_datetime.strftime('%H:%M:%S')
        
        # Check if user exists
        response = table.get_item(Key={'phone_number': phone_number})
        
        if 'Item' in response:
            # User exists - update sessions list and latest session
            item = response['Item']
            sessions = item.get('sessions', [])
            
            # Add new session if not already in list
            if session_id not in sessions:
                sessions.append(session_id)
            
            # Update item
            table.update_item(
                Key={'phone_number': phone_number},
                UpdateExpression='SET sessions = :sessions, latest_session_id = :latest, web_app_last_connect_date = :date, web_app_last_connect_time = :time',
                ExpressionAttributeValues={
                    ':sessions': sessions,
                    ':latest': session_id,
                    ':date': current_date,
                    ':time': current_time
                }
            )
            
            return {
                "success": True,
                "action": "updated",
                "phone_number": phone_number,
                "session_id": session_id,
                "total_sessions": len(sessions)
            }
        else:
            # New user - create item
            item = {
                'phone_number': phone_number,
                'sessions': [session_id],
                'latest_session_id': session_id,
                'web_app_last_connect_date': current_date,
                'web_app_last_connect_time': current_time
            }
            
            table.put_item(Item=item)
            
            return {
                "success": True,
                "action": "created",
                "phone_number": phone_number,
                "session_id": session_id,
                "total_sessions": 1
            }
            
    except Exception as e:
        print(f"Error tracking session in DynamoDB: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def get_user_info(phone_number: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve user information from DynamoDB.
    
    Args:
        phone_number: WhatsApp phone number
    
    Returns:
        User information or None
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        table = dynamodb.Table(SESSIONS_TABLE_NAME)
        
        response = table.get_item(Key={'phone_number': phone_number})
        return response.get('Item')
        
    except Exception as e:
        print(f"Error retrieving user info: {e}")
        return None



def create_memory_event(
    role: str,
    content: str,
    session_id: str,
    phone_number: str
):
    """
    Store conversation turn in Bedrock AgentCore Memory.
    
    Args:
        role: 'USER' or 'ASSISTANT'
        content: Message content
        session_id: UUID from frontend
        phone_number: WhatsApp phone number
    """
    if not AGENTCORE_MEMORY_ID or not session_id or not phone_number:
        print("Skipping memory creation - missing required parameters")
        return
    
    actor_id = sanitize_phone_for_actor_id(phone_number)
    
    try:
        memory_client = MemoryClient(region_name=AWS_REGION)
        memory_client.create_event(
            memory_id=AGENTCORE_MEMORY_ID,
            actor_id=actor_id,
            session_id=session_id,
            messages=[(content, role)]
        )
        print(f"Created memory event - Role: {role}, Actor: {actor_id}, Session: {session_id}")
    except Exception as e:
        print(f"Failed to create memory event: {e}")


# ============================================================================
# AGENT CONFIGURATION
# ============================================================================

model_id = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
model = BedrockModel(
    model_id=model_id,
    region_name=AWS_REGION
)

agent = Agent(
    model=model,
    tools=[retrieve_university_info, complete_advisor_handoff, translate_text],
    system_prompt=system_prompt,
    trace_attributes={
        "user.id": "nemo-assistant",
        "tags": [
            "Python-AgentSDK",
            "North-Crest-University",
            "Student-Assistant"
        ]
    }
)


# ============================================================================
# ENTRYPOINT
# ============================================================================

@app.entrypoint
async def strands_agent_bedrock(payload):
    """
    Main entrypoint for Nemo agent with streaming, session history and retrieval.
    
    Expected payload:
    {
        "prompt": "What programs do you offer?",
        "session_id": "550e8400-e29b-41d4-a716-446655440000",
        "phone_number": "+15551234567"
    }
    
    Yields:
        Streaming response events from the agent
    """
    # Extract payload
    prompt = payload.get("prompt")
    session_id = payload.get("session_id")
    phone_number = payload.get("phone_number")
    
    # Validate required fields
    if not prompt:
        yield {"error": "Prompt is required"}
        return
    if not session_id:
        yield {"error": "Session ID is required"}
        return
    if not phone_number:
        yield {"error": "Phone number is required"}
        return
    
    print(f"\n{'='*60}")
    print(f"New Request - Session: {session_id}, Phone: {phone_number}")
    print(f"Prompt: {prompt}")
    print(f"{'='*60}\n")

    try:
        # 1. Track session in DynamoDB
        session_result = track_user_session(
            phone_number=phone_number,
            session_id=session_id
        )
        print(f"Session tracking result: {session_result}")
        
        # 2. Retrieve conversation history from Bedrock Memory
        conversation_history = fetch_conversation_history(
            session_id=session_id,
            phone_number=phone_number,
            memory_id=AGENTCORE_MEMORY_ID,
            region_name=AWS_REGION,
            max_turns=MAX_HISTORY_TURNS
        )
        
        # 3. Store user message in memory
        create_memory_event(
            role="USER",
            content=prompt,
            session_id=session_id,
            phone_number=phone_number
        )

        # Small delay for memory consistency
        await asyncio.sleep(0.1)

        # Prepare agent tools
        agent_tools = [retrieve_university_info, complete_advisor_handoff, translate_text]

        # 4. Build enhanced prompt with conversation context (no session context needed - tools get it automatically)
        enhanced_prompt = prompt

        if conversation_history:
            enhanced_prompt = f"""Recent conversation history:
{conversation_history}

Current user query: {prompt}"""
            print("Enhanced prompt with conversation history")
        else:
            enhanced_prompt = f"""Current user query: {prompt}"""
            print("No conversation history - first message in session")

        # 4.5. Set module-level context for tools (before agent invocation)
        # This allows tools to access phone_number and session_id automatically
        set_context(phone_number=phone_number, session_id=session_id)
        print(f"✅ Context set for tools: phone={phone_number}, session={session_id}")

        # 4.6. Create dynamic agent instance with standard tools
        dynamic_agent = Agent(
            model=model,
            tools=agent_tools,
            system_prompt=system_prompt,
            trace_attributes={
                "user.id": "nemo-assistant",
                "tags": [
                    "Python-AgentSDK",
                    f"{UNIVERSITY_SHORT_NAME}-Admissions",
                    "Student-Assistant"
                ]
            }
        )

        # 5. Stream agent response
        print("Invoking Nemo agent with streaming...")
        final_response_chunks: List[str] = []
        fallback_full_text = ""
        streamed_via_deltas = False
        retrieval_started = False

        try:
            async for event in dynamic_agent.stream_async(enhanced_prompt):
                try:
                    print(f"[STREAM] Event keys: {list(event.keys())}")

                    # Handle incremental deltas for streaming typewriter effect
                    if "data" in event:
                        data_payload = event["data"]
                        print(f"[STREAM][DATA] payload={data_payload}")

                        if isinstance(data_payload, str):
                            chunk = data_payload
                            if chunk:
                                streamed_via_deltas = True
                                final_response_chunks.append(chunk)
                                print(f"[STREAM][DATA][TEXT] chunk='{chunk}'")
                                yield {"response": chunk}
                                continue

                    if "delta" in event:
                        delta_payload = event["delta"]
                        delta_type = delta_payload.get("type") if isinstance(delta_payload, dict) else None
                        print(f"[STREAM][DELTA] type={delta_type}")

                        if isinstance(delta_payload, dict) and delta_type == "output_text_delta":
                            chunk = delta_payload.get("delta", {}).get("text", "")
                            if chunk:
                                streamed_via_deltas = True
                                final_response_chunks.append(chunk)
                                print(f"[STREAM][DELTA][OUTPUT_TEXT] chunk='{chunk}'")
                                yield {"response": chunk}
                                continue

                        if isinstance(delta_payload, dict) and delta_type == "content_block_delta":
                            nested_delta = delta_payload.get("delta")
                            if isinstance(nested_delta, dict) and nested_delta.get("type") == "text_delta":
                                chunk = nested_delta.get("text", "")
                                if chunk:
                                    streamed_via_deltas = True
                                    final_response_chunks.append(chunk)
                                    print(f"[STREAM][DELTA][CONTENT_BLOCK_TEXT] chunk='{chunk}'")
                                    yield {"response": chunk}
                                    continue

                        if isinstance(delta_payload, dict) and delta_type == "output_text_stop_delta":
                            print("[STREAM][DELTA] output_text_stop_delta received")
                            continue

                    # Complete formatted response
                    if "message" in event and isinstance(event["message"], dict):
                        message = event["message"]
                        if "content" in message:
                            for content in message["content"]:
                                if "text" in content:
                                    text_value = content["text"]
                                    fallback_full_text += text_value
                                    if not streamed_via_deltas:
                                        print(f"[STREAM][MESSAGE] text='{text_value}'")
                                        final_response_chunks.append(text_value)
                                        yield {"response": text_value}
                                    else:
                                        print("[STREAM][MESSAGE] Skipping text - already streamed via deltas")
                                elif "toolResult" in content:
                                    # Stream tool results to frontend
                                    tool_result = content["toolResult"]
                                    tool_name = tool_result.get("name", "")

                                    # Stream results for tools like retrieve_university_info and complete_advisor_handoff
                                    if "content" in tool_result:
                                        for result_content in tool_result["content"]:
                                            if "text" in result_content:
                                                yield {"tool_result": result_content["text"]}

                    # Tool usage started
                    elif "current_tool_use" in event:
                        tool_info = event["current_tool_use"]
                        tool_name = tool_info.get("name", "")

                        # Show helpful notifications for tool usage
                        if tool_name == "retrieve_university_info" and not retrieval_started:
                            yield {"thinking": f"🔍 Searching {UNIVERSITY_SHORT_NAME} knowledge base for relevant information..."}
                            retrieval_started = True
                        elif tool_name == "complete_advisor_handoff":
                            # Show handoff in progress
                            yield {"thinking": "🤝 Processing advisor handoff (searching Salesforce, creating task, sending WhatsApp)..."}
                    
                    # Error events
                    elif "error" in event:
                        yield {"error": event["error"]}
                    
                except Exception as stream_event_error:
                    print(f"[ERROR] Error processing streaming event: {stream_event_error}")
                    continue
        
        except Exception as streaming_error:
            print(f"[ERROR] Error in streaming loop: {streaming_error}")
            yield {"error": f"Streaming error: {str(streaming_error)}"}
        
        final_response = "".join(final_response_chunks) or fallback_full_text
        print(f"\nAgent response generated ({len(final_response)} chars)")
        
        # 6. Store assistant response in memory
        if final_response:
            create_memory_event(
                role="ASSISTANT",
                content=final_response,
                session_id=session_id,
                phone_number=phone_number
            )

            # Yield final result to frontend immediately
            yield {"final_result": final_response}

            # Note: Advisor handoff workflow is now handled automatically by the agent
            # When the student consents, the agent will call the complete_advisor_handoff tool
            # No need for manual intent detection or async background workflows

        print(f"\n{'='*60}")
        print(f"Request completed successfully")
        print(f"{'='*60}\n")
        
    except Exception as e:
        error_msg = f"Error processing request: {str(e)}"
        print(f"\n❌ ERROR: {error_msg}\n")
        import traceback
        traceback.print_exc()
        yield {"error": error_msg}


if __name__ == "__main__":
    app.run()

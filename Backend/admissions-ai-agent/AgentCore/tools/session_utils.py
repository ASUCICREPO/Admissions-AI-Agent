#!/usr/bin/env python3

"""Shared session-related helper utilities for Nemo agent tools."""

import logging
import os
from typing import Optional

from bedrock_agentcore.memory import MemoryClient

logger = logging.getLogger(__name__)


# Environment configuration (defaults align with existing modules)
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AGENTCORE_MEMORY_ID = os.getenv("AGENTCORE_MEMORY_ID")
DEFAULT_MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "5"))


def sanitize_phone_for_actor_id(phone_number: str) -> str:
    """Convert phone number to valid AWS Bedrock actor_id format."""

    if not phone_number:
        raise ValueError("Phone number is required")

    cleaned = "".join(
        c if c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/"
        else ""
        for c in phone_number
    )

    if not cleaned or not cleaned[0].isalnum():
        cleaned = f"phone-{cleaned}"

    return cleaned


def fetch_conversation_history(
    *,
    session_id: str,
    phone_number: str,
    memory_id: Optional[str] = None,
    region_name: Optional[str] = None,
    max_turns: Optional[int] = None,
    branch_name: str = "main",
) -> str:
    """Retrieve conversation history from Bedrock AgentCore Memory."""

    if not session_id or not phone_number:
        return ""

    resolved_memory_id = memory_id or AGENTCORE_MEMORY_ID
    if not resolved_memory_id:
        logger.warning("No AGENTCORE_MEMORY_ID configured; skipping conversation history fetch")
        return ""

    resolved_region = region_name or AWS_REGION
    turns_to_fetch = max_turns or DEFAULT_MAX_HISTORY_TURNS

    actor_id = sanitize_phone_for_actor_id(phone_number)

    try:
        memory_client = MemoryClient(region_name=resolved_region)
        recent_turns = memory_client.get_last_k_turns(
            memory_id=resolved_memory_id,
            actor_id=actor_id,
            session_id=session_id,
            k=turns_to_fetch,
            branch_name=branch_name,
        )

        if not recent_turns:
            logger.info("No conversation history found for session %s", session_id)
            return ""

        context_messages = []
        for turn in recent_turns:
            for message in turn:
                role = message["role"].lower()
                content = message["content"]["text"]
                context_messages.append(f"{role.title()}: {content}")

        logger.info("Retrieved %s conversation turns from memory", len(recent_turns))
        return "\n".join(context_messages)

    except Exception as exc:
        logger.error("Failed to retrieve session history: %s", exc)
        return ""



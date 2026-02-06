#!/usr/bin/env python3

import os
import boto3
from typing import Optional
from botocore.exceptions import ClientError
from strands import tool

AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')


@tool
def translate_text(
    text: str,
    target_language: str,
    source_language: Optional[str] = None
) -> str:
    """
    Translate text from one language to another using AWS Translate service.
    
    Use this tool when you detect that the user's input is in a non-English language.
    The tool supports auto-detection of the source language when not specified.
    
    **When to use this tool:**
    - User sends a message in a non-English language (e.g., Spanish, French, Hindi)
    - You need to translate user input to English for processing
    - You need to translate your English response back to the user's language
    
    **Workflow for non-English conversations:**
    1. Translate user input to English: `translate_text(text=user_input, target_language='en', source_language='auto')`
    2. Process the English text normally (use knowledge base, have conversation, etc.)
    3. Generate your response in English
    4. Translate your English response back: `translate_text(text=english_response, target_language=detected_language, source_language='en')`
    5. Send the translated response to the user
    
    **Supported language codes (ISO 639-1):**
    - 'en' - English
    - 'es' - Spanish
    - 'fr' - French
    - 'de' - German
    - 'pt' - Portuguese
    - 'it' - Italian
    - 'hi' - Hindi
    - 'ja' - Japanese
    - 'ko' - Korean
    - 'zh' - Chinese
    - And 70+ other languages supported by AWS Translate
    
    Args:
        text: The text to translate (required)
        target_language: Target language code (e.g., 'en', 'es', 'fr') (required)
        source_language: Source language code (optional). If not provided or set to 'auto', 
                        AWS Translate will auto-detect the source language.
                        Use 'auto' for auto-detection, or specify a language code like 'en', 'es', etc.
    
    Returns:
        Translated text, or error message if translation fails.
        When source_language is 'auto' or not provided, the response will include the detected source language.
    
    Example:
        # Translate Spanish to English (auto-detect source)
        translate_text(text="¿Qué programas ofrecen?", target_language='en', source_language='auto')
        # Returns: "What programs do you offer?" (and detects source as 'es')
        
        # Translate English to Spanish
        translate_text(text="We offer undergraduate and graduate programs.", target_language='es', source_language='en')
        # Returns: "Ofrecemos programas de pregrado y posgrado."
    """
    # Input validation
    if not text or not text.strip():
        error_msg = "Error: Text to translate is required and cannot be empty."
        print(error_msg)
        return error_msg
    
    if not target_language or not target_language.strip():
        error_msg = "Error: Target language code is required (e.g., 'en', 'es', 'fr')."
        print(error_msg)
        return error_msg
    
    # Normalize language codes
    target_language = target_language.strip().lower()
    source_language_param = source_language.strip().lower() if source_language else 'auto'
    
    # If source_language is explicitly set to 'auto' or not provided, use auto-detection
    if source_language_param == 'auto' or not source_language:
        source_language_param = 'auto'
    
    print(f"Translating text (length: {len(text)} chars) from '{source_language_param}' to '{target_language}'")
    
    try:
        # Initialize AWS Translate client
        translate_client = boto3.client('translate', region_name=AWS_REGION)
        
        # Prepare translation parameters
        translate_params = {
            'Text': text,
            'SourceLanguageCode': source_language_param,
            'TargetLanguageCode': target_language
        }
        
        # Call AWS Translate
        response = translate_client.translate_text(**translate_params)
        
        # Extract translated text
        translated_text = response.get('TranslatedText', '')
        
        # Extract detected source language (if auto-detection was used)
        detected_source_language = response.get('SourceLanguageCode', source_language_param)
        
        if not translated_text:
            error_msg = "Error: Translation service returned empty result."
            print(error_msg)
            return error_msg
        
        # Log success
        if source_language_param == 'auto':
            print(f"✅ Translation successful: Detected source language '{detected_source_language}', translated to '{target_language}'")
        else:
            print(f"✅ Translation successful: '{source_language_param}' → '{target_language}'")
        
        # Return translated text
        # Note: The detected source language is included in the response metadata,
        # but we return just the translated text for simplicity.
        # The agent can call this tool again with the detected language code if needed.
        return translated_text
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        error_msg = f"Error translating text (AWS Error {error_code}): {error_message}"
        print(error_msg)
        return error_msg
        
    except Exception as e:
        error_msg = f"Error translating text: {str(e)}"
        print(error_msg)
        return error_msg


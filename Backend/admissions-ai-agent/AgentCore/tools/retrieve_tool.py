#!/usr/bin/env python3

import os
import boto3
from typing import Any, Dict, List
from botocore.config import Config as BotocoreConfig
from strands import tool

AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
KNOWLEDGE_BASE_ID = os.getenv('ENGLISH_KNOWLEDGE_BASE_ID')
UNIVERSITY_NAME = os.getenv('UNIVERSITY_NAME', 'Mapua University')
UNIVERSITY_SHORT_NAME = os.getenv('UNIVERSITY_SHORT_NAME', 'MU')


def extract_source_info(result: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract source name and URL from retrieval result.
    
    Args:
        result: Single retrieval result from Bedrock Knowledge Base
    
    Returns:
        Dictionary with source_name and url
    """
    location = result.get("location", {})
    metadata = result.get("metadata", {})
    
    # Extract URL from location
    url = None
    if "s3Location" in location and "uri" in location["s3Location"]:
        url = location["s3Location"]["uri"]
    elif "customDocumentLocation" in location and "id" in location["customDocumentLocation"]:
        url = location["customDocumentLocation"]["id"]
    
    # Extract source name
    # Priority: metadata source URI > extracted from URL > Unknown
    source_name = metadata.get("x-amz-bedrock-kb-source-uri", "")
    
    if not source_name and url:
        # Extract filename from URL
        source_name = url.split('/')[-1] if '/' in url else url
    
    return {
        'source_name': source_name or 'Unknown',
        'url': url or 'N/A'
    }


def filter_results_by_score(
    results: List[Dict[str, Any]],
    min_score: float
) -> List[Dict[str, Any]]:
    """
    Filter results by minimum relevance score.
    
    Args:
        results: List of retrieval results
        min_score: Minimum score threshold (0.0-1.0)
    
    Returns:
        Filtered list of results
    """
    return [r for r in results if r.get("score", 0.0) >= min_score]


def format_results_with_sources(results: List[Dict[str, Any]]) -> str:
    """
    Format retrieval results with scores, sources, URLs, and content.
    
    Args:
        results: Filtered retrieval results
    
    Returns:
        Formatted string for agent consumption
    """
    if not results:
        return "No results found above score threshold."
    
    formatted = []
    formatted.append(f"Retrieved {len(results)} results:\n")
    
    for idx, result in enumerate(results, 1):
        score = result.get("score", 0.0)
        content = result.get("content", {}).get("text", "")
        source_info = extract_source_info(result)
        
        formatted.append(f"Result {idx}:")
        formatted.append(f"Score: {score:.4f}")
        formatted.append(f"Source: {source_info['source_name']}")
        formatted.append(f"URL: {source_info['url']}")
        formatted.append(f"Content: {content}\n")
    
    return "\n".join(formatted)


@tool
def retrieve_university_info(
    text: str,
    numberOfResults: int = 5,
    score: float = 0.5
) -> str:
    """
    Retrieve relevant information from the university knowledge base.
    
    Use this tool to search for factual information about:
    - Academic programs and majors
    - Admission requirements and processes
    - Campus facilities and resources
    - Student services and support
    - University policies and procedures
    
    The results include source documents and URLs for reference.
    
    Args:
        text: The search query about university information
        numberOfResults: Maximum number of results to return (default: 5)
        score: Minimum relevance score threshold 0.0-1.0 (default: 0.5)
    
    Returns:
        Formatted results including scores, source names, URLs, and content
    """
    if not KNOWLEDGE_BASE_ID:
        return "Error: Knowledge Base ID not configured. Please set ENGLISH_KNOWLEDGE_BASE_ID."
    
    print(f"Retrieving university info for query: {text[:100]}...")
    
    try:
        # Initialize Bedrock client
        config = BotocoreConfig(user_agent_extra="nemo-university-assistant")
        bedrock_client = boto3.client(
            "bedrock-agent-runtime",
            region_name=AWS_REGION,
            config=config
        )
        
        # Configure retrieval
        retrieval_config = {
            "vectorSearchConfiguration": {
                "numberOfResults": numberOfResults
            }
        }
        
        # Perform retrieval
        response = bedrock_client.retrieve(
            retrievalQuery={"text": text},
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalConfiguration=retrieval_config
        )
        
        # Filter and format results
        all_results = response.get("retrievalResults", [])
        filtered_results = filter_results_by_score(all_results, score)
        formatted_output = format_results_with_sources(filtered_results)
        
        print(f"Found {len(filtered_results)} results above score threshold {score}")
        
        return formatted_output
        
    except Exception as e:
        error_msg = f"Error retrieving information: {str(e)}"
        print(error_msg)
        return error_msg

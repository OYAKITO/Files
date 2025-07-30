from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import io
import torch
import torchaudio
import numpy as np
from TTS.api import TTS
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Global TTS model instance
tts_model = None

def initialize_tts():
    """Initialize TTS model on first use"""
    global tts_model
    if tts_model is None:
        try:
            # Using Coqui TTS - a popular open-source TTS library
            # This model is pre-trained and works well for English
            tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)
            logger.info("TTS model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize TTS model: {e}")
            # Fallback to simpler model if the above fails
            try:
                tts_model = TTS(model_name="tts_models/en/ljspeech/glow-tts", progress_bar=False)
                logger.info("Fallback TTS model initialized successfully")
            except Exception as e2:
                logger.error(f"Failed to initialize fallback TTS model: {e2}")
                tts_model = None

def index(request):
    """Render the main questionnaire page"""
    return render(request, 'questionnaire.html')

@csrf_exempt
def tts(request):
    """Generate speech from text using open-source TTS"""
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required."}, status=405)
    
    try:
        # Parse JSON data
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)
        
        # Limit text length to prevent abuse
        if len(text) > 500:
            text = text[:500]
        
        # Initialize TTS model if not already done
        initialize_tts()
        
        if tts_model is None:
            return JsonResponse({"error": "TTS model not available"}, status=503)
        
        # Generate speech
        logger.info(f"Generating TTS for text: {text[:50]}...")
        
        # Create a temporary file-like object in memory
        audio_buffer = io.BytesIO()
        
        # Generate speech to the buffer
        tts_model.tts_to_file(text=text, file_path=audio_buffer)
        
        # Reset buffer position to beginning
        audio_buffer.seek(0)
        
        # Return audio response
        response = HttpResponse(audio_buffer.getvalue(), content_type="audio/wav")
        response['Content-Disposition'] = 'inline; filename="speech.wav"'
        
        logger.info("TTS generation successful")
        return response
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return JsonResponse({"error": "TTS generation failed"}, status=500)

# Alternative implementation using pyttsx3 (works offline, no GPU needed)
def tts_pyttsx3(request):
    """Alternative TTS using pyttsx3 - works completely offline"""
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required."}, status=405)
    
    try:
        import pyttsx3
        import wave
        import tempfile
        import os
        
        # Parse JSON data
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)
        
        # Limit text length
        if len(text) > 500:
            text = text[:500]
        
        # Initialize pyttsx3 engine
        engine = pyttsx3.init()
        
        # Set properties (optional)
        engine.setProperty('rate', 150)    # Speed of speech
        engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
        
        # Get available voices and set to a female voice if available
        voices = engine.getProperty('voices')
        if len(voices) > 1:
            engine.setProperty('voice', voices[1].id)  # Usually female voice
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        # Save speech to file
        engine.save_to_file(text, temp_filename)
        engine.runAndWait()
        
        # Read the generated audio file
        with open(temp_filename, 'rb') as audio_file:
            audio_data = audio_file.read()
        
        # Clean up temporary file
        os.unlink(temp_filename)
        
        # Return audio response
        response = HttpResponse(audio_data, content_type="audio/wav")
        response['Content-Disposition'] = 'inline; filename="speech.wav"'
        
        return response
        
    except ImportError:
        return JsonResponse({"error": "pyttsx3 not installed. Please install it with: pip install pyttsx3"}, status=503)
    except Exception as e:
        logger.error(f"pyttsx3 TTS generation failed: {e}")
        return JsonResponse({"error": "TTS generation failed"}, status=500)

# Simple fallback using browser's built-in TTS (client-side)
def tts_browser_fallback(request):
    """Return JavaScript code for client-side TTS as fallback"""
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required."}, status=405)
    
    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)
        
        # Return instruction to use browser TTS
        return JsonResponse({
            "use_browser_tts": True,
            "text": text,
            "message": "Using browser TTS as fallback"
        })
        
    except Exception as e:
        return JsonResponse({"error": "Failed to process request"}, status=500)
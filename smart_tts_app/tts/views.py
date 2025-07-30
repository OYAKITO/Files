from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import io
import tempfile
import os
import logging
import asyncio
import threading

# Set up logging
logger = logging.getLogger(__name__)

def index(request):
    """Render the main questionnaire page"""
    return render(request, 'questionare.html')  # Note: your template is named 'questionare.html'

@csrf_exempt
def tts(request):
    """Primary TTS endpoint - tries multiple TTS methods for reliability"""
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
        
        logger.info(f"Generating TTS for text: {text[:50]}...")
        
        # Try Edge TTS first (best quality)
        try:
            return tts_edge_internal(text)
        except Exception as e:
            logger.warning(f"Edge TTS failed: {e}")
        
        # Fallback to pyttsx3 (most reliable)
        try:
            return tts_pyttsx3_internal(text)
        except Exception as e:
            logger.warning(f"pyttsx3 TTS failed: {e}")
        
        # Final fallback to gTTS if available
        try:
            return tts_gtts_internal(text)
        except Exception as e:
            logger.warning(f"gTTS failed: {e}")
        
        # If all fail, return browser TTS instruction
        return JsonResponse({
            "use_browser_tts": True,
            "text": text,
            "message": "Server TTS unavailable, use browser TTS"
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return JsonResponse({"error": "TTS generation failed"}, status=500)

@csrf_exempt
def tts_pyttsx3(request):
    """pyttsx3 TTS endpoint - works offline"""
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required."}, status=405)
    
    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)
        
        if len(text) > 500:
            text = text[:500]
        
        return tts_pyttsx3_internal(text)
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.error(f"pyttsx3 TTS failed: {e}")
        return JsonResponse({"error": "TTS generation failed"}, status=500)

def tts_pyttsx3_internal(text):
    """Internal pyttsx3 TTS implementation"""
    try:
        import pyttsx3
        
        # Initialize pyttsx3 engine
        engine = pyttsx3.init()
        
        # Set properties
        engine.setProperty('rate', 150)    # Speed of speech
        engine.setProperty('volume', 0.9)  # Volume level
        
        # Try to set a better voice if available
        voices = engine.getProperty('voices')
        if voices and len(voices) > 1:
            # Try to find a female voice or use the second voice
            for voice in voices:
                if 'female' in voice.name.lower() or 'woman' in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
            else:
                engine.setProperty('voice', voices[1].id)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            # Save speech to file
            engine.save_to_file(text, temp_filename)
            engine.runAndWait()
            
            # Read the generated audio file
            with open(temp_filename, 'rb') as audio_file:
                audio_data = audio_file.read()
            
            # Return audio response
            response = HttpResponse(audio_data, content_type="audio/wav")
            response['Content-Disposition'] = 'inline; filename="speech.wav"'
            
            return response
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_filename):
                try:
                    os.unlink(temp_filename)
                except:
                    pass  # Ignore cleanup errors
        
    except ImportError:
        raise Exception("pyttsx3 not installed. Install with: pip install pyttsx3")
    except Exception as e:
        raise Exception(f"pyttsx3 generation failed: {e}")

@csrf_exempt
def tts_edge(request):
    """Edge TTS endpoint - high quality cloud TTS"""
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required."}, status=405)
    
    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)
        
        if len(text) > 500:
            text = text[:500]
        
        return tts_edge_internal(text)
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.error(f"Edge TTS failed: {e}")
        return JsonResponse({"error": "Edge TTS generation failed"}, status=500)

def tts_edge_internal(text):
    """Internal Edge TTS implementation"""
    try:
        import edge_tts
        
        # Run async Edge TTS in a thread
        def run_edge_tts():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(generate_edge_tts(text))
            finally:
                loop.close()
        
        # Run in thread to avoid blocking
        audio_data = run_edge_tts()
        
        if audio_data:
            response = HttpResponse(audio_data, content_type="audio/mp3")
            response['Content-Disposition'] = 'inline; filename="speech.mp3"'
            return response
        else:
            raise Exception("No audio data generated")
            
    except ImportError:
        raise Exception("edge-tts not installed. Install with: pip install edge-tts")
    except Exception as e:
        raise Exception(f"Edge TTS generation failed: {e}")

async def generate_edge_tts(text):
    """Async function to generate Edge TTS"""
    try:
        import edge_tts
        
        # Use a good English voice
        voice = "en-US-AriaNeural"  # Female voice
        # Alternative voices: "en-US-JennyNeural", "en-US-GuyNeural"
        
        communicate = edge_tts.Communicate(text, voice)
        
        # Generate audio data
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        return audio_data
        
    except Exception as e:
        logger.error(f"Async Edge TTS failed: {e}")
        return None

def tts_gtts_internal(text):
    """Internal Google Text-to-Speech implementation"""
    try:
        from gtts import gTTS
        
        # Create gTTS object
        tts = gTTS(text=text, lang='en', slow=False)
        
        # Save to memory buffer
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Return audio response
        response = HttpResponse(audio_buffer.getvalue(), content_type="audio/mp3")
        response['Content-Disposition'] = 'inline; filename="speech.mp3"'
        
        return response
        
    except ImportError:
        raise Exception("gTTS not installed. Install with: pip install gTTS")
    except Exception as e:
        raise Exception(f"gTTS generation failed: {e}")

@csrf_exempt
def tts_status(request):
    """Check TTS availability status"""
    status = {
        "pyttsx3": False,
        "edge_tts": False,
        "gtts": False,
        "available_engines": []
    }
    
    # Check pyttsx3
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.stop()
        status["pyttsx3"] = True
        status["available_engines"].append("pyttsx3")
    except:
        pass
    
    # Check edge-tts
    try:
        import edge_tts
        status["edge_tts"] = True
        status["available_engines"].append("edge_tts")
    except:
        pass
    
    # Check gTTS
    try:
        from gtts import gTTS
        status["gtts"] = True
        status["available_engines"].append("gtts")
    except:
        pass
    
    return JsonResponse(status)
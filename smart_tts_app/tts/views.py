from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from transformers import ESPnetTTSProcessor, ESPnetTTSModel
import torch, soundfile as sf, io, json

# Load model once
processor = ESPnetTTSProcessor.from_pretrained("espnet/kan-bayashi_ljspeech_vits")
model = ESPnetTTSModel.from_pretrained("espnet/kan-bayashi_ljspeech_vits")

def index(request):
    return render(request, 'questionnaire.html')

def tts(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        text = data.get("text", "")
        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)

        inputs = processor(text=text, return_tensors="pt")
        with torch.no_grad():
            wav = model(**inputs).waveform

        buffer = io.BytesIO()
        sf.write(buffer, wav.squeeze().numpy(), 22050, format='WAV')
        buffer.seek(0)
        return HttpResponse(buffer.read(), content_type="audio/wav")

    return JsonResponse({"error": "POST method required."}, status=405)

def index(request):
    return render(request, 'questionnaire.html')